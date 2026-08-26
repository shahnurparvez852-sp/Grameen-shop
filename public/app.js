let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let cat = "All";

const money = n => "৳" + Number(n).toLocaleString("en-BD");

async function load() {
  products = await fetch("/api/products").then(r => r.json());
  render();
  update();
}

function render() {

  let q = (document.getElementById("search").value || "").toLowerCase();

  let a = products.filter(p =>
    (cat === "All" || p.category === cat) &&
    (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    )
  );

  let s = document.getElementById("sort").value;

  if (s === "low") {
    a.sort((x, y) => x.price - y.price);
  }

  if (s === "high") {
    a.sort((x, y) => y.price - x.price);
  }

  document.getElementById("cats").innerHTML =
    ["All", ...new Set(products.map(p => p.category))]
      .map(x =>
        `<button
          class="pill ${x === cat ? "active" : ""}"
          onclick="cat='${x}';render()"
        >${x}</button>`
      )
      .join("");


  document.getElementById("grid").innerHTML = a.map(p => `

    <article class="card">

      <div class="pic">

        ${
          p.icon && p.icon.startsWith("data:image")
            ? `<img
                src="${p.icon}"
                alt="${p.name}"
                style="width:100%;height:100%;object-fit:cover;"
              >`
            : `<span class="product-icon">${p.icon || "🛍️"}</span>`
        }

        <span>${p.stock} left</span>

      </div>

      <small>${p.category}</small>

      <h3>${p.name}</h3>

      <b>${money(p.price)}</b>

      <del>
        ${p.old_price ? money(p.old_price) : ""}
      </del>

      <button
        class="add"
        ${p.stock < 1 ? "disabled" : ""}
        onclick="add(${p.id})"
      >
        ${p.stock < 1 ? "Out of stock" : "Add to cart"}
      </button>

    </article>

  `).join("");
}


function add(id) {

  let x = cart.find(i => i.id === id);

  if (x) {
    x.qty++;
  } else {
    cart.push({
      id,
      qty: 1
    });
  }

  save();
  openCart();
}


function save() {

  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );

  update();
}


function update() {

  document.getElementById("count").textContent =
    cart.reduce((a, x) => a + x.qty, 0);

}


function openCart() {

  document
    .getElementById("cart")
    .classList.remove("hidden");

  drawCart();

}


function closeCart() {

  document
    .getElementById("cart")
    .classList.add("hidden");

}


function drawCart() {

  let t = 0;

  document.getElementById("cartItems").innerHTML =

    cart.map(i => {

      let p = products.find(x => x.id === i.id);

      if (!p) return "";

      t += p.price * i.qty;

      return `

        <div class="item">

          <span>
            ${
              p.icon && p.icon.startsWith("data:image")
                ? `<img
                    src="${p.icon}"
                    style="
                      width:50px;
                      height:50px;
                      object-fit:cover;
                      border-radius:8px;
                    "
                  >`
                : p.icon
            }
          </span>

          <div>

            <b>${p.name}</b>

            <br>

            ${money(p.price)} × ${i.qty}

            <br>

            <button onclick="qty(${p.id},-1)">
              −
            </button>

            ${i.qty}

            <button onclick="qty(${p.id},1)">
              +
            </button>

          </div>

        </div>

      `;

    }).join("")

    || "<p class='muted'>Your cart is empty.</p>";


  document.getElementById("total").textContent =
    money(t);

}


function qty(id, d) {

  let x = cart.find(i => i.id === id);

  if (!x) return;

  x.qty += d;

  if (x.qty < 1) {
    cart = cart.filter(i => i.id !== id);
  }

  save();
  drawCart();

}


function checkout() {

  if (!cart.length) {
    return alert("Your cart is empty.");
  }

  closeCart();

  document
    .getElementById("checkout")
    .classList.remove("hidden");

}


function closeCheckout() {

  document
    .getElementById("checkout")
    .classList.add("hidden");

}


document.getElementById("orderForm").onsubmit = async e => {

  e.preventDefault();

  let body =
    Object.fromEntries(
      new FormData(e.target)
    );

  body.items = cart;

  let r = await fetch(
    "/api/orders",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );

  let x = await r.json();

  if (!r.ok) {
    return alert(x.error);
  }

  alert(
    `Order #${x.order_id} confirmed! Total ${x.money}. We will contact you at ${body.phone}.`
  );

  cart = [];

  save();

  closeCheckout();

  load();

  e.target.reset();

};


load();
