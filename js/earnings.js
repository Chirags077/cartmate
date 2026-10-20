// ========================================
// CARTMATE - EARNINGS MODULE
// Calculates and displays sales stats,
// order breakdowns, and CSV export.
// ========================================

let selectedPeriod = "today";


// ----------------------------------------
// PERIOD FILTER
// ----------------------------------------

function getPeriodOrders(period) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today);
    week.setDate(week.getDate() - week.getDay());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const year  = new Date(now.getFullYear(), 0, 1);

    let start = today;
    if (period === "week")  start = week;
    if (period === "month") start = month;
    if (period === "year")  start = year;

    return orders.filter(order => order.timestamp >= start.getTime());
}

function calculatePeriodStats(period) {
    const periodOrders = getPeriodOrders(period);
    const amount    = periodOrders.reduce((total, order) => total + Number(order.total || 0), 0);
    const customers = periodOrders.length;
    const items     = periodOrders.reduce((total, order) =>
        total + order.items.reduce((count, item) => count + Number(item.qty || 0), 0), 0);
    return { amount, customers, items };
}


// ----------------------------------------
// RENDER EARNINGS CARDS
// ----------------------------------------

function renderEarnings() {
    ["today", "week", "month", "year"].forEach(period => {
        const stats     = calculatePeriodStats(period);
        const amount    = document.getElementById(`stat-${period}-amount`);
        const customers = document.getElementById(`stat-${period}-cust`);
        const items     = document.getElementById(`stat-${period}-items`);
        if (amount)    amount.textContent    = fmt(stats.amount);
        if (customers) customers.textContent = `${stats.customers} ${stats.customers === 1 ? "customer" : "customers"}`;
        if (items)     items.textContent     = `${stats.items} ${stats.items === 1 ? "item" : "items"} sold`;
    });
    renderEarningsBreakdown();
}


// ----------------------------------------
// RENDER EARNINGS BREAKDOWN LIST
// ----------------------------------------

function renderEarningsBreakdown() {
    const container = document.getElementById("earnings-list");
    const title     = document.getElementById("breakdown-title");
    if (!container) return;

    const titles = {
        today: "Today's Orders",
        week:  "This Week's Orders",
        month: "This Month's Orders",
        year:  "This Year's Orders"
    };

    if (title) title.textContent = titles[selectedPeriod] || "Orders";

    const periodOrders = getPeriodOrders(selectedPeriod);
    container.innerHTML = "";

    if (!periodOrders.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>No orders recorded for this period.</p></div>`;
        return;
    }

    periodOrders.forEach(order => {
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
                    <span class="due-badge ${due === 0 ? "is-paid" : "is-due"}">${due === 0 ? "Paid" : "Due " + fmt(due)}</span>
                    <strong>${fmt(order.total)}</strong>
                </div>
            </summary>
            <div class="order-items">
                ${order.items.map(item => `<div><span>${escapeHtml(item.name)} × ${item.qty}</span><span>${fmt(item.price * item.qty)}</span></div>`).join("")}
            </div>
            <div class="payment-panel">
                <button class="delete-order-btn" type="button" data-action="delete">Delete Order</button>
            </div>
        `;
        container.appendChild(details);

        details.querySelector('[data-action="delete"]').addEventListener("click", async e => {
            e.preventDefault();
            const confirmed = await showConfirmModal(
                "Delete this order? This cannot be undone.",
                { confirmText: "Delete", danger: true }
            );
            if (!confirmed) return;
            orders = orders.filter(item => item.id !== order.id);
            await saveOrders();
            renderEarningsBreakdown();
            renderEarnings();
            renderHistory();
        });
    });
}


// ----------------------------------------
// EARNINGS CARDS CLICK & EXPORT BUTTON
// ----------------------------------------

function setupEarningsCards() {
    const cards = document.querySelectorAll(".earnings-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(item => item.classList.remove("active-card"));
            card.classList.add("active-card");
            selectedPeriod = card.dataset.period;
            renderEarningsBreakdown();
        });
    });

    const exportButton = document.getElementById("exportSalesBtn");
    if (exportButton) exportButton.addEventListener("click", exportSalesToCSV);
}


// ----------------------------------------
// EXPORT SALES REPORT (CSV)
// ----------------------------------------

function exportSalesToCSV() {
    if (!orders || orders.length === 0) {
        alert("No orders recorded yet to export.");
        return;
    }

    const headers = ["Order ID", "Date & Time", "Customer Name", "Items Summary", "Total (₹)", "Paid (₹)", "Due (₹)"];
    const rows    = orders.map(order => {
        const paid         = Number(order.paidAmount || 0);
        const due          = Math.max(0, order.total - paid);
        const itemsSummary = (order.items || []).map(item => `${item.name} (x${item.qty})`).join("; ");
        return [
            `"${order.id}"`,
            `"${formatDateTime(order.timestamp)}"`,
            `"${(order.customerName || "Customer").replace(/"/g, '""')}"`,
            `"${itemsSummary.replace(/"/g, '""')}"`,
            order.total,
            paid,
            due
        ].join(",");
    });

    const blob = new Blob([[headers.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `CartMate_Sales_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
