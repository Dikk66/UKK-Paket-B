const prisma = require('../lib/prisma');

const sendResponse = (res, statusCode, message, data = null, error = null) => {
  const response = {
    status: statusCode < 400,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return res.status(statusCode).json(response);
};

/**
 * Generate kode booking: BOOK-YYYYMMDD-XXXX
 */
const generateKodeBooking = (id) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const idPadded = String(id).padStart(4, '0');
  return `BOOK-${year}${month}${day}-${idPadded}`;
};

/**
 * Cek overlap reservasi berdasarkan jam
 */
const isOverlap = (existStart, existEnd, newStart, newEnd) => {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(newStart) < toMinutes(existEnd) && toMinutes(newEnd) > toMinutes(existStart);
};

/**
 * POST /api/reservasi
 * Buat reservasi baru (member only)
 * Body: id_space, tanggal_reservasi, jam_mulai, durasi_jam, id_diskon (optional), kode_promo (optional)
 */
const create = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;

    if (!member) {
      return sendResponse(res, 400, 'Profil member tidak ditemukan', null,
        'User tidak memiliki profil member');
    }

    const { id_space, tanggal_reservasi, jam_mulai, durasi_jam, id_diskon, kode_promo } = req.body;

    if (!id_space || !tanggal_reservasi || !jam_mulai || !durasi_jam) {
      return sendResponse(res, 400, 'Field wajib tidak lengkap', null,
        'id_space, tanggal_reservasi, jam_mulai, dan durasi_jam diperlukan');
    }

    // Validasi space ada dan milik maker yang sama
    const space = await prisma.space.findFirst({
      where: {
        id: parseInt(id_space),
        owner: { user: { makerId: user.makerId } }
      },
      include: { owner: true }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak valid atau tidak tersedia');
    }

    // Hitung jam selesai
    const [startHour, startMinute] = jam_mulai.split(':').map(Number);
    const durasiJam = parseInt(durasi_jam);
    const endHour = startHour + durasiJam;
    const jam_selesai = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

    // Parse tanggal — gunakan date-only string agar tidak kena timezone offset
    const [tYear, tMonth, tDay] = tanggal_reservasi.split('-').map(Number);
    const tanggalStart = new Date(Date.UTC(tYear, tMonth - 1, tDay, 0, 0, 0));
    const tanggalEnd   = new Date(Date.UTC(tYear, tMonth - 1, tDay, 23, 59, 59));

    // Cek ketersediaan space (overlap check via detail_reservasi)
    const existingDetails = await prisma.detailReservasi.findMany({
      where: {
        id_space: parseInt(id_space),
        reservasi: {
          tanggal_reservasi: { gte: tanggalStart, lte: tanggalEnd },
          status: { not: 'dibatalkan' }
        }
      },
      include: { reservasi: true }
    });

    const hasConflict = existingDetails.some(d =>
      isOverlap(d.reservasi.jam_mulai, d.reservasi.jam_selesai, jam_mulai, jam_selesai)
    );

    if (hasConflict) {
      return sendResponse(res, 409, 'Space sudah dipesan pada waktu tersebut', null,
        'Waktu yang diminta sudah terisi. Silakan pilih waktu lain.');
    }

    // Resolve diskon: bisa dari id_diskon atau kode_promo (nama_diskon)
    let diskon = null;
    const now = new Date();

    if (id_diskon) {
      diskon = await prisma.diskon.findFirst({
        where: {
          id: parseInt(id_diskon),
          makerId: user.makerId,
          tanggal_awal: { lte: now },
          tanggal_akhir: { gte: now }
        }
      });
      if (!diskon) {
        return sendResponse(res, 400, 'Diskon tidak valid atau kadaluarsa', null,
          'Diskon tidak ditemukan atau tidak aktif');
      }
    } else if (kode_promo) {
      diskon = await prisma.diskon.findFirst({
        where: {
          nama_diskon: kode_promo,
          makerId: user.makerId,
          tanggal_awal: { lte: now },
          tanggal_akhir: { gte: now }
        }
      });
      if (!diskon) {
        return sendResponse(res, 400, 'Kode promo tidak valid atau kadaluarsa', null,
          'Kode promo tidak ditemukan atau tidak aktif');
      }
    }

    // Kalkulasi harga
    const harga_per_jam = space.harga_per_jam;
    const total_harga_awal = harga_per_jam * durasiJam;
    const potongan = diskon ? (total_harga_awal * diskon.persentase_diskon) / 100 : 0;
    const total_harga = total_harga_awal - potongan;

    // Buat reservasi dengan kode_booking sementara
    const reservasi = await prisma.reservasi.create({
      data: {
        kode_booking: `BOOK-TEMP-${Date.now()}`,
        tanggal_reservasi: tanggalStart,
        jam_mulai,
        jam_selesai,
        durasi_jam: durasiJam,
        id_owner: space.owner.id,
        id_member: member.id,
        status: 'belum_dikonfirm'
      }
    });

    // Update kode_booking dengan format benar
    const kode_booking = generateKodeBooking(reservasi.id);
    await prisma.reservasi.update({
      where: { id: reservasi.id },
      data: { kode_booking }
    });

    // Buat detail_reservasi
    const detail = await prisma.detailReservasi.create({
      data: {
        id_reservasi: reservasi.id,
        id_space: parseInt(id_space),
        id_diskon: diskon ? diskon.id : null,
        total_harga
      }
    });

    // Ambil data lengkap
    const result = await prisma.reservasi.findUnique({
      where: { id: reservasi.id },
      include: {
        member: { select: { nama_member: true, telp: true } },
        detail_reservasi: {
          include: {
            space: {
              include: { owner: { select: { nama_coworking: true, alamat: true } } }
            },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      }
    });

    // Format foto space
    const formattedResult = {
      ...result,
      detail_reservasi: result.detail_reservasi.map(d => ({
        ...d,
        space: {
          ...d.space,
          foto: d.space.foto ? `${process.env.BASE_URL}/uploads/spaces/${d.space.foto}` : null
        }
      }))
    };

    return sendResponse(res, 201, 'Reservasi berhasil dibuat', { reservasi: formattedResult });
  } catch (error) {
    console.error('Create reservasi error:', error);
    return sendResponse(res, 500, 'Gagal membuat reservasi', null, error.message);
  }
};

/**
 * GET /api/reservasi/my
 * Daftar reservasi member yang login
 */
const getMyReservations = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;

    if (!member) {
      return sendResponse(res, 400, 'Profil member tidak ditemukan', null, 'User tidak memiliki profil member');
    }

    const reservasis = await prisma.reservasi.findMany({
      where: { id_member: member.id },
      include: {
        detail_reservasi: {
          include: {
            space: {
              select: {
                id: true,
                nama_space: true,
                tipe: true,
                foto: true,
                owner: { select: { nama_coworking: true, alamat: true } }
              }
            },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = reservasis.map(r => ({
      ...r,
      detail_reservasi: r.detail_reservasi.map(d => ({
        ...d,
        space: {
          ...d.space,
          foto: d.space.foto ? `${process.env.BASE_URL}/uploads/spaces/${d.space.foto}` : null
        }
      }))
    }));

    return sendResponse(res, 200, 'Daftar reservasi berhasil diambil', {
      total: formatted.length,
      reservasis: formatted
    });
  } catch (error) {
    console.error('Get my reservations error:', error);
    return sendResponse(res, 500, 'Gagal mengambil reservasi', null, error.message);
  }
};

/**
 * GET /api/reservasi/my/history
 * Riwayat reservasi member dengan filter bulan & tahun
 */
const getMyHistory = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;

    if (!member) {
      return sendResponse(res, 400, 'Profil member tidak ditemukan', null, 'User tidak memiliki profil member');
    }

    const { month, year } = req.query;
    const whereClause = { id_member: member.id };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      whereClause.tanggal_reservasi = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      whereClause.tanggal_reservasi = { gte: startDate, lte: endDate };
    }

    const reservasis = await prisma.reservasi.findMany({
      where: whereClause,
      include: {
        detail_reservasi: {
          include: {
            space: {
              select: {
                id: true,
                nama_space: true,
                tipe: true,
                foto: true,
                owner: { select: { nama_coworking: true } }
              }
            },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      },
      orderBy: { tanggal_reservasi: 'desc' }
    });

    const totalBayar = reservasis
      .filter(r => r.status !== 'dibatalkan')
      .reduce((sum, r) => {
        const total = r.detail_reservasi.reduce((s, d) => s + d.total_harga, 0);
        return sum + total;
      }, 0);

    const formatted = reservasis.map(r => ({
      ...r,
      detail_reservasi: r.detail_reservasi.map(d => ({
        ...d,
        space: {
          ...d.space,
          foto: d.space.foto ? `${process.env.BASE_URL}/uploads/spaces/${d.space.foto}` : null
        }
      }))
    }));

    return sendResponse(res, 200, 'Riwayat reservasi berhasil diambil', {
      filter: { month: month || null, year: year || null },
      summary: { total_reservasi: formatted.length, total_bayar: totalBayar },
      reservasis: formatted
    });
  } catch (error) {
    console.error('Get my history error:', error);
    return sendResponse(res, 500, 'Gagal mengambil riwayat reservasi', null, error.message);
  }
};

/**
 * GET /api/reservasi/:id/e-ticket
 * Ambil e-ticket reservasi
 */
const getETicket = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;
    const { id } = req.params;

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_member: member.id },
      include: {
        member: {
          include: {
            user: {
              include: { maker: { select: { app_key: true, name: true } } }
            }
          }
        },
        detail_reservasi: {
          include: {
            space: {
              include: {
                owner: { select: { nama_coworking: true, alamat: true } }
              }
            },
            diskon: true
          }
        }
      }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik Anda');
    }

    const appKey = reservasi.member.user.maker.app_key;
    const qr_code_payload = `VERIFY-RESERVASI-${reservasi.id}-${appKey}`;

    const detail = reservasi.detail_reservasi[0];
    const totalHarga = reservasi.detail_reservasi.reduce((s, d) => s + d.total_harga, 0);

    const eTicket = {
      kode_booking: reservasi.kode_booking,
      status: reservasi.status,
      qr_code_payload,
      member: {
        nama_member: reservasi.member.nama_member,
        telp: reservasi.member.telp
      },
      space: detail ? {
        nama_space: detail.space.nama_space,
        tipe: detail.space.tipe,
        kapasitas: detail.space.kapasitas,
        foto: detail.space.foto
          ? `${process.env.BASE_URL}/uploads/spaces/${detail.space.foto}`
          : null,
        coworking: detail.space.owner.nama_coworking,
        alamat: detail.space.owner.alamat
      } : null,
      jadwal: {
        tanggal: reservasi.tanggal_reservasi,
        jam_mulai: reservasi.jam_mulai,
        jam_selesai: reservasi.jam_selesai,
        durasi_jam: reservasi.durasi_jam
      },
      pembayaran: {
        harga_per_jam: detail ? detail.space.harga_per_jam : 0,
        total_harga: totalHarga,
        diskon: detail && detail.diskon ? {
          nama_diskon: detail.diskon.nama_diskon,
          persentase: detail.diskon.persentase_diskon
        } : null
      },
      check_in_time: reservasi.check_in_time,
      check_out_time: reservasi.check_out_time,
      createdAt: reservasi.createdAt
    };

    return sendResponse(res, 200, 'E-ticket berhasil diambil', { e_ticket: eTicket });
  } catch (error) {
    console.error('Get e-ticket error:', error);
    return sendResponse(res, 500, 'Gagal mengambil e-ticket', null, error.message);
  }
};

/**
 * GET /api/reservasi/:id
 * Detail reservasi by ID
 */
const getById = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;
    const { id } = req.params;

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_member: member.id },
      include: {
        member: { select: { nama_member: true, telp: true } },
        detail_reservasi: {
          include: {
            space: {
              include: {
                owner: { select: { nama_coworking: true, alamat: true, telp: true } }
              }
            },
            diskon: true
          }
        }
      }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik Anda');
    }

    const formatted = {
      ...reservasi,
      detail_reservasi: reservasi.detail_reservasi.map(d => ({
        ...d,
        space: {
          ...d.space,
          foto: d.space.foto
            ? `${process.env.BASE_URL}/uploads/spaces/${d.space.foto}`
            : null
        }
      }))
    };

    return sendResponse(res, 200, 'Detail reservasi berhasil diambil', { reservasi: formatted });
  } catch (error) {
    console.error('Get reservasi by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail reservasi', null, error.message);
  }
};

/**
 * PATCH /api/reservasi/:id/cancel
 * Batalkan reservasi
 */
const cancelReservasi = async (req, res) => {
  try {
    const user = req.user;
    const member = user.member;
    const { id } = req.params;

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_member: member.id }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik Anda');
    }

    if (!['belum_dikonfirm', 'disetujui'].includes(reservasi.status)) {
      return sendResponse(res, 400, 'Reservasi tidak dapat dibatalkan', null,
        `Reservasi dengan status '${reservasi.status}' tidak dapat dibatalkan`);
    }

    const updated = await prisma.reservasi.update({
      where: { id: parseInt(id) },
      data: { status: 'dibatalkan' }
    });

    return sendResponse(res, 200, 'Reservasi berhasil dibatalkan', { reservasi: updated });
  } catch (error) {
    console.error('Cancel reservasi error:', error);
    return sendResponse(res, 500, 'Gagal membatalkan reservasi', null, error.message);
  }
};

module.exports = { create, getMyReservations, getMyHistory, getETicket, getById, cancelReservasi };
