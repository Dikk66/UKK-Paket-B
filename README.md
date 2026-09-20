# Coworking Space Reservation Backend API

Backend API untuk Aplikasi Reservasi Coworking Space menggunakan Node.js, Express, dan Prisma (MySQL).

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v4
- **ORM**: Prisma v5
- **Database**: MySQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Upload**: Multer
- **CORS**: cors

## Struktur Project

```
coworking-backend/
├── prisma/
│   └── schema.prisma          # Skema database Prisma
├── src/
│   ├── middleware/
│   │   ├── auth.js            # JWT auth middleware
│   │   └── makerKey.js        # App key middleware
│   ├── routes/
│   │   ├── maker.js           # Maker endpoints
│   │   ├── auth.js            # Auth endpoints
│   │   ├── spaces.js          # Space endpoints (public)
│   │   ├── diskon.js          # Diskon endpoints (public)
│   │   ├── reservasi.js       # Reservasi endpoints (member)
│   │   ├── upload.js          # Upload endpoints
│   │   └── admin/
│   │       ├── profile.js     # Admin profile
│   │       ├── members.js     # Admin kelola member
│   │       ├── spaces.js      # Admin kelola space
│   │       ├── diskon.js      # Admin kelola diskon
│   │       ├── reservasi.js   # Admin kelola reservasi
│   │       └── reports.js     # Admin laporan
│   ├── controllers/           # Business logic
│   └── app.js                 # Entry point
├── uploads/
│   ├── spaces/                # Foto ruang
│   ├── members/               # Foto member
│   └── general/               # Upload umum
├── .env                       # Konfigurasi environment
└── package.json
```

## Setup & Instalasi

### 1. Clone & Install

```bash
cd coworking-backend
npm install
```

### 2. Konfigurasi Environment

Edit file `.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/coworking_db"
JWT_SECRET="your_secret_key_here"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
BASE_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database (development)
npm run db:push

# Atau gunakan migrate
npm run db:migrate
```

### 4. Jalankan Server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

---

## Konsep Multi-Tenancy

Setiap **AppMaker** (developer frontend/siswa) memiliki `app_key` unik. Semua data (member, space, diskon, reservasi) terisolasi per maker melalui header `x-maker-key` atau `x-app-key`.

---

## API Endpoints

### Response Format

Semua response mengikuti format:

```json
// Sukses
{
  "status": true,
  "statusCode": 200,
  "message": "Pesan sukses",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error
{
  "status": false,
  "statusCode": 400,
  "message": "Pesan error",
  "error": "Detail error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Public Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Status API |
| GET | `/health` | Health check |

---

### Maker Endpoints

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/maker/register` | - | Registrasi maker baru |
| POST | `/api/maker/login` | - | Login maker |
| GET | `/api/maker/me` | Bearer (maker) | Info maker |
| GET | `/api/maker/stats` | Bearer/x-maker-key | Statistik maker |
| GET | `/api/maker/list` | - | Daftar semua maker |

**Register Maker:**
```json
POST /api/maker/register
{
  "name": "Nama Maker",
  "username": "username_maker",
  "email": "maker@email.com",
  "password": "password123"
}
```

---

### Auth Endpoints

> Header: `x-maker-key: mk_xxxxx`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/register/member` | x-maker-key | Registrasi member |
| POST | `/api/auth/register/admin-space` | x-maker-key | Registrasi admin |
| POST | `/api/auth/login` | x-maker-key | Login |
| GET | `/api/auth/profile` | Bearer JWT | Profil user |

**Login:**
```json
POST /api/auth/login
Headers: { "x-maker-key": "mk_xxx" }
{
  "username": "member1",
  "password": "password123"
}
```

---

### Space Endpoints (Public, dengan x-maker-key)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/spaces/types` | optional | Tipe space |
| GET | `/api/spaces/availability` | x-maker-key | Cek ketersediaan |
| GET | `/api/spaces` | x-maker-key | Daftar space |
| GET | `/api/spaces/:id` | x-maker-key | Detail space |

**Cek Ketersediaan:**
```
GET /api/spaces/availability?id_space=1&tanggal=2024-03-15&jam_mulai=09:00&durasi_jam=2
Headers: { "x-maker-key": "mk_xxx" }
```

---

### Diskon Endpoints

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/diskon/active` | x-maker-key | Diskon aktif |
| POST | `/api/diskon/check` | x-maker-key | Cek kode diskon |
| GET | `/api/diskon/:id` | x-maker-key | Detail diskon |

**Cek Diskon:**
```json
POST /api/diskon/check
Headers: { "x-maker-key": "mk_xxx" }
{
  "nama_diskon": "PROMO2024",
  "total_harga": 150000
}
```

---

### Reservasi Endpoints (Member Only)

> Header: `Authorization: Bearer <token>`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/reservasi` | Buat reservasi baru |
| GET | `/api/reservasi/my` | Daftar reservasiku |
| GET | `/api/reservasi/my/history` | Riwayat (filter bulan/tahun) |
| GET | `/api/reservasi/:id/e-ticket` | E-ticket reservasi |
| GET | `/api/reservasi/:id` | Detail reservasi |
| PATCH | `/api/reservasi/:id/cancel` | Batalkan reservasi |

**Buat Reservasi:**
```json
POST /api/reservasi
Authorization: Bearer <token>
{
  "spaceId": 1,
  "diskonId": 1,           // optional
  "tanggal_reservasi": "2024-03-15",
  "jam_mulai": "09:00",
  "durasi_jam": 2
}
```

---

### Admin Endpoints

> Header: `Authorization: Bearer <admin_token>`

#### Profile Admin
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/profile` | Profil admin |
| PUT | `/api/admin/profile` | Update profil |

#### Kelola Member
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/members` | Daftar member |
| POST | `/api/admin/members` | Tambah member |
| GET | `/api/admin/members/:id` | Detail member |
| PUT | `/api/admin/members/:id` | Update member |
| DELETE | `/api/admin/members/:id` | Hapus member |

#### Kelola Space
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/spaces` | Daftar space |
| POST | `/api/admin/spaces` | Tambah space |
| GET | `/api/admin/spaces/:id` | Detail space |
| PUT | `/api/admin/spaces/:id` | Update space |
| DELETE | `/api/admin/spaces/:id` | Hapus space |

**Tambah Space:**
```json
POST /api/admin/spaces
Authorization: Bearer <admin_token>
{
  "nama_space": "Meeting Room A",
  "harga_per_jam": 75000,
  "tipe": "meeting_room",
  "kapasitas": 10,
  "deskripsi": "Ruang meeting dengan proyektor",
  "foto": "space-123.jpg"   // optional, dari /api/upload/spaces
}
```

#### Kelola Diskon
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/diskon` | Daftar diskon |
| POST | `/api/admin/diskon` | Tambah diskon |
| GET | `/api/admin/diskon/:id` | Detail diskon |
| PUT | `/api/admin/diskon/:id` | Update diskon |
| DELETE | `/api/admin/diskon/:id` | Hapus diskon |

**Tambah Diskon:**
```json
POST /api/admin/diskon
Authorization: Bearer <admin_token>
{
  "nama_diskon": "PROMO2024",
  "persentase_diskon": 20,
  "tanggal_awal": "2024-03-01",
  "tanggal_akhir": "2024-03-31"
}
```

#### Kelola Reservasi
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/reservasi` | Daftar reservasi |
| PATCH | `/api/admin/reservasi/:id/status` | Update status |
| POST | `/api/admin/reservasi/:id/check-in` | Check-in |
| POST | `/api/admin/reservasi/:id/check-out` | Check-out |

**Filter Reservasi:**
```
GET /api/admin/reservasi?month=3&year=2024&status=disetujui&id_space=1
```

**Status yang valid:** `belum_dikonfirm`, `disetujui`, `aktif`, `selesai`, `dibatalkan`

**Flow Status:**
```
belum_dikonfirm → disetujui → (check-in) aktif → (check-out) selesai
                           ↘ dibatalkan
```

#### Laporan
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/reports/monthly` | Laporan bulanan |
| GET | `/api/admin/reports/income` | Laporan pendapatan |

```
GET /api/admin/reports/monthly?month=3&year=2024
GET /api/admin/reports/income?month=3&year=2024
```

---

### Upload Endpoints

| Method | Endpoint | Field | Deskripsi |
|--------|----------|-------|-----------|
| POST | `/api/upload/image` | `image` | Upload gambar umum |
| POST | `/api/upload/spaces` | `foto` | Upload foto space |
| POST | `/api/upload/members` | `foto` | Upload foto member |

Upload menggunakan `multipart/form-data`. Batas ukuran: 5MB.

---

## Business Logic

### Kalkulasi Reservasi

```
jam_selesai        = jam_mulai + durasi_jam
total_harga_awal   = harga_per_jam × durasi_jam
potongan_diskon    = total_harga_awal × (persentase_diskon / 100)
total_bayar        = total_harga_awal - potongan_diskon
```

### Kode Booking
Format: `BOOK-YYYYMMDD-XXXX` (XXXX = 4 digit ID)

### App Key Generation
Format: `mk_` + 32 hex chars (crypto.randomBytes(16))

### E-Ticket QR Code Payload
Format: `VERIFY-RESERVASI-{id}-{app_key}`

### Cek Ketersediaan Space
Space tidak bisa dipesan jika sudah ada reservasi (status bukan `dibatalkan`) yang jamnya **overlap** pada tanggal yang sama.

Overlap terjadi jika: `new_start < existing_end AND new_end > existing_start`

---

## Tipe Space

| Value | Label |
|-------|-------|
| `desk` | Meja Kerja |
| `meeting_room` | Ruang Meeting |
| `private_office` | Kantor Privat |

---

## Lisensi

ISC
