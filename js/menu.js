// ========================================
// CARTMATE - MENU MODULE
// Manages menu items: render, add, remove.
// ========================================


// ----------------------------------------
// RENDER MENU LIST
// ----------------------------------------

function renderMenu() {
    const menuList  = document.getElementById("menu-list");
    const menuEmpty = document.getElementById("menu-empty");
    if (!menuList || !menuEmpty) return;

    menuList.innerHTML = "";

    if (!menu || menu.length === 0) {
        menuEmpty.style.display = "block";
        return;
    }

    menuEmpty.style.display = "none";

    menu.forEach(item => {
        const row = document.createElement("div");
        row.className = "menu-row";
        row.innerHTML = `
            <div>
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-price">₹${Number(item.price).toFixed(2)}</div>
            </div>
            <button type="button" class="icon-btn" data-delete-menu="${item.id}" title="Delete item">×</button>
        `;
        menuList.appendChild(row);
    });

    menuList.querySelectorAll("[data-delete-menu]").forEach(button => {
        button.addEventListener("click", () => removeItem(button.dataset.deleteMenu));
    });
}


// ----------------------------------------
// ADD ITEM
// ----------------------------------------

async function addItem() {
    const nameInput  = document.getElementById("newItemName");
    const priceInput = document.getElementById("newItemPrice");
    if (!nameInput || !priceInput) return;

    const name  = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name) {
        showMenuStatus("Please enter an item name.", true);
        nameInput.focus();
        return;
    }

    if (priceInput.value.trim() === "" || Number.isNaN(price) || price < 0) {
        showMenuStatus("Please enter a valid price.", true);
        priceInput.focus();
        return;
    }

    if (menu.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        showMenuStatus("This item already exists.", true);
        nameInput.focus();
        return;
    }

    menu.push({ id: uid(), name, price });
    await saveMenu();

    nameInput.value  = "";
    priceInput.value = "";

    renderMenu();
    renderOrder();
    showMenuStatus("Item added successfully.", false);
    nameInput.focus();
}


// ----------------------------------------
// REMOVE ITEM
// ----------------------------------------

async function removeItem(id) {
    const item = menu.find(item => item.id === id);
    if (!item) return;

    const confirmed = await showConfirmModal(
        `Delete "${item.name}" from the menu?`,
        { confirmText: "Delete", danger: true }
    );
    if (!confirmed) return;

    menu = menu.filter(item => item.id !== id);
    delete orderQty[id];

    await saveMenu();
    renderMenu();
    renderOrder();
    showMenuStatus("Item deleted.", false);
}


// ----------------------------------------
// STATUS MESSAGE
// ----------------------------------------

function showMenuStatus(message, isError = false) {
    const status = document.getElementById("menuStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", isError);
    clearTimeout(status._timer);
    status._timer = setTimeout(() => {
        status.textContent = "";
        status.classList.remove("error");
    }, 2500);
}


// ----------------------------------------
// SETUP MENU INPUT EVENTS
// ----------------------------------------

function setupMenuInputs() {
    const addButton  = document.getElementById("addItemBtn");
    const nameInput  = document.getElementById("newItemName");
    const priceInput = document.getElementById("newItemPrice");

    if (addButton) addButton.addEventListener("click", addItem);

    if (nameInput && priceInput) {
        nameInput.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); priceInput.focus(); }
        });
        priceInput.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); addItem(); }
        });
    }
}
