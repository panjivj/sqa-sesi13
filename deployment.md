# Deployment ke VPS Ubuntu

Panduan ini menggunakan Docker Compose dan Caddy. Caddy menjadi satu-satunya service yang membuka port publik serta menangani reverse proxy dan HTTPS otomatis.

## Arsitektur Production

```text
Internet
   │
   ├── https://event.example.com
   ├── https://admin-event.example.com
   └── https://api-event.example.com
                    │
               Caddy :80/:443
                    │
        ┌───────────┼────────────┐
        │           │            │
   public-web  admin-dashboard  backend:3000
                                  │
                         SQLite named volume
```

Container yang dijalankan:

- `backend`: Express.js dan SQLite.
- `public-web`: hasil build Vue yang disajikan Nginx.
- `admin-dashboard`: hasil build Vue yang disajikan Nginx.
- `caddy`: domain, reverse proxy, sertifikat HTTPS, dan redirect HTTP ke HTTPS.

Selenium tidak dijalankan di VPS. Test mode production tetap dijalankan dari komputer lokal.

## 1. Persiapan DNS

Buat tiga DNS record tipe `A` yang mengarah ke alamat IPv4 VPS:

| Host | Tujuan |
| --- | --- |
| `event.example.com` | IP VPS |
| `admin-event.example.com` | IP VPS |
| `api-event.example.com` | IP VPS |

Gunakan domain yang sebenarnya, bukan domain contoh. Tambahkan record `AAAA` hanya jika VPS sudah memiliki dan menggunakan IPv6.

Pastikan DNS sudah terpropagasi:

```bash
dig +short event.example.com
dig +short admin-event.example.com
dig +short api-event.example.com
```

Caddy hanya dapat memperoleh sertifikat publik apabila domain mengarah ke VPS dan port `80` serta `443` dapat diakses. Dokumentasi: [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## 2. Instalasi Docker pada Ubuntu

Gunakan repository resmi Docker, bukan package Docker tidak resmi dari repository lain. Instruksi terbaru tersedia di [Docker Engine untuk Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

Hapus package yang berpotensi konflik:

```bash
sudo apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc
```

Tambahkan repository resmi Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verifikasi:

```bash
sudo systemctl status docker --no-pager
sudo docker run --rm hello-world
sudo docker compose version
```

Seluruh perintah Docker pada panduan ini menggunakan `sudo`. Konfigurasi Docker tanpa `sudo` bersifat opsional dan harus mempertimbangkan bahwa anggota group `docker` memperoleh hak akses setara root.

## 3. Firewall

Buka hanya SSH, HTTP, dan HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

Jika penyedia VPS memiliki network firewall atau security group, buka port yang sama di sana. Jangan membuka port backend `3000`, public web, atau dashboard secara langsung. Compose hanya memublikasikan port milik Caddy.

Docker memiliki interaksi khusus dengan UFW. Baca bagian firewall pada [dokumentasi instalasi Docker Ubuntu](https://docs.docker.com/engine/install/ubuntu/) sebelum menambahkan published port lain.

## 4. Mengambil Source Code

Contoh lokasi aplikasi:

```bash
sudo mkdir -p /opt/run-event
sudo chown "$USER":"$USER" /opt/run-event
git clone <URL_REPOSITORY> /opt/run-event
cd /opt/run-event
```

Ganti `<URL_REPOSITORY>` dengan URL Git repository yang sebenarnya.

## 5. Konfigurasi Production

Salin contoh environment:

```bash
cp .env.production.example .env.production
nano .env.production
```

Isi domain sebenarnya:

```env
PUBLIC_DOMAIN=event.example.com
ADMIN_DOMAIN=admin-event.example.com
API_DOMAIN=api-event.example.com
API_PUBLIC_URL=https://api-event.example.com
ACME_EMAIL=admin@example.com
```

Ketentuan:

- `API_PUBLIC_URL` harus menggunakan domain yang sama dengan `API_DOMAIN` dan diawali `https://`.
- `ACME_EMAIL` digunakan Caddy untuk pengelolaan sertifikat.
- Jangan menambahkan `http://` atau `https://` pada tiga variable `*_DOMAIN`.
- `.env.production` tidak masuk Git.

Validasi hasil interpolasi Compose:

```bash
sudo docker compose --env-file .env.production config
```

Jangan lanjutkan jika perintah tersebut menampilkan error variable wajib belum diisi.

## 6. Build dan Menjalankan Aplikasi

Build image dan jalankan seluruh container:

```bash
sudo docker compose --env-file .env.production up -d --build
```

Periksa status:

```bash
sudo docker compose --env-file .env.production ps
sudo docker compose --env-file .env.production logs --tail=100
```

Tunggu sampai `backend`, `public-web`, dan `admin-dashboard` berstatus healthy. Periksa Caddy jika sertifikat belum terbit:

```bash
sudo docker compose --env-file .env.production logs -f caddy
```

Tekan `Ctrl+C` untuk keluar dari tampilan log tanpa menghentikan container.

## 7. Verifikasi Deployment

Jalankan dari VPS atau komputer lokal:

```bash
curl -I https://event.example.com
curl -I https://admin-event.example.com
curl https://api-event.example.com/health
```

Health check backend harus mengembalikan:

```json
{"status":"ok"}
```

Buka public web dan dashboard melalui browser untuk memastikan keduanya menggunakan HTTPS dan dapat membaca backend.

## 8. Menjalankan Selenium Production dari Lokal

Pada komputer lokal, edit file `.env` repository:

```env
PROD_PUBLIC_WEB_URL=https://event.example.com
PROD_ADMIN_DASHBOARD_URL=https://admin-event.example.com

SELENIUM_HEADLESS=false
SELENIUM_STEP_DELAY_MS=500
SELENIUM_PAUSE_AFTER_TEST_MS=3000
```

Jalankan:

```bash
npm run test:e2e:prod
```

Test membuat data peserta nyata pada SQLite production. Data menggunakan nama berawalan `Selenium Test` dan email unik, tetapi tidak dihapus otomatis.

## 9. Update Deployment

Masuk ke direktori aplikasi:

```bash
cd /opt/run-event
```

Disarankan membuat backup database sebelum update. Setelah itu:

```bash
git pull --ff-only
sudo docker compose --env-file .env.production up -d --build --remove-orphans
sudo docker compose --env-file .env.production ps
```

Compose hanya mengganti container yang konfigurasinya berubah. Named volume SQLite dan volume sertifikat Caddy tetap dipertahankan.

## 10. Backup SQLite

Volume database memiliki nama tetap `run-event-registration-data`. Untuk mendapatkan backup konsisten, hentikan backend sebentar:

```bash
cd /opt/run-event
mkdir -p backups
BACKUP_FILE="sqlite-$(date +%Y%m%d-%H%M%S).tar.gz"

sudo docker compose --env-file .env.production stop backend
sudo docker run --rm \
  -v run-event-registration-data:/data:ro \
  -v "$PWD/backups:/backup" \
  alpine sh -c "tar czf /backup/$BACKUP_FILE -C /data ."
sudo docker compose --env-file .env.production start backend

echo "Backup tersimpan di backups/$BACKUP_FILE"
```

Salin file backup ke lokasi lain di luar VPS secara berkala.

### Restore backup

Restore akan mengganti seluruh database aktif. Pastikan nama file benar dan simpan backup kondisi terakhir sebelum melanjutkan.

```bash
cd /opt/run-event
sudo docker compose --env-file .env.production stop backend

sudo docker run --rm \
  -v run-event-registration-data:/data \
  -v "$PWD/backups:/backup:ro" \
  alpine sh -c 'rm -rf /data/* && tar xzf /backup/NAMA_BACKUP.tar.gz -C /data'

sudo docker compose --env-file .env.production start backend
```

Ganti `NAMA_BACKUP.tar.gz` dengan file yang akan dipulihkan.

## 11. Operasional Dasar

Melihat status:

```bash
sudo docker compose --env-file .env.production ps
```

Melihat log seluruh service:

```bash
sudo docker compose --env-file .env.production logs -f
```

Melihat log satu service:

```bash
sudo docker compose --env-file .env.production logs -f backend
```

Restart satu service:

```bash
sudo docker compose --env-file .env.production restart backend
```

Menghentikan seluruh aplikasi tanpa menghapus volume:

```bash
sudo docker compose --env-file .env.production down
```

Menjalankan kembali:

```bash
sudo docker compose --env-file .env.production up -d
```

Jangan menggunakan `down -v` karena opsi tersebut menghapus database dan data sertifikat Caddy.

## 12. Data Persisten

Compose membuat tiga named volume:

| Volume | Isi |
| --- | --- |
| `run-event-registration-data` | File SQLite `app.db` |
| `run-event-caddy-data` | Sertifikat dan state Caddy |
| `run-event-caddy-config` | Konfigurasi internal Caddy |

Container dapat dibuat ulang tanpa menghapus volume tersebut. Backend hanya boleh dijalankan dengan satu replica karena database menggunakan SQLite.

## 13. Troubleshooting

### Caddy gagal memperoleh sertifikat

Periksa:

- DNS sudah mengarah ke IP VPS.
- Port `80` dan `443` terbuka pada UFW dan firewall penyedia VPS.
- Domain di `.env.production` tidak memakai protokol.
- Tidak ada service lain seperti Nginx atau Apache yang memakai port `80`/`443`.

```bash
sudo ss -lntup | grep -E ':80|:443'
sudo docker compose --env-file .env.production logs caddy
```

### Frontend tidak dapat mengakses backend

Pastikan `API_PUBLIC_URL` benar. Nilai ini ditanam ke bundle Vue saat image dibangun, sehingga perubahan environment memerlukan build ulang:

```bash
sudo docker compose --env-file .env.production up -d --build public-web admin-dashboard
```

Periksa juga:

```bash
curl https://api-event.example.com/health
```

### Backend tidak healthy

```bash
sudo docker compose --env-file .env.production logs backend
sudo docker compose --env-file .env.production exec backend ls -la /data
```

Pastikan volume `/data` dapat ditulis dan hanya ada satu container backend.

### Dashboard dapat diakses publik

Dashboard proof of concept ini memang tidak memiliki autentikasi. Jangan menyimpan data pribadi sungguhan dan jangan gunakan deployment ini sebagai aplikasi production nyata sebelum autentikasi serta perlindungan data ditambahkan.

## File Deployment di Repository

```text
.
├── compose.yaml
├── Caddyfile
├── .dockerignore
├── .env.production.example
├── apps/backend/Dockerfile
├── apps/public-web/Dockerfile
├── apps/public-web/nginx.conf
├── apps/admin-dashboard/Dockerfile
├── apps/admin-dashboard/nginx.conf
└── deployment.md
```
