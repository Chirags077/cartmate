let orderQty = {};

let currentReceiptOrder = null;


/* =========================================
   FORMAT MONEY
   ========================================= */

function fmt(amount) {

    return (
        CURRENCY +
        Number(amount || 0)
            .toLocaleString(
                "en-IN",
                {
                    maximumFractionDigits: 2
                }
            )
    );

}


/* =========================================
   RESET ORDER
   ========================================= */

function resetOrder() {

    orderQty = {};

    const customer =
        document.getElementById(
            "customerName"
        );


    if (customer) {

        customer.value = "";

    }


    currentReceiptOrder =
        null;

}


/* =========================================
   RENDER ORDER
   ========================================= */

function renderOrder() {

    const empty =
        document.getElementById(
            "order-empty"
        );

    const content =
        document.getElementById(
            "order-content"
        );


    if (!menu.length) {

        empty.style.display =
            "block";

        content.style.display =
            "none";

        return;

    }


    empty.style.display =
        "none";

    content.style.display =
        "block";


    const container =
        document.getElementById(
            "order-items"
        );


    container.innerHTML = "";


    menu.forEach(item => {

        const quantity =
            orderQty[item.id] || 0;


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "order-row";


        row.innerHTML = `

            <div class="item-name">

                ${escapeHtml(item.name)}

                <span class="item-price">
                    ${fmt(item.price)} each
                </span>

            </div>


            <div class="qty-control">

                <button
                    class="qty-btn"
                    type="button"
                    data-action="minus"
                    data-id="${item.id}"
                >
                    −
                </button>


                <span class="qty-val">
                    ${quantity}
                </span>


                <button
                    class="qty-btn"
                    type="button"
                    data-action="plus"
                    data-id="${item.id}"
                >
                    +
                </button>

            </div>


            <div class="line-total">

                ${
                    quantity > 0
                        ? fmt(
                            quantity *
                            item.price
                        )
                        : ""
                }

            </div>

        `;


        row
            .querySelector(
                '[data-action="minus"]'
            )
            .addEventListener(
                "click",
                () =>
                    changeQuantity(
                        item.id,
                        -1
                    )
            );


        row
            .querySelector(
                '[data-action="plus"]'
            )
            .addEventListener(
                "click",
                () =>
                    changeQuantity(
                        item.id,
                        1
                    )
            );


        container.appendChild(row);

    });


    updateTotal();

}


/* =========================================
   CHANGE QUANTITY
   ========================================= */

function changeQuantity(
    id,
    change
) {

    const current =
        orderQty[id] || 0;


    orderQty[id] =
        Math.max(
            0,
            current + change
        );


    renderOrder();

}


/* =========================================
   CURRENT LINES
   ========================================= */

function currentOrderLines() {

    return menu

        .map(item => ({

            item,

            qty:
                orderQty[item.id] ||
                0

        }))

        .filter(
            line =>
                line.qty > 0
        );

}


/* =========================================
   TOTAL
   ========================================= */

function getCurrentOrderTotal() {

    return currentOrderLines()
        .reduce(
            (
                total,
                line
            ) =>
                total +
                line.qty *
                line.item.price,
            0
        );

}


/* =========================================
   UPDATE TOTAL
   ========================================= */

function updateTotal() {

    const total =
        getCurrentOrderTotal();


    const totalElement =
        document.getElementById(
            "orderTotal"
        );


    const completeButton =
        document.getElementById(
            "completeOrderBtn"
        );


    totalElement.textContent =
        fmt(total);


    completeButton.disabled =
        currentOrderLines()
            .length === 0;

}


/* =========================================
   COMPLETE ORDER
   ========================================= */

async function completeOrder() {

    const lines =
        currentOrderLines();


    if (!lines.length) {

        return;

    }


    const customerInput =
        document.getElementById(
            "customerName"
        );


    const customerName =
        customerInput.value.trim() ||
        "Walk-in customer";


    const total =
        getCurrentOrderTotal();


    const order = {

        id: uid(),

        customerName,

        items:
            lines.map(
                line => ({

                    name:
                        line.item.name,

                    price:
                        line.item.price,

                    qty:
                        line.qty

                })
            ),

        total,

        timestamp:
            Date.now(),

        paidAmount:
            0,

        /*
         * NEW:
         * When true, this order is hidden
         * from the "Recent Orders" list
         * under New Order, but it still
         * counts toward Earnings totals
         * and still appears in the
         * Earnings breakdown.
         */

        hiddenFromRecent:
            false

    };


    orders.unshift(order);


    /*
     * Keep a reasonable number
     * of old orders.
     */

    orders =
        orders.slice(
            0,
            100
        );


    await saveOrders();


    currentReceiptOrder =
        order;


    showReceipt(order);

    if (typeof playOrderSound === "function") {
        playOrderSound();
    }


    renderHistory();

    renderEarnings();

}


/* =========================================
   SHOW RECEIPT
   ========================================= */

function showReceipt(order) {

    const orderContent =
        document.getElementById(
            "order-content"
        );

    const receipt =
        document.getElementById(
            "receipt-view"
        );


    orderContent.style.display =
        "none";


    receipt.style.display =
        "block";


    document.getElementById(
        "receiptName"
    ).textContent =
        order.customerName;


    document.getElementById(
        "receiptWhen"
    ).textContent =
        formatDateTime(
            order.timestamp
        );


    const lines =
        document.getElementById(
            "receiptLines"
        );


    lines.innerHTML = "";


    order.items.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "receipt-line";


            row.innerHTML = `

                <span>
                    ${escapeHtml(item.name)}
                    × ${item.qty}
                </span>

                <strong>
                    ${fmt(
                        item.price *
                        item.qty
                    )}
                </strong>

            `;


            lines.appendChild(row);

        }
    );


    document.getElementById(
        "receiptTotal"
    ).textContent =
        fmt(order.total);


    generateOrderQR(order);

    if (typeof applyReceiptPreferences === "function") {
        applyReceiptPreferences(order);
    }

}


/* =========================================
   START NEW ORDER
   ========================================= */

function startNewOrder() {

    resetOrder();

    const phoneInput =
        document.getElementById(
            "whatsappPhone"
        );

    if (phoneInput) {
        phoneInput.value = "";
    }

    document.getElementById(
        "receipt-view"
    ).style.display =
        "none";


    document.getElementById(
        "order-content"
    ).style.display =
        menu.length
            ? "block"
            : "none";


    renderOrder();


    const customer =
        document.getElementById(
            "customerName"
        );


    if (customer) {

        customer.focus();

    }

}


/* =========================================
   DATE
   ========================================= */

function formatDateTime(
    timestamp
) {

    return new Date(
        timestamp
    ).toLocaleString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function isSameDay(
    timestamp,
    referenceDate
) {

    const date =
        new Date(timestamp);


    return (

        date.getFullYear() ===
            referenceDate.getFullYear()

        &&

        date.getMonth() ===
            referenceDate.getMonth()

        &&

        date.getDate() ===
            referenceDate.getDate()

    );

}


/* =========================================
   RENDER TODAY'S HISTORY
   ========================================= */

function renderHistory() {

    const section =
        document.getElementById(
            "history-section"
        );

    const list =
        document.getElementById(
            "history-list"
        );


    if (!section || !list) {

        return;

    }


    /*
     * IMPORTANT:
     * Only today's orders are shown
     * under New Order, and only the
     * ones that haven't been cleared
     * (hiddenFromRecent). Cleared
     * orders stay in the "orders"
     * array so Earnings still counts
     * them.
     */

    const todayOrders =
        orders.filter(
            order =>
                isSameDay(
                    order.timestamp,
                    new Date()
                ) &&
                !order.hiddenFromRecent
        );


    if (!todayOrders.length) {

        section.style.display =
            "none";

        return;

    }


    section.style.display =
        "block";


    list.innerHTML = "";


    todayOrders.forEach(
        order => {

            const details =
                document.createElement(
                    "details"
                );


            details.className =
                "history-item";


            const paid =
                Number(
                    order.paidAmount ||
                    0
                );


            const due =
                Math.max(
                    0,
                    order.total -
                    paid
                );


            details.innerHTML = `

                <summary>

                    <div>

                        <span class="who">
                            ${escapeHtml(
                                order.customerName
                            )}
                        </span>

                        <span class="when">
                            ${formatDateTime(
                                order.timestamp
                            )}
                        </span>

                    </div>


                    <div class="amt-row">

                        <!-- NEW: tick box to quickly
                             mark the order paid/unpaid
                             without opening the panel -->

                        <input
                            type="checkbox"
                            class="paid-check"
                            id="paid-check-${order.id}"
                            data-action="toggle-paid"
                            ${
                                due === 0
                                    ? "checked"
                                    : ""
                            }
                            title="${
                                due === 0
                                    ? "Mark as unpaid"
                                    : "Mark as fully paid"
                            }"
                        >


                        <span
                            class="due-badge ${
                                due === 0
                                    ? "is-paid"
                                    : "is-due"
                            }"
                        >

                            ${
                                due === 0
                                    ? "Paid"
                                    : "Due " +
                                      fmt(due)
                            }

                        </span>


                        <strong>
                            ${fmt(
                                order.total
                            )}
                        </strong>

                    </div>

                </summary>


                <!-- ITEMS -->

                <div class="order-items">

                    ${order.items
                        .map(
                            item => `

                                <div>

                                    <span>
                                        ${escapeHtml(
                                            item.name
                                        )}
                                        × ${item.qty}
                                    </span>

                                    <span>
                                        ${fmt(
                                            item.price *
                                            item.qty
                                        )}
                                    </span>

                                </div>

                            `
                        )
                        .join("")}

                </div>


                <!-- PAYMENT -->

                <div class="payment-panel">

                    <p class="payment-status">

                        Paid:
                        <strong>
                            ${fmt(paid)}
                        </strong>

                        /

                        <strong>
                            ${fmt(order.total)}
                        </strong>

                    </p>


                    ${
                        due > 0 && upiId
                            ? `

                                <div
                                    class="mini-qr-wrap"
                                >

                                    <div
                                        class="mini-qr"
                                        id="mini-qr-${order.id}"
                                    ></div>

                                    <span
                                        class="mini-qr-caption"
                                    >
                                        Scan to pay
                                        ${fmt(due)}
                                    </span>

                                </div>

                            `
                            : ""
                    }


                    ${
                        due > 0
                            ? `

                                <div
                                    class="payment-form"
                                >

                                    <input
                                        type="number"
                                        id="pay-${order.id}"
                                        min="0"
                                        step="0.01"
                                        placeholder="Amount"
                                    >

                                    <button
                                        type="button"
                                        data-action="record"
                                    >
                                        Record
                                    </button>

                                    <button
                                        type="button"
                                        class="mark-full"
                                        data-action="paid"
                                    >
                                        Mark Paid
                                    </button>

                                </div>

                            `
                            : ""
                    }


                    <button
                        class="delete-order-btn"
                        type="button"
                        data-action="delete"
                    >
                        Delete Order
                    </button>

                </div>

            `;


            list.appendChild(details);


            /*
             * Balance QR
             */

            if (
                due > 0 &&
                upiId
            ) {

                const qr =
                    document.getElementById(
                        `mini-qr-${order.id}`
                    );


                if (qr) {

                    generateBalanceQR(
                        qr,
                        order,
                        due
                    );

                }

            }


            /*
             * NEW: Paid tick-box
             *
             * Stop the click from bubbling to
             * <summary>, which would otherwise
             * expand/collapse the order.
             */

            const paidCheck =
                details.querySelector(
                    '[data-action="toggle-paid"]'
                );


            if (paidCheck) {

                paidCheck.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                    }
                );


                paidCheck.addEventListener(
                    "change",
                    async event => {

                        event.stopPropagation();


                        if (event.target.checked) {

                            order.paidAmount =
                                order.total;

                        } else {

                            order.paidAmount = 0;

                        }


                        await saveOrders();


                        renderHistory();

                        renderEarnings();

                    }
                );

            }


            /*
             * Record Payment
             */

            const recordButton =
                details.querySelector(
                    '[data-action="record"]'
                );


            if (recordButton) {

                recordButton.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();


                        const input =
                            document.getElementById(
                                `pay-${order.id}`
                            );


                        const amount =
                            Number(
                                input.value
                            );


                        if (
                            !Number.isFinite(
                                amount
                            ) ||
                            amount <= 0
                        ) {

                            alert(
                                "Enter a valid payment amount."
                            );

                            return;

                        }


                        order.paidAmount =
                            Math.min(
                                order.total,

                                Number(
                                    order.paidAmount ||
                                    0
                                ) +
                                amount
                            );


                        await saveOrders();


                        renderHistory();

                        renderEarnings();

                    }
                );

            }


            /*
             * Mark Paid
             */

            const paidButton =
                details.querySelector(
                    '[data-action="paid"]'
                );


            if (paidButton) {

                paidButton.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();


                        order.paidAmount =
                            order.total;


                        await saveOrders();


                        renderHistory();

                        renderEarnings();

                    }
                );

            }


            /*
             * Delete
             *
             * This is a permanent delete —
             * it removes the order entirely,
             * including from Earnings. Use
             * this to correct a mistaken
             * order, not to just "clear"
             * a finished one.
             */

            const deleteButton =
                details.querySelector(
                    '[data-action="delete"]'
                );


            deleteButton.addEventListener(
                "click",
                async event => {

                    event.preventDefault();


                    const confirmed =
                        await showConfirmModal(
                            "Delete this order? This cannot be undone and it will also be removed from Earnings.",
                            {
                                confirmText: "Delete",
                                danger: true
                            }
                        );


                    if (!confirmed) {

                        return;

                    }


                    orders =
                        orders.filter(
                            item =>
                                item.id !==
                                order.id
                        );


                    await saveOrders();


                    renderHistory();

                    renderEarnings();

                }
            );

        }
    );

}


/* =========================================
   CLEAR TODAY'S ORDERS
   ========================================= */

async function clearTodayOrders() {

    /*
     * IMPORTANT:
     * "Clear" here means: hide these
     * orders from the Recent Orders
     * list only. They are NOT deleted
     * and still count fully toward
     * Earnings (Today/Week/Month/Year
     * totals and the Earnings
     * breakdown list).
     */

    const todayOrders =
        orders.filter(
            order =>
                isSameDay(
                    order.timestamp,
                    new Date()
                ) &&
                !order.hiddenFromRecent
        );


    if (!todayOrders.length) {

        return;

    }


    const confirmed =
        await showConfirmModal(
            `Clear ${todayOrders.length} order${
                todayOrders.length === 1
                    ? ""
                    : "s"
            } from Recent Orders?\n\nThey'll still be counted in your Earnings.`,
            {
                confirmText: "Clear"
            }
        );


    if (!confirmed) {

        return;

    }


    todayOrders.forEach(
        order => {

            order.hiddenFromRecent =
                true;

        }
    );


    await saveOrders();


    renderHistory();

    renderEarnings();

}


/* =========================================
   CUSTOMER INPUT
   ========================================= */

function setupCustomerInput() {

    const clearButton =
        document.getElementById(
            "clearCustomerBtn"
        );


    const customerInput =
        document.getElementById(
            "customerName"
        );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                customerInput.value =
                    "";

                customerInput.focus();

            }
        );

    }

}


/* =========================================
   ORDER BUTTONS
   ========================================= */

function setupOrderButtons() {

    const completeButton =
        document.getElementById(
            "completeOrderBtn"
        );


    const newOrderButton =
        document.getElementById(
            "newOrderBtn"
        );


    const clearTodayButton =
        document.getElementById(
            "clearTodayOrdersBtn"
        );


    if (completeButton) {

        completeButton.addEventListener(
            "click",
            completeOrder
        );

    }


    if (newOrderButton) {

        newOrderButton.addEventListener(
            "click",
            startNewOrder
        );

    }


    if (clearTodayButton) {

        clearTodayButton.addEventListener(
            "click",
            clearTodayOrders
        );

    }


    const shareWhatsAppButton =
        document.getElementById(
            "shareWhatsAppBtn"
        );

    if (shareWhatsAppButton) {

        shareWhatsAppButton.addEventListener(
            "click",
            () => {

                if (currentReceiptOrder) {
                    shareReceiptOnWhatsApp(
                        currentReceiptOrder
                    );
                }

            }
        );

    }

    const printSlipButton =
        document.getElementById(
            "printSlipBtn"
        );

    if (printSlipButton) {
        printSlipButton.addEventListener(
            "click",
            () => {
                printReceipt();
            }
        );
    }

    const tabUpiBtn =
        document.getElementById(
            "tabUpiQrBtn"
        );

    const tabEBillBtn =
        document.getElementById(
            "tabEBillQrBtn"
        );

    if (tabUpiBtn) {
        tabUpiBtn.addEventListener("click", () => {
            showReceiptQrTab("upi");
        });
    }

    if (tabEBillBtn) {
        tabEBillBtn.addEventListener("click", () => {
            showReceiptQrTab("ebill");
        });
    }

}


/* =========================================
   PRINT RECEIPT (58mm / 80mm THERMAL SLIP)
   ========================================= */

function printReceipt() {
    window.print();
}


/* =========================================
   APPLY RECEIPT PREFERENCES
   ========================================= */

function applyReceiptPreferences(order) {
    if (!order) return;

    const printBtn = document.getElementById("printSlipBtn");
    const waBlock = document.getElementById("whatsapp-share-block");
    const ebillBlock = document.getElementById("ebill-qr-block");
    const upiBlock = document.getElementById("qr-block");
    const qrTabs = document.getElementById("receiptQrTabs");

    const prefs = (typeof billingPrefs !== "undefined")
        ? billingPrefs
        : { scanBill: true, printSlip: true, whatsapp: true };

    // 1. Thermal Print button
    if (printBtn) {
        printBtn.style.display = prefs.printSlip ? "flex" : "none";
    }

    // 2. WhatsApp block
    if (waBlock) {
        waBlock.style.display = prefs.whatsapp ? "block" : "none";
    }

    // 3. QR logic
    const hasUpi = !!upiId;
    const hasEbill = !!prefs.scanBill;

    if (hasUpi && hasEbill) {
        if (qrTabs) qrTabs.style.display = "flex";
        showReceiptQrTab("upi");
    } else if (hasUpi) {
        if (qrTabs) qrTabs.style.display = "none";
        if (upiBlock) upiBlock.style.display = "block";
        if (ebillBlock) ebillBlock.style.display = "none";
    } else if (hasEbill) {
        if (qrTabs) qrTabs.style.display = "none";
        if (upiBlock) upiBlock.style.display = "none";
        if (ebillBlock) ebillBlock.style.display = "block";
    } else {
        if (qrTabs) qrTabs.style.display = "none";
        if (upiBlock) upiBlock.style.display = "none";
        if (ebillBlock) ebillBlock.style.display = "none";
    }

    if (hasEbill) {
        generateEBillQR(order);
    }
}


function showReceiptQrTab(tab) {
    const upiBlock = document.getElementById("qr-block");
    const ebillBlock = document.getElementById("ebill-qr-block");
    const upiBtn = document.getElementById("tabUpiQrBtn");
    const ebillBtn = document.getElementById("tabEBillQrBtn");

    if (tab === "upi") {
        if (upiBlock) upiBlock.style.display = "block";
        if (ebillBlock) ebillBlock.style.display = "none";
        if (upiBtn) upiBtn.classList.add("active");
        if (ebillBtn) ebillBtn.classList.remove("active");
    } else {
        if (upiBlock) upiBlock.style.display = "none";
        if (ebillBlock) ebillBlock.style.display = "block";
        if (upiBtn) upiBtn.classList.remove("active");
        if (ebillBtn) ebillBtn.classList.add("active");
    }
}


/* =========================================
   GENERATE CUSTOMER SCAN E-BILL QR
   ========================================= */

function generateEBillQR(order) {
    const qrContainer = document.getElementById("ebillQrcode");
    if (!qrContainer || typeof QRCode === "undefined") return;

    qrContainer.innerHTML = "";

    const itemsSummary = order.items
        .map(i => `• ${i.name} x${i.qty} = ${fmt(i.price * i.qty)}`)
        .join("\n");

    const paid = Number(order.paidAmount || 0);
    const due = Math.max(0, order.total - paid);
    const status = due === 0 ? "PAID" : `DUE: ${fmt(due)}`;

    const text =
`🧾 ${shopName || "CARTMATE"}
Date: ${formatDateTime(order.timestamp)}
Customer: ${order.customerName || "Customer"}
------------------------
${itemsSummary}
------------------------
TOTAL: ${fmt(order.total)} (${status})
${upiId ? `UPI: ${upiId}\n` : ""}
Thank you for your visit! 🙏
✨ Billed with CartMate`;

    try {
        new QRCode(qrContainer, {
            text: text,
            width: 170,
            height: 170,
            colorDark: "#0f172a",
            colorLight: "#ffffff"
        });
    } catch (err) {
        console.warn("E-Bill QR error:", err);
    }
}


/* =========================================
   SHARE RECEIPT ON WHATSAPP
   ========================================= */

function shareReceiptOnWhatsApp(order) {

    if (!order) return;

    const phoneInput =
        document.getElementById("whatsappPhone");
    const phone =
        phoneInput ? phoneInput.value.replace(/\D/g, "") : "";

    const itemsText = order.items
        .map(
            item =>
                `• ${item.name} × ${item.qty} = ${fmt(item.price * item.qty)}`
        )
        .join("\n");

    const paid =
        Number(order.paidAmount || 0);

    const due =
        Math.max(0, order.total - paid);

    const paymentStatus =
        due === 0
            ? "✅ Paid"
            : `⚠️ Due: ${fmt(due)}`;

    const message =
`🧾 *${shopName || "CARTMATE"}*
-----------------------------
Customer: *${order.customerName || "Customer"}*
Time: ${formatDateTime(order.timestamp)}
-----------------------------
${itemsText}
-----------------------------
*Total: ${fmt(order.total)}*
Status: ${paymentStatus}${upiId ? `\n💳 Pay via UPI: ${upiId}` : ""}

Thank you for your visit! 🙏
✨ _Billed with CartMate_`;

    let waUrl;
    if (phone && phone.length === 10) {
        waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    } else {
        waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, "_blank");

}
