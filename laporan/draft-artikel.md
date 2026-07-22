# DRAFT NASKAH ARTIKEL

> **Catatan penyusunan:** Naskah ini disiapkan untuk dipindahkan ke `Template JATI.docx`. Hapus seluruh teks dalam tanda kurung siku dan catatan penyusunan sebelum artikel dikumpulkan. Masukkan nama dosen pembimbing, alamat kampus, email korespondensi, serta tangkapan layar pada posisi yang telah ditandai. Setelah dipindahkan, atur naskah menjadi kertas A4, dua kolom, dan gaya huruf sesuai template.

## DATA ADMINISTRASI PENULIS

| Data | Isian |
| --- | --- |
| Nama kontak | Panji Jaya Sutra |
| Nomor WhatsApp | [Isi nomor WhatsApp] |
| Program studi | Teknik Informatika |
| Perguruan tinggi | Universitas Esa Unggul |

# OTOMATISASI PENGUJIAN BLACK BOX PADA APLIKASI PENDAFTARAN EVENT LARI BERBASIS WEB MENGGUNAKAN SELENIUM WEBDRIVER

**Panji Jaya Sutra, [Nama Dosen Pembimbing 1], [Nama Dosen Pembimbing 2]**

Teknik Informatika, Universitas Esa Unggul  
[Isi alamat lengkap kampus]  
[Isi email mahasiswa sebagai email korespondensi]

## ABSTRAK

Aplikasi pendaftaran event lari menghubungkan formulir peserta, layanan antarmuka pemrograman, basis data, dan dashboard admin dalam satu alur transaksi. Keterhubungan tersebut menimbulkan risiko kegagalan yang tidak selalu terdeteksi melalui pemeriksaan satu komponen. Penelitian ini bertujuan mengevaluasi kesesuaian fungsi aplikasi melalui pengujian black box berbasis skenario pengguna dan mengotomatisasi eksekusinya menggunakan Selenium WebDriver. Objek uji mencakup registrasi, validasi email, pencegahan data duplikat, pencarian, autentikasi, logout, perubahan data, serta penghapusan registrasi. Dua belas test case disusun dari kelas masukan valid dan tidak valid, kemudian dijalankan pada lingkungan production melalui browser. Keluaran antarmuka dibandingkan dengan hasil yang diharapkan, sedangkan keberhasilan dihitung dari proporsi test case yang lulus. Seluruh test case menghasilkan status lulus dengan durasi total 290,278 detik, sehingga tingkat kesesuaian fungsional pada ruang lingkup pengujian mencapai 100%. Otomatisasi juga menghasilkan identitas data unik, pelaporan durasi, dan tangkapan layar ketika terjadi kegagalan. Hasil ini menunjukkan bahwa alur utama aplikasi telah bekerja sesuai spesifikasi yang diuji, meskipun pengujian lanjutan tetap diperlukan untuk batas input, keamanan, beban, kompatibilitas lintas browser, dan kestabilan jaringan.

**Kata kunci:** black box, Selenium WebDriver, pengujian otomatis, aplikasi web, end-to-end, equivalence partitioning

## 1. PENDAHULUAN

Pendaftaran kegiatan melalui aplikasi web memindahkan sejumlah aktivitas yang sebelumnya dilakukan secara manual menjadi rangkaian transaksi digital. Pengguna mengisi identitas, memilih kategori kegiatan, memberikan informasi kontak darurat, dan menerima kode registrasi. Pada sisi pengelola, admin perlu masuk ke dashboard, mencari peserta, memperbarui data, serta menghapus registrasi yang tidak lagi diperlukan. Walaupun setiap halaman dapat tampak bekerja secara terpisah, kegagalan pada komunikasi antarkomponen dapat menyebabkan data tidak tersimpan, sesi tidak terlindungi, pencarian tidak akurat, atau perubahan data tidak tercermin pada antarmuka.

Kualitas perangkat lunak tidak cukup ditentukan dari keberhasilan proses pembangunan. Produk perlu dievaluasi terhadap kebutuhan dan keluaran yang telah ditetapkan. ISO/IEC/IEEE 29119-1:2022 menempatkan pengujian sebagai kegiatan terstruktur yang menggunakan konsep dan terminologi yang dapat diterapkan pada beragam jenis perangkat lunak [1]. Sementara itu, ISO/IEC 25010:2023 menyediakan model kualitas produk yang dapat digunakan untuk menentukan sasaran dan kriteria evaluasi, termasuk kesesuaian fungsi produk dengan kebutuhan pemangku kepentingan [2]. Berdasarkan kedua acuan tersebut, pemeriksaan fungsi aplikasi dari sudut pandang pengguna menjadi bagian penting sebelum aplikasi dianggap siap digunakan.

Black-box testing sesuai untuk mengevaluasi perilaku yang terlihat karena penguji memberi masukan dan memeriksa keluaran tanpa menjadikan struktur kode sebagai dasar penilaian. Studi pada sistem informasi akademik menunjukkan bahwa pemisahan masukan ke dalam kelas ekuivalen dapat mengurangi jumlah data uji sambil tetap mewakili kondisi penting [3]. Pendekatan serupa juga digunakan untuk memeriksa autentikasi *single sign-on* [4] dan sistem informasi akademik dengan kombinasi *equivalence partitioning* serta *boundary value analysis* [5]. Penelitian-penelitian tersebut memperlihatkan bahwa rancangan input valid dan tidak valid membantu mengungkap perbedaan antara perilaku aplikasi dan spesifikasi.

Eksekusi manual pada banyak skenario memiliki kelemahan berupa pengulangan langkah, potensi ketidakkonsistenan tindakan, dan waktu pemeriksaan regresi yang bertambah. Otomatisasi end-to-end memberi cara untuk menjalankan alur pengguna secara konsisten melalui browser. Selenium WebDriver dipilih karena menyediakan instruksi untuk mengendalikan browser melalui antarmuka yang mengikuti model WebDriver [15], [16]. Dalam penelitian ini, Selenium bukan hanya mengisi form, tetapi juga memeriksa pesan validasi, membaca kode registrasi, melakukan login, mencari data, mengoperasikan modal edit, merespons dialog konfirmasi, dan memastikan perubahan keadaan setelah logout atau penghapusan.

Objek penelitian adalah aplikasi pendaftaran event lari berbasis web yang terdiri dari public web, backend API, basis data SQLite, dashboard admin, dan paket pengujian E2E. Sebelum penelitian dilakukan, belum tersedia dokumentasi artikel yang merangkum tingkat kesesuaian seluruh fungsi utama melalui satu eksekusi otomatis. Permasalahan penelitian dirumuskan sebagai berikut: (1) bagaimana merancang kelas data uji yang mewakili operasi registrasi dan pengelolaan peserta; (2) bagaimana mengotomatisasi alur lintas public web dan dashboard admin; serta (3) bagaimana mengukur hasil aktual dari seluruh skenario.

Tujuan penelitian ini adalah menyusun dan mengeksekusi dua belas test case black box untuk memeriksa registrasi, validasi, pencarian, autentikasi, edit, serta delete. Kontribusi penelitian terletak pada penerapan skenario menyeluruh yang melewati beberapa komponen aplikasi, penggunaan data unik untuk menjaga independensi eksekusi, pemanfaatan *explicit wait* berdasarkan kondisi antarmuka, dan penyajian hasil kuantitatif berdasarkan status serta durasi setiap test case. Hasil penelitian diharapkan menjadi dasar regresi saat aplikasi dikembangkan lebih lanjut.

## 2. TINJAUAN PUSTAKA

### 2.1. Pengujian Perangkat Lunak dan Kualitas Fungsional

Pengujian perangkat lunak merupakan proses memperoleh bukti mengenai kesesuaian perilaku aktual terhadap perilaku yang ditentukan. Fokus penelitian ini adalah kesesuaian fungsional, bukan penilaian menyeluruh terhadap seluruh karakteristik kualitas. ISO/IEC 25010:2023 membedakan kualitas produk ke dalam beberapa karakteristik sehingga keberhasilan pada fungsi tertentu tidak otomatis membuktikan keamanan, efisiensi kinerja, keandalan, atau kompatibilitas secara keseluruhan [2]. Oleh sebab itu, istilah “lulus” dalam artikel ini selalu merujuk pada skenario dan kondisi uji yang didefinisikan.

Black-box testing menilai antarmuka sistem melalui relasi masukan dan keluaran. Penguji tidak perlu menggunakan informasi tentang percabangan, fungsi internal, atau jalur kode untuk menentukan hasil. Pada aplikasi web, bentuk keluaran dapat berupa perpindahan halaman, pesan validasi, perubahan isi tabel, status sesi, atau hilangnya sebuah data. Penelitian Wulandari dkk. menunjukkan penggunaan *equivalence partitioning* untuk mewakili kelompok input pada sistem akademik [3]. Zidan dkk. menerapkan pembagian kelas input pada fungsi autentikasi SSO [4], sedangkan Santi dkk. menggabungkan kelas ekuivalen dengan pemeriksaan batas nilai untuk memperoleh cakupan kondisi yang lebih beragam [5].

### 2.2. Equivalence Partitioning

*Equivalence partitioning* membagi domain input menjadi kelompok yang diperkirakan memicu perilaku sistem yang sama. Satu atau beberapa anggota representatif dipilih dari setiap kelompok agar pengujian tidak harus mencoba seluruh kemungkinan data. Dalam penelitian ini, pembagian tersebut diterapkan secara praktis pada pasangan kelas valid dan tidak valid. Contohnya adalah email berformat benar dibandingkan email tanpa struktur alamat yang sah, kredensial benar dibandingkan password salah, serta email baru dibandingkan email yang sudah dimiliki peserta lain.

Penelitian black box pada aplikasi stok dan penjualan menggunakan kelas input untuk menemukan ketidaksesuaian pada sejumlah fungsi [6]. Suharyono dkk. memperluas pemeriksaan kelas ekuivalen dengan nilai batas untuk aplikasi SIADITA [7], sedangkan Putri dkk. membandingkan beberapa teknik desain black box pada aplikasi web [8]. Hasil penelitian tersebut mendukung gagasan bahwa pemilihan teknik harus mengikuti karakter domain input. Karena objek penelitian ini lebih banyak berisi status, identitas unik, dan tindakan pengguna daripada rentang numerik, kelas ekuivalen dan transisi keadaan dipilih sebagai dasar utama skenario.

### 2.3. Otomatisasi End-to-End dengan Selenium WebDriver

Pengujian end-to-end memeriksa alur aplikasi sebagaimana digunakan oleh pengguna, mulai dari interaksi pada browser hingga keluaran yang kembali ditampilkan. WebDriver didefinisikan sebagai antarmuka kendali jarak jauh yang memungkinkan program mengarahkan browser dan memanipulasi elemen dokumen [15]. Selenium memanfaatkan mekanisme tersebut untuk mendukung otomatisasi pada browser utama melalui API yang konsisten [16].

Dalam implementasi penelitian, setiap test case membuat sesi browser tersendiri, membuka target URL, mencari elemen melalui atribut `data-testid`, melakukan aksi, lalu menjalankan asersi. Test runner bawaan Node.js menganggap fungsi pengujian berhasil apabila *promise* selesai tanpa penolakan dan gagal ketika terjadi *exception* atau asersi yang tidak terpenuhi [17]. Pemisahan sesi browser mengurangi pengaruh cookie dan status halaman dari test sebelumnya, terutama pada skenario akses tanpa autentikasi dan logout.

Pengujian E2E memiliki tantangan tersendiri. Survei Leotta dkk. terhadap praktisi Selenium mengidentifikasi kestabilan dan pemeliharaan test sebagai persoalan yang penting dalam praktik [13]. Liu dkk. menjelaskan bahwa perubahan antarmuka yang belum selesai setelah sebuah perintah dapat menimbulkan hasil tidak deterministik; penggunaan kondisi tunggu yang tepat lebih efisien dibandingkan jeda tetap pada semua langkah [14]. Temuan tersebut menjadi dasar penggunaan *explicit wait* pada elemen, teks, dan dialog di penelitian ini.

### 2.4. Penelitian Terdahulu dan Posisi Penelitian

Penelitian black box pada website telah dilakukan pada berbagai objek. Winata dkk. membandingkan pelaksanaan pengujian manual dan otomatis pada website EPOS [9]. Kartono dkk. menggunakan *boundary value analysis* pada website penjualan makanan [10], sedangkan Hardika dkk. menggunakan kelas ekuivalen pada website peternakan [11]. Nasir dkk. menerapkan *equivalence partitioning* pada fungsi pemesanan dan jadwal praktik gigi [12]. Secara umum, studi tersebut menilai kesesuaian input dan output pada fitur yang dipilih.

Penelitian ini memiliki perbedaan pada keluasan lintasan transaksi dan cara eksekusi. Skenario tidak berhenti pada respons satu form, tetapi menghubungkan public web dengan dashboard admin. Data yang dimasukkan pada halaman pendaftaran diverifikasi kembali setelah autentikasi, lalu digunakan pada pencarian, edit, dan delete. Selain itu, status sesi diperiksa melalui login valid, login tidak valid, akses tanpa autentikasi, logout, dan pemuatan ulang halaman. Dengan demikian, pengujian mengombinasikan partisi input dengan transisi keadaan pengguna dan konsistensi data lintas antarmuka.

## 3. METODE PENELITIAN

### 3.1. Objek dan Arsitektur Sistem

Aplikasi yang diuji merupakan *proof of concept* pendaftaran event lari dalam satu monorepo. Public web dan dashboard admin dibangun menggunakan Vue.js. Backend menggunakan Express.js dan menyimpan data pada SQLite. Paket Selenium ditulis dalam JavaScript dan dieksekusi menggunakan Node.js. Deployment production menjalankan service di dalam container yang dikelola Docker Compose [19]. SQLite dipilih karena bekerja sebagai basis data transaksional tanpa server terpisah dan sesuai untuk satu instance backend dengan trafik rendah [18].

**Tabel 1. Komponen objek pengujian**

| Komponen | Teknologi | Tanggung jawab dalam pengujian |
| --- | --- | --- |
| Public web | Vue.js dan Vite | Menampilkan event, menerima data peserta, dan menampilkan hasil registrasi |
| Backend API | Express.js | Memvalidasi input, mengelola sesi, dan menyediakan operasi data |
| Basis data | SQLite | Menyimpan event, registrasi, dan sesi admin |
| Dashboard admin | Vue.js dan Vite | Menyediakan login, pencarian, pagination, edit, delete, dan logout |
| E2E test | Selenium WebDriver dan `node:test` | Mengendalikan browser, menjalankan asersi, dan melaporkan hasil |
| Deployment | Docker Compose, Nginx, dan Caddy | Menjalankan service serta menyediakan akses HTTPS production |

Dari Tabel 1 terlihat bahwa hasil pada browser bergantung pada integrasi beberapa komponen. Arsitektur pengujian ditunjukkan pada Gambar 1.

```text
Selenium WebDriver
        │
        ├── Public web ──┐
        │                ├── Backend API ── SQLite
        └── Dashboard ───┘
```

**Gambar 1. Arsitektur pengujian end-to-end aplikasi**

> [Ganti diagram teks dengan gambar arsitektur yang rapi ketika dipindahkan ke DOCX. Letakkan judul gambar di bawah gambar.]

Gambar 1 memperlihatkan bahwa Selenium tidak mengakses database secara langsung. Seluruh validasi dilakukan melalui perilaku yang tersedia bagi pengguna. Pendekatan ini menjaga karakter black box sekaligus memeriksa konsistensi data dari proses registrasi hingga pengelolaan pada dashboard.

### 3.2. Rancangan Penelitian

Penelitian menggunakan pendekatan evaluatif dengan pengujian fungsional black box. Tahapan penelitian terdiri atas: (1) mengidentifikasi fungsi utama dan hasil yang dipersyaratkan; (2) membagi kondisi input atau keadaan ke dalam kelas representatif; (3) menyiapkan fixture unik; (4) mengimplementasikan langkah browser dan asersi; (5) menjalankan test pada production; (6) mencatat status serta durasi; dan (7) menghitung tingkat kesesuaian.

```text
Identifikasi fungsi
        ↓
Pembentukan kelas input dan keadaan
        ↓
Penyusunan fixture serta test case
        ↓
Eksekusi Selenium pada production
        ↓
Perbandingan hasil aktual dan harapan
        ↓
Perhitungan tingkat kesesuaian
```

**Gambar 2. Tahapan penelitian**

> [Ganti diagram teks dengan flowchart ketika dipindahkan ke DOCX.]

Skenario dijalankan secara berurutan agar beban pada environment production tetap terkendali. Setiap test case menggunakan browser baru. Apabila sebuah test gagal, runner membuat tangkapan layar dengan nama yang memuat ID test, mode, dan waktu kegagalan. Browser ditutup pada blok finalisasi sehingga sumber daya tetap dilepas pada kondisi lulus maupun gagal.

### 3.3. Kelas Data Uji

Fixture peserta disimpan terpisah dari script. Placeholder `{{runId}}` diganti menggunakan waktu eksekusi untuk membentuk nama dan email unik. Strategi tersebut mencegah benturan dengan unique index email ketika suite dijalankan berulang. Kelas uji utama ditampilkan pada Tabel 2.

**Tabel 2. Pembagian kelas data dan keadaan**

| Objek | Kelas valid | Kelas tidak valid atau alternatif | Perilaku yang diperiksa |
| --- | --- | --- | --- |
| Form registrasi | Seluruh field wajib terisi dan email valid | Format email tidak valid | Form diterima atau ditolak dengan pesan yang tepat |
| Keunikan email | Email belum terdaftar | Email telah terdaftar | Duplikasi ditolak tanpa membuat peserta kedua |
| Pencarian | Email peserta tersedia | Data tidak ditemukan setelah delete | Tabel menampilkan jumlah hasil yang benar |
| Login | Username dan password benar | Password salah | Dashboard dibuka atau akses ditolak |
| Sesi | Cookie sesi aktif | Tidak ada sesi atau sesi telah dihapus | Dashboard terlindungi |
| Edit | Nama dan kategori baru valid | Email baru dimiliki peserta lain | Perubahan disimpan atau ditolak tanpa merusak data lama |
| Delete | Konfirmasi diterima | Konfirmasi dibatalkan | Data dihapus atau dipertahankan |

Tabel 2 menunjukkan bahwa kelas uji tidak hanya dibentuk dari nilai field, tetapi juga dari keadaan sistem. Login dan logout menghasilkan transisi sesi, sedangkan delete menghasilkan transisi keberadaan data. Kondisi tersebut diamati melalui antarmuka sebagaimana pengguna berinteraksi dengan aplikasi.

### 3.4. Skenario Pengujian

Dua belas test case dirancang berdasarkan fungsi kritis. Delapan test berada pada kelompok registrasi dan pengelolaan data, sedangkan empat test memeriksa autentikasi. Rinciannya ditampilkan pada Tabel 3.

**Tabel 3. Skenario pengujian black box**

| ID | Skenario | Data atau tindakan utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| TC-01 | Registrasi valid | Data peserta lengkap, email unik, kategori 10K | Pesan sukses dan kode registrasi tampil; data ditemukan pada dashboard |
| TC-02 | Validasi format email | Email tanpa format alamat yang sah | Form tidak dikirim dan pesan format email tampil |
| TC-03 | Pencegahan email duplikat | Form dikirim dua kali menggunakan email sama | Pengiriman kedua ditolak dengan pesan email telah terdaftar |
| TC-04 | Pencarian peserta | Email unik peserta yang baru dibuat | Hanya satu baris yang sesuai ditampilkan |
| TC-05 | Login valid | Username dan password admin yang benar | Dashboard tampil dan identitas admin terbaca |
| TC-06 | Login tidak valid | Username benar dan password salah | Pesan kesalahan tampil dan dashboard tidak terbuka |
| TC-07 | Akses tanpa autentikasi | Membuka dashboard tanpa cookie sesi | Form login tampil dan konten dashboard terlindungi |
| TC-08 | Logout | Login valid, klik logout, lalu muat ulang | Sesi berakhir dan pengguna tetap berada pada halaman login |
| TC-09 | Edit valid | Nama diperbarui dan kategori diubah menjadi 10K | Pesan sukses tampil dan tabel memuat nilai baru |
| TC-10 | Konflik email saat edit | Email target diganti dengan email peserta lain | Perubahan ditolak dan data target tetap menggunakan email lama |
| TC-11 | Batal delete | Klik hapus kemudian batalkan dialog | Registrasi tetap tersedia |
| TC-12 | Konfirmasi delete | Klik hapus kemudian terima dialog | Data hilang dan tidak ditemukan dalam pencarian |

Pada Tabel 3, data sensitif seperti password tidak ditulis secara terbuka. Nilainya dibaca dari environment variable. Test yang memerlukan dashboard menggunakan helper login yang sama agar langkah autentikasi konsisten. TC-07 menggunakan sesi browser baru sehingga tidak mewarisi cookie dari test lain.

### 3.5. Lingkungan dan Prosedur Eksekusi

Pengujian terakhir dilakukan pada 23 Juli 2026 terhadap public web `https://running-event.esgul.my.id` dan dashboard `https://dashboard-event.esgul.my.id`. Script dijalankan dari komputer penguji menggunakan Node.js 22.16.0 dan Selenium WebDriver 4.46.0. Browser Chrome atau Chromium dikendalikan melalui driver yang kompatibel. Sebelum browser dibuat, runner memeriksa keterjangkauan public web dan dashboard. URL production diwajibkan memakai HTTPS dan tidak boleh mengarah ke localhost.

Prosedur umum registrasi adalah membuka public web, menunggu komponen siap, mengisi field, menyetujui ketentuan, mengirim form, lalu membaca kode registrasi. Untuk verifikasi dashboard, Selenium membuka halaman admin, mengisi kredensial, menunggu dashboard, mencari email, dan memeriksa teks baris. Pada operasi asinkron, script menunggu kondisi tertentu seperti keberadaan elemen, visibilitas pesan, perubahan jumlah hasil, atau munculnya dialog. Pendekatan ini mengikuti kebutuhan sinkronisasi E2E yang dibahas pada penelitian flaky test [13], [14].

Suite dijalankan dengan perintah berikut:

```bash
npm run test:e2e:prod
```

Perintah tersebut menjalankan suite registrasi dan pengelolaan lebih dahulu, kemudian suite autentikasi. Reporter menampilkan keterangan test sebelum browser bekerja dan memberikan tanda lulus beserta durasinya setelah skenario selesai.

### 3.6. Teknik Analisis Hasil

Setiap test case diberi nilai 1 apabila hasil aktual memenuhi seluruh asersi dan nilai 0 apabila setidaknya satu asersi gagal. Tingkat kesesuaian fungsional dihitung menggunakan Persamaan (1).

```text
Tingkat Kesesuaian = (Jumlah Test Lulus / Jumlah Test Dijalankan) × 100%     (1)
```

Selain persentase, durasi dianalisis untuk mengetahui biaya eksekusi setiap kelompok fungsi. Durasi tidak digunakan untuk menyatakan performa aplikasi karena di dalamnya terdapat jeda demonstrasi, pembuatan browser, perpindahan halaman, dan penutupan sesi. Angka tersebut hanya menggambarkan waktu yang diperlukan suite pada konfigurasi penelitian.

## 4. HASIL DAN PEMBAHASAN

### 4.1. Hasil Eksekusi Pengujian

Eksekusi production terakhir menyelesaikan seluruh dua belas test case. Hasil aktual dan durasi ditampilkan pada Tabel 4.

**Tabel 4. Hasil pengujian black box otomatis**

| ID | Hasil aktual | Durasi (detik) | Status |
| --- | --- | ---: | --- |
| TC-01 | Kode registrasi tampil dan peserta ditemukan pada dashboard | 29,970 | Lulus |
| TC-02 | Pesan format email tidak valid tampil dan form tidak tersimpan | 25,598 | Lulus |
| TC-03 | Registrasi kedua ditolak karena email telah terdaftar | 26,007 | Lulus |
| TC-04 | Pencarian email menampilkan tepat satu peserta yang sesuai | 30,410 | Lulus |
| TC-05 | Login berhasil dan dashboard menampilkan identitas admin | 9,941 | Lulus |
| TC-06 | Password salah ditolak dan dashboard tidak ditampilkan | 9,929 | Lulus |
| TC-07 | Tanpa sesi, sistem menampilkan form login | 6,486 | Lulus |
| TC-08 | Logout menghapus sesi dan refresh tetap menampilkan login | 10,533 | Lulus |
| TC-09 | Nama dan kategori baru tersimpan serta tampil pada tabel | 30,758 | Lulus |
| TC-10 | Konflik email ditolak dan email lama tetap tersimpan | 49,950 | Lulus |
| TC-11 | Pembatalan dialog mempertahankan registrasi | 29,885 | Lulus |
| TC-12 | Konfirmasi menghapus data dan hasil pencarian menjadi kosong | 30,799 | Lulus |

Tabel 4 memperlihatkan bahwa hasil aktual pada setiap skenario sama dengan keluaran yang ditetapkan. Suite registrasi dan pengelolaan menyelesaikan delapan test dalam 253,385 detik, sedangkan suite autentikasi menyelesaikan empat test dalam 36,894 detik. Total waktu yang dilaporkan kedua suite adalah 290,278 detik atau sekitar 4 menit 50 detik. Rata-rata durasi individual sebesar 24,189 detik.

### 4.2. Analisis Registrasi, Validasi, dan Pencarian

TC-01 membuktikan alur positif yang paling panjang: data dimasukkan pada public web, backend menghasilkan kode registrasi, lalu peserta ditemukan setelah admin login. Keberhasilan ini memberikan bukti integrasi dari browser ke penyimpanan dan kembali ke dashboard. TC-02 menguji kelas email tidak valid dan memastikan penolakan terjadi sebelum pesan sukses muncul. TC-03 menguji aturan bisnis yang berbeda, yaitu keunikan email, dengan mengirim data valid yang sama dua kali. Hasilnya menunjukkan bahwa validasi format dan validasi konflik data bekerja pada kondisi masing-masing.

TC-04 memeriksa pencarian server-side menggunakan email unik. Jumlah hasil berubah menjadi satu dan isi baris mengandung email serta kode registrasi yang sesuai. Penggunaan `runId` penting karena pencarian tidak bergantung pada data lama yang mungkin telah ada pada production. Dengan demikian, asersi menguji data milik eksekusi aktif dan mengurangi kemungkinan *false positive*.

### 4.3. Analisis Autentikasi dan Sesi

Keempat skenario autentikasi memperoleh status lulus. TC-05 menunjukkan bahwa kredensial valid membentuk sesi dan memberikan akses pada dashboard. TC-06 memastikan kelas password salah tidak menghasilkan akses. TC-07 memulai browser tanpa cookie sehingga membuktikan bahwa tampilan dashboard tidak diberikan hanya karena URL diketahui. TC-08 melengkapi siklus sesi dengan melakukan logout dan memuat ulang halaman.

Kombinasi TC-05 sampai TC-08 lebih kuat daripada pemeriksaan login positif saja karena mencakup pembentukan, penolakan, ketiadaan, dan penghentian sesi. Walaupun demikian, hasil tersebut belum mencakup pembatasan percobaan login, kedaluwarsa sesi berdasarkan waktu, pemulihan akun, serangan otomatis, atau pengujian keamanan cookie secara mendalam. Pernyataan kualitas pada bagian ini dibatasi pada perilaku fungsional yang terlihat.

### 4.4. Analisis Edit dan Delete

TC-09 membuktikan perubahan data valid melalui modal edit. Nama dan kategori yang disimpan muncul kembali pada tabel. TC-10 menguji kelas konflik dengan mengganti email target menjadi email milik peserta sumber. Sistem menolak perubahan dan mempertahankan email lama. Durasi TC-10 sebesar 49,950 detik merupakan yang terpanjang karena test harus membuat dua peserta sebelum memeriksa konflik.

TC-11 dan TC-12 membedakan dua cabang dialog konfirmasi. Saat dialog dibatalkan, data tetap dapat ditemukan. Saat dialog diterima, pesan sukses tampil, jumlah hasil turun menjadi nol, dan elemen data tidak ditemukan kembali. Pasangan ini penting karena keberadaan tombol delete saja tidak membuktikan bahwa pembatalan aman maupun penghapusan benar-benar mengubah keadaan data.

### 4.5. Tingkat Kesesuaian Fungsional

Rekap hasil berdasarkan kelompok fungsi ditampilkan pada Tabel 5.

**Tabel 5. Rekapitulasi hasil pengujian**

| Kelompok fungsi | Test case | Dijalankan | Lulus | Gagal | Kesesuaian |
| --- | --- | ---: | ---: | ---: | ---: |
| Registrasi dan validasi | TC-01–TC-03 | 3 | 3 | 0 | 100% |
| Pencarian | TC-04 | 1 | 1 | 0 | 100% |
| Autentikasi dan sesi | TC-05–TC-08 | 4 | 4 | 0 | 100% |
| Edit | TC-09–TC-10 | 2 | 2 | 0 | 100% |
| Delete | TC-11–TC-12 | 2 | 2 | 0 | 100% |
| **Total** | **TC-01–TC-12** | **12** | **12** | **0** | **100%** |

Berdasarkan Tabel 5 dan Persamaan (1), tingkat kesesuaian dihitung sebagai berikut:

```text
Tingkat Kesesuaian = (12 / 12) × 100% = 100%
```

Nilai 100% berarti semua skenario yang dirancang memberikan keluaran sesuai harapan pada eksekusi terakhir. Nilai tersebut tidak berarti aplikasi bebas dari seluruh cacat. Cakupan penelitian belum menguji semua kombinasi field, panjang minimum dan maksimum, injeksi masukan berbahaya, beban pengguna serentak, aksesibilitas, browser selain Chrome/Chromium, pemulihan ketika service berhenti, serta kualitas pada perangkat bergerak. Interpretasi ini konsisten dengan model kualitas yang memisahkan kesesuaian fungsional dari karakteristik lain [2].

### 4.6. Stabilitas Eksekusi dan Temuan Nonfungsional

Pada percobaan sebelum eksekusi final, satu test pernah berhenti ketika menunggu informasi event, dan pemeriksaan awal pada kesempatan lain gagal menjangkau public web atau dashboard. Pemeriksaan server menunjukkan container sehat dan resource mencukupi, sedangkan koneksi eksternal sesekali mengalami *connect timeout*. Karena kegagalan berlangsung sebelum asersi fungsi TC-09 dijalankan dan eksekusi final seluruh test berhasil tanpa perubahan fungsi, kejadian tersebut diklasifikasikan sebagai gangguan environment, bukan ketidaksesuaian hasil fungsional.

Temuan ini tetap relevan karena pengujian E2E bergantung pada browser, jaringan, frontend, backend, dan waktu perubahan DOM. Literatur menyebut *flakiness* sebagai tantangan nyata dalam Selenium [13]. Liu dkk. menunjukkan bahwa operasi antarmuka yang belum selesai dapat menyebabkan hasil berbeda walaupun kode aplikasi tidak berubah [14]. Implementasi penelitian mengurangi risiko tersebut melalui *explicit wait*, selector `data-testid`, browser terisolasi, preflight URL, dan screenshot kegagalan. Pengembangan berikutnya dapat menambahkan retry terbatas pada preflight koneksi, pencatatan akar error jaringan, serta pemisahan hasil “fungsi gagal” dan “environment tidak tersedia”.

### 4.7. Implikasi dan Keterbatasan

Secara praktis, suite dapat digunakan sebagai pemeriksaan regresi setelah perubahan pada form, autentikasi, dashboard, atau endpoint registrasi. Penggunaan fixture terpisah memudahkan penyesuaian data tanpa mengubah urutan aksi. Reporter Node.js memberikan status dan durasi setelah Selenium selesai, sementara screenshot membantu investigasi ketika asersi atau penantian gagal [17]. Deployment multi-container juga memungkinkan service dibangun dan dijalankan dengan konfigurasi yang konsisten [19].

Terdapat beberapa keterbatasan. Pertama, penelitian menggunakan satu keluarga browser sehingga belum membuktikan kompatibilitas lintas browser. Kedua, data production yang dibuat suite tidak seluruhnya dibersihkan otomatis; TC-12 hanya menghapus data miliknya sendiri. Ketiga, persentase kesesuaian memperlakukan semua test dengan bobot sama, padahal dampak bisnis setiap fungsi dapat berbeda. Keempat, *equivalence partitioning* belum dikombinasikan secara lengkap dengan *boundary value analysis* untuk panjang teks, tanggal ekstrem, dan nomor telepon. Kelima, pengujian berfokus pada perilaku antarmuka dan tidak menggantikan unit test, API test, pemeriksaan keamanan, maupun pengujian performa.

## 5. KESIMPULAN DAN SARAN

Penelitian ini berhasil menyusun otomatisasi black-box end-to-end untuk aplikasi pendaftaran event lari berbasis web menggunakan Selenium WebDriver. Dua belas test case mencakup registrasi valid, email tidak valid, email duplikat, pencarian, login valid dan tidak valid, perlindungan akses, logout, edit valid, konflik email saat edit, pembatalan delete, dan konfirmasi delete. Eksekusi production tanggal 23 Juli 2026 menghasilkan 12 test lulus dan 0 gagal dalam 290,278 detik, sehingga tingkat kesesuaian fungsional pada ruang lingkup yang diuji mencapai 100%. Penggunaan data unik, sesi browser terisolasi, selector khusus pengujian, *explicit wait*, dan screenshot kegagalan membuat proses lebih konsisten serta mudah ditelusuri. Meskipun demikian, hasil 100% tidak menunjukkan bahwa aplikasi bebas dari seluruh risiko; penelitian lanjutan disarankan menambah *boundary value analysis*, kombinasi input melalui *decision table*, pengujian pagination, kedaluwarsa sesi, keamanan, beban, aksesibilitas, perangkat bergerak, dan beberapa browser. Suite juga perlu diintegrasikan ke continuous integration dengan environment uji khusus dan mekanisme pembersihan data agar regresi dapat dijalankan berulang tanpa memengaruhi data production.

## DAFTAR PUSTAKA

[1] ISO/IEC/IEEE, “ISO/IEC/IEEE 29119-1:2022 Software and systems engineering—Software testing—Part 1: General concepts,” 2nd ed., Jan. 2022. [Online]. Available: https://www.iso.org/standard/81291.html

[2] ISO/IEC, “ISO/IEC 25010:2023 Systems and software engineering—Systems and software Quality Requirements and Evaluation (SQuaRE)—Product quality model,” 2nd ed., Nov. 2023. [Online]. Available: https://www.iso.org/standard/78176.html

[3] A. S. Wulandari, A. Saepudin, M. P. Kinanti, Z. Sudesi, A. Saifudin, and Y. Yulianti, “Pengujian aplikasi sistem informasi akademik berbasis web menggunakan metode black box testing equivalence partitioning,” *Jurnal Teknologi Sistem Informasi dan Aplikasi*, vol. 5, no. 2, pp. 102–109, 2022, doi: 10.32493/jtsi.v5i2.17561.

[4] M. Zidan, S. Nur’aini, N. C. H. Wibowo, and M. A. Ulinuha, “Black Box Testing pada aplikasi Single Sign On (SSO) di Diskominfostandi menggunakan teknik equivalence partitions,” *Walisongo Journal of Information Technology*, vol. 4, no. 2, 2022, doi: 10.21580/wjit.2022.4.2.12135.

[5] P. A. D. A. Santi, R. Afwani, M. A. Albar, S. E. Anjarwani, and A. Z. Mardiansyah, “Black box testing with equivalence partitioning and boundary value analysis methods (study case: Academic Information System of Mataram University),” in *Proc. First Mandalika Int. Multi-Conf. on Science and Engineering 2022*, pp. 207–219, 2022, doi: 10.2991/978-94-6463-084-8_19.

[6] A. Samdono, A. P. Sari, and F. P. Aditiawan, “Pengujian black box pada sistem informasi stok dan penjualan berbasis website menggunakan metode equivalence partitioning (studi kasus: CV. Algani Karya Mandiri),” *JATI (Jurnal Mahasiswa Teknik Informatika)*, vol. 8, no. 1, pp. 880–885, 2024, doi: 10.36040/jati.v8i1.8893.

[7] F. W. G. Suharyono, K. Kartini, and A. Junaidi, “Penerapan metode boundary value analysis dan equivalence partitioning dalam pengujian black box untuk aplikasi SIADITA,” *JATI (Jurnal Mahasiswa Teknik Informatika)*, vol. 8, no. 1, pp. 1013–1020, 2024, doi: 10.36040/jati.v8i1.8921.

[8] S. J. Putri, D. G. P. Putri, and W. H. N. Putra, “Analisis komparasi pada teknik black box testing (studi kasus: Website Lars),” *Journal of Internet and Software Engineering*, vol. 5, no. 1, pp. 23–28, 2024, doi: 10.22146/jise.v5i1.9446.

[9] W. Winata, A. W. R. Emanuel, and Herlina, “Pengujian website EPOS PT XYZ menggunakan metode black box testing,” *Jurnal Informatika Atma Jogja*, vol. 3, no. 2, 2022, doi: 10.24002/jiaj.v3i2.6780.

[10] F. K. Kartono *et al*., “Pengujian black box testing pada sistem website Osha Snack: Pendekatan teknik boundary value analysis,” *Jurnal Kridatama Sains dan Teknologi*, vol. 6, no. 2, pp. 754–766, 2024, doi: 10.53863/kst.v6i02.1407.

[11] B. Hardika *et al*., “Pengujian blackbox testing website Garuda Farm menggunakan teknik equivalence partitioning,” *Jurnal Kridatama Sains dan Teknologi*, vol. 6, no. 2, pp. 740–753, 2024, doi: 10.53863/kst.v6i02.1420.

[12] M. Nasir *et al*., “Implementasi equivalence partitioning testing pada fitur booking dan jadwal website praktik gigi mandiri drg. Susilawati,” *STRING (Satuan Tulisan Riset dan Inovasi Teknologi)*, vol. 9, no. 3, p. 371, 2025, doi: 10.30998/string.v9i3.26570.

[13] M. Leotta, B. García, F. Ricca, and J. Whitehead, “Challenges of end-to-end testing with Selenium WebDriver and how to face them: A survey,” in *2023 IEEE 16th International Conference on Software Testing, Verification and Validation (ICST)*, pp. 339–350, 2023, doi: 10.1109/ICST57152.2023.00039.

[14] X. Liu, Z. Song, W. Fang, W. Yang, and W. Wang, “WEFix: Intelligent automatic generation of explicit waits for efficient web end-to-end flaky tests,” in *Proceedings of the ACM Web Conference 2024*, 2024, doi: 10.1145/3589334.3645628.

[15] World Wide Web Consortium, “WebDriver,” W3C Working Draft, 2026. [Online]. Available: https://www.w3.org/TR/webdriver2/. [Accessed: Jul. 23, 2026].

[16] Selenium Project, “The Selenium browser automation project: WebDriver documentation,” 2025. [Online]. Available: https://www.selenium.dev/documentation/webdriver/. [Accessed: Jul. 23, 2026].

[17] OpenJS Foundation, “Node.js test runner documentation,” 2026. [Online]. Available: https://nodejs.org/api/test.html. [Accessed: Jul. 23, 2026].

[18] SQLite Project, “SQLite documentation,” 2026. [Online]. Available: https://www.sqlite.org/docs.html. [Accessed: Jul. 23, 2026].

[19] Docker Inc., “Docker Compose documentation,” 2026. [Online]. Available: https://docs.docker.com/compose/. [Accessed: Jul. 23, 2026].

---

## CHECKLIST PEMINDAHAN KE TEMPLATE DOCX

- [ ] Hapus catatan penyusunan dan checklist ini dari naskah final.
- [ ] Isi nama dosen pembimbing, alamat kampus, email, dan nomor kontak.
- [ ] Pastikan abstrak tetap satu paragraf dan tidak melebihi 200 kata.
- [ ] Terapkan format A4 dua kolom, margin, font, dan ukuran sesuai `Template JATI.docx`.
- [ ] Ubah diagram teks menjadi gambar, kemudian letakkan judul gambar di bawahnya.
- [ ] Pastikan judul tabel berada di atas tabel dan penomorannya berurutan.
- [ ] Masukkan screenshot public web, dashboard, dan hasil console Selenium bila diperlukan.
- [ ] Impor seluruh DOI/URL ke Mendeley lalu verifikasi kembali gaya IEEE.
- [ ] Jalankan pemeriksaan ejaan Bahasa Indonesia.
- [ ] Lakukan pemeriksaan Turnitin; revisi bila skor kemiripan melebihi ketentuan dosen.
