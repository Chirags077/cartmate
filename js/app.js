let menu = [];
let orders = [];

let cart = {};

let paymentMethod = "Cash";


document.addEventListener(
  "DOMContentLoaded",
  () => {

    menu = Storage.getMenu();

    orders = Storage.getOrders();

    setupNavigation();

    setupCustomerInput();

    setupPayment();

    setupMenu();

    renderFoodItems();

    renderEarnings();

  }
);


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {

  const tabs =
    document.querySelectorAll(".tab");

  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        tabs.forEach(t =>
          t.classList.remove("active")
        );

        tab.classList.add("active");

        const view =
          tab.dataset.view;

        showView(view);

      }
    );

  });

}


function showView(view) {

  document
    .querySelectorAll(".view")
    .forEach(section => {

      section.classList.remove("active");

    });


  if (view === "order") {

    document
      .getElementById("orderView")
      .classList.add("active");

  }


  if (view === "earnings") {

    document
      .getElementById("earningsView")
      .classList.add("active");

    renderEarnings();

  }


  if (view === "menu") {

    document
      .getElementById("menuView")
      .classList.add("active");

    renderMenu();

  }

}


/* =========================
   CUSTOMER
========================= */

function setupCustomerInput() {

  document
    .getElementById("clearCustomer")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("customerName")
          .value = "";

      }
    );

}


/* =========================
   FOOD ITEMS
========================= */

function renderFoodItems() {

  const container =
    document.getElementById("foodList");

  container.innerHTML = "";


  menu.forEach(item => {

    const quantity =
      cart[item.id] || 0;


    const row =
      document.createElement("div");

    row.className =
      "food-item";


    row.innerHTML = `

      <div class="food-info">

        <span class="food-name">
          ${item.name}
        </span>

        <span class="price">
          ₹${item.price} each
        </span>

      </div>


      <div class="quantity">

        <button
          class="qty-btn"
          onclick="changeQuantity(${item.id}, -1)"
        >
          −
        </button>


        <span class="qty">
          ${quantity}
        </span>


        <button
          class="qty-btn"
          onclick="changeQuantity(${item.id}, 1)"
        >
          +
        </button>

      </div>

    `;


    container.appendChild(row);

  });


  updateTotal();

}


/* =========================
   QUANTITY
========================= */

function changeQuantity(id, amount) {

  if (!cart[id]) {
    cart[id] = 0;
  }


  cart[id] += amount;


  if (cart[id] < 0) {
    cart[id] = 0;
  }


  renderFoodItems();

}


/* =========================
   TOTAL
========================= */

function calculateTotal() {

  let total = 0;


  menu.forEach(item => {

    const quantity =
      cart[item.id] || 0;


    total +=
      item.price * quantity;

  });


  return total;

}


function updateTotal() {

  const total =
    calculateTotal();


  document
    .getElementById("totalAmount")
    .textContent =
    `₹${total}`;

}


/* =========================
   PAYMENT
========================= */

function setupPayment() {

  const buttons =
    document.querySelectorAll(
      ".payment-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(b =>
          b.classList.remove("active")
        );


        button.classList.add("active");


        paymentMethod =
          button.dataset.payment;

      }
    );

  });


  document
    .getElementById("completeOrder")
    .addEventListener(
      "click",
      completeOrder
    );

}


/* =========================
   COMPLETE ORDER
========================= */

function completeOrder() {

  const total =
    calculateTotal();


  if (total === 0) {

    showMessage(
      "Please add at least one item."
    );

    return;

  }


  const customer =
    document
      .getElementById("customerName")
      .value.trim();


  const items = menu
    .filter(item =>
      (cart[item.id] || 0) > 0
    )
    .map(item => ({

      name: item.name,

      price: item.price,

      quantity: cart[item.id]

    }));


  const order = {

    id: Date.now(),

    customer:
      customer || "Walk-in Customer",

    items,

    total,

    payment:
      paymentMethod,

    date:
      new Date().toISOString()

  };


  orders.unshift(order);


  Storage.saveOrders(orders);


  cart = {};


  document
    .getElementById("customerName")
    .value = "";


  renderFoodItems();

  renderEarnings();


  showMessage(
    "✓ Order completed successfully"
  );

}


/* =========================
   EARNINGS
========================= */

function renderEarnings() {

  const today =
    new Date().toDateString();


  const todayOrders =
    orders.filter(order => {

      return new Date(
        order.date
      ).toDateString() === today;

    });


  const earnings =
    todayOrders.reduce(
      (sum, order) =>
        sum + order.total,
      0
    );


  document
    .getElementById("todayEarnings")
    .textContent =
    `₹${earnings}`;


  document
    .getElementById("todayOrders")
    .textContent =
    todayOrders.length;


  const list =
    document.getElementById(
      "ordersList"
    );


  list.innerHTML = "";


  if (todayOrders.length === 0) {

    list.innerHTML = `
      <p style="color:#94a3b8">
        No orders yet today.
      </p>
    `;

    return;

  }


  todayOrders.forEach(order => {

    const row =
      document.createElement("div");

    row.className =
      "order-row";


    const items =
      order.items
        .map(item =>
          `${item.name} × ${item.quantity}`
        )
        .join(", ");


    row.innerHTML = `

      <div class="order-row-top">

        <span>
          ${order.customer}
        </span>

        <span>
          ₹${order.total}
        </span>

      </div>


      <div class="order-items">

        ${items}
        · ${order.payment}

      </div>

    `;


    list.appendChild(row);

  });

}


/* =========================
   MENU
========================= */

function setupMenu() {

  document
    .getElementById("addItem")
    .addEventListener(
      "click",
      addMenuItem
    );

}


function renderMenu() {

  const container =
    document.getElementById(
      "menuList"
    );


  container.innerHTML = "";


  menu.forEach(item => {

    const row =
      document.createElement("div");

    row.className =
      "menu-row";


    row.innerHTML = `

      <div>

        <strong>
          ${item.name}
        </strong>

        <div style="color:#ffc229;margin-top:4px">
          ₹${item.price}
        </div>

      </div>


      <button
        class="menu-delete"
        onclick="deleteMenuItem(${item.id})"
      >
        Delete
      </button>

    `;


    container.appendChild(row);

  });

}


function addMenuItem() {

  const name =
    document
      .getElementById("itemName")
      .value.trim();


  const price =
    Number(
      document
        .getElementById("itemPrice")
        .value
    );


  if (!name || !price || price < 0) {

    showMessage(
      "Enter a food name and price."
    );

    return;

  }


  const newItem = {

    id: Date.now(),

    name,

    price

  };


  menu.push(newItem);


  Storage.saveMenu(menu);


  document
    .getElementById("itemName")
    .value = "";


  document
    .getElementById("itemPrice")
    .value = "";


  renderMenu();

  renderFoodItems();


  showMessage(
    "Item added to menu."
  );

}


function deleteMenuItem(id) {

  menu =
    menu.filter(
      item => item.id !== id
    );


  delete cart[id];


  Storage.saveMenu(menu);


  renderMenu();

  renderFoodItems();

}


/* =========================
   MESSAGE
========================= */

function showMessage(text) {

  const message =
    document.getElementById(
      "message"
    );


  message.textContent = text;

  message.classList.add("show");


  setTimeout(
    () => {
      message.classList.remove("show");
    },
    1800
  );

}