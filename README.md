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
Public web → isi formulir → simpan ke SQLite → buka dashboard → verifikasi peserta
```

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

## Menjalankan Selenium Mode Development

Pastikan `npm run dev` sedang berjalan pada terminal pertama. Pada terminal kedua jalankan:

```bash
npm run test:e2e:dev
```

Secara default browser ditampilkan agar proses pengisian form dapat diamati. Kecepatan dan durasi browser tetap terbuka dapat diatur di `.env`:

```env
SELENIUM_HEADLESS=false
SELENIUM_STEP_DELAY_MS=500
SELENIUM_PAUSE_AFTER_TEST_MS=3000
SELENIUM_TIMEOUT_MS=15000
```

Gunakan `SELENIUM_HEADLESS=true` untuk menjalankan test tanpa jendela browser, misalnya pada CI.

### Dataset Selenium

Data peserta yang diisikan Selenium disimpan terpisah di:

```text
apps/e2e-tests/fixtures/participants.json
```

Ubah nilai pada object `registrationSuccess` untuk menyesuaikan dataset. Pertahankan placeholder `{{runId}}` pada email agar setiap eksekusi menghasilkan peserta unik.

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
```

Kemudian jalankan dari komputer lokal:

```bash
npm run test:e2e:prod
```

Mode production memiliki guard berikut:

- Kedua URL wajib diisi.
- URL wajib menggunakan HTTPS.
- URL tidak boleh mengarah ke localhost.
- Public web dan dashboard harus dapat diakses sebelum browser dibuka.

Test production membuat data nyata di database cloud. Peserta test menggunakan awalan `Selenium Test` dan email unik agar mudah ditemukan serta dibersihkan secara manual.

## Konfigurasi Environment

| Variable | Kegunaan | Nilai lokal |
| --- | --- | --- |
| `BACKEND_PORT` | Port backend | `3000` |
| `PUBLIC_WEB_PORT` | Port public web | `5173` |
| `ADMIN_DASHBOARD_PORT` | Port dashboard admin | `5174` |
| `VITE_API_URL` | URL backend untuk kedua aplikasi Vue | `http://localhost:3000` |
| `DEV_PUBLIC_WEB_URL` | Target public web mode dev | `http://localhost:5173` |
| `DEV_ADMIN_DASHBOARD_URL` | Target dashboard mode dev | `http://localhost:5174` |
| `PROD_PUBLIC_WEB_URL` | Target public web mode prod | Wajib diubah |
| `PROD_ADMIN_DASHBOARD_URL` | Target dashboard mode prod | Wajib diubah |
| `SELENIUM_HEADLESS` | Menampilkan atau menyembunyikan browser | `false` |
| `SELENIUM_STEP_DELAY_MS` | Jeda setelah aksi Selenium | `500` |
| `SELENIUM_PAUSE_AFTER_TEST_MS` | Jeda sebelum browser ditutup | `3000` |
| `SELENIUM_TIMEOUT_MS` | Batas waktu menunggu elemen/URL | `15000` |
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
| `GET` | `/api/registrations` | Daftar peserta untuk dashboard |

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

## Batasan Proof of Concept

- Dashboard admin tidak memiliki autentikasi.
- Belum ada pembayaran, email konfirmasi, edit, atau hapus peserta.
- Data Selenium production tidak dihapus otomatis.
- SQLite ditujukan untuk satu instance backend dan trafik rendah.
- Fokus utama project adalah keberhasilan alur Selenium end-to-end.
