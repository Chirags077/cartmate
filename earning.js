let selectedPeriod = "today";


function getPeriodOrders(
    period
) {

    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const week =
        new Date(today);


    week.setDate(
        week.getDate() -
        week.getDay()
    );


    const month =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const year =
        new Date(
            now.getFullYear(),
            0,
            1
        );


    let start;


    if (period === "today") {

        start = today;

    } else if (period === "week") {

        start = week;

    } else if (period === "month") {

        start = month;

    } else if (period === "year") {

        start = year;

    } else {

        return [];

    }


    return orders.filter(
        order =>
            order.timestamp >=
            start.getTime()
    );

}


function calculatePeriodStats(
    period
) {

    const periodOrders =
        getPeriodOrders(
            period
        );


    const amount =
        periodOrders.reduce(
            (
                total,
                order
            ) =>
                total +
                Number(
                    order.total ||
                    0
                ),
            0
        );


    const customers =
        periodOrders.length;


    const items =
        periodOrders.reduce(
            (
                total,
                order
            ) =>
                total +
                order.items.reduce(
                    (
                        count,
                        item
                    ) =>
                        count +
                        Number(
                            item.qty ||
                            0
                        ),
                    0
                ),
            0
        );


    return {

        amount,

        customers,

        items

    };

}


function renderEarnings() {

    [
        "today",
        "week",
        "month",
        "year"
    ].forEach(
        period => {

            const stats =
                calculatePeriodStats(
                    period
                );


            const amount =
                document.getElementById(
                    `stat-${period}-amount`
                );


            const customers =
                document.getElementById(
                    `stat-${period}-cust`
                );


            const items =
                document.getElementById(
                    `stat-${period}-items`
                );


            if (amount) {

                amount.textContent =
                    fmt(
                        stats.amount
                    );

            }


            if (customers) {

                customers.textContent =
                    `${stats.customers} ${
                        stats.customers === 1
                            ? "customer"
                            : "customers"
                    }`;

            }


            if (items) {

                items.textContent =
                    `${stats.items} ${
                        stats.items === 1
                            ? "item"
                            : "items"
                    } sold`;

            }

        }
    );


    renderEarningsBreakdown();

}


function getPeriodTitle(
    period
) {

    const titles = {

        today:
            "Today's Orders",

        week:
            "This Week's Orders",

        month:
            "This Month's Orders",

        year:
            "This Year's Orders"

    };


    return (
        titles[period] ||
        "Orders"
    );

}


function renderEarningsBreakdown() {

    const container =
        document.getElementById(
            "earnings-list"
        );


    const title =
        document.getElementById(
            "breakdown-title"
        );


    if (!container) return;


    const periodOrders =
        getPeriodOrders(
            selectedPeriod
        );


    title.textContent =
        getPeriodTitle(
            selectedPeriod
        );


    container.innerHTML = "";


    if (!periodOrders.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    📊
                </div>

                <p>
                    No orders recorded
                    for this period.
                </p>

            </div>

        `;

        return;

    }


    periodOrders.forEach(
        order => {

            const details =
                document.createElement(
                    "details"
                );


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


            details.className =
                "history-item";


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


                <!-- NEW: delete button so an order can be
                     removed from here too, not just from
                     Recent Orders -->

                <div class="payment-panel">

                    <button
                        class="delete-order-btn"
                        type="button"
                        data-action="delete"
                    >
                        Delete Order
                    </button>

                </div>

            `;


            container.appendChild(
                details
            );


            /*
             * NEW: wire up delete.
             * This is a full, permanent
             * delete — it removes the
             * order from everywhere,
             * including Earnings totals.
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
                            "Delete this order? This cannot be undone.",
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


                    renderEarningsBreakdown();

                    renderEarnings();

                    renderHistory();

                }
            );

        }
    );

}


function setupEarningsCards() {

    const cards =
        document.querySelectorAll(
            ".earnings-card"
        );


    cards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                cards.forEach(
                    item =>
                        item.classList.remove(
                            "active-card"
                        )
                );


                card.classList.add(
                    "active-card"
                );


                selectedPeriod =
                    card.dataset.period;


                renderEarningsBreakdown();

            }
        );

    });

    const exportButton =
        document.getElementById("exportSalesBtn");

    if (exportButton) {
        exportButton.addEventListener("click", exportSalesToCSV);
    }

}


/* =========================================
   EXPORT SALES TO CSV (EXCEL READY)
   ========================================= */

function exportSalesToCSV() {

    if (!orders || orders.length === 0) {
        alert("No orders recorded yet to export.");
        return;
    }

    const headers = [
        "Order ID",
        "Date & Time",
        "Customer Name",
        "Items Summary",
        "Total (₹)",
        "Paid (₹)",
        "Due (₹)"
    ];

    const rows = orders.map(order => {
        const paid = Number(order.paidAmount || 0);
        const due = Math.max(0, order.total - paid);
        const itemsSummary = (order.items || [])
            .map(item => `${item.name} (x${item.qty})`)
            .join("; ");

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

    const csvString = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `CartMate_Sales_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

}
