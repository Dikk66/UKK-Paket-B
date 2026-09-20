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
 * GET /api/admin/reservasi
 * Daftar semua reservasi milik space owner ini
 * Query: month, year, status, id_space, tanggal
 */
const getAll = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const { month, year, status, id_space, tanggal } = req.query;

    const whereClause = {
      id_owner: user.spaceOwner.id
    };

    if (status) whereClause.status = status;

    if (tanggal) {
      const [tY, tM, tD] = tanggal.split('-').map(Number);
      whereClause.tanggal_reservasi = {
        gte: new Date(Date.UTC(tY, tM - 1, tD, 0, 0, 0)),
        lte: new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59))
      };
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      whereClause.tanggal_reservasi = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      whereClause.tanggal_reservasi = { gte: startDate, lte: endDate };
    }

    // Filter id_space via detail_reservasi
    if (id_space) {
      whereClause.detail_reservasi = {
        some: { id_space: parseInt(id_space) }
      };
    }

    const reservasis = await prisma.reservasi.findMany({
      where: whereClause,
      include: {
        member: {
          select: { id: true, nama_member: true, telp: true, instansi: true }
        },
        detail_reservasi: {
          include: {
            space: { select: { id: true, nama_space: true, tipe: true } },
            diskon: { select: { nama_diskon: true, persentase_diskon: true } }
          }
        }
      },
      orderBy: { tanggal_reservasi: 'desc' }
    });

    return sendResponse(res, 200, 'Daftar reservasi berhasil diambil', {
      total: reservasis.length,
      filter: { month, year, status, id_space, tanggal },
      reservasis
    });
  } catch (error) {
    console.error('Admin get all reservasi error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar reservasi', null, error.message);
  }
};

/**
 * PATCH /api/admin/reservasi/:id/status
 * Update status reservasi
 */
const updateStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const validStatuses = ['belum_dikonfirm', 'disetujui', 'aktif', 'selesai', 'dibatalkan'];
    if (!status || !validStatuses.includes(status)) {
      return sendResponse(res, 400, 'Status tidak valid', null,
        `Status harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik space Anda');
    }

    const updated = await prisma.reservasi.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        member: { select: { nama_member: true, telp: true } },
        detail_reservasi: {
          include: {
            space: { select: { nama_space: true } }
          }
        }
      }
    });

    return sendResponse(res, 200, 'Status reservasi berhasil diupdate', { reservasi: updated });
  } catch (error) {
    console.error('Admin update reservasi status error:', error);
    return sendResponse(res, 500, 'Gagal mengupdate status reservasi', null, error.message);
  }
};

/**
 * POST /api/admin/reservasi/:id/check-in
 * Check-in reservasi — ubah status ke aktif
 */
const checkIn = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik space Anda');
    }

    if (reservasi.status !== 'disetujui') {
      return sendResponse(res, 400, 'Check-in tidak dapat dilakukan', null,
        `Reservasi harus berstatus 'disetujui' untuk check-in. Status saat ini: ${reservasi.status}`);
    }

    if (reservasi.check_in_time) {
      return sendResponse(res, 400, 'Reservasi sudah check-in', null,
        'Reservasi ini sudah melakukan check-in sebelumnya');
    }

    const updated = await prisma.reservasi.update({
      where: { id: parseInt(id) },
      data: { status: 'aktif', check_in_time: new Date() },
      include: {
        member: { select: { nama_member: true, telp: true } },
        detail_reservasi: {
          include: { space: { select: { nama_space: true } } }
        }
      }
    });

    return sendResponse(res, 200, 'Check-in berhasil', { reservasi: updated });
  } catch (error) {
    console.error('Admin check-in error:', error);
    return sendResponse(res, 500, 'Gagal melakukan check-in', null, error.message);
  }
};

/**
 * POST /api/admin/reservasi/:id/check-out
 * Check-out reservasi — ubah status ke selesai
 */
const checkOut = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const reservasi = await prisma.reservasi.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id }
    });

    if (!reservasi) {
      return sendResponse(res, 404, 'Reservasi tidak ditemukan', null,
        'Reservasi tidak ditemukan atau bukan milik space Anda');
    }

    if (reservasi.status !== 'aktif') {
      return sendResponse(res, 400, 'Check-out tidak dapat dilakukan', null,
        `Reservasi harus berstatus 'aktif' untuk check-out. Status saat ini: ${reservasi.status}`);
    }

    if (reservasi.check_out_time) {
      return sendResponse(res, 400, 'Reservasi sudah check-out', null,
        'Reservasi ini sudah melakukan check-out sebelumnya');
    }

    const updated = await prisma.reservasi.update({
      where: { id: parseInt(id) },
      data: { status: 'selesai', check_out_time: new Date() },
      include: {
        member: { select: { nama_member: true, telp: true } },
        detail_reservasi: {
          include: { space: { select: { nama_space: true } } }
        }
      }
    });

    return sendResponse(res, 200, 'Check-out berhasil', { reservasi: updated });
  } catch (error) {
    console.error('Admin check-out error:', error);
    return sendResponse(res, 500, 'Gagal melakukan check-out', null, error.message);
  }
};

module.exports = { getAll, updateStatus, checkIn, checkOut };
