# 🍲 Warung Palu — Website Pemesanan Makanan Khas Palu

Website pemesanan makanan khas Palu berbasis HTML, CSS, dan JavaScript murni (tanpa framework).

---

## 📁 Struktur Folder

```
warung-palu/
├── index.html              ← Halaman Login (Pelanggan & Kasir)
├── menu.html               ← Halaman Menu (Pelanggan)
├── dashboard.html          ← Halaman Kasir / Admin
│
├── css/
│   ├── main.css            ← CSS global, variabel, komponen bersama
│   ├── login.css           ← CSS halaman login
│   ├── menu.css            ← CSS halaman menu pelanggan
│   └── dashboard.css       ← CSS halaman kasir
│
├── js/
│   ├── app.js              ← Data menu, utilitas, storage (dimuat di semua halaman)
│   ├── login.js            ← Logika login
│   ├── menu.js             ← Logika menu pelanggan & keranjang
│   └── dashboard.js        ← Logika dashboard kasir
│
└── assets/
    ├── makanan/            ← Letakkan gambar makanan di sini
    │   ├── kaledo.jpg
    │   ├── sayur-kelor.jpg
    │   ├── nasi-jagung.jpg
    │   ├── duo-goreng.jpg
    │   ├── palumara.jpg
    │   └── uta-dada.jpg
    │
    ├── minuman/            ← Letakkan gambar minuman di sini
    │   ├── saraba.jpg
    │   ├── es-teh.jpg
    │   ├── teh-hangat.jpg
    │   ├── kopi.jpg
    │   ├── jus-jeruk.jpg
    │   └── air-mineral.jpg
    │
    ├── pencuci-mulut/      ← Letakkan gambar pencuci mulut di sini
    │   ├── palu-butung.jpg
    │   ├── pisang-ijo.jpg
    │   └── cucur.jpg
    │
    └── icons/
        └── logo.png        ← Logo warung (opsional)
```

---

## 🚀 Cara Menjalankan

1. Buka file `index.html` di browser (double-click atau gunakan Live Server di VS Code)
2. Tidak perlu server khusus — semua berjalan di sisi klien

> **Catatan**: Jika gambar tidak muncul, pastikan nama file gambar sesuai dengan path di atas. Website tetap berfungsi tanpa gambar (emoji akan ditampilkan sebagai pengganti).

---

## 👤 Login Pelanggan

1. Buka `index.html`
2. Masukkan **Nomor Meja** (1–50)
3. Masukkan nama (opsional)
4. Klik **Mulai Pesan**

## 👨‍💼 Login Kasir

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123`|

---

## ✨ Fitur Lengkap

### Halaman Pelanggan (`menu.html`)
- Pilih menu dengan filter kategori (Makanan / Minuman / Pencuci Mulut)
- Modal detail item dengan pilih jumlah
- Keranjang pesanan (sidebar)
- Checkout & kirim pesanan
- Pantau status pesanan secara real-time (auto-refresh 15 detik)

### Halaman Kasir (`dashboard.html`)
- Dashboard statistik (Menunggu / Diproses / Selesai / Pendapatan)
- Kelola pesanan masuk dengan filter status
- Update status: Menunggu → Diproses → Selesai
- Detail pesanan lengkap
- Kelola menu: tambah, edit, hapus item
- Riwayat pesanan selesai

---

## 💾 Penyimpanan Data

Data disimpan di **localStorage** browser, sehingga:
- Tidak perlu database atau server
- Data bertahan selama browser tidak dibersihkan
- Antara tab berbeda tetap sinkron jika dibuka ulang

---

## 🎨 Menambahkan Gambar

1. Siapkan gambar dalam format `.jpg`, `.png`, atau `.webp`
2. Tempatkan di folder `assets/` sesuai kategori
3. Penamaan file harus **persis sama** dengan tabel di atas
4. Resolusi disarankan: **600×400 piksel** atau lebih (rasio 3:2)

---

## ⚙️ Kustomisasi

### Mengubah Harga Menu
Edit file `js/app.js`, cari objek `MENU_DATA` dan ubah nilai `price`.

### Menambah Item Menu Baru (lewat kode)
Tambahkan objek baru di array yang sesuai di `MENU_DATA` dalam `js/app.js`.

### Mengubah Warna Tema
Edit variabel CSS di bagian `:root` dalam `css/main.css`:
```css
--clr-primary:    #C8402A;  /* Merah utama */
--clr-accent:     #E8973A;  /* Kuning aksen */
```

### Menambah Kasir
Edit fungsi `loginCashier()` di `js/login.js` untuk menambah akun.
