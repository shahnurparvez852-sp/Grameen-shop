const express=require("express");
const session=require("express-session");
const Database=require("better-sqlite3");
const path=require("path");
const app=express();
const db=new Database("store.db");
const PORT=process.env.PORT||3000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"dev-secret-change-me",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,
 price INTEGER NOT NULL,old_price INTEGER DEFAULT 0,icon TEXT DEFAULT '🛍️',
 stock INTEGER DEFAULT 0,active INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,customer_name TEXT NOT NULL,phone TEXT NOT NULL,
 address TEXT NOT NULL,payment TEXT NOT NULL,note TEXT,items_json TEXT NOT NULL,
 total INTEGER NOT NULL,status TEXT DEFAULT 'Pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
const count=db.prepare("SELECT COUNT(*) c FROM products").get().c;
if(!count){
 const add=db.prepare("INSERT INTO products(name,category,price,old_price,icon,stock) VALUES(?,?,?,?,?,?)");
 [
  ["Classic Oversized T-Shirt","Fashion",790,990,"👕",25],
  ["Premium Smart Watch","Electronics",2490,2990,"⌚",12],
  ["Wireless Headphones","Electronics",1890,2290,"🎧",18],
  ["Minimal Leather Bag","Accessories",1590,1990,"👜",10],
  ["Modern Table Lamp","Home",1190,1490,"💡",20],
  ["Everyday Sneakers","Fashion",2190,2590,"👟",15],
  ["Ceramic Coffee Set","Home",890,1090,"☕",30],
  ["Classic Sunglasses","Accessories",990,1290,"🕶️",14]
 ].forEach(x=>add.run(...x));
}
const money=n=>"৳"+Number(n).toLocaleString("en-BD");
app.get("/api/products",(req,res)=>res.json(db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all()));
app.post("/api/orders",(req,res)=>{
 const {customer_name,phone,address,payment,note,items}=req.body;
 if(!customer_name||!phone||!address||!payment||!Array.isArray(items)||!items.length)return res.status(400).json({error:"Please complete all required fields."});
 let total=0, normalized=[];
 const get=db.prepare("SELECT * FROM products WHERE id=? AND active=1");
 for(const i of items){
   const p=get.get(i.id); const qty=Math.max(1,Math.floor(Number(i.qty)||1));
   if(!p)return res.status(400).json({error:"A product is unavailable."});
   if(p.stock<qty)return res.status(400).json({error:`Only ${p.stock} units of ${p.name} are available.`});
   total+=p.price*qty; normalized.push({id:p.id,name:p.name,price:p.price,qty});
 }
 const tx=db.transaction(()=>{
   const info=db.prepare("INSERT INTO orders(customer_name,phone,address,payment,note,items_json,total) VALUES(?,?,?,?,?,?,?)")
    .run(customer_name,phone,address,payment,note||"",JSON.stringify(normalized),total);
   const upd=db.prepare("UPDATE products SET stock=stock-? WHERE id=?");
   normalized.forEach(i=>upd.run(i.qty,i.id));
   return info.lastInsertRowid;
 });
 const id=tx();
 res.json({ok:true,order_id:id,total,money:money(total)});
});
function admin(req,res,next){if(req.session.admin)return next();res.status(401).json({error:"Admin login required."})}
app.post("/api/admin/login",(req,res)=>{
 const u=process.env.ADMIN_USER||"admin",p=process.env.ADMIN_PASSWORD||"admin123";
 if(req.body.username===u&&req.body.password===p){req.session.admin=true;return res.json({ok:true})}
 res.status(401).json({error:"Invalid login."});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({loggedIn:!!req.session.admin}));
app.get("/api/admin/orders",admin,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all().map(o=>({...o,items:JSON.parse(o.items_json)}))));
app.patch("/api/admin/orders/:id",admin,(req,res)=>{
 const allowed=["Pending","Confirmed","Packed","Shipped","Delivered","Cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
 db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);
 res.json({ok:true});
});
app.post("/api/admin/products",admin,(req,res)=>{
 const {name,category,price,old_price,icon,stock}=req.body;
 if(!name||!category||!price)return res.status(400).json({error:"Name, category and price are required."});
 const r=db.prepare("INSERT INTO products(name,category,price,old_price,icon,stock) VALUES(?,?,?,?,?,?)").run(name,category,price,old_price||0,icon||"🛍️",stock||0);
 res.json({ok:true,id:r.lastInsertRowid});
});
app.patch("/api/admin/products/:id",admin,(req,res)=>{
 const p=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id); if(!p)return res.status(404).json({error:"Not found"});
 const x={...p,...req.body};
 db.prepare("UPDATE products SET name=?,category=?,price=?,old_price=?,icon=?,stock=?,active=? WHERE id=?")
 .run(x.name,x.category,x.price,x.old_price||0,x.icon||"🛍️",x.stock||0,x.active?1:0,req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/products/:id",admin,(req,res)=>{db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);res.json({ok:true})});
app.listen(PORT,()=>console.log(`Parvez Shop running on http://localhost:${PORT}`));
