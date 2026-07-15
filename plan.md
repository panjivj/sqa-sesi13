# Rencana Pengembangan Aplikasi Pendaftaran Event Lari

## 1. Tujuan

Membuat aplikasi proof of concept pendaftaran event lari dalam satu monorepo. Aplikasi dibuat sesederhana mungkin karena tujuan utamanya adalah mendemonstrasikan test automation menggunakan Selenium WebDriver.

Kriteria keberhasilan utama:

1. Selenium membuka website publik.
2. Selenium mengisi dan mengirim formulir pendaftaran.
3. Backend menyimpan data peserta ke SQLite.
4. Selenium membuka dashboard admin.
5. Selenium memastikan peserta yang baru didaftarkan muncul di dashboard.

## 2. Ruang Lingkup

Repository akan memiliki empat service:

| Service | Teknologi | Tanggung jawab |
| --- | --- | --- |
| Backend API | Express.js dan SQLite | Menyediakan informasi event, menerima registrasi, dan menyediakan daftar peserta |
| Public Web | Vue.js | Menampilkan informasi event dan formulir pendaftaran |
| Admin Dashboard | Vue.js | Menampilkan tabel peserta yang sudah mendaftar |
| E2E Tests | Selenium WebDriver | Mengotomatisasi registrasi dan memverifikasi data pada dashboard admin |

Fitur di luar kebutuhan test utama, seperti autentikasi admin, pembayaran, pengiriman email, edit peserta, hapus peserta, pagination, dan manajemen event, tidak dibuat pada versi ini.

## 3. Struktur Repository

Struktur yang direncanakan:

```text
.
├── apps/
│   ├── backend/
│   ├── public-web/
│   ├── admin-dashboard/
│   └── e2e-tests/
├── package.json
├── .gitignore
├── README.md
└── plan.md
```

Repository menggunakan npm workspaces agar keempat service dapat dikelola dari root repository.

## 4. Rancangan Data Minimal

### Event

Hanya ada satu event contoh yang dibuat otomatis sebagai seed.

Field yang diperlukan:

- `id`
- `name`
- `description`
- `event_date`
- `location`

### Registration

Field yang diisi peserta melalui formulir:

- `name`
- `email`
- `phone`
- `gender`
- `birth_date`
- `address`
- `race_category`
- `shirt_size`
- `emergency_contact_name`
- `emergency_contact_phone`
- `medical_condition` (opsional)
- `agree_to_terms`

Field yang dibuat otomatis oleh backend:

- `id`
- `event_id`
- `registration_code`
- `created_at`

Kategori lari pada proof of concept ini cukup menggunakan pilihan `5K` dan `10K`. Ukuran jersey menggunakan pilihan `S`, `M`, `L`, `XL`, dan `XXL`.

## 5. Rancangan API Minimal

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/health` | Memastikan backend aktif |
| `GET` | `/api/event` | Mengambil informasi satu event |
| `POST` | `/api/registrations` | Menyimpan pendaftaran peserta |
| `GET` | `/api/registrations` | Mengambil seluruh peserta untuk dashboard admin |

Validasi backend mencakup seluruh field wajib, format email sederhana, pilihan kategori lari dan ukuran jersey yang valid, serta persetujuan syarat pendaftaran. Riwayat atau kondisi medis boleh dikosongkan.

## 6. Rancangan Antarmuka

### Public Web

Satu halaman yang berisi:

- Nama dan informasi event.
- Form identitas peserta: nama, email, nomor telepon, jenis kelamin, tanggal lahir, dan alamat.
- Form kebutuhan event: kategori lari dan ukuran jersey.
- Form keselamatan: nama dan nomor telepon kontak darurat serta kondisi medis opsional.
- Checkbox persetujuan syarat pendaftaran.
- Tombol daftar.
- Pesan berhasil beserta kode registrasi atau pesan gagal.

Elemen penting akan diberi atribut `data-testid` agar mudah dan stabil saat dipilih oleh Selenium.

### Admin Dashboard

Satu halaman tanpa login yang berisi:

- Judul dashboard.
- Tombol muat ulang bila diperlukan.
- Tabel kode registrasi, nama, email, nomor telepon, kategori lari, ukuran jersey, dan waktu pendaftaran.
- Detail data peserta dan kontak darurat dapat ditampilkan langsung pada tabel atau bagian detail sederhana.
- Pesan ketika belum ada peserta.

## 7. Rencana Test Selenium

Satu skenario end-to-end utama:

1. Pastikan backend, public web, dan admin dashboard berjalan.
2. Buka public web.
3. Isi seluruh data peserta, data lomba, dan kontak darurat dengan email unik.
4. Klik tombol daftar.
5. Pastikan pesan pendaftaran berhasil dan kode registrasi tampil.
6. Buka admin dashboard.
7. Cari email atau kode registrasi peserta pada tabel.
8. Pastikan data utama peserta dan kategori lari tampil.
9. Tutup browser.

Browser dijalankan dalam mode headless agar test dapat digunakan secara lokal maupun di CI.

## 8. Tahapan Pengerjaan

Pengerjaan harus dilakukan satu tahap pada satu waktu dan hanya dilanjutkan setelah ada perintah dari pengguna.

### Tahap 1 — Fondasi Monorepo

- Membuat root `package.json` dan npm workspaces.
- Membuat folder empat service.
- Menambahkan `.gitignore` dan perintah dasar.

Hasil tahap: struktur repository tersedia dan dependency dapat diinstal.

### Tahap 2 — Backend API

- Membuat Express.js server.
- Membuat dan menginisialisasi database SQLite.
- Membuat satu event seed.
- Membuat endpoint event dan registrasi.
- Memverifikasi endpoint secara manual atau dengan test API sederhana.

Hasil tahap: data registrasi dapat disimpan dan dibaca kembali.

### Tahap 3 — Public Web

- Membuat aplikasi Vue.js.
- Menampilkan informasi event dari backend.
- Membuat formulir registrasi event lari dengan data peserta, kategori, jersey, kontak darurat, dan kondisi medis.
- Menampilkan status berhasil atau gagal.

Hasil tahap: pengguna dapat mendaftar melalui browser.

### Tahap 4 — Admin Dashboard

- Membuat aplikasi Vue.js terpisah.
- Mengambil daftar peserta dari backend.
- Menampilkan peserta dalam tabel sederhana.

Hasil tahap: data peserta dapat dilihat melalui browser.

### Tahap 5 — Selenium WebDriver

- Menyiapkan Selenium dan browser headless.
- Membuat skenario registrasi publik.
- Membuka dashboard dan memverifikasi peserta.
- Menambahkan screenshot ketika test gagal jika diperlukan.

Hasil tahap: skenario end-to-end utama berhasil dijalankan otomatis.

### Tahap 6 — Integrasi dan Dokumentasi

- Menambahkan perintah untuk menjalankan service dari root.
- Menjalankan seluruh alur beberapa kali untuk memastikan konsisten.
- Menulis petunjuk instalasi, menjalankan aplikasi, dan menjalankan test di `README.md`.

Hasil tahap: project dapat digunakan ulang dengan instruksi yang singkat dan jelas.

## 9. Batasan dan Prinsip Implementasi

- Mengutamakan kode sederhana dan mudah dipahami.
- Tidak menambahkan fitur yang tidak mendukung skenario Selenium utama.
- Tidak menggunakan autentikasi untuk dashboard admin pada proof of concept ini.
- SQLite digunakan sebagai satu file database lokal.
- Tidak mengoptimalkan aplikasi untuk produksi atau trafik tinggi.
- Setiap tahap harus diverifikasi sebelum melanjutkan ke tahap berikutnya.
- Implementasi tahap berikutnya hanya dimulai setelah ada instruksi pengguna.

## 10. Definition of Done

Project dinyatakan selesai jika:

- Keempat service tersedia di repository.
- Backend menyimpan registrasi ke SQLite.
- Public web berhasil mengirim registrasi.
- Dashboard admin menampilkan data registrasi.
- Selenium berhasil menjalankan alur registrasi hingga verifikasi dashboard secara otomatis.
- Petunjuk menjalankan aplikasi dan test tersedia di README.
