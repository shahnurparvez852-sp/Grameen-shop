let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let cat = "All";

const money = n => "৳" + Number(n).toLocaleString("en-BD");

/* =====================================================
   PAYMENT NUMBERS
===================================================== */

const BKASH_NUMBER = "01312376687";
const NAGAD_NUMBER = "01728376687";


/* =====================================================
   API HELPER
===================================================== */

async function api(url, options = {}) {

  const response = await fetch(url, options);

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Something went wrong."
    );
  }

  return data;
}


/* =====================================================
   LOAD PRODUCTS
===================================================== */

async function load() {

  try {

    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Could not load products");
    }

    products = await response.json();

    /*
      Remove products that no longer exist
      from local cart.
    */

    cart = cart.filter(item =>
      products.some(p => p.id === item.id)
    );

    /*
      Make sure cart quantity does not exceed stock.
    */

    cart.forEach(item => {

      const product =
        products.find(p => p.id === item.id);

      if (product && item.qty > product.stock) {
        item.qty = product.stock;
      }

    });

    cart = cart.filter(item => item.qty > 0);

    save();

    render();

    update();

  } catch (error) {

    console.error(error);

    const grid =
      document.getElementById("grid");

    if (grid) {
      grid.innerHTML =
        "<p>Products could not be loaded.</p>";
    }

  }

}


/* =====================================================
   RENDER PRODUCTS
===================================================== */

function render() {

  const searchInput =
    document.getElementById("search");

  const q =
    (searchInput?.value || "").toLowerCase().trim();


  let a =
    products.filter(p =>

      (cat === "All" || p.category === cat) &&

      (
        !q ||
        String(p.name).toLowerCase().includes(q) ||
        String(p.category).toLowerCase().includes(q)
      )

    );


  const sort =
    document.getElementById("sort")?.value || "";


  if (sort === "low") {

    a.sort(
      (x, y) =>
        Number(x.price) - Number(y.price)
    );

  }


  if (sort === "high") {

    a.sort(
      (x, y) =>
        Number(y.price) - Number(x.price)
    );

  }


  /* ===================================================
     CATEGORIES
  =================================================== */

  const cats =
    document.getElementById("cats");


  if (cats) {

    cats.innerHTML =
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

  }


  /* ===================================================
     PRODUCT GRID
  =================================================== */

  const grid =
    document.getElementById("grid");


  if (!grid) return;


  grid.innerHTML =

    a.map(p => {

      const image =
        String(p.icon || "");


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
                  src="${escapeAttribute(image)}"
                  alt="${escapeAttribute(p.name)}"
                  loading="lazy"

                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block;
                  "

                  onerror="
                    this.style.display='none';
                    this.nextElementSibling.style.display='flex';
                  "
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
                  style="
                    font-size:80px;
                  "
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
              ${Number(p.stock)} left
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
                Number(p.old_price) > 0

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

    grid.innerHTML = `

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


/* =====================================================
   CATEGORY
===================================================== */

function setCategory(category) {

  cat = category;

  render();

}


/* =====================================================
   HTML SAFETY
===================================================== */

function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHtml(value);

}


/* =====================================================
   ADD TO CART
===================================================== */

function add(id) {

  const product =
    products.find(p => p.id === id);


  if (!product) {

    return alert(
      "Product not found."
    );

  }


  if (Number(product.stock) < 1) {

    return alert(
      "This product is out of stock."
    );

  }


  let x =
    cart.find(i => i.id === id);


  if (x) {

    if (
      Number(x.qty) >=
      Number(product.stock)
    ) {

      return alert(
        `Only ${product.stock} units are available.`
      );

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


/* =====================================================
   SAVE CART
===================================================== */

function save() {

  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );

  update();

}


/* =====================================================
   CART COUNT
===================================================== */

function update() {

  const count =
    document.getElementById("count");


  if (count) {

    count.textContent =
      cart.reduce(
        (total, item) =>
          total + Number(item.qty),
        0
      );

  }

}


/* =====================================================
   OPEN CART
===================================================== */

function openCart() {

  const cartBox =
    document.getElementById("cart");


  if (!cartBox) return;


  cartBox.classList.remove("hidden");

  drawCart();

}


/* =====================================================
   CLOSE CART
===================================================== */

function closeCart() {

  const cartBox =
    document.getElementById("cart");


  if (cartBox) {

    cartBox.classList.add("hidden");

  }

}


/* =====================================================
   DRAW CART
===================================================== */

function drawCart() {

  const cartItems =
    document.getElementById("cartItems");


  const totalElement =
    document.getElementById("total");


  if (!cartItems || !totalElement) return;


  let total = 0;


  cartItems.innerHTML =

    cart.map(i => {

      const p =
        products.find(x => x.id === i.id);


      if (!p) return "";


      total +=
        Number(p.price) *
        Number(i.qty);


      const image =
        String(p.icon || "");


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
                  src="${escapeAttribute(image)}"
                  alt="${escapeAttribute(p.name)}"
                  style="
                    width:60px;
                    height:60px;
                    object-fit:cover;
                    border-radius:10px;
                  "
                  onerror="this.style.display='none';"
                >

              `

              :

              `

                <span
                  style="
                    font-size:35px;
                  "
                >
                  ${escapeHtml(image || "🛍️")}
                </span>

              `
            }

          </div>


          <div style="flex:1;">

            <b>
              ${escapeHtml(p.name)}
            </b>

            <br>

            ${money(p.price)} × ${i.qty}

            <br><br>

            <button
              onclick="qty(${p.id},-1)"
            >
              −
            </button>

            <span style="margin:0 8px;">
              ${i.qty}
            </span>

            <button
              onclick="qty(${p.id},1)"
            >
              +
            </button>

          </div>

        </div>

      `;

    }).join("")

    ||

    "<p class='muted'>Your cart is empty.</p>";


  totalElement.textContent =
    money(total);

}


/* =====================================================
   CART QUANTITY
===================================================== */

function qty(id, d) {

  const x =
    cart.find(i => i.id === id);


  if (!x) return;


  const product =
    products.find(p => p.id === id);


  x.qty += d;


  if (
    product &&
    x.qty > Number(product.stock)
  ) {

    x.qty =
      Number(product.stock);

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


/* =====================================================
   CHECKOUT
===================================================== */

function checkout() {

  if (!cart.length) {

    return alert(
      "Your cart is empty."
    );

  }


  closeCart();


  const checkoutBox =
    document.getElementById("checkout");


  if (checkoutBox) {

    checkoutBox
      .classList
      .remove("hidden");

  }


  updatePaymentInfo();

}


/* =====================================================
   CLOSE CHECKOUT
===================================================== */

function closeCheckout() {

  const checkoutBox =
    document.getElementById("checkout");


  if (checkoutBox) {

    checkoutBox
      .classList
      .add("hidden");

  }

}


/* =====================================================
   PAYMENT INFORMATION
===================================================== */

function updatePaymentInfo() {

  const form =
    document.getElementById("orderForm");


  if (!form) return;


  const payment =
    form.elements["payment"]?.value;


  let box =
    document.getElementById("paymentInfo");


  /*
    Create payment info box automatically
    if it does not already exist.
  */

  if (!box) {

    box =
      document.createElement("div");

    box.id = "paymentInfo";

    box.style.cssText = `
      margin:12px 0;
      padding:15px;
      border-radius:12px;
      background:#f5f7f9;
      border:1px solid #ddd;
      line-height:1.6;
    `;


    const paymentSelect =
      form.elements["payment"];


    paymentSelect
      .parentNode
      .insertBefore(
        box,
        paymentSelect.nextSibling
      );

  }


  if (payment === "bKash Manual") {

    box.innerHTML = `

      <div style="font-size:18px;font-weight:700;">
        📱 bKash Payment
      </div>

      <div style="margin-top:5px;">
        <strong>Merchant Number:</strong>
        <span
          style="
            font-size:20px;
            font-weight:800;
            color:#087443;
          "
        >
          ${BKASH_NUMBER}
        </span>
      </div>

      <small>
        Send your payment to this bKash Merchant number,
        then keep your transaction ID/order information.
      </small>

    `;

    box.style.display = "block";

  }

  else if (payment === "Nagad Manual") {

    box.innerHTML = `

      <div style="font-size:18px;font-weight:700;">
        📱 Nagad Payment
      </div>

      <div style="margin-top:5px;">
        <strong>Personal Number:</strong>
        <span
          style="
            font-size:20px;
            font-weight:800;
            color:#087443;
          "
        >
          ${NAGAD_NUMBER}
        </span>
      </div>

      <small>
        Send your payment to this Nagad Personal number,
        then keep your transaction ID/order information.
      </small>

    `;

    box.style.display = "block";

  }

  else {

    box.innerHTML = `

      <div style="font-size:17px;font-weight:700;">
        💵 Cash on Delivery
      </div>

      <small>
        Pay when your order is delivered.
      </small>

    `;

    box.style.display = "block";

  }

}


/* =====================================================
   PAYMENT SELECT CHANGE
===================================================== */

document.addEventListener(
  "change",
  function(e) {

    if (
      e.target &&
      e.target.name === "payment"
    ) {

      updatePaymentInfo();

    }

  }
);


/* =====================================================
   ORDER STATUS CHECK UI
===================================================== */

function createOrderStatusBox(orderId) {

  let box =
    document.getElementById("orderStatusBox");


  if (box) {
    return box;
  }


  box =
    document.createElement("div");

  box.id = "orderStatusBox";


  box.style.cssText = `
    margin-top:20px;
    padding:20px;
    border-radius:16px;
    background:#f7faf8;
    border:1px solid #dfe8e2;
  `;


  const checkoutAside =
    document
      .querySelector("#checkout aside");


  if (checkoutAside) {

    checkoutAside.appendChild(box);

  }


  return box;

}


/* =====================================================
   SHOW ORDER SUCCESS
===================================================== */

function showOrderSuccess(
  orderId,
  totalMoney,
  phone
) {

  const box =
    createOrderStatusBox(orderId);


  box.innerHTML = `

    <div
      style="
        text-align:center;
      "
    >

      <div
        style="
          font-size:50px;
          margin-bottom:8px;
        "
      >
        ✅
      </div>

      <h3 style="margin:5px 0;">
        Order Successfully Placed!
      </h3>

      <p>
        Thank you for shopping with
        <strong>Grameen Shop</strong>.
      </p>

      <div
        style="
          margin:15px 0;
          padding:15px;
          background:white;
          border-radius:12px;
        "
      >

        <strong>
          Order ID
        </strong>

        <div
          style="
            font-size:25px;
            font-weight:800;
            color:#087443;
            margin-top:5px;
          "
        >
          #${orderId}
        </div>

      </div>


      <p>
        Total:
        <strong>
          ${totalMoney}
        </strong>
      </p>

      <p>
        📞 We will contact you at
        <strong>${escapeHtml(phone)}</strong>
      </p>


      <div
        id="customerOrderStatus"
        style="
          margin-top:15px;
        "
      >
        Loading order status...
      </div>


      <button
        class="btn"
        type="button"
        onclick="checkOrderStatus(${orderId})"
        style="margin-top:12px;"
      >
        🔄 Check Order Status
      </button>

    </div>

  `;


  checkOrderStatus(orderId);

}


/* =====================================================
   CHECK ORDER STATUS
===================================================== */

async function checkOrderStatus(orderId) {

  const statusBox =
    document.getElementById(
      "customerOrderStatus"
    );


  if (!statusBox) return;


  statusBox.innerHTML =
    "⏳ Checking status...";


  try {

    /*
      IMPORTANT:
      This calls a public endpoint.
      The server code below must also contain
      GET /api/orders/:id
    */

    const response =
      await fetch(
        "/api/orders/" + orderId
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Could not check order."
      );

    }


    const status =
      data.status || "Pending";


    let icon = "🕐";


    if (status === "Confirmed") {
      icon = "✅";
    }

    if (status === "Packed") {
      icon = "📦";
    }

    if (status === "Shipped") {
      icon = "🚚";
    }

    if (status === "Delivered") {
      icon = "🎉";
    }

    if (status === "Cancelled") {
      icon = "❌";
    }


    statusBox.innerHTML = `

      <div
        style="
          padding:14px;
          border-radius:12px;
          background:white;
          border:1px solid #ddd;
        "
      >

        <strong>
          Current Order Status
        </strong>

        <div
          style="
            font-size:22px;
            font-weight:800;
            margin-top:6px;
            color:#087443;
          "
        >
          ${icon} ${escapeHtml(status)}
        </div>

      </div>

    `;


  } catch(error) {

    console.error(error);

    statusBox.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:10px;
          background:#fff4f4;
        "
      >
        ⚠️ ${escapeHtml(error.message)}
      </div>

    `;

  }

}


/* =====================================================
   ORDER FORM
===================================================== */

const orderForm =
  document.getElementById("orderForm");


if (orderForm) {

  orderForm.onsubmit =
    async e => {

      e.preventDefault();


      if (!cart.length) {

        return alert(
          "Your cart is empty."
        );

      }


      const button =
        orderForm.querySelector(
          'button[type="submit"]'
        );


      const originalText =
        button
          ? button.textContent
          : "";


      const body =
        Object.fromEntries(
          new FormData(e.target)
        );


      body.items = cart.map(item => ({
        id: Number(item.id),
        qty: Number(item.qty)
      }));


      try {

        if (button) {

          button.disabled = true;

          button.textContent =
            "⏳ Placing Order...";

        }


        const x =
          await api(
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


        /*
          Save order ID so customer can
          find it later on this browser.
        */

        localStorage.setItem(
          "lastOrderId",
          String(x.order_id)
        );


        /*
          Clear cart.
        */

        cart = [];

        save();


        /*
          Hide the normal checkout form.
        */

        Array.from(
          e.target.elements
        ).forEach(el => {

          el.disabled = true;

        });


        /*
          Hide submit button.
        */

        if (button) {

          button.style.display =
            "none";

        }


        /*
          Show success + live status.
        */

        showOrderSuccess(
          x.order_id,
          x.money,
          body.phone
        );


        /*
          Reload products so stock updates.
        */

        await load();


      } catch(error) {

        console.error(error);

        alert(
          "❌ " +
          (
            error.message ||
            "Could not place order."
          )
        );


        if (button) {

          button.disabled = false;

          button.textContent =
            originalText ||
            "✅ Confirm Order";

        }

      }

    };

}


/* =====================================================
   START
===================================================== */

load();
