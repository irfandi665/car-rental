# Migrasi Docker dari Windows ke WSL2

Panduan ini memindahkan workflow development Rental Mobil dari folder Windows
(`D:\Project\web\rental-mobil`) ke filesystem Linux WSL2. Jalankan proyek dari
folder Linux, misalnya `~/projects/rental-mobil`, agar bind mount Docker dan
hot reload lebih stabil.

## Pilih model Docker

Ada dua cara menjalankan Docker dari WSL:

1. **Docker Desktop + integrasi WSL2 (disarankan).** Docker daemon dan volume
   tetap milik Docker Desktop. Aktifkan integrasi distro WSL, lalu jalankan
   perintah Docker dari folder proyek di WSL. Ini migrasi termudah dan data
   Docker yang sudah ada tetap tersedia.
2. **Docker Engine terpisah di WSL.** Distro WSL menjalankan daemon Docker
   sendiri. Image, container, dan volume tidak sama dengan Docker Desktop,
   sehingga database dan file storage harus dipindahkan secara terpisah.

Jangan menjalankan dua daemon sekaligus tanpa sengaja: perintah `docker` bisa
terhubung ke engine yang berbeda, dan volume dengan nama sama pada kedua engine
tetap merupakan data yang berbeda.

## Opsi A — Docker Desktop dengan integrasi WSL2

### 1. Pastikan distro menggunakan WSL2

Di PowerShell:

```powershell
wsl --list --verbose
```

Pastikan distro Linux yang akan dipakai memiliki `VERSION` bernilai `2`. Jika
belum, ubah distro yang sesuai (ganti `Ubuntu` dengan nama dari daftar):

```powershell
wsl --set-version Ubuntu 2
```

### 2. Aktifkan integrasi Docker Desktop

Di Docker Desktop:

1. Buka **Settings → General**, aktifkan **Use the WSL 2 based engine**.
2. Buka **Settings → Resources → WSL Integration**.
3. Aktifkan integrasi untuk distro yang akan digunakan, lalu pilih **Apply &
   Restart**.
4. Buka terminal distro WSL dan cek:

   ```bash
   docker version
   docker compose version
   ```

Pastikan perintah `docker` tersedia dan bagian `Server` pada `docker version`
menampilkan versi engine.

### 3. Salin proyek ke filesystem Linux

Buka distro WSL. Contoh berikut menyalin isi proyek dari drive `D:` ke home
Linux, tanpa membawa cache build dan dependency Windows:

```bash
mkdir -p "$HOME/projects"
tar \
  --exclude='rental-mobil/node_modules' \
  --exclude='rental-mobil/.next' \
  -C /mnt/d/Project/web \
  -cf - rental-mobil | tar -C "$HOME/projects" -xf -

cp /mnt/d/Project/web/rental-mobil/.env.local \
  "$HOME/projects/rental-mobil/.env.local"
cd "$HOME/projects/rental-mobil"
```

Perintah `tar` tetap membawa file lain, termasuk perubahan lokal dan direktori
`.git` jika ada. File `.env.local` disalin terpisah dan tidak boleh dimasukkan
ke Git. Jika file itu belum ada, buat dari template lalu isi nilainya:

```bash
cp .env.example .env.local
chmod 600 .env.local
```

Jangan mengganti URL service di `.env.local` untuk penggunaan Compose:
`DATABASE_URL` harus memakai hostname `db`, dan `S3_ENDPOINT` harus memakai
`http://storage:8333`.

### 4. Pindahkan layanan ke folder WSL

Folder kerja lama dan folder baru memakai nama project Compose `rental-mobil`
yang sama. Pada Docker Desktop, named volumes proyek tetap berada di engine
yang sama. Hentikan stack lama dari PowerShell di folder Windows:

```powershell
Set-Location D:\Project\web\rental-mobil
docker compose down
```

Perintah di atas **tidak** menghapus named volumes. Jangan tambahkan `-v` atau
menjalankan `docker volume prune`; tindakan tersebut dapat menghapus data.

Lanjutkan dari terminal WSL:

```bash
cd "$HOME/projects/rental-mobil"
docker compose up --build -d
docker compose ps
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma generate
```

Buka [http://localhost:3000](http://localhost:3000). Dashboard pgAdmin ada di
port `5050`; SeaweedFS S3 menggunakan port `8333`.

### 5. Buka proyek dengan VS Code

Dari terminal WSL di folder proyek:

```bash
code .
```

Pastikan VS Code menampilkan indikator **WSL** pada status bar. Jangan membuka
salinan di `D:\...` jika ingin menjalankan development dari WSL.

## Opsi B — pindah ke Docker Engine yang terpisah di WSL

Gunakan opsi ini hanya jika memang ingin daemon Docker berjalan di distro WSL,
bukan memakai engine Docker Desktop. Pasang Docker Engine dan Compose plugin
mengikuti panduan resmi Docker untuk distro Linux yang digunakan. Jangan
menjalankan langkah instalasi ini bersamaan dengan integrasi Docker Desktop
tanpa menentukan engine mana yang akan dipakai.

### 1. Backup dari engine Windows/Docker Desktop

Jalankan langkah ini **sebelum** beralih ke Docker Engine WSL. Buka terminal
WSL dengan integrasi Docker Desktop aktif dan pastikan `docker compose ps`
menampilkan stack lama. Buat folder backup di home Linux:

```bash
mkdir -p "$HOME/rental-mobil-migration-backup"
cd /mnt/d/Project/web/rental-mobil
```

Simpan dump PostgreSQL dalam format custom:

```bash
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" -f /tmp/rental.dump'
docker cp rental-db:/tmp/rental.dump \
  "$HOME/rental-mobil-migration-backup/rental.dump"
```

Backup volume SeaweedFS yang menyimpan data objek:

```bash
docker run --rm \
  -v rental-mobil_storage_data:/data:ro \
  -v "$HOME/rental-mobil-migration-backup:/backup" \
  alpine sh -c 'tar -czf /backup/storage-data.tar.gz -C /data .'
```

Periksa bahwa kedua file backup ada dan ukurannya bukan nol:

```bash
ls -lh "$HOME/rental-mobil-migration-backup"
```

Jangan menghapus atau membersihkan Docker Desktop volumes sampai aplikasi
berhasil diverifikasi menggunakan engine WSL.

### 2. Beralih ke engine WSL

1. Hentikan stack lama tanpa menghapus volumes:

   ```bash
   cd /mnt/d/Project/web/rental-mobil
   docker compose down
   ```

2. Aktifkan Docker Engine WSL mengikuti dokumentasi resmi untuk distro yang
   digunakan. Jika Docker Desktop masih terintegrasi, putuskan integrasi distro
   tersebut atau pastikan Docker CLI benar-benar menunjuk ke daemon WSL.
3. Di terminal WSL, cek engine aktif:

   ```bash
   docker context show
   docker version
   docker compose version
   ```

4. Pastikan proyek, `.env.local`, dan folder backup berada pada filesystem
   Linux. Jika belum, salin proyek menggunakan langkah 3 pada Opsi A.

### 3. Buat volume baru dan pulihkan data

Dari folder proyek Linux, buat database dan volume storage kosong:

```bash
cd "$HOME/projects/rental-mobil"
docker compose up -d db storage
docker compose ps
```

Pulihkan PostgreSQL:

```bash
docker cp "$HOME/rental-mobil-migration-backup/rental.dump" \
  rental-db:/tmp/rental.dump
docker compose exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner /tmp/rental.dump'
```

Pulihkan file SeaweedFS ke volume baru. Untuk image Compose ini, nama volume
storage adalah `rental-mobil_storage_data`:

```bash
docker compose stop storage
docker run --rm \
  -v rental-mobil_storage_data:/data \
  -v "$HOME/rental-mobil-migration-backup:/backup:ro" \
  alpine sh -c 'tar -xzf /backup/storage-data.tar.gz -C /data'
docker compose start storage
```

Jika nama project Compose diubah, konfirmasikan nama volume terlebih dahulu
dengan `docker volume ls` dan gunakan volume yang benar. Jangan ekstrak backup
ke volume yang sedang digunakan SeaweedFS.

### 4. Jalankan aplikasi dan verifikasi

```bash
docker compose up --build -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma generate
docker compose ps
curl -I http://localhost:3000/
curl -i http://localhost:3000/api/health
```

Pastikan halaman katalog tampil, health endpoint mengembalikan HTTP 200, data
booking masih ada, dan dokumen/gambar lama dapat dibuka dari aplikasi sebelum
menghapus apa pun dari engine Docker Desktop.

## Perintah development sehari-hari

Jalankan perintah berikut dari folder proyek Linux:

```bash
docker compose up -d
docker compose logs -f app
docker compose ps
docker compose down
```

`docker compose down` menghentikan stack dan menghapus container/network, tetapi
mempertahankan named volumes. Hindari `docker compose down -v` jika data masih
diperlukan.

## Troubleshooting

- **`docker: command not found`:** aktifkan WSL integration di Docker Desktop
  (Opsi A), atau pasang Docker CLI/Engine untuk distro yang dipilih (Opsi B).
- **Docker CLI tidak bisa menghubungi daemon:** pastikan Docker Desktop berjalan
  atau daemon WSL aktif, lalu periksa `docker context show`.
- **Port 3000 sudah dipakai:** hentikan stack lama atau proses lain yang
  menggunakan port tersebut sebelum menjalankan `docker compose up`.
- **Database terlihat kosong:** pastikan engine Docker yang aktif benar.
  Docker Desktop dan Docker Engine WSL memiliki volume terpisah; jangan menjalankan
  `docker volume prune` sebelum memastikan backup dan pemulihan.
- **Perubahan file lambat atau hot reload gagal:** pastikan kode berada di
  `~/projects/...`, bukan dijalankan langsung dari `/mnt/d/...`.
- **Aplikasi belum siap saat pertama kali dibuka:** periksa
  `docker compose logs -f app db storage` dan tunggu healthcheck database siap.

## Catatan keamanan dan data

- Jangan commit `.env.local`, dump database, arsip storage, dokumen identitas,
  atau backup lainnya.
- Backup dapat berisi data pribadi; simpan di lokasi lokal yang aman dan hapus
  hanya setelah migrasi serta verifikasi selesai.
- Perintah migrasi di panduan ini tidak menghapus volume. Selalu periksa
  engine/context aktif sebelum menjalankan operasi terhadap Docker volumes.
