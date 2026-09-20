const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coworking Space Reservation API',
      version: '1.0.0',
      description: `
# API Reservasi Coworking Space - UKK 2026/2027

## Cara Penggunaan

### 1. Daftar sebagai App Maker
- \`POST /api/maker/register\` → dapatkan **app_key** dan **token**

### 2. Gunakan app_key di semua request
- Tambahkan header: \`x-maker-key: <app_key>\`

### 3. Register & Login User
- Register member: \`POST /api/auth/register/member\`
- Register admin: \`POST /api/auth/register/admin-space\`  
- Login: \`POST /api/auth/login\` → dapatkan **JWT token**

### 4. Gunakan JWT untuk endpoint yang membutuhkan auth
- Tambahkan header: \`Authorization: Bearer <token>\`

## Role
- **member** → bisa reservasi, lihat e-ticket, batalkan reservasi
- **admin_space** → kelola space, member, diskon, konfirmasi reservasi, check-in/out, laporan
      `,
      contact: {
        name: 'SMK Telkom Malang',
        url: 'https://learn.smktelkom-mlg.sch.id/coworking/'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token dari login. Format: Bearer <token>'
        },
        MakerKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-maker-key',
          description: 'App key dari registrasi maker. Format: mk_xxxx'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Berhasil' },
            data: { type: 'object' },
            timestamp: { type: 'string', example: '2026-08-01T00:00:00.000Z' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Gagal' },
            error: { type: 'string', example: 'Detail error' },
            timestamp: { type: 'string', example: '2026-08-01T00:00:00.000Z' }
          }
        }
      }
    },
    tags: [
      { name: 'Root', description: 'Status & Health Check' },
      { name: 'Maker', description: 'App Maker Management' },
      { name: 'Auth', description: 'Autentikasi User (Member & Admin)' },
      { name: 'Spaces', description: 'Katalog Coworking Space' },
      { name: 'Diskon', description: 'Promo & Diskon' },
      { name: 'Reservasi', description: 'Pemesanan (Member)' },
      { name: 'Admin - Profile', description: 'Profil Admin Coworking' },
      { name: 'Admin - Members', description: 'Manajemen Member' },
      { name: 'Admin - Spaces', description: 'Manajemen Space/Ruangan' },
      { name: 'Admin - Diskon', description: 'Manajemen Diskon/Promo' },
      { name: 'Admin - Reservasi', description: 'Manajemen Reservasi' },
      { name: 'Admin - Reports', description: 'Laporan & Rekap Pendapatan' },
      { name: 'Upload', description: 'Upload Foto/Media' }
    ],
    paths: {
      '/': {
        get: {
          tags: ['Root'],
          summary: 'Status API',
          description: 'Cek status API dan daftar endpoint yang tersedia',
          responses: {
            200: { description: 'API berjalan normal' }
          }
        }
      },
      '/health': {
        get: {
          tags: ['Root'],
          summary: 'Health Check Server',
          responses: {
            200: { description: 'Server sehat' }
          }
        }
      },

      // ===== MAKER =====
      '/api/maker/register': {
        post: {
          tags: ['Maker'],
          summary: 'Registrasi App Maker (Siswa Pengembang Frontend)',
          description: 'Mendaftarkan akun App Maker dan mendapatkan app_key',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'username', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Budi Santoso', description: 'Nama lengkap siswa peserta ujian' },
                    username: { type: 'string', example: 'budisantoso', description: 'Username unik untuk login App Maker' },
                    email: { type: 'string', example: 'budi@sch.id', description: 'Email unik untuk login & verifikasi akun' },
                    password: { type: 'string', example: 'Password123', description: 'Kata sandi akun, minimal 6 karakter' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Registrasi berhasil, mendapat app_key dan token' },
            409: { description: 'Username atau email sudah digunakan' }
          }
        }
      },
      '/api/maker/login': {
        post: {
          tags: ['Maker'],
          summary: 'Login App Maker',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string', example: 'budisantoso' },
                    password: { type: 'string', example: 'Password123' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Login berhasil' },
            401: { description: 'Kredensial tidak valid' }
          }
        }
      },
      '/api/maker/me': {
        get: {
          tags: ['Maker'],
          summary: 'Profil & App Key App Maker yang sedang login',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Data maker berhasil diambil' },
            401: { description: 'Token tidak valid' }
          }
        }
      },
      '/api/maker/stats': {
        get: {
          tags: ['Maker'],
          summary: 'Statistik keseluruhan data App Maker',
          security: [{ BearerAuth: [] }, { MakerKey: [] }],
          responses: {
            200: { description: 'Statistik berhasil diambil' }
          }
        }
      },
      '/api/maker/list': {
        get: {
          tags: ['Maker'],
          summary: 'Daftar semua App Maker yang terdaftar (Public)',
          responses: {
            200: { description: 'Daftar maker berhasil diambil' }
          }
        }
      },

      // ===== AUTH =====
      '/api/auth/register/member': {
        post: {
          tags: ['Auth'],
          summary: 'Registrasi Akun Member / Pelanggan Baru',
          security: [{ MakerKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password', 'nama_member'],
                  properties: {
                    username: { type: 'string', example: 'member1', description: 'Username unik untuk login member' },
                    password: { type: 'string', example: 'password123', description: 'Kata sandi akun, minimal 6 karakter' },
                    nama_member: { type: 'string', example: 'Ani Susanti', description: 'Nama lengkap / nama panggilan' },
                    instansi: { type: 'string', example: 'SMK Telkom Malang', description: 'Nama instansi/perusahaan/sekolah' },
                    alamat: { type: 'string', example: 'Jl. Danau Ranau No.1', description: 'Alamat lengkap' },
                    telp: { type: 'string', example: '081234567890', description: 'Nomor telepon/WhatsApp' },
                    foto: { type: 'string', example: 'member_photo.jpg', description: 'Nama file foto profil (opsional)' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Registrasi member berhasil' },
            409: { description: 'Username sudah digunakan' }
          }
        }
      },
      '/api/auth/register/admin-space': {
        post: {
          tags: ['Auth'],
          summary: 'Registrasi Pengelola Lokasi / Admin Coworking Space',
          security: [{ MakerKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password', 'nama_coworking', 'nama_pemilik'],
                  properties: {
                    username: { type: 'string', example: 'admin_space', description: 'Username unik untuk login admin' },
                    password: { type: 'string', example: 'password123', description: 'Kata sandi akun, minimal 6 karakter' },
                    nama_coworking: { type: 'string', example: 'Malter Hub Coworking', description: 'Nama label / branding coworking space' },
                    nama_pemilik: { type: 'string', example: 'Ahmad Ali', description: 'Nama lengkap pemilik/penanggungjawab' },
                    telp: { type: 'string', example: '08239410231', description: 'Nomor telepon/call untuk angkatan lokal' },
                    alamat: { type: 'string', example: 'Jl. Danau Ranau 1', description: 'Alamat coworking space' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Registrasi admin space berhasil' },
            409: { description: 'Username sudah digunakan' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login Akun User (Member atau Admin Space) - Mengembalikan JWT Token',
          security: [{ MakerKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string', example: 'member1' },
                    password: { type: 'string', example: 'password123' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Login berhasil, mendapat JWT token' },
            401: { description: 'Kredensial tidak valid' }
          }
        }
      },
      '/api/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'Cek Profil & Hak Akses Pengguna yang Sedang Login',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Profil berhasil diambil' },
            401: { description: 'Token tidak valid' }
          }
        }
      },

      // ===== SPACES =====
      '/api/spaces/types': {
        get: {
          tags: ['Spaces'],
          summary: 'Daftar Tipe Space (Personal Desk, Meeting Room, Private Office)',
          security: [{ MakerKey: [] }],
          responses: {
            200: { description: 'Tipe space berhasil diambil' }
          }
        }
      },
      '/api/spaces/availability': {
        get: {
          tags: ['Spaces'],
          summary: 'Cek Ketersediaan Space Berdasarkan Tanggal & Jam',
          security: [{ MakerKey: [] }],
          parameters: [
            { name: 'id_space', in: 'query', required: true, schema: { type: 'integer' }, example: 1 },
            { name: 'tanggal', in: 'query', required: true, schema: { type: 'string' }, example: '2026-08-30' },
            { name: 'jam_mulai', in: 'query', required: true, schema: { type: 'string' }, example: '09:00' },
            { name: 'durasi_jam', in: 'query', required: true, schema: { type: 'integer' }, example: 2 }
          ],
          responses: {
            200: { description: 'Ketersediaan berhasil dicek' }
          }
        }
      },
      '/api/spaces': {
        get: {
          tags: ['Spaces'],
          summary: 'Lihat Semua Space Coworking (Filter Tipe & Search)',
          security: [{ MakerKey: [] }],
          parameters: [
            { name: 'tipe', in: 'query', schema: { type: 'string', enum: ['desk', 'meeting_room', 'private_office'] } },
            { name: 'search', in: 'query', schema: { type: 'string' }, example: 'Jakarta' }
          ],
          responses: {
            200: { description: 'Daftar space berhasil diambil' }
          }
        }
      },
      '/api/spaces/{id}': {
        get: {
          tags: ['Spaces'],
          summary: 'Lihat Detail Space Coworking Berdasarkan ID',
          security: [{ MakerKey: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
          ],
          responses: {
            200: { description: 'Detail space berhasil diambil' },
            404: { description: 'Space tidak ditemukan' }
          }
        }
      },

      // ===== DISKON =====
      '/api/diskon/active': {
        get: {
          tags: ['Diskon'],
          summary: 'Daftar Promo / Diskon yang Sedang Aktif',
          security: [{ MakerKey: [] }],
          responses: {
            200: { description: 'Diskon aktif berhasil diambil' }
          }
        }
      },
      '/api/diskon/check': {
        post: {
          tags: ['Diskon'],
          summary: 'Periksa Validitas & Hitung Potongan Kode Promo',
          security: [{ MakerKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nama_diskon'],
                  properties: {
                    nama_diskon: { type: 'string', example: 'DISKON20', description: 'Nama kode promo yang akan dicek' },
                    total_harga: { type: 'number', example: 100000, description: 'Total harga sebelum diskon (opsional untuk kalkulasi)' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Kode diskon valid' },
            404: { description: 'Kode diskon tidak valid atau kadaluarsa' }
          }
        }
      },
      '/api/diskon/{id}': {
        get: {
          tags: ['Diskon'],
          summary: 'Lihat Detail Diskon Berdasarkan ID',
          security: [{ MakerKey: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
          ],
          responses: {
            200: { description: 'Detail diskon berhasil diambil' },
            404: { description: 'Diskon tidak ditemukan' }
          }
        }
      },

      // ===== RESERVASI (MEMBER) =====
      '/api/reservasi': {
        post: {
          tags: ['Reservasi'],
          summary: 'Buat Pemesanan Space Baru (+ Kode Promo & Perhitungan Otomatis)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id_space', 'tanggal_reservasi', 'jam_mulai', 'durasi_jam'],
                  properties: {
                    id_space: { type: 'integer', example: 1, description: 'ID space yang ingin dipesan' },
                    tanggal_reservasi: { type: 'string', example: '2026-08-30', description: 'Tanggal reservasi format YYYY-MM-DD' },
                    jam_mulai: { type: 'string', example: '09:00', description: 'Jam mulai format HH:MM' },
                    durasi_jam: { type: 'integer', example: 2, description: 'Durasi penggunaan dalam jam (minimal 1)' },
                    id_diskon: { type: 'integer', example: 1, description: 'ID promo diskon (opsional)' },
                    kode_promo: { type: 'string', example: 'DISKON20', description: 'Kode promo diskon (opsional)' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Reservasi berhasil dibuat' },
            409: { description: 'Space sudah dipesan pada waktu tersebut' }
          }
        }
      },
      '/api/reservasi/my': {
        get: {
          tags: ['Reservasi'],
          summary: 'Lihat Daftar Pemesanan Saya (Member)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Daftar reservasi berhasil diambil' }
          }
        }
      },
      '/api/reservasi/my/history': {
        get: {
          tags: ['Reservasi'],
          summary: 'Riwayat Pemesanan Berdasarkan Bulan & Tahun',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'integer' }, example: 8 },
            { name: 'year', in: 'query', schema: { type: 'integer' }, example: 2026 }
          ],
          responses: {
            200: { description: 'Riwayat reservasi berhasil diambil' }
          }
        }
      },
      '/api/reservasi/{id}/e-ticket': {
        get: {
          tags: ['Reservasi'],
          summary: 'Cetak Tiket / Tiket Bukti Nota Digital',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
          ],
          responses: {
            200: { description: 'E-ticket berhasil diambil dengan QR code payload' },
            404: { description: 'Reservasi tidak ditemukan' }
          }
        }
      },
      '/api/reservasi/{id}': {
        get: {
          tags: ['Reservasi'],
          summary: 'Detail Pemesanan Berdasarkan ID',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
          ],
          responses: {
            200: { description: 'Detail reservasi berhasil diambil' },
            404: { description: 'Reservasi tidak ditemukan' }
          }
        }
      },
      '/api/reservasi/{id}/cancel': {
        patch: {
          tags: ['Reservasi'],
          summary: 'Batalkan Pemesanan (Hanya status belum_dikonfirm/disetujui)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
          ],
          responses: {
            200: { description: 'Reservasi berhasil dibatalkan' },
            400: { description: 'Reservasi tidak dapat dibatalkan' }
          }
        }
      },

      // ===== ADMIN PROFILE =====
      '/api/admin/profile': {
        get: {
          tags: ['Admin - Profile'],
          summary: 'Lihat Data Profil Lokasi Coworking Space',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Profil admin berhasil diambil' }
          }
        },
        put: {
          tags: ['Admin - Profile'],
          summary: 'Update Data Profil Lokasi Coworking Space',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nama_coworking: { type: 'string', example: 'Malter Hub Coworking' },
                    nama_pemilik: { type: 'string', example: 'Ahmad Ali' },
                    telp: { type: 'string', example: '08239410231' },
                    alamat: { type: 'string', example: 'Jl. Danau Ranau 1' },
                    password: { type: 'string', example: 'newpassword123' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Profil berhasil diupdate' }
          }
        }
      },

      // ===== ADMIN MEMBERS =====
      '/api/admin/members': {
        get: {
          tags: ['Admin - Members'],
          summary: 'Daftar Semua Member (+ Search)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, example: 'Ani' }
          ],
          responses: {
            200: { description: 'Daftar member berhasil diambil' }
          }
        },
        post: {
          tags: ['Admin - Members'],
          summary: 'Tambah Data Member Baru ke Aplikasi',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password', 'nama_member'],
                  properties: {
                    username: { type: 'string', example: 'member2' },
                    password: { type: 'string', example: 'password123' },
                    nama_member: { type: 'string', example: 'Bambang' },
                    instansi: { type: 'string', example: 'SMK Telkom' },
                    alamat: { type: 'string', example: 'Jl. Danau Batur 1' },
                    telp: { type: 'string', example: '081234567891' },
                    foto: { type: 'string', example: 'member_photo.jpg' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Member berhasil ditambahkan' }
          }
        }
      },
      '/api/admin/members/{id}': {
        get: {
          tags: ['Admin - Members'],
          summary: 'Detail Data Member Berdasarkan ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Detail member berhasil diambil' }, 404: { description: 'Member tidak ditemukan' } }
        },
        put: {
          tags: ['Admin - Members'],
          summary: 'Update Data Member / Pelanggan',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nama_member: { type: 'string', example: 'Bambang Updated' },
                    instansi: { type: 'string', example: 'SMK Telkom' },
                    alamat: { type: 'string', example: 'Jl. Baru No.1' },
                    telp: { type: 'string', example: '081234567892' },
                    foto: { type: 'string', example: 'foto_baru.jpg' },
                    password: { type: 'string', example: 'newpassword123' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Member berhasil diupdate' } }
        },
        delete: {
          tags: ['Admin - Members'],
          summary: 'Hapus Data Member beserta Riwayat Reservasi',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Member berhasil dihapus' }, 400: { description: 'Member masih memiliki reservasi aktif' } }
        }
      },

      // ===== ADMIN SPACES =====
      '/api/admin/spaces': {
        get: {
          tags: ['Admin - Spaces'],
          summary: 'Tampilkan Ruangan / Meja Space Baru (milik admin)',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Daftar space berhasil diambil' } }
        },
        post: {
          tags: ['Admin - Spaces'],
          summary: 'Tambah Ruangan / Meja Space Baru',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nama_space', 'harga_per_jam', 'tipe', 'kapasitas'],
                  properties: {
                    nama_space: { type: 'string', example: 'Meja A1' },
                    harga_per_jam: { type: 'number', example: 15000 },
                    tipe: { type: 'string', enum: ['desk', 'meeting_room', 'private_office'], example: 'desk' },
                    kapasitas: { type: 'integer', example: 1 },
                    foto: { type: 'string', example: 'space_foto.jpg' },
                    deskripsi: { type: 'string', example: 'Meja kerja nyaman dekat jendela' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Space berhasil ditambahkan' } }
        }
      },
      '/api/admin/spaces/{id}': {
        get: {
          tags: ['Admin - Spaces'],
          summary: 'Detail Data Space Berdasarkan ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Detail space berhasil diambil' } }
        },
        put: {
          tags: ['Admin - Spaces'],
          summary: 'Update Data Ruangan / Space',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nama_space: { type: 'string', example: 'Meja A1 Updated' },
                    harga_per_jam: { type: 'number', example: 20000 },
                    tipe: { type: 'string', enum: ['desk', 'meeting_room', 'private_office'] },
                    kapasitas: { type: 'integer', example: 2 },
                    foto: { type: 'string', example: 'space_baru.jpg' },
                    deskripsi: { type: 'string', example: 'Deskripsi baru' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Space berhasil diupdate' } }
        },
        delete: {
          tags: ['Admin - Spaces'],
          summary: 'Hapus Ruangan / Space',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Space berhasil dihapus' }, 400: { description: 'Space masih ada reservasi aktif' } }
        }
      },

      // ===== ADMIN DISKON =====
      '/api/admin/diskon': {
        get: {
          tags: ['Admin - Diskon'],
          summary: 'Daftar Semua Promo / Diskon (+ Status Aktif)',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Daftar diskon berhasil diambil' } }
        },
        post: {
          tags: ['Admin - Diskon'],
          summary: 'Tambah Kode Promo Baru',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nama_diskon', 'persentase_diskon', 'tanggal_awal', 'tanggal_akhir'],
                  properties: {
                    nama_diskon: { type: 'string', example: 'DISKON20' },
                    persentase_diskon: { type: 'number', example: 20, description: 'Persentase 1-100' },
                    tanggal_awal: { type: 'string', example: '2026-08-01', description: 'Format YYYY-MM-DD' },
                    tanggal_akhir: { type: 'string', example: '2026-08-31', description: 'Format YYYY-MM-DD' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Diskon berhasil ditambahkan' } }
        }
      },
      '/api/admin/diskon/{id}': {
        get: {
          tags: ['Admin - Diskon'],
          summary: 'Detail Kode Promo Berdasarkan ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Detail diskon berhasil diambil' } }
        },
        put: {
          tags: ['Admin - Diskon'],
          summary: 'Update Data Kode Promo & Periode',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nama_diskon: { type: 'string', example: 'DISKON30' },
                    persentase_diskon: { type: 'number', example: 30 },
                    tanggal_awal: { type: 'string', example: '2026-09-01' },
                    tanggal_akhir: { type: 'string', example: '2026-09-30' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Diskon berhasil diupdate' } }
        },
        delete: {
          tags: ['Admin - Diskon'],
          summary: 'Hapus Kode Promo',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Diskon berhasil dihapus' } }
        }
      },

      // ===== ADMIN RESERVASI =====
      '/api/admin/reservasi': {
        get: {
          tags: ['Admin - Reservasi'],
          summary: 'Daftar Reservasi di Lokasi Coworking (Filter: Status, Space, Bulan, dll)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'integer' }, example: 8 },
            { name: 'year', in: 'query', schema: { type: 'integer' }, example: 2026 },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['belum_dikonfirm', 'disetujui', 'aktif', 'selesai', 'dibatalkan'] } },
            { name: 'id_space', in: 'query', schema: { type: 'integer' }, example: 1 },
            { name: 'tanggal', in: 'query', schema: { type: 'string' }, example: '2026-08-30' }
          ],
          responses: { 200: { description: 'Daftar reservasi berhasil diambil' } }
        }
      },
      '/api/admin/reservasi/{id}/status': {
        patch: {
          tags: ['Admin - Reservasi'],
          summary: 'Set/Update Status Pemesanan (Konfirmasi, Tolak, dll)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['belum_dikonfirm', 'disetujui', 'aktif', 'selesai', 'dibatalkan'], example: 'disetujui' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Status berhasil diupdate' } }
        }
      },
      '/api/admin/reservasi/{id}/check-in': {
        post: {
          tags: ['Admin - Reservasi'],
          summary: 'Check-In ke Ruangan (Status Disetujui → Aktif)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Check-in berhasil' }, 400: { description: 'Status harus disetujui' } }
        }
      },
      '/api/admin/reservasi/{id}/check-out': {
        post: {
          tags: ['Admin - Reservasi'],
          summary: 'Check-Out dari Ruangan (Status Aktif → Selesai)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: { 200: { description: 'Check-out berhasil' }, 400: { description: 'Status harus aktif' } }
        }
      },

      // ===== ADMIN REPORTS =====
      '/api/admin/reports/monthly': {
        get: {
          tags: ['Admin - Reports'],
          summary: 'Rekap Reservasi Bulanan & Pendapatan Per Space',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', required: true, schema: { type: 'integer' }, example: 8 },
            { name: 'year', in: 'query', required: true, schema: { type: 'integer' }, example: 2026 }
          ],
          responses: { 200: { description: 'Laporan bulanan berhasil diambil' } }
        }
      },
      '/api/admin/reports/income': {
        get: {
          tags: ['Admin - Reports'],
          summary: 'Jasa Menampilkan Estimasi Pendapatan Bulan/Space',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', required: true, schema: { type: 'integer' }, example: 8 },
            { name: 'year', in: 'query', required: true, schema: { type: 'integer' }, example: 2026 }
          ],
          responses: { 200: { description: 'Laporan pendapatan berhasil diambil' } }
        }
      },

      // ===== UPLOAD =====
      '/api/upload/image': {
        post: {
          tags: ['Upload'],
          summary: 'Upload Berkas Foto Ruangan / Media Umum (Multipart Form)',
          security: [{ MakerKey: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    image: { type: 'string', format: 'binary', description: 'File gambar (jpg, png, webp, max 5MB)' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Gambar berhasil diupload' } }
        }
      },
      '/api/upload/spaces': {
        post: {
          tags: ['Upload'],
          summary: 'Admin Space: Upload Foto Ruangan / Meja Space',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    foto: { type: 'string', format: 'binary', description: 'Foto space (jpg, png, webp, max 5MB)' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Foto space berhasil diupload' } }
        }
      },
      '/api/upload/members': {
        post: {
          tags: ['Upload'],
          summary: 'User/Admin: Upload Foto Profil Member / Pelanggan',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    foto: { type: 'string', format: 'binary', description: 'Foto member (jpg, png, webp, max 5MB)' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Foto member berhasil diupload' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
