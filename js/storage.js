// ========================================
// CARTMATE - STORAGE MODULE
// Handles all localStorage reads/writes
// with optional window.storage API support.
// ========================================

const STORAGE_KEYS = {
    MENU:          "cartmate-menu-items",
    ORDERS:        "cartmate-orders",
    SHOP_NAME:     "cartmate-shop-name",
    UPI_ID:        "cartmate-upi-id",
    SOUND:         "cartmate-sound-enabled",
    THEME:         "cartmate-theme",
    BILLING_PREFS: "cartmate-billing-prefs"
};


// ----------------------------------------
// SAFE GET / SET (localStorage fallback)
// ----------------------------------------

async function safeGet(key) {
    try {
        if (window.storage && typeof window.storage.get === "function") {
            const result = await window.storage.get(key, false);
            return result ? result.value : null;
        }
        return localStorage.getItem(key);
    } catch (error) {
        console.error("Storage read error:", error);
        return null;
    }
}

async function safeSet(key, value) {
    try {
        if (window.storage && typeof window.storage.set === "function") {
            await window.storage.set(key, value, false);
        } else {
            localStorage.setItem(key, value);
        }
    } catch (error) {
        console.error("Storage save error:", error);
    }
}


// ----------------------------------------
// SAVE HELPERS
// ----------------------------------------

async function saveMenu()    { await safeSet(STORAGE_KEYS.MENU,      JSON.stringify(menu)); }
async function saveOrders()  { await safeSet(STORAGE_KEYS.ORDERS,    JSON.stringify(orders)); }
async function saveShopName(){ await safeSet(STORAGE_KEYS.SHOP_NAME, shopName); }
async function saveUpiId()   { await safeSet(STORAGE_KEYS.UPI_ID,    upiId); }

async function saveBillingPrefs() {
    await safeSet(STORAGE_KEYS.BILLING_PREFS, JSON.stringify(billingPrefs));
}


// ----------------------------------------
// LOAD ALL APP DATA
// ----------------------------------------

async function loadAll() {
    const [savedMenu, savedOrders, savedShopName, savedUpiId] = await Promise.all([
        safeGet(STORAGE_KEYS.MENU),
        safeGet(STORAGE_KEYS.ORDERS),
        safeGet(STORAGE_KEYS.SHOP_NAME),
        safeGet(STORAGE_KEYS.UPI_ID)
    ]);

    try   { menu = savedMenu   ? JSON.parse(savedMenu)   : []; } catch { menu = []; }
    try   { orders = savedOrders ? JSON.parse(savedOrders) : []; } catch { orders = []; }

    shopName = savedShopName || "CARTMATE";
    upiId    = savedUpiId    || "";
}


// ----------------------------------------
// BILLING PREFERENCES
// ----------------------------------------

async function loadBillingPrefs() {
    const saved = await safeGet(STORAGE_KEYS.BILLING_PREFS);
    if (saved) {
        try {
            billingPrefs = Object.assign(billingPrefs, JSON.parse(saved));
        } catch (e) {
            console.error("Billing prefs parse error:", e);
        }
    }
    updateBillingPrefsUI();
}

function updateBillingPrefsUI() {
    const scanBill = document.getElementById("prefScanBill");
    const printSlip = document.getElementById("prefPrintSlip");
    const whatsapp = document.getElementById("prefWhatsApp");

    if (scanBill)  scanBill.checked  = !!billingPrefs.scanBill;
    if (printSlip) printSlip.checked = !!billingPrefs.printSlip;
    if (whatsapp)  whatsapp.checked  = !!billingPrefs.whatsapp;
}

function setupBillingPrefInputs() {
    const scanBill  = document.getElementById("prefScanBill");
    const printSlip = document.getElementById("prefPrintSlip");
    const whatsapp  = document.getElementById("prefWhatsApp");

    if (scanBill) {
        scanBill.addEventListener("change", async () => {
            billingPrefs.scanBill = scanBill.checked;
            await saveBillingPrefs();
            if (currentReceiptOrder) applyReceiptPreferences(currentReceiptOrder);
        });
    }

    if (printSlip) {
        printSlip.addEventListener("change", async () => {
            billingPrefs.printSlip = printSlip.checked;
            await saveBillingPrefs();
            if (currentReceiptOrder) applyReceiptPreferences(currentReceiptOrder);
        });
    }

    if (whatsapp) {
        whatsapp.addEventListener("change", async () => {
            billingPrefs.whatsapp = whatsapp.checked;
            await saveBillingPrefs();
            if (currentReceiptOrder) applyReceiptPreferences(currentReceiptOrder);
        });
    }
}
