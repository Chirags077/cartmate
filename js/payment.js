// ========================================
// CARTMATE - PAYMENT & UPI MODULE
// Handles UPI QR generation, E-Bill QR,
// and WhatsApp bill sharing.
// ========================================


// ----------------------------------------
// UPI URL BUILDER
// ----------------------------------------

function createUpiUrl(amount, customerName, notePrefix = "Order for") {
    if (!upiId) return "";
    return "upi://pay?pa=" + encodeURIComponent(upiId) +
        "&pn=" + encodeURIComponent(shopName) +
        "&am=" + encodeURIComponent(Number(amount).toFixed(2)) +
        "&cu=INR&tn=" + encodeURIComponent(`${notePrefix} ${customerName}`);
}


// ----------------------------------------
// GENERATE UPI PAYMENT QR (on receipt)
// ----------------------------------------

function generateOrderQR(order) {
    const qrBlock    = document.getElementById("qr-block");
    const qrContainer = document.getElementById("qrcode");
    const missing    = document.getElementById("qr-missing-hint");
    if (!qrBlock || !qrContainer) return;

    qrContainer.innerHTML = "";

    if (!upiId || typeof QRCode === "undefined") {
        qrBlock.style.display = "none";
        if (missing) missing.style.display = "block";
        return;
    }

    try {
        new QRCode(qrContainer, {
            text: createUpiUrl(order.total, order.customerName, "Order for"),
            width: 170, height: 170, colorDark: "#0f172a", colorLight: "#ffffff"
        });
        qrBlock.style.display = "block";
        if (missing) missing.style.display = "none";
    } catch (error) {
        console.error("QR error:", error);
        qrBlock.style.display = "none";
    }
}


// ----------------------------------------
// GENERATE BALANCE QR (in history panel)
// ----------------------------------------

function generateBalanceQR(container, order, dueAmount) {
    if (!container || !upiId || typeof QRCode === "undefined") return;
    container.innerHTML = "";
    try {
        new QRCode(container, {
            text: createUpiUrl(dueAmount, order.customerName, "Balance for"),
            width: 80, height: 80, colorDark: "#0f172a", colorLight: "#ffffff"
        });
    } catch (error) {
        console.error("Balance QR error:", error);
    }
}


// ----------------------------------------
// GENERATE E-BILL QR (customer scan)
// ----------------------------------------

function generateEBillQR(order) {
    const qrContainer = document.getElementById("ebillQrcode");
    if (!qrContainer || typeof QRCode === "undefined") return;

    qrContainer.innerHTML = "";

    const itemsSummary = order.items
        .map(i => `• ${i.name} x${i.qty} = ${fmt(i.price * i.qty)}`)
        .join("\n");

    const paid   = Number(order.paidAmount || 0);
    const due    = Math.max(0, order.total - paid);
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
            width: 170, height: 170,
            colorDark: "#0f172a", colorLight: "#ffffff"
        });
    } catch (err) {
        console.warn("E-Bill QR error:", err);
    }
}


// ----------------------------------------
// APPLY RECEIPT PREFERENCES
// Controls visibility of QR blocks,
// print button, and WhatsApp block.
// ----------------------------------------

function applyReceiptPreferences(order) {
    if (!order) return;

    const printBtn   = document.getElementById("printSlipBtn");
    const waBlock    = document.getElementById("whatsapp-share-block");
    const ebillBlock = document.getElementById("ebill-qr-block");
    const upiBlock   = document.getElementById("qr-block");
    const qrTabs     = document.getElementById("receiptQrTabs");
    const prefs      = billingPrefs;

    // 1. Thermal print button
    if (printBtn) printBtn.style.display = prefs.printSlip ? "flex" : "none";

    // 2. WhatsApp block
    if (waBlock) waBlock.style.display = prefs.whatsapp ? "block" : "none";

    // 3. QR logic
    const hasUpi   = !!upiId;
    const hasEbill = !!prefs.scanBill;

    if (hasUpi && hasEbill) {
        if (qrTabs) qrTabs.style.display = "flex";
        showReceiptQrTab("upi");
    } else if (hasUpi) {
        if (qrTabs)     qrTabs.style.display    = "none";
        if (upiBlock)   upiBlock.style.display   = "block";
        if (ebillBlock) ebillBlock.style.display = "none";
    } else if (hasEbill) {
        if (qrTabs)     qrTabs.style.display    = "none";
        if (upiBlock)   upiBlock.style.display   = "none";
        if (ebillBlock) ebillBlock.style.display = "block";
    } else {
        if (qrTabs)     qrTabs.style.display    = "none";
        if (upiBlock)   upiBlock.style.display   = "none";
        if (ebillBlock) ebillBlock.style.display = "none";
    }

    if (hasEbill) generateEBillQR(order);
}


// ----------------------------------------
// QR TAB SWITCHER (UPI ↔ E-Bill)
// ----------------------------------------

function showReceiptQrTab(tab) {
    const upiBlock   = document.getElementById("qr-block");
    const ebillBlock = document.getElementById("ebill-qr-block");
    const upiBtn     = document.getElementById("tabUpiQrBtn");
    const ebillBtn   = document.getElementById("tabEBillQrBtn");

    if (tab === "upi") {
        if (upiBlock)   upiBlock.style.display   = "block";
        if (ebillBlock) ebillBlock.style.display  = "none";
        if (upiBtn)     upiBtn.classList.add("active");
        if (ebillBtn)   ebillBtn.classList.remove("active");
    } else {
        if (upiBlock)   upiBlock.style.display   = "none";
        if (ebillBlock) ebillBlock.style.display  = "block";
        if (upiBtn)     upiBtn.classList.remove("active");
        if (ebillBtn)   ebillBtn.classList.add("active");
    }
}


// ----------------------------------------
// WHATSAPP SHARE
// ----------------------------------------

function shareReceiptOnWhatsApp(order) {
    if (!order) return;

    const phoneInput = document.getElementById("whatsappPhone");
    const phone      = phoneInput ? phoneInput.value.replace(/\D/g, "") : "";

    const itemsText     = order.items.map(item => `• ${item.name} × ${item.qty} = ${fmt(item.price * item.qty)}`).join("\n");
    const paid          = Number(order.paidAmount || 0);
    const due           = Math.max(0, order.total - paid);
    const paymentStatus = due === 0 ? "✅ Paid" : `⚠️ Due: ${fmt(due)}`;

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


// ----------------------------------------
// PRINT RECEIPT
// ----------------------------------------

function printReceipt() {
    window.print();
}


// ----------------------------------------
// SETUP UPI ID INPUT
// ----------------------------------------

function setupPaymentSettings() {
    const input = document.getElementById("upiId");
    if (!input) return;

    input.value = upiId;

    input.addEventListener("change", async () => {
        upiId       = input.value.trim();
        input.value = upiId;
        await saveUpiId();
        if (currentReceiptOrder) {
            generateOrderQR(currentReceiptOrder);
            applyReceiptPreferences(currentReceiptOrder);
        }
        renderHistory();
    });
}

function refreshPaymentSettings() {
    const input = document.getElementById("upiId");
    if (input) input.value = upiId;
}
