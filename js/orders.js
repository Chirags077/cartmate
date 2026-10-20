// ========================================
// CARTMATE - ORDERS MODULE
// Manages the active order pad, receipt
// display, and recent orders history.
// ========================================

let orderQty = {};
let currentReceiptOrder = null;


// ----------------------------------------
// UTILS
// ----------------------------------------

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#039;");
}

function fmt(amount) {
    return CURRENCY + Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
}

function isSameDay(timestamp, referenceDate) {
    const date = new Date(timestamp);
    return (
        date.getFullYear() === referenceDate.getFullYear() &&
        date.getMonth()    === referenceDate.getMonth()    &&
        date.getDate()     === referenceDate.getDate()
    );
}


// ----------------------------------------
// CONFIRM MODAL
// ----------------------------------------

function showConfirmModal(message, options = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        const safeMessage = typeof escapeHtml === "function" ? escapeHtml(message) : String(message);
        overlay.innerHTML = `
            <div class="confirm-box">
                <p class="confirm-message">${safeMessage}</p>
                <div class="confirm-actions">
                    <button type="button" class="confirm-cancel">${options.cancelText  || "Cancel"}</button>
                    <button type="button" class="confirm-ok ${options.danger ? "danger" : ""}">${options.confirmText || "Confirm"}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("show"));

        function cleanup(result) {
            overlay.classList.remove("show");
            setTimeout(() => overlay.remove(), 150);
            resolve(result);
        }

        overlay.querySelector(".confirm-cancel").addEventListener("click", () => cleanup(false));
        overlay.querySelector(".confirm-ok").addEventListener("click",     () => cleanup(true));
        overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(false); });

        function onKeyDown(event) {
            if (event.key === "Escape") {
                document.removeEventListener("keydown", onKeyDown);
                cleanup(false);
            }
        }
        document.addEventListener("keydown", onKeyDown);
    });
}


// ----------------------------------------
// ORDER PAD
// ----------------------------------------

function resetOrder() {
    orderQty = {};
    const customer = document.getElementById("customerName");
    if (customer) customer.value = "";
    currentReceiptOrder = null;
}

function renderOrder() {
    const empty   = document.getElementById("order-empty");
    const content = document.getElementById("order-content");

    if (!menu.length) {
        if (empty)   empty.style.display   = "block";
        if (content) content.style.display = "none";
        return;
    }

    if (empty)   empty.style.display   = "none";
    if (content) content.style.display = "block";

    const container = document.getElementById("order-items");
    if (!container) return;
    container.innerHTML = "";

    menu.forEach(item => {
        const quantity = orderQty[item.id] || 0;
        const row = document.createElement("div");
        row.className = "order-row";
        row.innerHTML = `
            <div class="item-name">
                ${escapeHtml(item.name)}
                <span class="item-price">${fmt(item.price)} each</span>
            </div>
            <div class="qty-control">
                <button class="qty-btn" type="button" data-action="minus" data-id="${item.id}">−</button>
                <span class="qty-val">${quantity}</span>
                <button class="qty-btn" type="button" data-action="plus"  data-id="${item.id}">+</button>
            </div>
            <div class="line-total">${quantity > 0 ? fmt(quantity * item.price) : ""}</div>
        `;
        row.querySelector('[data-action="minus"]').addEventListener("click", () => changeQuantity(item.id, -1));
        row.querySelector('[data-action="plus"]').addEventListener("click",  () => changeQuantity(item.id,  1));
        container.appendChild(row);
    });

    updateTotal();
}

function changeQuantity(id, change) {
    const current = orderQty[id] || 0;
    orderQty[id] = Math.max(0, current + change);
    renderOrder();
}

function currentOrderLines() {
    return menu
        .map(item => ({ item, qty: orderQty[item.id] || 0 }))
        .filter(line => line.qty > 0);
}

function getCurrentOrderTotal() {
    return currentOrderLines().reduce((total, line) => total + line.qty * line.item.price, 0);
}

function updateTotal() {
    const total          = getCurrentOrderTotal();
    const totalElement   = document.getElementById("orderTotal");
    const completeButton = document.getElementById("completeOrderBtn");
    if (totalElement)   totalElement.textContent   = fmt(total);
    if (completeButton) completeButton.disabled = currentOrderLines().length === 0;
}


// ----------------------------------------
// COMPLETE ORDER
// ----------------------------------------

async function completeOrder() {
    const lines = currentOrderLines();
    if (!lines.length) return;

    const customerInput = document.getElementById("customerName");
    const customerName  = (customerInput ? customerInput.value.trim() : "") || "Walk-in customer";
    const total         = getCurrentOrderTotal();

    const order = {
        id:               uid(),
        customerName,
        items:            lines.map(line => ({ name: line.item.name, price: line.item.price, qty: line.qty })),
        total,
        timestamp:        Date.now(),
        paidAmount:       0,
        hiddenFromRecent: false
    };

    orders.unshift(order);
    orders = orders.slice(0, 100);
    await saveOrders();

    currentReceiptOrder = order;
    showReceipt(order);
    playOrderSound();
    renderHistory();
    renderEarnings();
}


// ----------------------------------------
// RECEIPT
// ----------------------------------------

function showReceipt(order) {
    document.getElementById("order-content").style.display = "none";
    const receipt = document.getElementById("receipt-view");
    receipt.style.display = "block";

    document.getElementById("receiptName").textContent = order.customerName;
    document.getElementById("receiptWhen").textContent = formatDateTime(order.timestamp);

    const lines = document.getElementById("receiptLines");
    lines.innerHTML = "";

    order.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "receipt-line";
        row.innerHTML = `
            <span>${escapeHtml(item.name)} × ${item.qty}</span>
            <strong>${fmt(item.price * item.qty)}</strong>
        `;
        lines.appendChild(row);
    });

    document.getElementById("receiptTotal").textContent = fmt(order.total);
    generateOrderQR(order);
    applyReceiptPreferences(order);
}

function startNewOrder() {
    resetOrder();
    const phoneInput = document.getElementById("whatsappPhone");
    if (phoneInput) phoneInput.value = "";
    document.getElementById("receipt-view").style.display   = "none";
    document.getElementById("order-content").style.display  = menu.length ? "block" : "none";
    renderOrder();
    const customer = document.getElementById("customerName");
    if (customer) customer.focus();
}


// ----------------------------------------
// RECENT ORDERS (TODAY'S HISTORY)
// ----------------------------------------

function renderHistory() {
    const section = document.getElementById("history-section");
    const list    = document.getElementById("history-list");
    if (!section || !list) return;

    const todayOrders = orders.filter(order =>
        isSameDay(order.timestamp, new Date()) && !order.hiddenFromRecent
    );

    if (!todayOrders.length) { section.style.display = "none"; return; }
    section.style.display = "block";
    list.innerHTML = "";

    todayOrders.forEach(order => {
        const details = document.createElement("details");
        details.className = "history-item";

        const paid = Number(order.paidAmount || 0);
        const due  = Math.max(0, order.total - paid);

        details.innerHTML = `
            <summary>
                <div>
                    <span class="who">${escapeHtml(order.customerName)}</span>
                    <span class="when">${formatDateTime(order.timestamp)}</span>
                </div>
                <div class="amt-row">
                    <input type="checkbox" class="paid-check" id="paid-check-${order.id}"
                        data-action="toggle-paid" ${due === 0 ? "checked" : ""}
                        title="${due === 0 ? "Mark as unpaid" : "Mark as fully paid"}">
                    <span class="due-badge ${due === 0 ? "is-paid" : "is-due"}">${due === 0 ? "Paid" : "Due " + fmt(due)}</span>
                    <strong>${fmt(order.total)}</strong>
                </div>
            </summary>
            <div class="order-items">
                ${order.items.map(item => `<div><span>${escapeHtml(item.name)} × ${item.qty}</span><span>${fmt(item.price * item.qty)}</span></div>`).join("")}
            </div>
            <div class="payment-panel">
                <p class="payment-status">Paid: <strong>${fmt(paid)}</strong> / <strong>${fmt(order.total)}</strong></p>
                ${due > 0 && upiId ? `<div class="mini-qr-wrap"><div class="mini-qr" id="mini-qr-${order.id}"></div><span class="mini-qr-caption">Scan to pay ${fmt(due)}</span></div>` : ""}
                ${due > 0 ? `<div class="payment-form"><input type="number" id="pay-${order.id}" min="0" step="0.01" placeholder="Amount"><button type="button" data-action="record">Record</button><button type="button" class="mark-full" data-action="paid">Mark Paid</button></div>` : ""}
                <button class="delete-order-btn" type="button" data-action="delete">Delete Order</button>
            </div>
        `;
        list.appendChild(details);

        // Mini balance QR
        if (due > 0 && upiId) {
            const qr = document.getElementById(`mini-qr-${order.id}`);
            if (qr) generateBalanceQR(qr, order, due);
        }

        // Toggle paid checkbox
        const paidCheck = details.querySelector('[data-action="toggle-paid"]');
        if (paidCheck) {
            paidCheck.addEventListener("click", e => e.stopPropagation());
            paidCheck.addEventListener("change", async e => {
                e.stopPropagation();
                order.paidAmount = e.target.checked ? order.total : 0;
                await saveOrders();
                renderHistory();
                renderEarnings();
            });
        }

        // Record partial payment
        const recordButton = details.querySelector('[data-action="record"]');
        if (recordButton) {
            recordButton.addEventListener("click", async e => {
                e.preventDefault();
                const input  = document.getElementById(`pay-${order.id}`);
                const amount = Number(input.value);
                if (!Number.isFinite(amount) || amount <= 0) { alert("Enter a valid payment amount."); return; }
                order.paidAmount = Math.min(order.total, Number(order.paidAmount || 0) + amount);
                await saveOrders();
                renderHistory();
                renderEarnings();
            });
        }

        // Mark fully paid
        const paidButton = details.querySelector('[data-action="paid"]');
        if (paidButton) {
            paidButton.addEventListener("click", async e => {
                e.preventDefault();
                order.paidAmount = order.total;
                await saveOrders();
                renderHistory();
                renderEarnings();
            });
        }

        // Delete order
        const deleteButton = details.querySelector('[data-action="delete"]');
        if (deleteButton) {
            deleteButton.addEventListener("click", async e => {
                e.preventDefault();
                const confirmed = await showConfirmModal(
                    "Delete this order? This cannot be undone.",
                    { confirmText: "Delete", danger: true }
                );
                if (!confirmed) return;
                orders = orders.filter(item => item.id !== order.id);
                await saveOrders();
                renderHistory();
                renderEarnings();
            });
        }
    });
}


// ----------------------------------------
// CLEAR TODAY'S ORDERS
// ----------------------------------------

async function clearTodayOrders() {
    const todayOrders = orders.filter(order =>
        isSameDay(order.timestamp, new Date()) && !order.hiddenFromRecent
    );
    if (!todayOrders.length) return;
    const confirmed = await showConfirmModal(
        `Clear ${todayOrders.length} order(s) from Recent Orders?\n\nThey'll still be counted in your Earnings.`,
        { confirmText: "Clear" }
    );
    if (!confirmed) return;
    todayOrders.forEach(order => order.hiddenFromRecent = true);
    await saveOrders();
    renderHistory();
    renderEarnings();
}


// ----------------------------------------
// WIRE UP ORDER BUTTONS
// ----------------------------------------

function setupCustomerInput() {
    const clearButton   = document.getElementById("clearCustomerBtn");
    const customerInput = document.getElementById("customerName");
    if (clearButton && customerInput) {
        clearButton.addEventListener("click", () => {
            customerInput.value = "";
            customerInput.focus();
        });
    }
}

function setupOrderButtons() {
    const completeBtn   = document.getElementById("completeOrderBtn");
    const newOrderBtn   = document.getElementById("newOrderBtn");
    const clearTodayBtn = document.getElementById("clearTodayOrdersBtn");
    const shareWaBtn    = document.getElementById("shareWhatsAppBtn");
    const printSlipBtn  = document.getElementById("printSlipBtn");
    const tabUpiBtn     = document.getElementById("tabUpiQrBtn");
    const tabEBillBtn   = document.getElementById("tabEBillQrBtn");

    if (completeBtn)   completeBtn.addEventListener("click",   completeOrder);
    if (newOrderBtn)   newOrderBtn.addEventListener("click",   startNewOrder);
    if (clearTodayBtn) clearTodayBtn.addEventListener("click", clearTodayOrders);
    if (printSlipBtn)  printSlipBtn.addEventListener("click",  printReceipt);
    if (tabUpiBtn)     tabUpiBtn.addEventListener("click",     () => showReceiptQrTab("upi"));
    if (tabEBillBtn)   tabEBillBtn.addEventListener("click",   () => showReceiptQrTab("ebill"));

    if (shareWaBtn) {
        shareWaBtn.addEventListener("click", () => {
            if (currentReceiptOrder) shareReceiptOnWhatsApp(currentReceiptOrder);
        });
    }
}
