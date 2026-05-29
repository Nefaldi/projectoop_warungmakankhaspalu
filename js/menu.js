/* ============================================================
   WARUNG PALU — menu.js
   OOP: MenuPage mengorkestrasikan semua komponen halaman menu
   ============================================================ */

'use strict';

// Auth guard
(function () {
  if (!Session.isCustomer()) { window.location.href = 'index.html'; }
})();

// ============================================================
// INHERITANCE — CartSidebar mewarisi UIComponent
// ============================================================
class CartSidebar extends UIComponent {
  #cart;
  #badgeComponent;

  constructor(cart) {
    super('cartSidebar');
    this.#cart = cart;
    this.#badgeComponent = new CartBadgeComponent();
  }

  // Override abstract method render()
  render() {
    const items     = this.#cart.getItems();
    const container = document.getElementById('cartItems');
    const footer    = document.getElementById('cartFooter');

    // Update badge
    this.#badgeComponent.render(this.#cart.getTotalQty());
    document.getElementById('cartTotal').textContent = Formatter.rupiah(this.#cart.getTotalPrice());

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Keranjang masih kosong</p></div>';
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${Formatter.rupiah(item.price * item.qty)}</div>
        </div>
        <div class="cart-item-qty">
          <button data-id="${item.id}" data-action="minus">−</button>
          <span>${item.qty}</span>
          <button data-id="${item.id}" data-action="plus">+</button>
        </div>
      </div>
    `).join('');

    // Delegasi event — satu listener untuk semua tombol qty
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'plus' ? 1 : -1;
        this.#cart.changeQty(btn.dataset.id, delta);
        this.render();
      });
    });
  }

  toggle() {
    const overlay = document.getElementById('cartOverlay');
    const isOpen  = this.el.classList.contains('open');
    this.el.classList.toggle('open', !isOpen);
    overlay.classList.toggle('active', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  }

  close() {
    this.el.classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ============================================================
// INHERITANCE — ItemModal mewarisi UIComponent
// ============================================================
class ItemModal extends UIComponent {
  #qty = 1;
  #currentItem = null;
  #onAdd;

  constructor(onAdd) {
    super('itemModal');
    this.#onAdd = onAdd;
  }

  // Override abstract method render()
  render(item) {
    this.#currentItem = item;
    this.#qty = 1;

    const img = document.getElementById('modalImg');
    img.src = item.image || '';

    // Sembunyikan placeholder saat gambar berhasil load
    const placeholder = document.getElementById('modalImgPlaceholder');
    img.onload  = () => { if (placeholder) placeholder.style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; };

    document.getElementById('modalName').textContent  = item.name;
    document.getElementById('modalDesc').textContent  = item.desc;
    document.getElementById('modalPrice').textContent = Formatter.rupiah(item.price);
    document.getElementById('modalQty').textContent   = this.#qty;

    this.el.classList.add('open');
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.el.classList.remove('open');
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    this.#currentItem = null;
  }

  changeQty(delta) {
    this.#qty = Math.max(1, this.#qty + delta);
    document.getElementById('modalQty').textContent = this.#qty;
  }

  confirmAdd() {
    if (!this.#currentItem) return;
    this.#onAdd(this.#currentItem, this.#qty);
    this.close();
  }
}

// ============================================================
// INHERITANCE — MenuGridComponent mewarisi UIComponent
// ============================================================
class MenuGridComponent extends UIComponent {
  #onCardClick;

  constructor(elementId, onCardClick) {
    super(elementId);
    this.#onCardClick = onCardClick;
  }

  // Override abstract method render()
  render(items) {
    if (!this.el) return;
    this.el.innerHTML = '';

    if (!items.length) {
      this.setHTML('<div class="empty-state"><p>Tidak ada item</p></div>');
      return;
    }

    items.forEach((item, i) => {
      const card = MenuCardRenderer.create(item, i, this.#onCardClick);
      this.el.appendChild(card);
    });
  }
}

// ============================================================
// INHERITANCE — OrderStatusComponent mewarisi UIComponent
// ============================================================
class OrderStatusComponent extends UIComponent {
  constructor() {
    super('orderStatusList');
  }

  // Override abstract method render()
  render(orders) {
    if (!orders.length) {
      this.setHTML('<div class="empty-state"><p>Belum ada pesanan</p></div>');
      return;
    }

    this.setHTML(orders.map(order => `
      <div class="order-status-card">
        <div class="order-head">
          <span class="order-id">#${order.id}</span>
          ${StatusBadge.render(order.status)}
        </div>
        <div class="order-items">
          ${order.items.map(i => `${i.name} ×${i.qty}`).join('<br>')}
        </div>
        ${order.note ? `<div style="font-size:.82rem;color:var(--clr-muted);font-style:italic;margin-bottom:.5rem;">${order.note}</div>` : ''}
        <div class="order-total">${Formatter.rupiah(order.total)}</div>
        <div style="font-size:.75rem;color:var(--clr-muted);margin-top:.3rem;">
          Dipesan: ${Formatter.time(order.createdAt)}
        </div>
      </div>
    `).join(''));
  }
}

// ============================================================
// ENCAPSULATION — MenuPage
// Mengorkestrasikan seluruh halaman menu sebagai satu unit
// ============================================================
class MenuPage {
  #cart;
  #cartSidebar;
  #itemModal;
  #grids = {};
  #orderStatus;
  #session;

  constructor() {
    this.#session = Session.get();
    this.#cart    = new CartManager();

    // Inisialisasi komponen dengan dependency injection
    this.#cartSidebar = new CartSidebar(this.#cart);
    this.#itemModal   = new ItemModal(this.#handleAddToCart.bind(this));
    this.#orderStatus = new OrderStatusComponent();

    this.#grids = {
      makanan:      new MenuGridComponent('gridMakanan',      this.#handleCardClick.bind(this)),
      minuman:      new MenuGridComponent('gridMinuman',      this.#handleCardClick.bind(this)),
      pencuciMulut: new MenuGridComponent('gridPencuciMulut', this.#handleCardClick.bind(this))
    };
  }

  init() {
    const mejaNum = this.#session.meja;
    document.getElementById('navMeja').textContent    = `Meja #${mejaNum}`;
    document.getElementById('cartMejaNum').textContent = mejaNum;
    document.getElementById('statusMejaNum').textContent = mejaNum;

    this.#renderMenus();
    this.#cartSidebar.render();

    // Auto-refresh status setiap 15 detik
    setInterval(() => {
      const statusSection = document.getElementById('sectionStatus');
      if (statusSection?.classList.contains('active')) this.#refreshOrderStatus();
    }, 15000);
  }

  // Private method — hanya bisa dipanggil dari dalam kelas
  #renderMenus() {
    const items = MenuStore.getAll();
    this.#grids.makanan.render(items.filter(i => i.category === 'makanan'));
    this.#grids.minuman.render(items.filter(i => i.category === 'minuman'));
    this.#grids.pencuciMulut.render(items.filter(i => i.category === 'pencuci-mulut'));
  }

  #handleCardClick(item) {
    this.#itemModal.render(item);
  }

  #handleAddToCart(item, qty) {
    this.#cart.add(item, qty);
    this.#cartSidebar.render();
    toast.success(`${item.name} ditambahkan ke keranjang`);
  }

  #refreshOrderStatus() {
    const orders = Orders.getByMeja(this.#session.meja);
    this.#orderStatus.render(orders);
  }

  // Public methods — dipanggil dari HTML via onclick
  filterCategory(cat) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.menu-section').forEach(sec => {
      if (cat === 'semua') {
        sec.classList.remove('hidden');
      } else {
        sec.classList.toggle('hidden', sec.dataset.category !== cat);
      }
    });
  }

  showSection(name) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => l.classList.remove('active'));
    // Aktifkan nav-link yang sesuai (jika pemanggil adalah nav-link)
    if (event && event.target && event.target.classList.contains('nav-link')) {
      event.target.classList.add('active');
    } else {
      // Panggil dari tombol lain (mis. btn-back-menu) — aktifkan link berdasarkan nama
      links.forEach(l => {
        if ((name === 'menu' && l.textContent.trim() === 'Menu') ||
            (name === 'status' && l.textContent.includes('Status'))) {
          l.classList.add('active');
        }
      });
    }

    const menuSec   = document.getElementById('sectionMenu');
    const statusSec = document.getElementById('sectionStatus');

    if (name === 'menu') {
      menuSec.classList.add('active');
      statusSec.classList.remove('active');
    } else {
      menuSec.classList.remove('active');
      statusSec.classList.add('active');
      this.#refreshOrderStatus();
    }
  }

  toggleCart()      { this.#cartSidebar.toggle(); }
  openModal(item)   { this.#itemModal.render(item); }
  closeModal()      { this.#itemModal.close(); }
  changeModalQty(d) { this.#itemModal.changeQty(d); }
  addFromModal()    { this.#itemModal.confirmAdd(); }

  checkout() {
    if (this.#cart.isEmpty()) {
      toast.error('Keranjang masih kosong');
      return;
    }

    const note  = document.getElementById('orderNote').value.trim();
    const order = {
      id:           Formatter.generateId(),
      meja:         this.#session.meja,
      customerName: this.#session.name,
      items:        this.#cart.getItems().map(c => ({
        id: c.id, name: c.name, price: c.price, qty: c.qty
      })),
      total:     this.#cart.getTotalPrice(),
      note,
      status:    'menunggu',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    Orders.add(order);
    this.#cart.clear();
    document.getElementById('orderNote').value = '';
    this.#cartSidebar.render();
    this.#cartSidebar.close();

    // Pindah ke tab status
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-link')[1]?.classList.add('active');
    document.getElementById('sectionMenu').classList.remove('active');
    document.getElementById('sectionStatus').classList.add('active');
    this.#refreshOrderStatus();

    toast.success('Pesanan berhasil dikirim!');
  }
}

// ============================================================
// BOOTSTRAP
// ============================================================
const menuPage = new MenuPage();

document.addEventListener('DOMContentLoaded', () => menuPage.init());

// Expose public methods ke global scope untuk HTML onclick
function filterCategory(cat) { menuPage.filterCategory(cat); }
function showSection(name)    { menuPage.showSection(name); }
function toggleCart()         { menuPage.toggleCart(); }
function closeModal()         { menuPage.closeModal(); }
function changeModalQty(d)    { menuPage.changeModalQty(d); }
function addFromModal()       { menuPage.addFromModal(); }
function checkout()           { menuPage.checkout(); }
