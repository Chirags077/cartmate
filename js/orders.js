window.OrderStore = {
  total(order){ return order.items.reduce((sum,x)=>sum+x.qty*x.price,0); },
  create(items, customer, payment){
    return {
      id:crypto.randomUUID(), timestamp:new Date().toISOString(),
      customer:customer.trim() || "Walk-in customer", payment,
      items:items.map(x=>({...x})), total:this.total({items})
    };
  }
};