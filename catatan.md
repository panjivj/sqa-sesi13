# Catatan Rancangan Selenium WebDriver

## Tujuan

Selenium WebDriver akan memiliki dua mode pengujian, yaitu `dev` dan `prod`. Selenium tetap dijalankan dari komputer lokal agar proses browser dapat diamati, sedangkan target URL dipilih berdasarkan mode yang digunakan.

## Mode Development

Mode `dev` menargetkan public web dan admin dashboard yang berjalan secara lokal.

```env
DEV_PUBLIC_WEB_URL=http://localhost:5173
DEV_ADMIN_DASHBOARD_URL=http://localhost:5174
```

Backend tidak perlu diakses langsung oleh Selenium karena seluruh interaksi dilakukan melalui UI. Namun backend lokal tetap harus berjalan di `http://localhost:3000` agar public web dan admin dashboard dapat berfungsi.

Perintah yang direncanakan:

```bash
npm run test:dev --workspace @run-event/e2e-tests
```

## Mode Production

Mode `prod` menargetkan domain public web dan admin dashboard yang sudah di-deploy ke cloud.

```env
PROD_PUBLIC_WEB_URL=https://event.example.com
PROD_ADMIN_DASHBOARD_URL=https://admin-event.example.com
```

Nilai domain contoh tersebut harus diganti dengan domain cloud yang sebenarnya. Public web dan admin dashboard production harus sudah dikonfigurasi agar mengakses backend cloud.

Perintah yang direncanakan:

```bash
npm run test:prod --workspace @run-event/e2e-tests
```

Mode akan diteruskan sebagai argumen Node.js agar tidak bergantung pada syntax environment variable milik sistem operasi:

```text
node test/registration.test.js --mode dev
node test/registration.test.js --mode prod
```

## Konfigurasi Browser

Karena proses test ingin diamati secara langsung dari komputer lokal, konfigurasi default development dapat menggunakan browser non-headless dan jeda antaraksi.

```env
SELENIUM_HEADLESS=false
SELENIUM_STEP_DELAY_MS=500
SELENIUM_PAUSE_AFTER_TEST_MS=3000
```

Keterangan:

- `SELENIUM_HEADLESS=false` membuat jendela browser terlihat.
- `SELENIUM_STEP_DELAY_MS` memberikan jeda singkat setelah setiap aksi utama.
- `SELENIUM_PAUSE_AFTER_TEST_MS` menahan browser beberapa detik setelah test selesai sebelum ditutup.

Untuk CI atau eksekusi tanpa tampilan:

```env
SELENIUM_HEADLESS=true
SELENIUM_STEP_DELAY_MS=0
SELENIUM_PAUSE_AFTER_TEST_MS=0
```

## Contoh Konfigurasi Lengkap

Konfigurasi Selenium nantinya ditambahkan ke `.env.example`:

```env
DEV_PUBLIC_WEB_URL=http://localhost:5173
DEV_ADMIN_DASHBOARD_URL=http://localhost:5174

PROD_PUBLIC_WEB_URL=https://event.example.com
PROD_ADMIN_DASHBOARD_URL=https://admin-event.example.com

SELENIUM_HEADLESS=false
SELENIUM_STEP_DELAY_MS=500
SELENIUM_PAUSE_AFTER_TEST_MS=3000
```

File `.env` yang berisi konfigurasi aktual tidak boleh dimasukkan ke Git.

## Alur Test untuk Kedua Mode

Alur test yang digunakan pada mode `dev` dan `prod` tetap sama:

1. Membaca argumen mode `dev` atau `prod`.
2. Mengambil public URL dan admin URL yang sesuai dari `.env`.
3. Memastikan kedua URL dapat diakses.
4. Membuka public web.
5. Mengisi seluruh data registrasi event lari.
6. Mengirim formulir pendaftaran.
7. Memastikan pesan berhasil tampil.
8. Menyimpan email unik dan kode registrasi dari halaman.
9. Membuka admin dashboard.
10. Memastikan email, kode registrasi, dan kategori peserta muncul pada tabel.
11. Menyimpan screenshot apabila test gagal.
12. Menutup browser setelah jeda akhir selesai.

Ringkasan alur:

```text
Pilih mode dev/prod
        ↓
Ambil public URL dan admin URL dari .env
        ↓
Buka public web dan kirim registrasi
        ↓
Simpan email dan kode registrasi
        ↓
Buka admin dashboard
        ↓
Verifikasi data peserta
```

## Data Test Production

Mode production akan membuat data registrasi nyata pada database cloud. Data test harus menggunakan nama dan email unik agar mudah dikenali dan tidak bertabrakan dengan eksekusi sebelumnya.

Dataset peserta disimpan di `apps/e2e-tests/fixtures/participants.json` pada object `registrationSuccess`. Placeholder `{{runId}}` pada nama dan email akan diganti otomatis saat test dijalankan. Placeholder pada email wajib dipertahankan agar Selenium dapat membedakan setiap registrasi.

Contoh:

```text
Nama: Selenium Test 20260715-103000
Email: selenium.20260715-103000@example.com
```

Backend proof of concept belum memiliki endpoint untuk menghapus data. Oleh karena itu, data test production tidak akan dihapus otomatis. Data tersebut dapat dikenali dan dibersihkan secara manual berdasarkan awalan `Selenium Test` atau `selenium.`.

## Validasi dan Pengamanan Sederhana

Sebelum test dijalankan:

- Mode hanya boleh bernilai `dev` atau `prod`.
- Konfigurasi URL untuk mode yang dipilih wajib tersedia.
- URL production wajib menggunakan protokol `https`.
- URL production tidak boleh mengarah ke `localhost` atau `127.0.0.1`.
- Public web dan admin dashboard diperiksa agar dapat diakses sebelum browser dimulai.
- Screenshot disimpan secara otomatis jika test gagal.

## Batas Tahap 5

Implementasi Tahap 5 hanya akan membuat satu skenario end-to-end utama dengan dukungan dua mode tersebut. Test tambahan yang tidak mendukung alur registrasi dan verifikasi dashboard tidak perlu dibuat untuk proof of concept ini.
