window.SalesStore = {
  today(orders){
    const d=new Date(); const y=d.getFullYear(),m=d.getMonth(),day=d.getDate();
    return orders.filter(o=>{const x=new Date(o.timestamp);return x.getFullYear()===y&&x.getMonth()===m&&x.getDate()===day;});
  },
  stats(orders){
    const list=this.today(orders);
    return {
      sales:list.reduce((s,o)=>s+o.total,0),
      orders:list.length,
      items:list.reduce((s,o)=>s+o.items.reduce((n,i)=>n+i.qty,0),0),
      list
    };
  }
};