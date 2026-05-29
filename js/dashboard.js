/* ============================================================
   WARUNG PALU — dashboard.js
   OOP: DashboardPage mengorkestrasikan semua komponen kasir
   ============================================================ */

'use strict';

// Auth guard
(function () {
  if (!Session.isCashier()) { window.location.href = 'index.html'; }
})();

// ============================================================
// INHERITANCE — StatsComponent mewarisi UIComponent
// ============================================================
class StatsComponent extends UIComponent {
  constructor() {
    super('statsRow');
  }

  // Override abstract method render()
  render() {
    const orders = Orders.getAll();
    const today  = new Date().toDateString();

    const waiting = orders.filter(o => o.status === 'menunggu').length;
    const process = orders.filter(o => o.status === 'diproses').length;
    const done    = orders.filter(o => o.status === 'selesai').length;
    const revenue = orders
      .filter(o => o.status === 'selesai' && new Date(o.createdAt).toDateString() === today)
      .reduce((s, o) => s + o.total, 0);

    document.getElementById('statWaiting').textContent = waiting;
    document.getElementById('statProcess').textContent = process;
    document.getElementById('statDone').textContent    = done;
    document.getElementById('statRevenue').textContent = Formatter.rupiah(revenue);

    const badge   = document.getElementById('sidebarBadge');
    const pending = waiting + process;
    badge.textContent    = pending;
    badge.style.display  = pending ? 'inline' : 'none';
  }
}

// ============================================================
// INHERITANCE — OrdersGrid mewarisi UIComponent
// ============================================================
class OrdersGridComponent extends UIComponent {
  #currentFilter = 'semua';

  constructor() {
    super('ordersGrid');
  }

  setFilter(filter) {
    this.#currentFilter = filter;
  }

  // Override abstract method render()
  render() {
    let orders = Orders.getAll();

    if (this.#currentFilter !== 'semua') {
      orders = orders.filter(o => o.status === this.#currentFilter);
    }

    // Sort: menunggu → diproses → selesai
    const priority = { menunggu: 0, diproses: 1, selesai: 2 };
    orders.sort((a, b) =>
      (priority[a.status] - priority[b.status]) || (b.createdAt - a.createdAt)
    );

    if (!orders.length) {
      this.setHTML('<div class="empty-state full-width"><p>Tidak ada pesanan</p></div>');
      return;
    }

    this.setHTML(orders.map((o, i) => this.#createCardHTML(o, i)).join(''));
  }

  // Private: detail HTML kartu tidak perlu diketahui luar
  #createCardHTML(order, index) {
    const itemsHtml = order.items.map(i => `<span>${i.name} ×${i.qty}</span>`).join('');
    const nextBtn   = this.#getNextStatusBtn(order);

    return `
      <div class="order-card" style="animation-delay:${index * 0.05}s">
        <div class="order-card-header">
          <div>
            <div class="meja-label">Meja</div>
            <div class="meja-num">${order.meja}</div>
          </div>
          ${StatusBadge.render(order.status)}
        </div>
        <div class="order-card-body">
          <div class="order-card-items">${itemsHtml}</div>
          ${order.note ? `<div class="order-card-note">${order.note}</div>` : ''}
          <div class="order-card-total">${Formatter.rupiah(order.total)}</div>
          <div class="order-card-time">${Formatter.time(order.createdAt)}</div>
        </div>
        <div class="order-card-footer">
          <button class="btn-status btn-detail" onclick="dashPage.openOrderModal('${order.id}')">Detail</button>
          <div>${nextBtn}</div>
        </div>
      </div>
    `;
  }

  // Polymorphism: output berbeda berdasarkan status (open/closed principle)
  #getNextStatusBtn(order) {
    const handlers = {
      menunggu: `<button class="btn-status btn-process" onclick="dashPage.updateStatus('${order.id}','diproses')">Proses</button>`,
      diproses: `<button class="btn-status btn-done"    onclick="dashPage.updateStatus('${order.id}','selesai')">Selesai</button>`,
      selesai:  `<span style="font-size:.82rem;color:var(--clr-success);font-weight:700;">Selesai ✓</span>`
    };
    return handlers[order.status] || '';
  }
}

// ============================================================
// INHERITANCE — OrderModal mewarisi UIComponent
// ============================================================
class OrderModalComponent extends UIComponent {
  #currentId = null;
  #onStatusChange;

  constructor(onStatusChange) {
    super('orderModal');
    this.#onStatusChange = onStatusChange;
  }

  // Override abstract method render()
  render(orderId) {
    const order = Orders.getAll().find(o => o.id === orderId);
    if (!order) return;
    this.#currentId = orderId;

    const content = `
      <div style="margin-bottom:1rem;">
        <p style="font-size:.8rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">ID Pesanan</p>
        <p style="font-weight:700;color:var(--clr-dark);">#${order.id}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div>
          <p style="font-size:.8rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">Meja</p>
          <p style="font-size:1.5rem;font-weight:700;font-family:var(--ff-display);color:var(--clr-dark);">${order.meja}</p>
        </div>
        <div>
          <p style="font-size:.8rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Status</p>
          ${StatusBadge.render(order.status)}
        </div>
      </div>
      <div style="margin-bottom:1rem;">
        <p style="font-size:.8rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem;">Item Pesanan</p>
        <div style="background:var(--clr-bg);border-radius:var(--radius-sm);padding:.75rem;">
          ${order.items.map(i => `
            <div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--clr-border);">
              <span>${i.name} ×${i.qty}</span>
              <span style="font-weight:600;">${Formatter.rupiah(i.price * i.qty)}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding:.5rem 0 0;font-weight:700;color:var(--clr-primary);">
            <span>Total</span>
            <span>${Formatter.rupiah(order.total)}</span>
          </div>
        </div>
      </div>
      ${order.note ? `<div style="margin-bottom:1rem;"><p style="font-size:.8rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">Catatan</p><p style="font-style:italic;color:var(--clr-mid);">${order.note}</p></div>` : ''}
      <p style="font-size:.75rem;color:var(--clr-muted);">Dipesan: ${Formatter.time(order.createdAt)}</p>
    `;

    // Polymorphism: tombol aksi berbeda bergantung status
    const actionMap = {
      menunggu: `<button class="btn-status btn-process" onclick="dashPage.updateStatusAndClose('${orderId}','diproses')">Proses Sekarang</button>`,
      diproses: `<button class="btn-status btn-done"    onclick="dashPage.updateStatusAndClose('${orderId}','selesai')">Tandai Selesai</button>`
    };

    document.getElementById('orderModalContent').innerHTML = content;
    document.getElementById('orderModalActions').innerHTML = actionMap[order.status] || '';

    this.el.classList.add('open');
    document.getElementById('modalOverlay').classList.add('active');
  }

  close() {
    this.el?.classList.remove('open');
    document.getElementById('modalOverlay')?.classList.remove('active');
    this.#currentId = null;
  }
}

// ============================================================
// INHERITANCE — MenuManagerComponent mewarisi UIComponent
// ============================================================
class MenuManagerComponent extends UIComponent {
  #currentFilter = 'semua';
  #editingId = null;

  constructor() {
    super('menuManagerBody');
  }

  setFilter(filter) {
    this.#currentFilter = filter;
  }

  // Override abstract method render()
  render() {
    const items = MenuStore.byCategory(this.#currentFilter);

    if (!items.length) {
      this.setHTML('<tr><td colspan="6" style="text-align:center;color:var(--clr-muted);padding:2rem;">Tidak ada item</td></tr>');
      return;
    }

    this.setHTML(items.map(item => `
      <tr>
        <td>
          <div class="table-img">
            <img src="${item.image}" alt="${item.name}"
                 onload="this.nextElementSibling.style.display='none'"
                 onerror="this.style.display='none'">
            <div class="table-img-placeholder"></div>
          </div>
        </td>
        <td style="font-weight:600;">${item.name}</td>
        <td><span class="cat-pill ${item.category}">${item.category}</span></td>
        <td style="font-weight:600;color:var(--clr-primary);">${Formatter.rupiah(item.price)}</td>
        <td>
          <span class="availability-dot ${item.available ? 'dot-yes' : 'dot-no'}"></span>
          ${item.available ? 'Tersedia' : 'Habis'}
        </td>
        <td>
          <button class="btn-edit"   onclick="dashPage.openEditMenuModal('${item.id}')">Edit</button>
          <button class="btn-delete" onclick="dashPage.deleteMenuItem('${item.id}','${item.name}')">Hapus</button>
        </td>
      </tr>
    `).join(''));
  }

  openAddModal() {
    this.#editingId = null;
    document.getElementById('menuModalTitle').textContent = 'Tambah Item Menu';
    ['editMenuId','menuName','menuPrice','menuDesc','menuEmoji','menuImage'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('menuCategory').value = 'makanan';
    document.getElementById('menuAvailable').checked = true;
    this.#showModal();
  }

  openEditModal(id) {
    const item = MenuStore.getAll().find(i => i.id === id);
    if (!item) return;
    this.#editingId = id;

    document.getElementById('menuModalTitle').textContent = 'Edit Item Menu';
    document.getElementById('editMenuId').value   = id;
    document.getElementById('menuName').value     = item.name;
    document.getElementById('menuCategory').value = item.category;
    document.getElementById('menuPrice').value    = item.price;
    document.getElementById('menuDesc').value     = item.desc;
    document.getElementById('menuEmoji').value    = item.emoji || '';
    document.getElementById('menuImage').value    = item.image || '';
    document.getElementById('menuAvailable').checked = item.available !== false;
    this.#showModal();
  }

  save() {
    const name      = document.getElementById('menuName').value.trim();
    const category  = document.getElementById('menuCategory').value;
    const price     = parseInt(document.getElementById('menuPrice').value, 10);
    const desc      = document.getElementById('menuDesc').value.trim();
    const emoji     = document.getElementById('menuEmoji').value.trim();
    const image     = document.getElementById('menuImage').value.trim();
    const available = document.getElementById('menuAvailable').checked;

    if (!name || !price) {
      toast.error('Nama dan harga wajib diisi');
      return;
    }

    const data = { name, category, price, desc, emoji, image, available };

    if (this.#editingId) {
      MenuStore.update(this.#editingId, data);
      toast.success('Menu berhasil diperbarui');
    } else {
      MenuStore.add(data);
      toast.success('Menu baru berhasil ditambahkan');
    }

    this.closeModal();
    this.render();
  }

  delete(id, name) {
    if (!confirm(`Hapus "${name}" dari menu?`)) return;
    MenuStore.delete(id);
    this.render();
    toast.show(`"${name}" dihapus dari menu`);
  }

  closeModal() {
    document.getElementById('menuModal').classList.remove('open');
    document.getElementById('menuModalOverlay').classList.remove('active');
    this.#editingId = null;
  }

  #showModal() {
    document.getElementById('menuModal').classList.add('open');
    document.getElementById('menuModalOverlay').classList.add('active');
  }
}

// ============================================================
// INHERITANCE — HistoryComponent mewarisi UIComponent
// ============================================================
class HistoryComponent extends UIComponent {
  constructor() {
    super('historyList');
  }

  // Override abstract method render()
  render() {
    const done = Orders.getAll().filter(o => o.status === 'selesai');

    if (!done.length) {
      this.setHTML('<div class="empty-state"><p>Belum ada riwayat pesanan selesai</p></div>');
      return;
    }

    this.setHTML(done.map(o => `
      <div class="history-card">
        <div class="history-meja">M${o.meja}</div>
        <div class="history-info">
          <div class="history-items">${o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</div>
          <div class="history-time">${Formatter.time(o.createdAt)}</div>
        </div>
        <div class="history-total">${Formatter.rupiah(o.total)}</div>
      </div>
    `).join(''));
  }
}

// ============================================================
// ENCAPSULATION — DashboardPage
// Mengorkestrasikan seluruh dashboard kasir
// ============================================================
class DashboardPage {
  #stats;
  #ordersGrid;
  #orderModal;
  #menuManager;
  #history;

  constructor() {
    this.#stats       = new StatsComponent();
    this.#ordersGrid  = new OrdersGridComponent();
    this.#orderModal  = new OrderModalComponent();
    this.#menuManager = new MenuManagerComponent();
    this.#history     = new HistoryComponent();
  }

  init() {
    this.#updateClock();
    setInterval(() => this.#updateClock(), 1000);
    setInterval(() => this.#autoRefresh(), 20000);

    this.#stats.render();
    this.#ordersGrid.render();
    this.#menuManager.render();

    // Tutup sidebar saat klik di luar
    document.addEventListener('click', e => {
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 900 &&
          sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !e.target.closest('.btn-sidebar-toggle')) {
        sidebar.classList.remove('open');
      }
    });
  }

  #updateClock() {
    const el = document.getElementById('topbarTime');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  #autoRefresh() {
    this.#stats.render();
    this.#ordersGrid.render();
  }

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  }

  showSection(name) {
    event.preventDefault();
    const titles = { orders: 'Order Masuk', 'menu-manager': 'Kelola Menu', history: 'Riwayat' };
    const sectionMap = {
      orders:         'sectionOrders',
      'menu-manager': 'sectionMenuManager',
      history:        'sectionHistory'
    };
    const navMap = {
      orders:         'navOrders',
      'menu-manager': 'navMenu',
      history:        'navHistory'
    };

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById(navMap[name])?.classList.add('active');
    document.getElementById('topbarTitle').textContent = titles[name] || '';

    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionMap[name])?.classList.add('active');

    if (name === 'orders')        { this.#stats.render(); this.#ordersGrid.render(); }
    if (name === 'menu-manager')  { this.#menuManager.render(); }
    if (name === 'history')       { this.#history.render(); }

    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  }

  filterOrders(filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    this.#ordersGrid.setFilter(filter);
    this.#ordersGrid.render();
  }

  updateStatus(id, status) {
    Orders.updateStatus(id, status);
    this.#stats.render();
    this.#ordersGrid.render();
    const labels = { diproses: 'Pesanan diproses', selesai: 'Pesanan selesai' };
    toast.success(labels[status] || 'Status diperbarui');
  }

  updateStatusAndClose(id, status) {
    this.updateStatus(id, status);
    this.closeModal();
  }

  openOrderModal(id)  { this.#orderModal.render(id); }
  closeModal()        { this.#orderModal.close(); }

  filterManagerCat(cat) {
    document.querySelectorAll('.mtab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    this.#menuManager.setFilter(cat);
    this.#menuManager.render();
  }

  openAddMenuModal()       { this.#menuManager.openAddModal(); }
  openEditMenuModal(id)    { this.#menuManager.openEditModal(id); }
  saveMenuItem()           { this.#menuManager.save(); }
  deleteMenuItem(id, name) { this.#menuManager.delete(id, name); }
  closeMenuModal()         { this.#menuManager.closeModal(); }
}

// ============================================================
// BOOTSTRAP
// ============================================================
const dashPage = new DashboardPage();

document.addEventListener('DOMContentLoaded', () => dashPage.init());

// Expose ke global scope untuk HTML onclick
function toggleSidebar()         { dashPage.toggleSidebar(); }
function showDashSection(name)   { dashPage.showSection(name); }
function filterOrders(f)         { dashPage.filterOrders(f); }
function openOrderModal(id)      { dashPage.openOrderModal(id); }
function closeModal()            { dashPage.closeModal(); }
function filterManagerCat(cat)   { dashPage.filterManagerCat(cat); }
function openAddMenuModal()      { dashPage.openAddMenuModal(); }
function saveMenuItem()          { dashPage.saveMenuItem(); }
function closeMenuModal()        { dashPage.closeMenuModal(); }
