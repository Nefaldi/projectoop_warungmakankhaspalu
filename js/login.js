/* ============================================================
   WARUNG PALU — login.js
   ============================================================ */

'use strict';

// Redirect if already logged in
(function () {
  const s = Session.get();
  if (s && s.role === 'customer') { window.location.href = 'menu.html'; return; }
  if (s && s.role === 'cashier')  { window.location.href = 'dashboard.html'; return; }
})();

function loginCustomer() {
  const tableInput = document.getElementById('tableNumber');
  const nameInput  = document.getElementById('customerName');
  const table = parseInt(tableInput.value, 10);

  if (!table || table < 1 || table > 50) {
    showToast('Masukkan nomor meja yang valid (1–50)', 'error');
    tableInput.focus();
    tableInput.style.borderColor = 'var(--clr-primary)';
    setTimeout(() => { tableInput.style.borderColor = ''; }, 1500);
    return;
  }

  Session.set({
    role: 'customer',
    meja: table,
    name: nameInput.value.trim() || 'Tamu',
    loginAt: Date.now()
  });

  showToast(`Selamat datang! Meja ${table}`, 'success');
  setTimeout(() => { window.location.href = 'menu.html'; }, 600);
}

function loginCashier() {
  const user = document.getElementById('cashierUser').value.trim();
  const pass = document.getElementById('cashierPass').value;

  // Demo credentials
  if (user === 'admin' && pass === 'admin123') {
    Session.set({ role: 'cashier', username: user, loginAt: Date.now() });
    showToast('Login berhasil! Selamat bekerja 👋', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } else {
    showToast('Username atau password salah', 'error');
    const passInput = document.getElementById('cashierPass');
    passInput.style.borderColor = 'var(--clr-primary)';
    setTimeout(() => { passInput.style.borderColor = ''; }, 1500);
  }
}

// Allow Enter key
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const active = document.activeElement;
  if (['tableNumber', 'customerName'].includes(active.id)) loginCustomer();
  if (['cashierUser', 'cashierPass'].includes(active.id))  loginCashier();
});
