const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=n=>"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});

const state={
  ...Storage.load(),
  cart:{}, payment:"Cash"
};

function save(){Storage.saveMenu(state.menu);Storage.saveOrders(state.orders);Storage.saveSettings(state.settings)}

function init(){
  $("#cartName").value=state.settings.cartName;
  $("#settingsCartName").value=state.settings.cartName;
  $("#upiId").value=state.settings.upiId;
  bindTabs(); bindEvents(); renderAll();
}

function bindTabs(){
  $$(".tab").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
  $$("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.go)));
}
function showView(name){
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $$(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
  if(name==="sales") renderSales();
}

function bindEvents(){
  $("#cartName").addEventListener("change",syncSettings);
  $("#addItem").addEventListener("click",addItem);
  $("#completeOrder").addEventListener("click",completeOrder);
  $("#clearOrder").addEventListener("click",clearOrder);
  $("#saveSettings").addEventListener("click",saveSettings);
  $("#resetData").addEventListener("click",()=>{if(confirm("Reset all FoodCart data on this browser?")){Storage.reset();location.reload();}});
  $$(".payment").forEach(b=>b.addEventListener("click",()=>{state.payment=b.dataset.payment;$$(".payment").forEach(x=>x.classList.toggle("active",x===b));}));
}

function syncSettings(){
  state.settings.cartName=$("#cartName").value.trim();
  $("#settingsCartName").value=state.settings.cartName; save();
}
function saveSettings(){
  state.settings.cartName=$("#settingsCartName").value.trim();
  state.settings.upiId=$("#upiId").value.trim();
  $("#cartName").value=state.settings.cartName; save();
  $("#settingsMessage").textContent="Settings saved.";
  setTimeout(()=>$("#settingsMessage").textContent="",1500);
}
function addItem(){
  const name=$("#itemName").value.trim(), price=Number($("#itemPrice").value);
  if(!name || !Number.isFinite(price) || price<0){$("#menuMessage").textContent="Enter a food name and valid price.";return;}
  state.menu=MenuStore.add(state.menu,name,price); save();
  $("#itemName").value=""; $("#itemPrice").value="";
  $("#menuMessage").textContent="Added to menu."; renderAll();
  setTimeout(()=>$("#menuMessage").textContent="",1500);
}
function removeItem(id){
  state.menu=MenuStore.remove(state.menu,id); delete state.cart[id]; save(); renderAll();
}
function renderMenu(){
  const list=$("#menuList"); list.innerHTML="";
  if(!state.menu.length){list.innerHTML='<div class="empty">No food items yet.</div>';return;}
  state.menu.forEach(item=>{
    const row=document.createElement("div");row.className="menu-row";
    row.innerHTML=`<strong>${escapeHtml(item.name)}</strong><span>${money(item.price)}</span><button class="delete">Delete</button>`;
    row.querySelector(".delete").onclick=()=>removeItem(item.id); list.appendChild(row);
  });
}
function renderButtons(){
  const box=$("#menuButtons");box.innerHTML="";
  $("#emptyMenu").classList.toggle("hidden",state.menu.length>0);
  state.menu.forEach(item=>{
    const b=document.createElement("button");b.className="product";
    b.innerHTML=`<strong>${escapeHtml(item.name)}</strong><span>${money(item.price)}</span>`;
    b.onclick=()=>{state.cart[item.id]=(state.cart[item.id]||0)+1;renderCart();};box.appendChild(b);
  });
}
function renderCart(){
  const box=$("#cartLines");box.innerHTML="";
  const lines=state.menu.filter(i=>state.cart[i.id]>0);
  let count=0,total=0;
  lines.forEach(item=>{
    const qty=state.cart[item.id];count+=qty;total+=qty*item.price;
    const row=document.createElement("div");row.className="cart-line";
    row.innerHTML=`<div><strong>${escapeHtml(item.name)}</strong><div class="muted">${money(item.price)} each</div></div>
      <div class="qty"><button>−</button><strong>${qty}</strong><button>+</button></div><strong>${money(qty*item.price)}</strong>`;
    const [minus,plus]=row.querySelectorAll("button");
    minus.onclick=()=>changeQty(item.id,-1);plus.onclick=()=>changeQty(item.id,1);box.appendChild(row);
  });
  $("#itemCount").textContent=`${count} item${count===1?"":"s"}`;
  $("#orderTotal").textContent=money(total);$("#completeOrder").disabled=!lines.length;
}
function changeQty(id,delta){state.cart[id]=(state.cart[id]||0)+delta;if(state.cart[id]<=0)delete state.cart[id];renderCart();}
function clearOrder(){state.cart={};$("#customerName").value="";$("#receipt").classList.add("hidden");renderCart();}
function completeOrder(){
  const items=state.menu.filter(i=>state.cart[i.id]>0).map(i=>({id:i.id,name:i.name,price:i.price,qty:state.cart[i.id]}));
  if(!items.length)return;
  const order=OrderStore.create(items,$("#customerName").value,state.payment);
  state.orders.unshift(order);save();showReceipt(order);state.cart={};renderCart();renderSales();
}
function showReceipt(order){
  const r=$("#receipt");r.classList.remove("hidden");
  const lines=order.items.map(i=>`<div class="receipt-line"><span>${escapeHtml(i.name)} × ${i.qty}</span><strong>${money(i.qty*i.price)}</strong></div>`).join("");
  r.innerHTML=`<h2>✓ Order Complete</h2><p class="muted" style="text-align:center">${escapeHtml(order.customer)} · ${order.payment}</p>
  ${lines}<div class="total-row"><span>Total</span><strong>${money(order.total)}</strong></div><div id="receiptQr" class="qr"></div>
  <button id="nextOrder" class="primary full">Start Next Order</button>`;
  if(state.settings.upiId && window.QRCode){
    new QRCode($("#receiptQr"),{text:`upi://pay?pa=${encodeURIComponent(state.settings.upiId)}&pn=${encodeURIComponent(state.settings.cartName||"Food Cart")}&am=${order.total}&cu=INR`,width:150,height:150});
  }
  $("#nextOrder").onclick=()=>{r.classList.add("hidden");$("#customerName").value="";};
  r.scrollIntoView({behavior:"smooth",block:"center"});
}
function renderSales(){
  const s=SalesStore.stats(state.orders);
  $("#todaySales").textContent=money(s.sales);$("#todayOrders").textContent=s.orders;$("#todayItems").textContent=s.items;
  const box=$("#salesList");box.innerHTML="";
  if(!s.list.length){box.innerHTML='<p class="muted">No orders today.</p>';return;}
  s.list.forEach(o=>{
    const row=document.createElement("div");row.className="sale-row";
    row.innerHTML=`<div class="sale-top"><span>${escapeHtml(o.customer)}</span><span>${money(o.total)}</span></div>
      <div class="sale-items">${o.items.map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join(" · ")} · ${o.payment}</div>`;
    box.appendChild(row);
  });
}
function renderAll(){renderMenu();renderButtons();renderCart();renderSales();}
function escapeHtml(s){const d=document.createElement("div");d.textContent=String(s);return d.innerHTML;}

document.addEventListener("DOMContentLoaded",init);