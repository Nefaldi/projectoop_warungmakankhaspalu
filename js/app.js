/* ============================================================
   WARUNG PALU — app.js
   OOP Architecture: Encapsulation, Abstraction, Inheritance, Polymorphism
   ============================================================ */

'use strict';

// ============================================================
// ABSTRACTION — Base class untuk operasi penyimpanan
// Menyembunyikan detail localStorage dari kelas turunan
// ============================================================
class BaseStorage {
  constructor(storageKey) {
    this._key = storageKey; // protected convention
  }

  _read(fallback = null) {
    try {
      const v = localStorage.getItem(this._key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  _write(value) {
    try {
      localStorage.setItem(this._key, JSON.stringify(value));
    } catch {}
  }

  _delete() {
    localStorage.removeItem(this._key);
  }
}

// ============================================================
// ENCAPSULATION — SessionManager
// Data sesi tersimpan rapat, hanya bisa diakses via method
// ============================================================
class SessionManager extends BaseStorage {
  constructor() {
    super('wp_session');
  }

  set(data) { this._write(data); }
  get()     { return this._read(); }
  clear()   { this._delete(); }

  isCustomer() {
    const s = this.get();
    return s && s.role === 'customer';
  }

  isCashier() {
    const s = this.get();
    return s && s.role === 'cashier';
  }
}

// ============================================================
// ENCAPSULATION — OrderRepository
// Semua logika order terkapsulasi, state tidak bisa diubah langsung
// ============================================================
class OrderRepository extends BaseStorage {
  constructor() {
    super('wp_orders');
  }

  getAll()        { return this._read([]); }
  save(orders)    { this._write(orders); }

  add(order) {
    const orders = this.getAll();
    orders.unshift(order);
    this.save(orders);
    return order;
  }

  updateStatus(id, status) {
    const orders = this.getAll();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx].status    = status;
      orders[idx].updatedAt = Date.now();
      this.save(orders);
      return orders[idx];
    }
    return null;
  }

  getByMeja(mejaNum) {
    return this.getAll().filter(o => o.meja === mejaNum);
  }
}

// ============================================================
// ENCAPSULATION — MenuRepository
// ============================================================
class MenuRepository extends BaseStorage {
  constructor() {
    super('wp_menu');
  }

  getAll() {
    const stored = this._read(null);
    if (stored) return stored;
    const defaults = [
      ...MENU_DATA.makanan,
      ...MENU_DATA.minuman,
      ...MENU_DATA.pencuciMulut
    ];
    this.save(defaults);
    return defaults;
  }

  save(items)  { this._write(items); }

  add(item) {
    const items = this.getAll();
    item.id = 'custom_' + Date.now();
    items.push(item);
    this.save(items);
    return item;
  }

  update(id, data) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data };
      this.save(items);
    }
  }

  delete(id) {
    this.save(this.getAll().filter(i => i.id !== id));
  }

  byCategory(cat) {
    const all = this.getAll();
    return cat === 'semua' ? all : all.filter(i => i.category === cat);
  }
}

// ============================================================
// ENCAPSULATION — CartManager
// State keranjang terisolasi, perubahan hanya via method
// ============================================================
class CartManager extends BaseStorage {
  #items = []; // private field (true encapsulation)

  constructor() {
    super('wp_cart');
    this.#items = this._read([]);
  }

  getItems()  { return [...this.#items]; } // return copy, bukan referensi

  getTotalQty()    { return this.#items.reduce((s, c) => s + c.qty, 0); }
  getTotalPrice()  { return this.#items.reduce((s, c) => s + c.price * c.qty, 0); }

  add(item, qty = 1) {
    const existing = this.#items.find(c => c.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.#items.push({ ...item, qty });
    }
    this._persist();
  }

  remove(id) {
    this.#items = this.#items.filter(c => c.id !== id);
    this._persist();
  }

  changeQty(id, delta) {
    const item = this.#items.find(c => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.remove(id);
    } else {
      this._persist();
    }
  }

  clear() {
    this.#items = [];
    this._delete();
  }

  isEmpty() { return this.#items.length === 0; }

  _persist() { this._write(this.#items); }
}

// ============================================================
// ABSTRACTION — Base UI Component
// Mendefinisikan kontrak (interface) yang harus diimplementasi
// ============================================================
class UIComponent {
  constructor(elementId) {
    this.el = document.getElementById(elementId);
  }

  // Abstract method — harus di-override oleh subclass
  render() {
    throw new Error(`render() harus diimplementasi oleh ${this.constructor.name}`);
  }

  show() { if (this.el) this.el.style.display = ''; }
  hide() { if (this.el) this.el.style.display = 'none'; }

  setHTML(html) { if (this.el) this.el.innerHTML = html; }
  setText(text) { if (this.el) this.el.textContent = text; }
}

// ============================================================
// INHERITANCE + POLYMORPHISM — Komponen Badge Status
// Setiap status menghasilkan representasi HTML berbeda (polymorphism)
// ============================================================
class StatusBadge {
  static LABELS = {
    menunggu: 'Menunggu',
    diproses: 'Diproses',
    selesai:  'Selesai'
  };

  // Polymorphism: method yang sama menghasilkan output berbeda
  // bergantung pada nilai status yang diterima
  static render(status) {
    const label = this.LABELS[status] || status;
    return `<span class="status-badge ${status}">${label}</span>`;
  }
}

// ============================================================
// INHERITANCE — CartBadgeComponent mewarisi UIComponent
// ============================================================
class CartBadgeComponent extends UIComponent {
  constructor() {
    super('cartBadge');
  }

  // Override abstract method
  render(qty) {
    this.setText(qty);
  }
}

// ============================================================
// INHERITANCE — MenuCardRenderer mewarisi UIComponent
// Bertanggung jawab hanya untuk merender satu kartu menu
// ============================================================
class MenuCardRenderer {
  // Abstraksi: pemanggil tidak perlu tahu cara membuat HTML kartu
  static create(item, index, onAdd) {
    const card = document.createElement('div');
    card.className = 'menu-card' + (item.available ? '' : ' unavailable');
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.image}" alt="${item.name}"
             onload="this.nextElementSibling.style.display='none'"
             onerror="this.style.display='none'">
        <div class="card-img-placeholder"></div>
        ${!item.available ? '<div class="card-unavailable-badge">Habis</div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-desc">${item.desc}</div>
        <div class="card-footer">
          <span class="card-price">${Formatter.rupiah(item.price)}</span>
          ${item.available
            ? `<button class="btn-add-card" data-id="${item.id}">+</button>`
            : ''}
        </div>
      </div>
    `;

    // Event listener via closure — tidak pakai inline onclick
    const btnAdd = card.querySelector('.btn-add-card');
    if (btnAdd) {
      btnAdd.addEventListener('click', e => {
        e.stopPropagation();
        onAdd(item);
      });
    }

    return card;
  }
}

// ============================================================
// ENCAPSULATION — Formatter
// Semua logika format terpusat, tidak tersebar di seluruh kode
// ============================================================
class Formatter {
  static rupiah(num) {
    return 'Rp ' + num.toLocaleString('id-ID');
  }

  static time(ts) {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  static generateId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() +
           Math.random().toString(36).slice(2, 5).toUpperCase();
  }
}

// ============================================================
// ENCAPSULATION — Toast Notification
// ============================================================
class Toast {
  #el;
  #timer = null;

  constructor() {
    this.#el = document.getElementById('toast');
  }

  show(msg, type = '', duration = 2800) {
    if (!this.#el) return;
    if (this.#timer) clearTimeout(this.#timer);

    this.#el.textContent = msg;
    this.#el.className = 'toast' + (type ? ' ' + type : '');
    requestAnimationFrame(() => this.#el.classList.add('show'));

    this.#timer = setTimeout(() => {
      this.#el.classList.remove('show');
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg)   { this.show(msg, 'error'); }
}

// ============================================================
// MENU DATA (tetap sebagai konstanta)
// ============================================================
const MENU_DATA = {
  makanan: [
    { id:'m1', name:'Kaledo',      category:'makanan', price:35000, image:'assets/makanan/kaledo.jpg',      desc:'Sop tulang kaki sapi khas Palu dengan kuah bening gurih dan bumbu rempah pilihan.', available:true },
    { id:'m2', name:'Sayur Kelor', category:'makanan', price:15000, image:'assets/makanan/sayur-kelor.jpg', desc:'Sayur daun kelor yang kaya gizi, dimasak dengan santan dan bumbu khas Sulawesi Tengah.', available:true },
    { id:'m3', name:'Nasi Jagung', category:'makanan', price:8000,  image:'assets/makanan/nasi-jagung.jpg', desc:'Nasi campuran jagung tradisional yang mengenyangkan dan lezat, sajian khas masyarakat Kaili.', available:true },
    { id:'m4', name:'Duo Goreng',  category:'makanan', price:10000, image:'assets/makanan/duo-goreng.jpg',  desc:'Dua lauk goreng pilihan (ikan & ayam) dengan bumbu tradisional yang crispy dan gurih.', available:true },
    { id:'m5', name:'Palumara',    category:'makanan', price:20000, image:'assets/makanan/palumara.jpg',    desc:'Sop ikan kuah kuning khas Palu dengan cita rasa asam segar dan rempah aromatik.', available:true },
    { id:'m6', name:'Uta Dada',    category:'makanan', price:25000, image:'assets/makanan/uta-dada.jpg',    desc:'Masakan daging dengan saus kelapa khas Kaili yang kaya rasa dan penuh rempah nusantara.', available:true }
  ],
  minuman: [
    { id:'d1', name:'Saraba',      category:'minuman', price:12000, image:'assets/minuman/saraba.jpg',      desc:'Minuman tradisional hangat berbahan jahe, gula aren, dan santan — khas Sulawesi Tengah.', available:true },
    { id:'d2', name:'Es Teh',      category:'minuman', price:8000,  image:'assets/minuman/es-teh.jpg',      desc:'Teh manis segar dengan es batu, menyegarkan di hari yang panas.', available:true },
    { id:'d3', name:'Teh Hangat',  category:'minuman', price:7000,  image:'assets/minuman/teh-hangat.jpg',  desc:'Teh hangat klasik yang menenangkan, sempurna menemani santapan Anda.', available:true },
    { id:'d4', name:'Kopi',        category:'minuman', price:10000, image:'assets/minuman/kopi.jpg',        desc:'Kopi robusta pilihan dari pegunungan Sulawesi Tengah, diseduh kental dan harum.', available:true },
    { id:'d5', name:'Jus Jeruk',   category:'minuman', price:15000, image:'assets/minuman/jus-jeruk.jpg',   desc:'Jus jeruk segar tanpa pemanis buatan, penuh vitamin C alami.', available:true },
    { id:'d6', name:'Air Mineral', category:'minuman', price:5000,  image:'assets/minuman/air-mineral.jpg', desc:'Air mineral segar kemasan botol.', available:true }
  ],
  pencuciMulut: [
    { id:'p1', name:'Palu Butung', category:'pencuci-mulut', price:15000, image:'assets/pencuci-mulut/palu-butung.jpg', desc:'Pisang yang dimasak dengan santan manis dan serutan es, penutup makan khas Palu yang ikonik.', available:true },
    { id:'p2', name:'Pisang Ijo',  category:'pencuci-mulut', price:15000, image:'assets/pencuci-mulut/pisang-ijo.jpg',  desc:'Pisang berbalut tepung berwarna hijau pandan, disajikan dengan bubur sumsum dan sirup merah.', available:true },
    { id:'p3', name:'Cucur',       category:'pencuci-mulut', price:10000, image:'assets/pencuci-mulut/cucur.jpg',       desc:'Kue tradisional berbahan tepung beras dan gula merah, renyah di luar dan lembut di dalam.', available:true }
  ]
};

// ============================================================
// GLOBAL INSTANCES — Singletons yang dibagikan antar halaman
// ============================================================
const Session  = new SessionManager();
const Orders   = new OrderRepository();
const MenuStore= new MenuRepository();
const toast    = new Toast();

// Legacy wrappers agar kode lama di login.js tetap berfungsi
function formatRupiah(num)  { return Formatter.rupiah(num); }
function formatTime(ts)     { return Formatter.time(ts); }
function generateId()       { return Formatter.generateId(); }
function showToast(msg, type) { toast.show(msg, type); }
function statusBadge(status)  { return StatusBadge.render(status); }
function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  Session.clear();
  window.location.href = 'index.html';
}