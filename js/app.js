// ========================================
// CARTMATE - MAIN APPLICATION
// Entry point: wires up all modules,
// initialises data, and registers the
// service worker for PWA / offline use.
// ========================================

const CURRENCY = "₹";

// Global state (referenced by all modules)
let menu       = [];
let orders     = [];
let shopName   = "CARTMATE";
let upiId      = "";
let billingPrefs = {
    scanBill:  true,
    printSlip: true,
    whatsapp:  true
};


// ========================================
// START APPLICATION
// ========================================

document.addEventListener("DOMContentLoaded", async function () {

    console.log("CartMate starting...");

    try {

        // --------------------------------
        // THEME (dark / light)
        // --------------------------------

        await setupThemeToggle();


        // --------------------------------
        // LOAD SAVED DATA
        // --------------------------------

        await loadAll();

        console.log("CartMate data loaded.");
        console.log("Menu:", menu);
        console.log("Orders:", orders);


        // --------------------------------
        // SHOP NAME
        // --------------------------------

        const shopNameInput = document.getElementById("shopName");

        if (shopNameInput) {
            shopNameInput.value = shopName || "CARTMATE";

            shopNameInput.addEventListener("change", async function () {
                shopName            = shopNameInput.value.trim() || "CARTMATE";
                shopNameInput.value = shopName;
                await saveShopName();
            });
        }


        // --------------------------------
        // INITIAL UI RENDER
        // --------------------------------

        renderMenu();
        resetOrder();
        renderOrder();
        renderHistory();
        renderEarnings();


        // --------------------------------
        // SETUP FEATURE MODULES
        // --------------------------------

        setupMenuInputs();
        setupPaymentSettings();
        setupCustomerInput();
        setupOrderButtons();
        setupEarningsCards();


        // --------------------------------
        // TABS
        // --------------------------------

        setupTabs();
        setActiveTab("order");
        refreshPaymentSettings();


        // --------------------------------
        // BILLING PREFERENCES
        // --------------------------------

        await loadBillingPrefs();
        setupBillingPrefInputs();


        // --------------------------------
        // SOUND ENGINE & TOGGLE
        // --------------------------------

        await initSound();

        const soundToggleBtn = document.getElementById("soundToggleBtn");

        if (soundToggleBtn) {
            soundToggleBtn.addEventListener("click", async function () {
                await setSoundEnabled(!isSoundEnabled());
            });
        }


        // --------------------------------
        // PWA SERVICE WORKER (OFFLINE)
        // --------------------------------

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("./sw.js")
                .then(reg => console.log("CartMate Service Worker registered:", reg.scope))
                .catch(err => console.warn("Service Worker registration failed:", err));
        }


        console.log("CartMate is ready.");

    } catch (error) {

        console.error("CartMate startup error:", error);

        // Even if storage fails, keep minimum functionality.
        try { setupMenuInputs(); } catch (e) { console.error("Menu setup error:", e); }
        try { setupTabs();       } catch (e) { console.error("Tab setup error:", e); }

        alert("CartMate could not load saved data. Please refresh the page.");
    }
});


// ========================================
// TABS
// ========================================

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    const goToMenuLink = document.getElementById("go-to-menu-link");
    if (goToMenuLink) goToMenuLink.addEventListener("click", () => setActiveTab("menu"));
}

function setActiveTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabName);
    });

    const orderView    = document.getElementById("view-order");
    const earningsView = document.getElementById("view-earnings");
    const menuView     = document.getElementById("view-menu");

    if (orderView)    orderView.style.display    = tabName === "order"    ? "block" : "none";
    if (earningsView) earningsView.style.display = tabName === "earnings" ? "block" : "none";
    if (menuView)     menuView.style.display     = tabName === "menu"     ? "block" : "none";

    if (tabName === "order")    { renderMenu(); renderOrder(); renderHistory(); }
    if (tabName === "earnings") { renderEarnings(); renderEarningsBreakdown(); }
    if (tabName === "menu")     { renderMenu(); refreshPaymentSettings(); }
}


// ========================================
// THEME (DARK / LIGHT)
// ========================================

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    const button  = document.getElementById("themeToggle");
    if (!button) return;

    const isLight = theme === "light";
    button.textContent = isLight ? "🌙" : "☀️";

    const label = isLight ? "Switch to dark mode" : "Switch to day mode";
    button.setAttribute("aria-label", label);
    button.title = label;
}

async function setupThemeToggle() {
    const saved = await safeGet(STORAGE_KEYS.THEME);
    applyTheme(saved === "light" ? "light" : "dark");

    const button = document.getElementById("themeToggle");
    if (!button) return;

    button.addEventListener("click", async function () {
        const current = document.documentElement.getAttribute("data-theme");
        const next    = current === "light" ? "dark" : "light";
        applyTheme(next);
        await safeSet(STORAGE_KEYS.THEME, next);
    });
}


// ========================================
// GLOBAL REFRESH
// ========================================

async function refreshApp() {
    await loadAll();
    renderMenu();
    renderOrder();
    renderHistory();
    renderEarnings();
    refreshPaymentSettings();
}
