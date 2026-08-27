let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let cat = "All";

const money = n => "৳" + Number(n).toLocaleString("en-BD");

async function load() {
  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Could not load products");
    }

    products = await response.json();

    render();
    update();

  } catch (error) {
    console.error(error);

    document.getElementById("grid").innerHTML =
      "<p>Products could not be loaded.</p>";
  }
}


function render() {

  const searchInput = document.getElementById("search");

  const q = (searchInput?.value || "").toLowerCase();

  let a = products.filter(p =>
    (cat === "All" || p.category === cat) &&
    (
      !q ||
      String(p.name).toLowerCase().includes(q) ||
      String(p.category).toLowerCase().includes(q)
    )
  );


  const sort = document.getElementById("sort")?.value || "";

  if (sort === "low") {
    a.sort((x, y) => Number(x.price) - Number(y.price));
  }

  if (sort === "high") {
    a.sort((x, y) => Number(y.price) - Number(x.price));
  }


  /* =========================
     CATEGORIES
  ========================= */

  document.getElementById("cats").innerHTML =
    ["All", ...new Set(products.map(p => p.category))]
      .map(x => `
        <button
          class="pill ${x === cat ? "active" : ""}"
          onclick="setCategory('${escapeHtml(x)}')"
        >
          ${escapeHtml(x)}
        </button>
      `)
      .join("");


  /* =========================
     PRODUCTS
  ========================= */

  document.getElementById("grid").innerHTML =

    a.map(p => {

      const image = p.icon || "";

      const isImage =
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:image");


      return `

        <article class="card">

          <!-- PRODUCT IMAGE -->

          <div
            class="pic"
            style="
              width:100%;
              height:250px;
              display:flex;
              align-items:center;
              justify-content:center;
              overflow:hidden;
              background:#f4f2f7;
              position:relative;
            "
          >

            ${
              isImage

              ?

              `
                <img
                  src="${image}"
                  alt="${escapeHtml(p.name)}"
                  loading="lazy"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block;
                  "
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                >

                <div
                  style="
                    display:none;
                    width:100%;
                    height:100%;
                    align-items:center;
                    justify-content:center;
                    font-size:80px;
                  "
                >
                  🛍️
                </div>
              `

              :

              `
                <span
                  class="product-icon"
                  style="font-size:80px;"
                >
                  ${escapeHtml(image || "🛍️")}
                </span>
              `
            }


            <!-- STOCK -->

            <span
              style="
                position:absolute;
                right:10px;
                bottom:10px;
                padding:6px 10px;
                border-radius:20px;
                background:rgba(0,0,0,.65);
                color:white;
                font-size:12px;
                font-weight:700;
              "
            >
              ${p.stock} left
            </span>

          </div>


          <!-- PRODUCT INFORMATION -->

          <div style="padding:20px;">

            <small>
              ${escapeHtml(p.category)}
            </small>

            <h3>
              ${escapeHtml(p.name)}
            </h3>

            <div
              style="
                display:flex;
                align-items:center;
                gap:10px;
                margin:8px 0 15px;
              "
            >

              <b
                class="price"
                style="
                  color:#087443;
                  font-size:21px;
                "
              >
                ${money(p.price)}
              </b>

              ${
                p.old_price
                ?
                `<del style="color:#999;">
                  ${money(p.old_price)}
                </del>`
                :
                ""
              }

            </div>


            <!-- ADD TO CART -->

            <button
              class="add btn full"
              ${p.stock < 1 ? "disabled" : ""}
              onclick="add(${p.id})"
            >
              ${
                p.stock < 1
                ? "Out of stock"
                : "🛒 Add to cart"
              }
            </button>

          </div>

        </article>

      `;

    }).join("");


  if (!a.length) {

    document.getElementById("grid").innerHTML =
      `
        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:50px;
          "
        >
          <div style="font-size:50px;">
            🔍
          </div>

          <h3>
            No products found
          </h3>

          <p class="muted">
            Try another search or category.
          </p>

        </div>
      `;

  }

}


/* =========================
   CATEGORY
========================= */

function setCategory(category) {

  cat = category;

  render();

}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   ADD TO CART
========================= */

function add(id) {

  const product = products.find(p => p.id === id);

  if (!product) {
    return alert("Product not found.");
  }

  if (product.stock < 1) {
    return alert("This product is out of stock.");
  }


  let x = cart.find(i => i.id === id);


  if (x) {

    if (x.qty >= product.stock) {
      return alert(`Only ${product.stock} units are available.`);
    }

    x.qty++;

  } else {

    cart.push({
      id: id,
      qty: 1
    });

  }


  save();

  openCart();

}


/* =========================
   SAVE CART
========================= */

function save() {

  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );

  update();

}


/* =========================
   CART COUNT
========================= */

function update() {

  const count = document.getElementById("count");

  if (count) {

    count.textContent =
      cart.reduce(
        (total, item) => total + item.qty,
        0
      );

  }

}


/* =========================
   OPEN CART
========================= */

function openCart() {

  document
    .getElementById("cart")
    .classList.remove("hidden");

  drawCart();

}


/* =========================
   CLOSE CART
========================= */

function closeCart() {

  document
    .getElementById("cart")
    .classList.add("hidden");

}


/* =========================
   DRAW CART
========================= */

function drawCart() {

  let total = 0;


  document.getElementById("cartItems").innerHTML =

    cart.map(i => {

      const p =
        products.find(x => x.id === i.id);


      if (!p) return "";


      total +=
        Number(p.price) * i.qty;


      const image =
        p.icon || "";


      const isImage =
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:image");


      return `

        <div
          class="item"
          style="
            display:flex;
            gap:12px;
            align-items:center;
            margin-bottom:15px;
          "
        >

          <div>

            ${
              isImage

              ?

              `
                <img
                  src="${image}"
                  alt="${escapeHtml(p.name)}"
                  style="
                    width:60px;
                    height:60px;
                    object-fit:cover;
                    border-radius:10px;
                  "
                >
              `

              :

              `
                <span
                  style="font-size:35px;"
                >
                  ${escapeHtml(image || "🛍️")}
                </span>
              `
            }

          </div>


          <div>

            <b>
              ${escapeHtml(p.name)}
            </b>

            <br>

            ${money(p.price)} × ${i.qty}

            <br>

            <button
              onclick="qty(${p.id},-1)"
            >
              −
            </button>

            ${i.qty}

            <button
              onclick="qty(${p.id},1)"
            >
              +
            </button>

          </div>

        </div>

      `;

    }).join("")

    || "<p class='muted'>Your cart is empty.</p>";


  document.getElementById("total").textContent =
    money(total);

}


/* =========================
   CART QUANTITY
========================= */

function qty(id, d) {

  const x =
    cart.find(i => i.id === id);


  if (!x) return;


  const product =
    products.find(p => p.id === id);


  x.qty += d;


  if (
    product &&
    x.qty > product.stock
  ) {

    x.qty =
      product.stock;

  }


  if (x.qty < 1) {

    cart =
      cart.filter(
        i => i.id !== id
      );

  }


  save();

  drawCart();

}


/* =========================
   CHECKOUT
========================= */

function checkout() {

  if (!cart.length) {

    return alert(
      "Your cart is empty."
    );

  }


  closeCart();


  document
    .getElementById("checkout")
    .classList.remove("hidden");

}


/* =========================
   CLOSE CHECKOUT
========================= */

function closeCheckout() {

  document
    .getElementById("checkout")
    .classList.add("hidden");

}


/* =========================
   ORDER
========================= */

document
  .getElementById("orderForm")
  .onsubmit = async e => {

    e.preventDefault();


    const body =
      Object.fromEntries(
        new FormData(e.target)
      );


    body.items = cart;


    try {

      const response =
        await fetch(
          "/api/orders",
          {
            method:"POST",

            headers:{
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(body)
          }
        );


      const x =
        await response.json();


      if (!response.ok) {

        return alert(
          x.error ||
          "Order failed."
        );

      }


      alert(
        `Order #${x.order_id} confirmed! Total ${x.money}. We will contact you at ${body.phone}.`
      );


      cart = [];

      save();

      closeCheckout();

      await load();

      e.target.reset();


    } catch(error) {

      console.error(error);

      alert(
        "Could not place order."
      );

    }

  };


/* =========================
   START
========================= */

load();
