# Rental Mobil

**Pilih mobil, tentukan tanggal, dan ajukan booking dengan mudah.**

## Deskripsi Proyek

Rental Mobil adalah aplikasi web untuk melihat armada, memeriksa ketersediaan mobil berdasarkan tanggal, dan mengajukan pemesanan. Admin dapat mengelola mobil, memproses status booking, serta memblokir tanggal ketika mobil tidak tersedia. Dokumen identitas dan gambar disimpan di penyimpanan S3-compatible secara privat.

## Tangkapan Layar / Demo Gambar

Belum ada tangkapan layar atau demo yang disimpan di repository. Tambahkan gambar ke `docs/images/`, kemudian tampilkan di bagian ini, contohnya:

```md
![Katalog armada](docs/images/katalog.png)
```

Jalankan aplikasi lokal menggunakan petunjuk di bagian [Cara Menjalankan Aplikasi](#cara-menjalankan-aplikasi-usage--deployment) untuk melihat demo.

## Fitur Utama

- Katalog mobil dengan filter kapasitas dan transmisi.
- Pencarian ketersediaan berdasarkan rentang tanggal sewa.
- Form booking dengan data penyewa, pilihan aksesori, dan estimasi harga.
- Validasi file identitas (JPG, PNG, atau WebP, maksimal 5 MB) dan penyimpanan privat.
- Kode booking dan halaman untuk melihat status pesanan.
- Panel admin untuk melihat pesanan, memperbarui status, dan melihat detail booking.
- Pengelolaan armada, harga, status aktif, serta gambar mobil.
- Kalender admin untuk memblokir tanggal kendaraan.
- Pencegahan booking mobil yang sama pada tanggal yang bertumpang-tindih.

## Prasyarat Sistem

- Node.js 22 atau lebih baru.
- npm (lockfile proyek menggunakan `package-lock.json`).
- Docker Desktop dengan Docker Compose, untuk menjalankan seluruh layanan lokal.
- Git.

## Panduan Instalasi

1. Clone repository dan masuk ke direktori proyek:

   ```bash
   git clone <URL-REPOSITORY>
   cd rental-mobil
   ```

2. Salin template variabel lingkungan:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Periksa dan sesuaikan nilai pada `.env.local`. Ganti khususnya `AUTH_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` dengan nilai lokal yang kuat. Buat secret dengan Node.js:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

4. Pasang dependency jika akan menjalankan aplikasi langsung di host:

   ```bash
   npm ci
   ```

   Instalasi dependency juga dilakukan otomatis saat image layanan `app` dibuat oleh Docker Compose.

## Cara Menjalankan Aplikasi (Usage / Deployment)

### Menjalankan dengan Docker Compose (disarankan untuk development)

Pastikan `.env.local` sudah tersedia, kemudian jalankan:

```bash
docker compose up --build -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma generate
```

Untuk mengisi database dengan data contoh khusus development:

```bash
docker compose exec app npx prisma db seed
```

Seed development membuat akun `admin@rental.test` dengan password `Admin123!`. Kredensial ini hanya untuk database lokal development; jangan gunakan atau seed akun tersebut di production. Untuk membuat atau mengganti akun admin sendiri, isi `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan opsional `ADMIN_NAME` di `.env.local`, lalu jalankan:

```bash
docker compose exec app npx tsx scripts/create-admin.ts
```

Buka aplikasi di [http://localhost:3000](http://localhost:3000). Panel admin berada di `/admin/login`. pgAdmin tersedia di [http://localhost:5050](http://localhost:5050), SeaweedFS S3 di port `8333`, dan antarmuka master SeaweedFS di port `9333`.

Untuk memindahkan workflow development dari Windows ke WSL2, termasuk opsi mempertahankan atau memindahkan data Docker, ikuti [tutorial migrasi Docker ke WSL2](./docs/MIGRASI-DOCKER-WSL.md).

Log dan layanan dapat diperiksa dengan:

```bash
docker compose logs -f app
docker compose ps
```

### Menjalankan aplikasi di host

Jalankan PostgreSQL dan SeaweedFS terlebih dahulu (misalnya melalui Docker Compose). Untuk proses Next.js di host, ubah alamat service di `.env.local` agar menunjuk ke port host, misalnya `DATABASE_URL` ke `localhost:5432` dan `S3_ENDPOINT`/`S3_PUBLIC_ENDPOINT` ke `http://localhost:8333`. Setelah dependency terpasang dan database siap:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### Build dan deployment production

Siapkan PostgreSQL dan penyimpanan S3-compatible yang dapat dijangkau aplikasi. Konfigurasikan semua variabel lingkungan production, lalu jalankan:

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

Atur `NODE_ENV=production` di lingkungan deployment. Jangan menjalankan `prisma migrate dev` atau seed development di production. Sesuaikan konfigurasi reverse proxy, domain, endpoint storage, dan secret dengan platform deployment yang digunakan.

Perintah proyek lainnya:

```bash
npm run lint
npx tsc --noEmit
```

## Variabel Lingkungan

Variabel aplikasi disimpan di `.env.local` untuk penggunaan lokal dan tidak boleh dimasukkan ke version control.

| Variabel | Kegunaan |
| --- | --- |
| `POSTGRES_USER` | Pengguna PostgreSQL pada Docker Compose. |
| `POSTGRES_PASSWORD` | Password PostgreSQL pada Docker Compose; ganti nilai contoh. |
| `POSTGRES_DB` | Nama database PostgreSQL pada Docker Compose. |
| `DATABASE_URL` | URL koneksi PostgreSQL. Di dalam Docker gunakan hostname service `db`; dari host gunakan `localhost`. |
| `PGADMIN_DEFAULT_EMAIL` | Email login pgAdmin lokal. |
| `PGADMIN_DEFAULT_PASSWORD` | Password pgAdmin lokal; ganti nilai contoh. |
| `S3_ENDPOINT` | Endpoint S3 yang diakses server aplikasi; di Docker Compose gunakan `http://storage:8333`. |
| `S3_PUBLIC_ENDPOINT` | Endpoint S3 yang dapat dijangkau browser untuk URL bertanda tangan; biasanya `http://localhost:8333` saat development lokal. |
| `S3_REGION` | Region S3, misalnya `us-east-1`. |
| `S3_ACCESS_KEY` | Access key untuk storage S3-compatible. |
| `S3_SECRET_KEY` | Secret key untuk storage S3-compatible. |
| `S3_BUCKET` | Nama bucket file, misalnya `rental-files`. |
| `S3_FORCE_PATH_STYLE` | Gunakan `true` untuk endpoint S3-compatible lokal seperti SeaweedFS. |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi, misalnya `http://localhost:3000`. |
| `AUTH_SECRET` | Secret untuk menandatangani sesi admin; gunakan nilai acak minimal 32 karakter. |
| `ADMIN_EMAIL` | Email admin untuk script `scripts/create-admin.ts`. |
| `ADMIN_PASSWORD` | Password admin untuk script pembuatan akun; minimal 12 karakter. |
| `ADMIN_NAME` | Nama admin untuk script pembuatan akun (opsional; default `Admin`). |

`AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `ADMIN_NAME` perlu ditambahkan ke `.env.local`; variabel tersebut belum tercantum di `.env.example`.

## Struktur Folder / Repositori

```text
.
├── infra/seaweedfs/       # Konfigurasi SeaweedFS lokal
├── prisma/
│   ├── migrations/        # Riwayat migrasi database
│   ├── schema.prisma      # Model dan konfigurasi schema Prisma
│   └── seed.ts            # Data contoh untuk development
├── scripts/               # Script administrasi dan pemeriksaan storage
├── src/
│   ├── app/               # Halaman Next.js, API, dan panel admin
│   ├── components/        # Komponen UI
│   └── lib/               # Auth, database, booking, validasi, dan storage
├── .env.example           # Template konfigurasi lokal
├── docker-compose.yml     # Layanan aplikasi dan dependensinya
└── prisma.config.ts       # Konfigurasi Prisma CLI dan datasource
```

## Daftar Teknologi yang Digunakan (Tech Stack)

- **Next.js 16** dengan App Router dan Cache Components.
- **React 19**, **TypeScript 5**, dan **Tailwind CSS 4**.
- **Prisma 7** dengan PostgreSQL dan driver adapter `@prisma/adapter-pg`.
- **PostgreSQL 17** untuk data aplikasi.
- **SeaweedFS** dengan API S3 untuk file privat; AWS SDK v3 untuk operasi S3 dan URL bertanda tangan.
- **Zod** untuk validasi, **bcryptjs** untuk hash password, dan **jose** untuk token sesi.
- **Docker Compose** untuk lingkungan development lokal.

## Panduan Kontribusi (Contributing)

1. Buat branch dari branch utama untuk perubahan yang dikerjakan.
2. Jaga agar perubahan tetap fokus dan sertakan migrasi jika schema database berubah.
3. Jangan commit file `.env.local`, kredensial, data identitas, atau file hasil build.
4. Jalankan pemeriksaan sebelum mengajukan perubahan:

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

5. Jelaskan perubahan, cara mengujinya, dan dampaknya terhadap konfigurasi atau database saat mengajukan pull request.

## Catatan Rilis / Riwayat Perubahan (Changelog)

### 2026-11-09 — Versi pengembangan awal

- Menambahkan katalog dan filter ketersediaan mobil.
- Menambahkan alur booking, aksesori, dan penyimpanan dokumen privat.
- Menambahkan panel admin untuk pesanan, armada, dan kalender blokir.
- Menambahkan migrasi Prisma untuk schema, pencegahan booking bertumpang-tindih, dan indeks ketersediaan.

Proyek masih dalam pengembangan; belum ada nomor rilis/tag versi yang ditetapkan.

## Lisensi (License)

Belum ada file lisensi atau pilihan lisensi yang ditetapkan di repository ini. Hak penggunaan dan distribusi belum didefinisikan; mintalah izin pemilik proyek sebelum menggunakan atau mendistribusikan kode di luar repository.

## Kontak & Pembuat (Credits / Contact)

- **Proyek:** Rental Mobil.
- **Pembuat/maintainer:** belum dicantumkan di metadata proyek.
- **Kontak:** belum dicantumkan. Untuk saat ini, gunakan kanal issue atau pull request pada repository tempat kode ini di-host.
