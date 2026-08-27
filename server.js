```javascript
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("store.db");

const PORT = process.env.PORT || 3000;


/* =====================================================
   BASIC CONFIG
===================================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "dev-secret-change-me",

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =====================================================
   DATABASE
===================================================== */

db.exec(`
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER DEFAULT 0,
  icon TEXT DEFAULT '🛍️',
  stock INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  payment TEXT NOT NULL,
  note TEXT,
  items_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);


/* =====================================================
   DATABASE MIGRATION
   Adds updated_at to old databases
===================================================== */

try {

  db.prepare(
    "SELECT updated_at FROM orders LIMIT 1"
  ).get();

} catch (error) {

  try {

    db.exec(
      "ALTER TABLE orders ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP"
    );

  } catch (e) {

    console.log(
      "updated_at migration:",
      e.message
    );

  }

}


/* =====================================================
   PAYMENT INFORMATION
===================================================== */

const PAYMENT_INFO = {

  bkash: {
    name: "bKash",
    number: "01312376687",
    type: "Merchant",
    instruction:
      "Send the payment to this bKash Merchant number and keep your Transaction ID."
  },

  nagad: {
    name: "Nagad",
    number: "01728376687",
    type: "Personal",
    instruction:
      "Send the payment to this Nagad Personal number and keep your Transaction ID."
  }

};


/* =====================================================
   MONEY
===================================================== */

const money = n =>
  "৳" +
  Number(n).toLocaleString("en-BD");


/* =====================================================
   INITIAL PRODUCTS
===================================================== */

const count =
  db
    .prepare(
      "SELECT COUNT(*) c FROM products"
    )
    .get().c;


if (!count) {

  const add =
    db.prepare(`
      INSERT INTO products
      (
        name,
        category,
        price,
        old_price,
        icon,
        stock
      )
      VALUES(?,?,?,?,?,?)
    `);


  [
    [
      "Classic Oversized T-Shirt",
      "Fashion",
      790,
      990,
      "👕",
      25
    ],

    [
      "Premium Smart Watch",
      "Electronics",
      2490,
      2990,
      "⌚",
      12
    ],

    [
      "Wireless Headphones",
      "Electronics",
      1890,
      2290,
      "🎧",
      18
    ],

    [
      "Minimal Leather Bag",
      "Accessories",
      1590,
      1990,
      "👜",
      10
    ],

    [
      "Modern Table Lamp",
      "Home",
      1190,
      1490,
      "💡",
      20
    ],

    [
      "Everyday Sneakers",
      "Fashion",
      2190,
      2590,
      "👟",
      15
    ],

    [
      "Ceramic Coffee Set",
      "Home",
      890,
      1090,
      "☕",
      30
    ],

    [
      "Classic Sunglasses",
      "Accessories",
      990,
      1290,
      "🕶️",
      14
    ]

  ].forEach(x => add.run(...x));

}


/* =====================================================
   PRODUCTS
===================================================== */

app.get(
  "/api/products",
  (req, res) => {

    const products =
      db
        .prepare(`
          SELECT *
          FROM products
          WHERE active=1
          ORDER BY id DESC
        `)
        .all();

    res.json(products);

  }
);


/* =====================================================
   PAYMENT INFO API
===================================================== */

app.get(
  "/api/payment-info",
  (req, res) => {

    res.json({
      ok: true,
      payment: PAYMENT_INFO
    });

  }
);


/* =====================================================
   CREATE ORDER
===================================================== */

app.post(
  "/api/orders",
  (req, res) => {

    try {

      const {
        customer_name,
        phone,
        address,
        payment,
        note,
        transaction_id,
        items
      } = req.body;


      if (
        !customer_name ||
        !phone ||
        !address ||
        !payment ||
        !Array.isArray(items) ||
        !items.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please complete all required fields."
          });

      }


      /* =================================================
         PAYMENT VALIDATION
      ================================================= */

      if (
        payment === "bKash Manual" &&
        !transaction_id
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please enter your bKash Transaction ID."
          });

      }


      if (
        payment === "Nagad Manual" &&
        !transaction_id
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please enter your Nagad Transaction ID."
          });

      }


      /* =================================================
         CHECK PRODUCTS
      ================================================= */

      let total = 0;

      const normalized = [];


      const get =
        db.prepare(`
          SELECT *
          FROM products
          WHERE id=?
          AND active=1
        `);


      for (const i of items) {

        const p =
          get.get(i.id);


        const qty =
          Math.max(
            1,
            Math.floor(
              Number(i.qty) || 1
            )
          );


        if (!p) {

          return res
            .status(400)
            .json({
              error:
                "A product is unavailable."
            });

        }


        if (p.stock < qty) {

          return res
            .status(400)
            .json({
              error:
                `Only ${p.stock} units of ${p.name} are available.`
            });

        }


        total +=
          p.price * qty;


        normalized.push({

          id: p.id,

          name: p.name,

          price: p.price,

          qty

        });

      }


      /* =================================================
         INSERT ORDER
      ================================================= */

      const tx =
        db.transaction(() => {

          const info =
            db.prepare(`
              INSERT INTO orders
              (
                customer_name,
                phone,
                address,
                payment,
                note,
                items_json,
                total,
                status,
                created_at,
                updated_at
              )
              VALUES(
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'Pending',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
              )
            `)
            .run(
              customer_name,
              phone,
              address,
              payment,
              note || "",
              JSON.stringify(
                normalized
              ),
              total
            );


          const orderId =
            info.lastInsertRowid;


          /* STOCK UPDATE */

          const upd =
            db.prepare(`
              UPDATE products
              SET stock=stock-?
              WHERE id=?
            `);


          normalized.forEach(i => {

            upd.run(
              i.qty,
              i.id
            );

          });


          return orderId;

        });


      const orderId = tx();


      /* =================================================
         RESPONSE
      ================================================= */

      res.json({

        ok: true,

        order_id: orderId,

        total,

        money: money(total),

        status: "Pending",

        payment,

        message:
          `Order #${orderId} received successfully. Your order status is Pending.`

      });


    } catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Could not place order."
        });

    }

  }
);


/* =====================================================
   CUSTOMER ORDER STATUS
===================================================== */

app.get(
  "/api/orders/:id",
  (req, res) => {

    try {

      const orderId =
        Number(req.params.id);


      const phone =
        String(
          req.query.phone || ""
        ).trim();


      if (!orderId || !phone) {

        return res
          .status(400)
          .json({
            error:
              "Order ID and phone number are required."
          });

      }


      const order =
        db
          .prepare(`
            SELECT *
            FROM orders
            WHERE id=?
            AND phone=?
          `)
          .get(
            orderId,
            phone
          );


      if (!order) {

        return res
          .status(404)
          .json({
            error:
              "Order not found. Please check your Order ID and phone number."
          });

      }


      res.json({

        ok: true,

        order: {

          id: order.id,

          customer_name:
            order.customer_name,

          phone:
            order.phone,

          address:
            order.address,

          payment:
            order.payment,

          transaction_id:
            order.transaction_id || "",

          total:
            order.total,

          money:
            money(order.total),

          status:
            order.status,

          items:
            JSON.parse(
              order.items_json
            ),

          created_at:
            order.created_at,

          updated_at:
            order.updated_at

        }

      });


    } catch (error) {

      console.error(
        "STATUS ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Could not check order status."
        });

    }

  }
);


/* =====================================================
   ADMIN AUTH
===================================================== */

function admin(
  req,
  res,
  next
) {

  if (
    req.session &&
    req.session.admin
  ) {

    return next();

  }


  res
    .status(401)
    .json({
      error:
        "Admin login required."
    });

}


/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post(
  "/api/admin/login",
  (req, res) => {

    const u =
      process.env.ADMIN_USER ||
      "admin";


    const p =
      process.env.ADMIN_PASSWORD ||
      "admin123";


    if (
      req.body.username === u &&
      req.body.password === p
    ) {

      req.session.admin = true;


      return res.json({
        ok: true
      });

    }


    res
      .status(401)
      .json({
        error:
          "Invalid login."
      });

  }
);


/* =====================================================
   ADMIN LOGOUT
===================================================== */

app.post(
  "/api/admin/logout",
  (req, res) => {

    req.session.destroy(
      () =>
        res.json({
          ok: true
        })
    );

  }
);


/* =====================================================
   ADMIN SESSION
===================================================== */

app.get(
  "/api/admin/me",
  (req, res) => {

    res.json({

      loggedIn:
        !!(
          req.session &&
          req.session.admin
        )

    });

  }
);


/* =====================================================
   ADMIN ORDERS
===================================================== */

app.get(
  "/api/admin/orders",
  admin,
  (req, res) => {

    const orders =
      db
        .prepare(`
          SELECT *
          FROM orders
          ORDER BY id DESC
        `)
        .all();


    res.json(

      orders.map(o => ({

        ...o,

        items:
          JSON.parse(
            o.items_json
          )

      }))

    );

  }
);


/* =====================================================
   UPDATE ORDER STATUS
===================================================== */

app.patch(
  "/api/admin/orders/:id",
  admin,
  (req, res) => {

    const allowed = [

      "Pending",

      "Confirmed",

      "Packed",

      "Shipped",

      "Delivered",

      "Cancelled"

    ];


    const newStatus =
      req.body.status;


    if (
      !allowed.includes(
        newStatus
      )
    ) {

      return res
        .status(400)
        .json({
          error:
            "Invalid status."
        });

    }


    const order =
      db
        .prepare(
          "SELECT * FROM orders WHERE id=?"
        )
        .get(
          req.params.id
        );


    if (!order) {

      return res
        .status(404)
        .json({
          error:
            "Order not found."
        });

    }


    db.prepare(`
      UPDATE orders
      SET
        status=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `)
    .run(
      newStatus,
      req.params.id
    );


    res.json({

      ok: true,

      order_id:
        Number(req.params.id),

      status:
        newStatus,

      message:
        `Order #${req.params.id} status changed to ${newStatus}.`

    });

  }
);


/* =====================================================
   ADD PRODUCT
===================================================== */

app.post(
  "/api/admin/products",
  admin,
  (req, res) => {

    const {
      name,
      category,
      price,
      old_price,
      icon,
      stock
    } = req.body;


    if (
      !name ||
      !category ||
      !price
    ) {

      return res
        .status(400)
        .json({
          error:
            "Name, category and price are required."
        });

    }


    const r =
      db.prepare(`
        INSERT INTO products
        (
          name,
          category,
          price,
          old_price,
          icon,
          stock
        )
        VALUES(?,?,?,?,?,?)
      `)
      .run(
        name,
        category,
        price,
        old_price || 0,
        icon || "🛍️",
        stock || 0
      );


    res.json({

      ok: true,

      id:
        r.lastInsertRowid

    });

  }
);


/* =====================================================
   EDIT PRODUCT
===================================================== */

app.patch(
  "/api/admin/products/:id",
  admin,
  (req, res) => {

    const p =
      db
        .prepare(
          "SELECT * FROM products WHERE id=?"
        )
        .get(
          req.params.id
        );


    if (!p) {

      return res
        .status(404)
        .json({
          error:
            "Product not found."
        });

    }


    const x = {

      ...p,

      ...req.body

    };


    db.prepare(`
      UPDATE products
      SET
        name=?,
        category=?,
        price=?,
        old_price=?,
        icon=?,
        stock=?,
        active=?
      WHERE id=?
    `)
    .run(

      x.name,

      x.category,

      x.price,

      x.old_price || 0,

      x.icon || "🛍️",

      x.stock || 0,

      x.active ? 1 : 0,

      req.params.id

    );


    res.json({
      ok: true
    });

  }
);


/* =====================================================
   HIDE PRODUCT
===================================================== */

app.delete(
  "/api/admin/products/:id",
  admin,
  (req, res) => {

    db.prepare(`
      UPDATE products
      SET active=0
      WHERE id=?
    `)
    .run(
      req.params.id
    );


    res.json({
      ok: true
    });

  }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {

    console.log(
      `Grameen Shop running on http://localhost:${PORT}`
    );

  }
);
```
