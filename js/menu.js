window.MenuStore = {
  add(menu, name, price){
    return [...menu, {id:crypto.randomUUID(), name:name.trim(), price:Number(price)}];
  },
  remove(menu,id){ return menu.filter(item=>item.id!==id); }
};