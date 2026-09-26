const Storage = {

  getMenu() {

    const saved = localStorage.getItem("chigasi_menu");

    if (saved) {
      return JSON.parse(saved);
    }

    const defaultMenu = [

      {
        id: 1,
        name: "burger",
        price: 89
      },

      {
        id: 2,
        name: "Classic peri peri",
        price: 59
      },

      {
        id: 3,
        name: "paneer fries",
        price: 139
      },

      {
        id: 4,
        name: "fusion fries",
        price: 129
      },

      {
        id: 5,
        name: "chigasi spcl fries",
        price: 139
      }

    ];

    this.saveMenu(defaultMenu);

    return defaultMenu;
  },


  saveMenu(menu) {

    localStorage.setItem(
      "chigasi_menu",
      JSON.stringify(menu)
    );

  },


  getOrders() {

    const saved =
      localStorage.getItem("chigasi_orders");

    return saved ? JSON.parse(saved) : [];

  },


  saveOrders(orders) {

    localStorage.setItem(
      "chigasi_orders",
      JSON.stringify(orders)
    );

  }

};