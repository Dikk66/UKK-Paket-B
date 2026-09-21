# Coworking Space Reservation API
### UKK XII Paket B — 2026/2027

Backend RESTful API untuk sistem reservasi coworking space berbasis **Node.js + Express + Prisma + MySQL**.

---

## Daftar Isi

1. [Teknologi yang Digunakan](#teknologi)
2. [Struktur Folder](#struktur-folder)
3. [Desain Database](#desain-database)
4. [Cara Kerja Sistem](#cara-kerja-sistem)
5. [Daftar Endpoint API](#daftar-endpoint-api)
6. [Penjelasan Setiap File](#penjelasan-setiap-file)
7. [Cara Menjalankan Lokal](#cara-menjalankan-lokal)
8. [Environment Variables](#environment-variables)
9. [Fitur Unggulan](#fitur-unggulan)

---

## Teknologi

| Teknologi | Fungsi |
|-----------|--------|
| **Node.js** | Runtime JavaScript di server |
| **Express.js** | Framework HTTP untuk membuat REST API |
| **Prisma ORM** | Penghubung antara kode JavaScript dan database MySQL |
| **MySQL** | Database untuk menyimpan semua data |
| **JWT (JSON Web Token)** | Sistem autentikasi — login menghasilkan token |
| **bcryptjs** | Enkripsi password sebelum disimpan ke database |
| **Multer** | Upload file/foto ke server |
| **Swagger UI** | Dokumentasi API yang bisa dicoba langsung di browser |
| **CORS** | Mengizinkan frontend dari domain lain mengakses API |

---

## Struktur Folder

```
coworking-backend/
│
├── prisma/
│   └── schema.prisma          # Definisi struktur database (tabel, relasi, tipe data)
│
├── src/
│   ├── app.js                 # File utama — entry point server
│   │
│   ├── lib/
│   │   └── prisma.js          # Koneksi database (satu instance Prisma dipakai bersama)
│   │
│   ├── middleware/
│   │   ├── auth.js            # Verifikasi JWT token
│   │   └── makerKey.js        # Verifikasi x-maker-key header
│   │
│   ├── controllers/           # Logika bisnis setiap endpoint
│   │   ├── makerController.js
│   │   ├── authController.js
│   │   ├── spacesController.js
│   │   ├── diskonController.js
│   │   ├── reservasiController.js
│   │   ├── uploadController.js
│   │   ├── adminProfileController.js
│   │   ├── adminMembersController.js
│   │   ├── adminSpacesController.js
│   │   ├── adminDiskonController.js
│   │   ├── adminReservasiController.js
│   │   └── adminReportsController.js
│   │
│   ├── routes/                # Definisi URL endpoint
│   │   ├── maker.js
│   │   ├── auth.js
│   │   ├── spaces.js
│   │   ├── diskon.js
│   │   ├── reservasi.js
│   │   ├── upload.js
│   │   └── admin/
│   │       ├── profile.js
│   │       ├── members.js
│   │       ├── spaces.js
│   │       ├── diskon.js
│   │       ├── reservasi.js
│   │       └── reports.js
│   │
│   └── swagger.js             # Konfigurasi dokumentasi Swagger
│
├── uploads/
│   ├── spaces/                # Foto ruangan coworking
│   ├── members/               # Foto profil member
│   └── general/               # Foto umum lainnya
│
├── .env                       # Konfigurasi environment (DATABASE_URL, JWT_SECRET, dll)
├── .env.example               # Template .env untuk panduan deployment
├── .gitignore                 # File yang tidak ikut di-push ke GitHub
├── package.json               # Daftar dependency dan script
└── postman_collection.json    # Koleksi request Postman untuk testing
```

---

## Desain Database

Sistem menggunakan **8 tabel** sesuai ERD soal:

```
app_makers          users
    │                 │
    │    ┌────────────┤
    │    │            │
    │  members    space_owners
    │    │            │
    │    │          spaces
    │    │            │
    │  reservasis ←───┘
    │    │
    └─ diskons
         │
    detail_reservasis
```

### Penjelasan Setiap Tabel

| Tabel | Isi | Field Penting |
|-------|-----|---------------|
| `app_makers` | Akun siswa pengembang frontend | `app_key` (unik per siswa) |
| `users` | Akun login semua pengguna | `role` (member/admin_space) |
| `members` | Profil pelanggan coworking | `id_user` (FK ke users) |
| `space_owners` | Profil admin/pengelola coworking | `id_user` (FK ke users) |
| `spaces` | Data ruangan/meja yang bisa dipesan | `tipe` (desk/meeting_room/private_office) |
| `diskons` | Kode promo | `tanggal_awal`, `tanggal_akhir` |
| `reservasis` | Header transaksi pemesanan | `kode_booking`, `status`, `jam_mulai` |
| `detail_reservasis` | Detail ruangan & diskon per reservasi | `id_space`, `id_diskon`, `total_harga` |

### Status Alur Reservasi

```
belum_dikonfirm → disetujui → aktif → selesai
        ↓               ↓
    dibatalkan      dibatalkan
```

---

## Cara Kerja Sistem

### Konsep Multi-Tenancy (x-maker-key)

Setiap siswa pengembang punya **app_key** unik. Semua data (member, space, diskon, reservasi) terisolasi per maker — artinya data milik maker A tidak akan tercampur dengan data maker B.

```
Siswa A (app_key: mk_aaa) → punya users, spaces, reservasi sendiri
Siswa B (app_key: mk_bbb) → punya users, spaces, reservasi sendiri
```

Header `x-maker-key` wajib dikirim di semua request kecuali endpoint maker.

### Alur Autentikasi JWT

```
1. POST /api/auth/login
        ↓
2. Server cek username + password
        ↓
3. Jika valid → generate JWT token (expire 7 hari)
        ↓
4. Token dikirim ke frontend
        ↓
5. Setiap request berikutnya kirim:
   Authorization: Bearer <token>
        ↓
6. Middleware verifyToken membaca token
   → decode → ambil user dari database
   → taruh di req.user
```

### Alur Membuat Reservasi

```
Member kirim: id_space, tanggal, jam_mulai, durasi_jam, kode_promo
        ↓
Cek space valid & milik maker yang sama
        ↓
Hitung jam_selesai = jam_mulai + durasi_jam
        ↓
Cek ketersediaan: apakah ada reservasi lain yang overlap?
        ↓
Validasi kode_promo jika ada (cek tanggal aktif)
        ↓
Hitung total_harga = harga_per_jam × durasi - diskon
        ↓
Simpan ke tabel reservasis + detail_reservasis
        ↓
Generate kode_booking: BOOK-YYYYMMDD-XXXX
```

---

## Daftar Endpoint API

Total: **50 endpoint**

### Public (tidak butuh token)
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/` | Status API |
| GET | `/health` | Health check server |
| POST | `/api/maker/register` | Daftar App Maker, dapat app_key |
| POST | `/api/maker/login` | Login App Maker |
| GET | `/api/maker/me` | Profil maker (butuh maker token) |
| GET | `/api/maker/stats` | Statistik data maker |
| GET | `/api/maker/list` | Daftar semua maker |

### Auth (butuh x-maker-key)
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/auth/register/member` | Daftar member baru |
| POST | `/api/auth/register/admin-space` | Daftar admin coworking |
| POST | `/api/auth/login` | Login, dapat JWT token |
| GET | `/api/auth/profile` | Lihat profil sendiri (butuh JWT) |

### Spaces & Diskon (butuh x-maker-key)
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/spaces/types` | Tipe space (desk, meeting_room, dll) |
| GET | `/api/spaces/availability` | Cek ketersediaan waktu |
| GET | `/api/spaces` | Daftar semua space |
| GET | `/api/spaces/:id` | Detail satu space |
| GET | `/api/diskon/active` | Diskon yang aktif hari ini |
| POST | `/api/diskon/check` | Validasi kode promo + hitung potongan |
| GET | `/api/diskon/:id` | Detail diskon |

### Reservasi Member (butuh JWT member)
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/reservasi` | Buat reservasi baru |
| GET | `/api/reservasi/my` | Semua reservasi saya |
| GET | `/api/reservasi/my/history` | Riwayat per bulan/tahun |
| GET | `/api/reservasi/:id/e-ticket` | E-ticket dengan QR payload |
| GET | `/api/reservasi/:id` | Detail reservasi |
| PATCH | `/api/reservasi/:id/cancel` | Batalkan reservasi |

### Admin (butuh JWT admin_space)
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET/PUT | `/api/admin/profile` | Lihat & update profil coworking |
| GET/POST | `/api/admin/members` | Kelola member |
| GET/PUT/DELETE | `/api/admin/members/:id` | Detail/update/hapus member |
| GET/POST | `/api/admin/spaces` | Kelola ruangan |
| GET/PUT/DELETE | `/api/admin/spaces/:id` | Detail/update/hapus space |
| GET/POST | `/api/admin/diskon` | Kelola diskon |
| GET/PUT/DELETE | `/api/admin/diskon/:id` | Detail/update/hapus diskon |
| GET | `/api/admin/reservasi` | Semua reservasi (dengan filter) |
| PATCH | `/api/admin/reservasi/:id/status` | Ubah status reservasi |
| POST | `/api/admin/reservasi/:id/check-in` | Check-in (disetujui → aktif) |
| POST | `/api/admin/reservasi/:id/check-out` | Check-out (aktif → selesai) |
| GET | `/api/admin/reports/monthly` | Laporan bulanan |
| GET | `/api/admin/reports/income` | Laporan pendapatan |

### Upload
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/upload/image` | Upload gambar umum (field: image) |
| POST | `/api/upload/spaces` | Upload foto space (field: foto) |
| POST | `/api/upload/members` | Upload foto member (field: foto) |

---

## Penjelasan Setiap File

### `src/app.js`
File utama server. Tugas utamanya:
- Inisialisasi Express
- Daftarkan semua middleware (cors, json parser)
- Mount semua routes ke URL-nya
- Daftarkan Swagger UI di `/api-docs`
- Handle 404 dan error global
- Jalankan server di port yang ditentukan

### `src/lib/prisma.js`
Membuat satu instance PrismaClient yang dipakai bersama oleh semua controller. Ini penting agar tidak ada terlalu banyak koneksi database terbuka sekaligus.

```javascript
const prisma = new PrismaClient();
module.exports = prisma;
// Semua controller: const prisma = require('../lib/prisma');
```

### `src/middleware/auth.js`
Berisi 5 fungsi middleware:

| Fungsi | Kegunaan |
|--------|---------|
| `verifyToken` | Cek JWT dari header Authorization, simpan user ke `req.user` |
| `requireMember` | Pastikan user adalah member (role check) |
| `requireAdmin` | Pastikan user adalah admin_space (role check) |
| `verifyMakerToken` | Cek JWT khusus untuk maker |
| `verifyMakerTokenOrKey` | Cek maker token ATAU x-maker-key |

### `src/middleware/makerKey.js`
Berisi 3 fungsi middleware:

| Fungsi | Kegunaan |
|--------|---------|
| `verifyMakerKey` | Wajib ada x-maker-key, simpan maker ke `req.maker` |
| `verifyMakerKeyFromToken` | Ambil maker dari JWT yang sudah ada |
| `optionalMakerKey` | x-maker-key opsional (tidak wajib) |

### `src/controllers/`
Setiap controller berisi fungsi-fungsi yang menangani logika bisnis:

**`makerController.js`** — register, login, getMe, getStats, getList

**`authController.js`** — registerMember, registerAdminSpace, login, getProfile

**`spacesController.js`** — getTypes, checkAvailability, getAll, getById

**`diskonController.js`** — getActive, checkDiskon, getById

**`reservasiController.js`** — create, getMyReservations, getMyHistory, getETicket, getById, cancelReservasi

**`uploadController.js`** — uploadImage, uploadSpaceImage, uploadMemberImage

**`adminProfileController.js`** — getProfile, updateProfile

**`adminMembersController.js`** — getAll, create, getById, update, remove

**`adminSpacesController.js`** — getAll, create, getById, update, remove

**`adminDiskonController.js`** — getAll, create, getById, update, remove

**`adminReservasiController.js`** — getAll, updateStatus, checkIn, checkOut

**`adminReportsController.js`** — getMonthlyReport, getIncomeReport

### `src/routes/`
Setiap route file mendefinisikan URL dan method HTTP, lalu menghubungkan ke controller yang sesuai. Contoh:

```javascript
// src/routes/admin/members.js
router.get('/',    verifyToken, requireAdmin, adminMembersController.getAll);
router.post('/',   verifyToken, requireAdmin, adminMembersController.create);
router.get('/:id', verifyToken, requireAdmin, adminMembersController.getById);
router.put('/:id', verifyToken, requireAdmin, adminMembersController.update);
router.delete('/:id', verifyToken, requireAdmin, adminMembersController.remove);
```

### `prisma/schema.prisma`
Mendefinisikan semua tabel database dalam format Prisma. Prisma akan membaca file ini dan membuat/update tabel di MySQL.

---

## Format Response API

Semua endpoint mengembalikan format JSON yang konsisten:

### Sukses
```json
{
  "status": true,
  "statusCode": 200,
  "message": "Data berhasil diambil",
  "data": { ... },
  "timestamp": "2026-08-01T00:00:00.000Z"
}
```

### Error
```json
{
  "status": false,
  "statusCode": 400,
  "message": "Field wajib tidak lengkap",
  "error": "username, password, dan nama_member diperlukan",
  "timestamp": "2026-08-01T00:00:00.000Z"
}
```

### HTTP Status Code yang Digunakan
| Code | Arti |
|------|------|
| 200 | OK — request berhasil |
| 201 | Created — data berhasil dibuat |
| 400 | Bad Request — input tidak valid |
| 401 | Unauthorized — token/key tidak valid |
| 403 | Forbidden — tidak punya hak akses |
| 404 | Not Found — data tidak ditemukan |
| 409 | Conflict — data duplikat / waktu overlap |
| 500 | Internal Server Error — error di server |

---

## Cara Menjalankan Lokal

### Syarat
- Node.js v18+
- MySQL (XAMPP)
- Git

### Langkah

```bash
# 1. Clone repo
git clone https://github.com/Dikk66/UKK-Paket-B.git
cd UKK-Paket-B

# 2. Install dependencies
npm install

# 3. Buat file .env
cp .env.example .env
# Edit .env sesuai konfigurasi lokal

# 4. Buat database MySQL
# Buka XAMPP → Start MySQL
# Buat database: coworking_db

# 5. Push schema ke database
npx prisma db push

# 6. Jalankan server
npm run dev        # development (auto-restart)
npm start          # production
```

Server berjalan di: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api-docs`

---

## Environment Variables

| Variable | Keterangan | Contoh |
|----------|------------|--------|
| `DATABASE_URL` | Koneksi MySQL | `mysql://root@localhost:3306/coworking_db` |
| `JWT_SECRET` | Kunci enkripsi token | `string_random_panjang` |
| `JWT_EXPIRES_IN` | Masa berlaku token | `7d` |
| `PORT` | Port server | `3000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `BASE_URL` | URL base server | `http://localhost:3000` |

---

## Fitur Unggulan

### 1. Multi-Tenancy dengan App Key
Setiap siswa pengembang punya `app_key` unik format `mk_` + 32 karakter hex. Data terisolasi per maker.

### 2. Cek Overlap Waktu Otomatis
Sistem otomatis menolak reservasi jika space sudah dipesan pada waktu yang sama, termasuk penanganan timezone yang benar menggunakan `Date.UTC()`.

### 3. E-Ticket dengan QR Payload
Setiap reservasi punya e-ticket dengan `qr_code_payload` format:
```
VERIFY-RESERVASI-{id}-{app_key}
```
QR code ini bisa di-scan untuk verifikasi saat check-in.

### 4. Alur Check-in / Check-out
Admin mengkonfirmasi reservasi → member check-in → member check-out → otomatis ubah status dan catat waktu.

### 5. Laporan Pendapatan
Admin bisa lihat laporan bulanan dengan breakdown per space, per hari, dan perbandingan dengan bulan sebelumnya.

### 6. Swagger UI
Dokumentasi interaktif bisa diakses di `/api-docs` — semua endpoint bisa dicoba langsung dari browser.

---

## Dokumentasi & Testing

| Tool | URL/File |
|------|----------|
| Swagger UI | `http://localhost:3000/api-docs` |
| Swagger JSON | `http://localhost:3000/api-docs.json` |
| Postman Collection | `postman_collection.json` |

---

## Dibuat untuk UKK XII Paket B
**SMK Telkom Malang — 2026/2027**
