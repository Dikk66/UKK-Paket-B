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
 * GET /api/spaces/types
 */
const getTypes = async (req, res) => {
  try {
    const types = [
      { value: 'desk', label: 'Meja Kerja (Desk)', description: 'Meja kerja individual untuk bekerja sendiri' },
      { value: 'meeting_room', label: 'Ruang Meeting', description: 'Ruang rapat untuk diskusi tim' },
      { value: 'private_office', label: 'Kantor Privat', description: 'Ruangan privat untuk tim kecil' }
    ];
    return sendResponse(res, 200, 'Tipe space berhasil diambil', { types });
  } catch (error) {
    return sendResponse(res, 500, 'Gagal mengambil tipe space', null, error.message);
  }
};

/**
 * GET /api/spaces/availability
 * Query: id_space, tanggal, jam_mulai, durasi_jam
 */
const checkAvailability = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { id_space, tanggal, jam_mulai, durasi_jam } = req.query;

    if (!id_space || !tanggal || !jam_mulai || !durasi_jam) {
      return sendResponse(res, 400, 'Parameter tidak lengkap', null,
        'id_space, tanggal, jam_mulai, dan durasi_jam diperlukan');
    }

    const space = await prisma.space.findFirst({
      where: {
        id: parseInt(id_space),
        owner: { user: { makerId } }
      }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak ditemukan');
    }

    const [startHour, startMinute] = jam_mulai.split(':').map(Number);
    const durasiJam = parseInt(durasi_jam);
    const endHour = startHour + durasiJam;
    const jam_selesai = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

    const [avYear, avMonth, avDay] = tanggal.split('-').map(Number);
    const tanggalStart = new Date(Date.UTC(avYear, avMonth - 1, avDay, 0, 0, 0));
    const tanggalEnd   = new Date(Date.UTC(avYear, avMonth - 1, avDay, 23, 59, 59));

    // Cek overlap via detail_reservasi
    const existingDetails = await prisma.detailReservasi.findMany({
      where: {
        id_space: parseInt(id_space),
        reservasi: {
          tanggal_reservasi: { gte: tanggalStart, lte: tanggalEnd },
          status: { not: 'dibatalkan' }
        }
      },
      include: {
        reservasi: { select: { jam_mulai: true, jam_selesai: true, status: true, kode_booking: true } }
      }
    });

    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const conflicting = existingDetails.filter(d => {
      const existStart = toMinutes(d.reservasi.jam_mulai);
      const existEnd = toMinutes(d.reservasi.jam_selesai);
      const newStart = toMinutes(jam_mulai);
      const newEnd = toMinutes(jam_selesai);
      return newStart < existEnd && newEnd > existStart;
    });

    const isAvailable = conflicting.length === 0;

    return sendResponse(res, 200, 'Ketersediaan space berhasil dicek', {
      space: {
        id: space.id,
        nama_space: space.nama_space,
        tipe: space.tipe,
        kapasitas: space.kapasitas,
        harga_per_jam: space.harga_per_jam
      },
      request: { tanggal, jam_mulai, jam_selesai, durasi_jam: durasiJam },
      is_available: isAvailable,
      conflicting_reservations: conflicting.map(d => ({
        kode_booking: d.reservasi.kode_booking,
        jam_mulai: d.reservasi.jam_mulai,
        jam_selesai: d.reservasi.jam_selesai,
        status: d.reservasi.status
      }))
    });
  } catch (error) {
    console.error('Check availability error:', error);
    return sendResponse(res, 500, 'Gagal mengecek ketersediaan', null, error.message);
  }
};

/**
 * GET /api/spaces
 */
const getAll = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { tipe, search } = req.query;

    const whereClause = {
      owner: { user: { makerId } }
    };

    if (tipe) whereClause.tipe = tipe;
    if (search) {
      whereClause.OR = [
        { nama_space: { contains: search } },
        { deskripsi: { contains: search } }
      ];
    }

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, nama_coworking: true, nama_pemilik: true, alamat: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = spaces.map(s => ({
      ...s,
      foto: s.foto ? `${process.env.BASE_URL}/uploads/spaces/${s.foto}` : null
    }));

    return sendResponse(res, 200, 'Daftar space berhasil diambil', {
      total: formatted.length,
      spaces: formatted
    });
  } catch (error) {
    console.error('Get all spaces error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar space', null, error.message);
  }
};

/**
 * GET /api/spaces/:id
 */
const getById = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { id } = req.params;

    const space = await prisma.space.findFirst({
      where: {
        id: parseInt(id),
        owner: { user: { makerId } }
      },
      include: {
        owner: {
          select: { id: true, nama_coworking: true, nama_pemilik: true, telp: true, alamat: true }
        }
      }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak ditemukan');
    }

    return sendResponse(res, 200, 'Detail space berhasil diambil', {
      space: {
        ...space,
        foto: space.foto ? `${process.env.BASE_URL}/uploads/spaces/${space.foto}` : null
      }
    });
  } catch (error) {
    console.error('Get space by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail space', null, error.message);
  }
};

module.exports = { getTypes, checkAvailability, getAll, getById };
