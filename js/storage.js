const Storage = {
  keys: { menu:"fc_menu", orders:"fc_orders", settings:"fc_settings" },
  read(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  write(key, value){ localStorage.setItem(key, JSON.stringify(value)); },
  load(){
    return {
      menu:this.read(this.keys.menu, []),
      orders:this.read(this.keys.orders, []),
      settings:this.read(this.keys.settings, {cartName:"",upiId:""})
    };
  },
  saveMenu(menu){ this.write(this.keys.menu, menu); },
  saveOrders(orders){ this.write(this.keys.orders, orders); },
  saveSettings(settings){ this.write(this.keys.settings, settings); },
  reset(){ Object.values(this.keys).forEach(k=>localStorage.removeItem(k)); }
};