# Aplikasi Pendaftaran Event Lari dan Pengujian Otomatis Menggunakan Selenium WebDriver

Disusun oleh:

| Data | Keterangan |
| --- | --- |
| Nama | Panji Jaya Sutra |
| NIM | 20220801517 |
| Program Studi | [Teknik Informatika] |
| Mata Kuliah | Software Quality Assurance - CIE724 |
| Dosen Pengampu | [Ir. DIAH ARYANI , ST, M.Kom] |
| Kampus | Universitas Esa Unggul |

## Akses Cepat

- [Buka draft presentasi laporan project SQA](draft_ppt_laporan_project_sqa.pptx)
- [Demo website pendaftaran](https://running-event.esgul.my.id)
- [Demo dashboard admin](https://dashboard-event.esgul.my.id)

# Run Event Registration PoC

Proof of concept pendaftaran event lari untuk demonstrasi test automation dengan Selenium WebDriver. Repository ini menggunakan monorepo npm dan terdiri dari empat service sederhana.

| Service | Teknologi | URL lokal |
| --- | --- | --- |
| Backend API | Express.js dan SQLite | `http://localhost:3000` |
| Public web | Vue.js dan Vite | `http://localhost:5173` |
| Admin dashboard | Vue.js dan Vite | `http://localhost:5174` |
| E2E test | Selenium WebDriver | Dijalankan dari terminal |

Alur utama yang diuji:

```text
Public web → isi formulir → simpan ke SQLite → login admin → buka dashboard → verifikasi peserta
```

## Test Suite Selenium dan Login Admin

### Hasil Pengujian Black Box

Pengujian menggunakan metode **black box**, yaitu memeriksa fungsi aplikasi melalui data input, tindakan pengguna, dan keluaran yang terlihat tanpa bergantung pada struktur kode internal. Selenium WebDriver bertindak sebagai pengguna pada public web dan dashboard admin, kemudian membandingkan hasil aktual dengan hasil yang diharapkan.

Pengujian terakhir dijalankan pada environment production tanggal **23 Juli 2026** melalui public web `https://running-event.esgul.my.id` dan dashboard `https://dashboard-event.esgul.my.id`. Selenium memiliki delapan test case registrasi dan pengelolaan data serta empat test case autentikasi admin. Nilai `{{runId}}` dibuat otomatis pada setiap eksekusi agar email peserta tetap unik.

| ID | Skenario Pengujian | Test Case (Data Input) | Hasil yang Diharapkan | Hasil Aktual | Status |
| --- | --- | --- | --- | --- | --- |
| `TC-01` | Melakukan registrasi menggunakan seluruh data yang valid | Nama: `Selenium Test {{runId}}`<br>Email: `selenium.{{runId}}@example.com`<br>Telepon: `081234567890`<br>Gender: `Laki-laki`<br>Tanggal lahir: `2000-01-15`<br>Kategori: `10K`<br>Ukuran kaus: `L` | Pesan sukses dan kode registrasi tampil; peserta ditemukan pada dashboard dengan email, kode, dan kategori yang sesuai | Pesan sukses dan kode registrasi tampil; data peserta ditemukan pada dashboard | Lulus |
| `TC-02` | Melakukan registrasi menggunakan format email yang tidak valid | Nama: `Selenium Invalid {{runId}}`<br>Email: `email-tidak-valid-{{runId}}`<br>Kategori: `5K` | Form tidak dikirim, pesan `Format email tidak valid` tampil, dan pesan registrasi sukses tidak muncul | Pesan validasi email tampil dan registrasi tidak tersimpan | Lulus |
| `TC-03` | Melakukan registrasi dua kali menggunakan email yang sama | Email: `selenium.duplicate.{{runId}}@example.com`<br>Pengiriman form: `2 kali` | Registrasi pertama berhasil; registrasi kedua ditolak dengan pesan email sudah terdaftar | Registrasi kedua ditolak dan pesan email sudah terdaftar tampil | Lulus |
| `TC-04` | Mencari peserta pada dashboard menggunakan email | Kata kunci: `selenium.search.{{runId}}@example.com` | Dashboard hanya menampilkan satu peserta yang memiliki email dan kode registrasi yang sesuai | Satu data peserta yang sesuai ditampilkan | Lulus |
| `TC-05` | Login admin menggunakan kredensial yang valid | Username: `admin`<br>Password: `123456` | Login berhasil, dashboard peserta tampil, dan username admin ditampilkan | Dashboard tampil dan username `admin` teridentifikasi | Lulus |
| `TC-06` | Login admin menggunakan password yang salah | Username: `admin`<br>Password: `123456-salah` | Login ditolak, pesan username atau password salah tampil, dan pengguna tetap pada halaman login | Pesan kesalahan tampil dan dashboard tidak terbuka | Lulus |
| `TC-07` | Mengakses dashboard tanpa sesi autentikasi | Buka URL dashboard tanpa cookie sesi | Form login tampil dan konten dashboard tidak dapat diakses | Form login tampil dan dashboard tidak ditampilkan | Lulus |
| `TC-08` | Logout setelah berhasil login sebagai admin | Username: `admin`<br>Password: `123456`<br>Aksi: klik tombol `Logout`, lalu refresh halaman | Sesi berakhir, pesan logout tampil, dan dashboard tidak dapat dibuka kembali tanpa login | Pesan logout dan form login tampil setelah halaman dimuat ulang | Lulus |
| `TC-09` | Mengubah registrasi menggunakan data yang valid | Email data: `selenium.edit.{{runId}}@example.com`<br>Nama baru: `Selenium Edit {{runId}} Diperbarui`<br>Kategori baru: `10K` | Pesan berhasil diperbarui tampil; nama dan kategori baru tersimpan pada tabel | Perubahan nama dan kategori tampil pada dashboard | Lulus |
| `TC-10` | Mengubah email registrasi menjadi email milik peserta lain | Email sumber: `selenium.conflict.source.{{runId}}@example.com`<br>Email target: `selenium.conflict.target.{{runId}}@example.com`<br>Email baru target: email sumber | Perubahan ditolak dengan pesan email sudah terdaftar dan email lama target tetap tersimpan | Pesan konflik email tampil dan data target tidak berubah | Lulus |
| `TC-11` | Membatalkan penghapusan registrasi | Email: `selenium.delete.cancel.{{runId}}@example.com`<br>Aksi konfirmasi: `Batal` | Dialog konfirmasi ditutup tanpa menghapus registrasi; data tetap tersedia pada dashboard | Data registrasi tetap ditemukan setelah pembatalan | Lulus |
| `TC-12` | Mengonfirmasi penghapusan registrasi | Email: `selenium.delete.{{runId}}@example.com`<br>Aksi konfirmasi: `OK` | Pesan berhasil dihapus tampil; hasil pencarian menjadi kosong dan registrasi tidak ditemukan kembali | Data terhapus dan tidak tampil lagi pada hasil pencarian | Lulus |

#### Ringkasan Hasil Black Box

| Kelompok fungsi | Test case | Jumlah diuji | Lulus | Gagal |
| --- | --- | ---: | ---: | ---: |
| Registrasi dan validasi form | `TC-01`–`TC-03` | 3 | 3 | 0 |
| Pencarian dashboard | `TC-04` | 1 | 1 | 0 |
| Autentikasi admin | `TC-05`–`TC-08` | 4 | 4 | 0 |
| Edit registrasi | `TC-09`–`TC-10` | 2 | 2 | 0 |
| Delete registrasi | `TC-11`–`TC-12` | 2 | 2 | 0 |
| **Total** | **`TC-01`–`TC-12`** | **12** | **12** | **0** |

Persentase keberhasilan pengujian dihitung dengan rumus `(jumlah test lulus / jumlah test dijalankan) × 100%`, sehingga hasil pengujian black box terakhir adalah **(12 / 12) × 100% = 100%**. Berdasarkan hasil tersebut, seluruh fungsi yang tercakup dalam skenario pengujian menghasilkan keluaran sesuai harapan.

Fitur pendukung yang telah diimplementasikan:

- Pesan validasi per field dengan atribut `data-testid` yang stabil.
- Aturan email unik pada database dan validasi duplikat pada backend.
- Pesan email duplikat pada public web.
- Pencarian peserta berdasarkan nama, email, atau kode registrasi pada dashboard admin.
- Login admin menggunakan sesi dalam cookie `HttpOnly`.
- Perlindungan halaman dashboard dan endpoint daftar peserta.
- Tombol logout untuk mengakhiri sesi admin.
- Kredensial dan masa berlaku sesi melalui environment variable.
- Fixture terpisah dan screenshot kegagalan yang dapat diidentifikasi untuk setiap test case.
- Helper login Selenium untuk test case yang memerlukan akses dashboard.

Rencana dan catatan implementasi lengkap tersedia di [plan.md](plan.md). Seluruh `TC-01` sampai `TC-12` sudah tersedia sebagai test Selenium mandiri dan telah lulus pada pengujian development serta production terakhir.

### Kredensial Login Demo

Akun berikut digunakan untuk demonstrasi backend, login dashboard, dan test Selenium:

```text
Username: admin
Password: 123456
```

Kredensial ini hanya ditujukan untuk demo project. Konfigurasi implementasi akan dibaca dari environment variable dan kredensial tersebut tidak boleh digunakan pada aplikasi production yang menyimpan data sungguhan.

## Prasyarat

- Node.js 22 atau lebih baru.
- npm.
- Google Chrome atau Chromium.
- ChromeDriver yang cocok dengan versi browser. Selenium Manager dapat mendeteksinya secara otomatis pada kebanyakan sistem.

## Instalasi

Dari root repository:

```bash
npm install
cp .env.example .env
```

Nilai bawaan `.env.example` sudah sesuai untuk pengembangan lokal. Isi URL production sebelum menjalankan Selenium dalam mode production.

## Menjalankan Aplikasi Lokal

Jalankan backend, public web, dan admin dashboard sekaligus:

```bash
npm run dev
```

Setelah ketiga service siap, buka:

- Public web: `http://localhost:5173`
- Admin dashboard: `http://localhost:5174`
- Health check backend: `http://localhost:3000/health`

Tekan `Ctrl+C` untuk menghentikan seluruh service.

Setiap service juga dapat dijalankan secara terpisah:

```bash
npm run dev:backend
npm run dev:public
npm run dev:admin
```

### Mengelola Data Registrasi

Setelah login, dashboard menampilkan maksimal 10 registrasi per halaman. Admin dapat:

- Mencari peserta berdasarkan nama, email, atau kode registrasi.
- Berpindah halaman menggunakan tombol **Sebelumnya** dan **Berikutnya**.
- Mengubah data peserta melalui tombol **Edit**.
- Menghapus registrasi melalui tombol **Hapus** dan dialog konfirmasi.

Kode registrasi serta waktu pendaftaran tidak dapat diubah. Penghapusan bersifat permanen, sehingga buat backup database sebelum membersihkan data dalam jumlah besar.

## Menjalankan Selenium Mode Development

Pastikan `npm run dev` sedang berjalan pada terminal pertama. Pada terminal kedua jalankan:

```bash
npm run test:e2e:dev
```

Perintah tersebut menjalankan delapan test case registrasi dan pengelolaan data, dilanjutkan empat test case autentikasi. Untuk menjalankan test autentikasi saja:

```bash
npm run test:e2e:auth:dev
```

Secara default browser ditampilkan agar proses pengisian form dapat diamati. Kecepatan dan durasi browser tetap terbuka dapat diatur di `.env`:

```env
SELENIUM_HEADLESS=false
SELENIUM_STEP_DELAY_MS=500
SELENIUM_PAUSE_AFTER_TEST_MS=3000
SELENIUM_TIMEOUT_MS=15000
SELENIUM_ADMIN_USERNAME=admin
SELENIUM_ADMIN_PASSWORD=123456
```

Gunakan `SELENIUM_HEADLESS=true` untuk menjalankan test tanpa jendela browser, misalnya pada CI.

### Dataset Selenium

Data peserta yang diisikan Selenium disimpan terpisah di:

```text
apps/e2e-tests/fixtures/participants.json
```

Fixture menyediakan dataset terpisah untuk registrasi, pencarian, edit, konflik email saat edit, pembatalan delete, dan delete. Nilainya dapat disesuaikan, tetapi placeholder `{{runId}}` pada setiap email wajib dipertahankan agar masing-masing eksekusi memiliki dataset yang unik.

Nilai yang diperbolehkan:

- `gender`: `Laki-laki` atau `Perempuan`.
- `raceCategory`: `5K` atau `10K`.
- `shirtSize`: `S`, `M`, `L`, `XL`, atau `XXL`.
- `birthDate`: format `YYYY-MM-DD`.

Runner memvalidasi fixture sebelum browser dibuka dan menampilkan pesan yang jelas jika dataset tidak valid.

## Menjalankan Selenium Mode Production

Isi domain deployment pada `.env`:

```env
PROD_PUBLIC_WEB_URL=https://event.example.com
PROD_ADMIN_DASHBOARD_URL=https://admin-event.example.com
SELENIUM_ADMIN_USERNAME=admin
SELENIUM_ADMIN_PASSWORD=123456
```

Kemudian jalankan dari komputer lokal:

```bash
npm run test:e2e:prod
```

Untuk menjalankan hanya test autentikasi pada production:

```bash
npm run test:e2e:auth:prod
```

Mode production memiliki guard berikut:

- Kedua URL wajib diisi.
- URL wajib menggunakan HTTPS.
- URL tidak boleh mengarah ke localhost.
- Public web dan dashboard harus dapat diakses sebelum browser dibuka.

Suite production membuat delapan registrasi sebagai data mandiri untuk test terkait. `TC-12` menghapus satu registrasi miliknya sendiri, sehingga pertambahan bersih maksimal tujuh data per eksekusi. Peserta test menggunakan nama dan email unik agar mudah ditemukan serta dibersihkan secara manual. Gunakan perintah auth-only apabila tidak ingin membuat atau menghapus data peserta.

## Konfigurasi Environment

| Variable | Kegunaan | Nilai lokal |
| --- | --- | --- |
| `BACKEND_PORT` | Port backend | `3000` |
| `PUBLIC_WEB_PORT` | Port public web | `5173` |
| `ADMIN_DASHBOARD_PORT` | Port dashboard admin | `5174` |
| `VITE_API_URL` | URL backend untuk kedua aplikasi Vue | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | Daftar origin frontend yang diizinkan, dipisahkan koma | `http://localhost:5173,http://localhost:5174` |
| `ADMIN_USERNAME` | Username akun admin demo | `admin` |
| `ADMIN_PASSWORD_HASH` | Hash `scrypt` password admin | Hash untuk password demo `123456` |
| `ADMIN_SESSION_TTL_SECONDS` | Masa berlaku sesi admin dalam detik | `3600` |
| `DEV_PUBLIC_WEB_URL` | Target public web mode dev | `http://localhost:5173` |
| `DEV_ADMIN_DASHBOARD_URL` | Target dashboard mode dev | `http://localhost:5174` |
| `PROD_PUBLIC_WEB_URL` | Target public web mode prod | Wajib diubah |
| `PROD_ADMIN_DASHBOARD_URL` | Target dashboard mode prod | Wajib diubah |
| `SELENIUM_HEADLESS` | Menampilkan atau menyembunyikan browser | `false` |
| `SELENIUM_STEP_DELAY_MS` | Jeda setelah aksi Selenium | `500` |
| `SELENIUM_PAUSE_AFTER_TEST_MS` | Jeda sebelum browser ditutup | `3000` |
| `SELENIUM_TIMEOUT_MS` | Batas waktu menunggu elemen/URL | `15000` |
| `SELENIUM_ADMIN_USERNAME` | Username login dashboard untuk Selenium | `admin` |
| `SELENIUM_ADMIN_PASSWORD` | Password login dashboard untuk Selenium | `123456` |
| `SELENIUM_CHROME_BINARY` | Path Chrome jika tidak terdeteksi | Kosong |

File `.env` tidak dimasukkan ke Git.

## Pengujian dan Build

Menjalankan test backend:

```bash
npm test
```

Membangun public web dan admin dashboard:

```bash
npm run build
```

Menjalankan pemeriksaan workspace, test backend, dan build kedua frontend:

```bash
npm run check
```

Hasil build tersedia di:

- `apps/public-web/dist`
- `apps/admin-dashboard/dist`

## API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/health` | Health check backend |
| `GET` | `/api/event` | Informasi event |
| `POST` | `/api/registrations` | Menyimpan peserta |
| `GET` | `/api/registrations?page=1&limit=10&search=` | Daftar peserta dengan pagination dan pencarian; memerlukan sesi admin |
| `PUT` | `/api/registrations/:id` | Mengubah data peserta; memerlukan sesi admin |
| `DELETE` | `/api/registrations/:id` | Menghapus registrasi; memerlukan sesi admin |
| `POST` | `/api/auth/login` | Memvalidasi kredensial dan membuat sesi admin |
| `GET` | `/api/auth/session` | Memeriksa sesi admin aktif |
| `POST` | `/api/auth/logout` | Menghapus sesi admin |

## Database

SQLite dibuat otomatis saat backend pertama kali dijalankan:

```text
apps/backend/data/app.db
```

File database tidak masuk Git. Untuk mengulang dari database kosong, hentikan backend lalu hapus `app.db`. Backend akan membuat ulang tabel dan satu event seed saat dijalankan kembali.

## Deployment Sederhana

Repository telah menyediakan Docker Compose, tiga Dockerfile, dan Caddy untuk deployment ke VPS Ubuntu. Caddy menangani domain, reverse proxy, dan HTTPS otomatis, sedangkan SQLite disimpan pada named volume.

Panduan DNS, instalasi Docker, firewall, deployment, update, backup, restore, dan Selenium production tersedia di [deployment.md](deployment.md).

## Struktur Repository

```text
.
├── apps/
│   ├── backend/
│   ├── public-web/
│   ├── admin-dashboard/
│   └── e2e-tests/
├── .env.example
├── .env.production.example
├── compose.yaml
├── Caddyfile
├── package.json
├── plan.md
├── catatan.md
├── deployment.md
└── README.md
```

## Troubleshooting

Jika Selenium tidak menemukan Chrome/Chromium, isi path binary pada `.env`:

```env
SELENIUM_CHROME_BINARY=/path/ke/chrome
```

Pada Linux dengan Chromium Snap, runner otomatis mencoba binary internal Snap. Jika port sudah digunakan, hentikan proses lama sebelum menjalankan `npm run dev` kembali.

Screenshot kegagalan Selenium disimpan di:

```text
apps/e2e-tests/screenshots
```

Seluruh screenshot kegagalan menggunakan nama yang memuat ID test case, misalnya `failure-TC-03-dev-<timestamp>.png`.

## Batasan Proof of Concept

- Autentikasi hanya menyediakan satu akun admin demo dan belum memiliki manajemen pengguna atau pemulihan password.
- Belum ada pembayaran atau email konfirmasi.
- Data Selenium production tidak dihapus otomatis.
- SQLite ditujukan untuk satu instance backend dan trafik rendah.
- Fokus utama project adalah keberhasilan alur Selenium end-to-end.
