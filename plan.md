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
| Admin Dashboard | Vue.js | Mengautentikasi admin dan menampilkan tabel peserta yang sudah mendaftar |
| E2E Tests | Selenium WebDriver | Mengotomatisasi registrasi dan memverifikasi data pada dashboard admin |

Autentikasi admin, edit, delete, pencarian, dan pagination termasuk dalam pengembangan karena dashboard menampilkan serta mengelola data peserta. Fitur di luar kebutuhan utama, seperti pembayaran, pengiriman email, dan manajemen event, tidak dibuat pada versi ini.

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
| `POST` | `/api/auth/login` | Memvalidasi kredensial admin dan membuat sesi |
| `GET` | `/api/auth/session` | Memeriksa sesi admin yang sedang aktif |
| `POST` | `/api/auth/logout` | Mengakhiri sesi admin |

Validasi backend mencakup seluruh field wajib, format email sederhana, pilihan kategori lari dan ukuran jersey yang valid, serta persetujuan syarat pendaftaran. Riwayat atau kondisi medis boleh dikosongkan. Tiga endpoint autentikasi merupakan bagian fase pengembangan berikutnya, sedangkan endpoint daftar peserta akan diubah menjadi endpoint yang dilindungi.

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

Dashboard telah memiliki halaman login dan perlindungan akses dengan kebutuhan berikut:

Kredensial akun untuk demonstrasi:

| Field | Nilai |
| --- | --- |
| Username | `admin` |
| Password | `123456` |

Kredensial tersebut hanya digunakan untuk demonstrasi dan pengujian project. Implementasi tetap membaca konfigurasi autentikasi dari environment variable, tidak menulis password langsung di source code, dan menyimpan representasi password dalam bentuk hash apabila perlu disimpan.

- Form username dan password admin.
- Pesan yang jelas ketika kredensial salah.
- Sesi autentikasi yang disimpan dalam cookie `HttpOnly` dan memiliki masa berlaku.
- Endpoint daftar peserta hanya dapat diakses setelah autentikasi berhasil.
- Pengguna yang belum login diarahkan ke halaman login.
- Tombol logout mengakhiri sesi dan mengembalikan pengguna ke halaman login.
- Kredensial dan masa berlaku sesi berasal dari environment variable dan tidak ditulis langsung di source code.

Setelah login, dashboard berisi:

- Judul dashboard.
- Tombol muat ulang bila diperlukan.
- Tabel kode registrasi, nama, email, nomor telepon, kategori lari, ukuran jersey, dan waktu pendaftaran.
- Detail data peserta dan kontak darurat dapat ditampilkan langsung pada tabel atau bagian detail sederhana.
- Pesan ketika belum ada peserta.

## 7. Rencana Test Selenium

Skenario end-to-end utama yang sudah menjadi fondasi pengujian:

1. Pastikan backend, public web, dan admin dashboard berjalan.
2. Buka public web.
3. Isi seluruh data peserta, data lomba, dan kontak darurat dengan email unik.
4. Klik tombol daftar.
5. Pastikan pesan pendaftaran berhasil dan kode registrasi tampil.
6. Buka admin dashboard.
7. Login menggunakan kredensial admin yang valid.
8. Cari email atau kode registrasi peserta pada tabel.
9. Pastikan data utama peserta dan kategori lari tampil.
10. Tutup browser.

Browser dapat dijalankan dalam mode headless agar test dapat digunakan secara lokal maupun di CI.

### Test Suite Selenium

Empat test case fitur registrasi dan pencarian yang telah diimplementasikan:

| ID | Test case | Hasil yang diharapkan |
| --- | --- | --- |
| `TC-01` | Registrasi menggunakan seluruh data yang valid | Pesan sukses dan kode registrasi tampil, kemudian peserta ditemukan pada dashboard admin |
| `TC-02` | Registrasi menggunakan format email yang tidak valid | Form tidak dikirim dan pesan validasi email tampil |
| `TC-03` | Registrasi menggunakan email yang sudah terdaftar | Backend menolak registrasi dan public web menampilkan pesan bahwa email sudah terdaftar |
| `TC-04` | Mencari peserta pada dashboard menggunakan email | Dashboard hanya menampilkan peserta yang sesuai dengan kata kunci pencarian |

Empat test case autentikasi admin yang telah diimplementasikan:

| ID | Test case | Hasil yang diharapkan |
| --- | --- | --- |
| `TC-05` | Login menggunakan kredensial admin yang valid | Login berhasil dan halaman dashboard peserta tampil |
| `TC-06` | Login menggunakan username atau password yang salah | Login ditolak, pesan kesalahan tampil, dan pengguna tetap berada di halaman login |
| `TC-07` | Membuka dashboard atau endpoint daftar peserta tanpa autentikasi | Halaman mengarahkan pengguna ke login dan API menolak permintaan dengan status `401` |
| `TC-08` | Logout setelah berhasil login | Sesi berakhir, halaman login tampil, dan dashboard tidak dapat dibuka kembali tanpa login |

Fitur dasar yang telah ditambahkan untuk mendukung test case tersebut adalah:

1. Pesan validasi form yang dapat diamati secara eksplisit dan memiliki atribut `data-testid`.
2. Pencegahan email peserta duplikat pada database dan backend.
3. Penanganan pesan email duplikat pada public web.
4. Kolom pencarian peserta berdasarkan nama, email, atau kode registrasi pada dashboard admin.
5. Dataset fixture yang terpisah untuk setiap test case agar test dapat dijalankan secara mandiri.
6. Helper Selenium untuk melakukan login agar test dashboard tidak menduplikasi langkah autentikasi.

Setiap test case harus menggunakan data unik apabila membuat registrasi baru. Pengujian tidak boleh bergantung pada urutan eksekusi test case lain, kecuali data prasyarat dibuat sendiri di dalam skenario yang sama.

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

### Tahap 7 — Autentikasi Dashboard Admin

Progress: autentikasi backend, penyimpanan sesi SQLite, konfigurasi environment, proteksi endpoint peserta, API test, halaman login dashboard, pemeriksaan sesi, logout, dan penyesuaian login pada runner Selenium utama telah selesai.

- Menggunakan akun demo dengan username `admin` dan password `123456` untuk login manual dan Selenium.
- Menambahkan konfigurasi username, password hash, dan masa berlaku autentikasi melalui environment variable.
- Menambahkan endpoint login, pemeriksaan sesi, dan logout pada backend.
- Menyimpan sesi autentikasi menggunakan cookie `HttpOnly` dengan pengaturan yang sesuai untuk development dan production.
- Melindungi endpoint `GET /api/registrations` agar hanya dapat diakses oleh admin yang sudah login.
- Menambahkan halaman login, pesan kredensial salah, penjagaan akses dashboard, dan tombol logout.
- Memastikan konfigurasi CORS mengizinkan cookie hanya dari origin dashboard yang ditentukan.
- Menambahkan test backend untuk login berhasil, login gagal, akses tanpa sesi, dan logout.

Hasil tahap: data peserta pada dashboard dan endpoint terkait hanya dapat diakses setelah autentikasi admin berhasil.

### Tahap 8 — Pengembangan Test Suite Selenium

Progress: selesai. `TC-01` sampai `TC-08` sudah dibuat sebagai test case mandiri dengan browser terisolasi, fixture yang sesuai, dan screenshot kegagalan berdasarkan ID.

- Menambahkan tampilan pesan validasi per field pada public web dengan selector `data-testid` yang stabil.
- Menambahkan aturan email unik pada database dan validasi email duplikat pada backend.
- Menampilkan pesan email sudah terdaftar pada public web.
- Menambahkan pencarian nama, email, atau kode registrasi pada dashboard admin.
- Memisahkan dataset fixture sesuai kebutuhan setiap test case.
- Memecah runner Selenium menjadi test case registrasi valid, validasi data tidak valid, email duplikat, pencarian peserta, login valid, login gagal, akses tanpa autentikasi, dan logout.
- Menambahkan helper login yang digunakan oleh test case yang perlu membuka dashboard.
- Menyimpan screenshot kegagalan dengan nama yang menunjukkan ID test case.
- Menjalankan seluruh test case pada mode development dan memastikan hasilnya konsisten.

Hasil tahap: delapan test case awal Selenium dapat dijalankan secara mandiri dan memberikan hasil lulus atau gagal yang jelas.

### Tahap 9 — Edit, Delete, dan Pagination Registrasi

Progress: selesai. Setelah mendapat instruksi lanjutan pengguna, fitur edit dan delete dilengkapi `TC-09` sampai `TC-12`. Suite development terakhir lulus 12/12.

- Menambahkan pagination server-side dengan nilai bawaan 10 data per halaman.
- Menambahkan pencarian server-side berdasarkan nama, email, atau kode registrasi.
- Menambahkan ringkasan total peserta, kategori 5K, dan kategori 10K yang tidak bergantung pada halaman aktif.
- Menambahkan endpoint terlindungi untuk mengubah dan menghapus registrasi.
- Menambahkan modal edit untuk seluruh data peserta yang dapat diubah.
- Menambahkan konfirmasi sebelum penghapusan permanen.
- Menyesuaikan halaman aktif setelah data terakhir pada suatu halaman dihapus.
- Menambahkan `TC-09` untuk edit menggunakan data valid.
- Menambahkan `TC-10` untuk penolakan edit menggunakan email peserta lain.
- Menambahkan `TC-11` untuk pembatalan konfirmasi delete.
- Menambahkan `TC-12` untuk penghapusan data yang dibuat sendiri oleh test.
- Menjalankan kembali delapan test case lama sebagai regression testing hingga seluruh suite lulus 12/12.

Hasil tahap: admin dapat mengelola data peserta dalam tabel yang dibagi per halaman tanpa memperpanjang tampilan dashboard secara berlebihan.

## 9. Batasan dan Prinsip Implementasi

- Mengutamakan kode sederhana dan mudah dipahami.
- Menjaga setiap fitur tambahan tetap sederhana dan sesuai instruksi pengguna.
- Autentikasi hanya mencakup satu akun admin sederhana dan belum memiliki fitur manajemen pengguna atau pemulihan password.
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
- Dashboard dan endpoint daftar peserta menolak akses pengguna yang belum terautentikasi.
- Admin dapat login menggunakan kredensial yang valid dan dapat mengakhiri sesi melalui logout.
- Admin dapat mencari, mengubah, dan menghapus registrasi melalui tabel dengan pagination.
- Selenium berhasil menjalankan alur registrasi hingga verifikasi dashboard secara otomatis.
- Selenium memiliki dua belas test case yang mencakup registrasi, validasi negatif, email duplikat, pencarian, autentikasi, edit, dan delete.
- Setiap test case dapat dijalankan secara mandiri dan menghasilkan informasi kegagalan yang mudah ditelusuri.
- Petunjuk menjalankan aplikasi dan test tersedia di README.
