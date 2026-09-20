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
 * GET /api/admin/diskon
 * Daftar semua diskon milik maker yang sama dengan admin
 */
const getAll = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const now = new Date();

    const diskons = await prisma.diskon.findMany({
      where: { makerId },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = diskons.map(d => ({
      ...d,
      is_active: d.tanggal_awal <= now && d.tanggal_akhir >= now
    }));

    return sendResponse(res, 200, 'Daftar diskon berhasil diambil', {
      total: formatted.length,
      diskons: formatted
    });
  } catch (error) {
    console.error('Admin get all diskons error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar diskon', null, error.message);
  }
};

/**
 * POST /api/admin/diskon
 * Tambah diskon baru
 */
const create = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { nama_diskon, persentase_diskon, tanggal_awal, tanggal_akhir } = req.body;

    if (!nama_diskon || !persentase_diskon || !tanggal_awal || !tanggal_akhir) {
      return sendResponse(res, 400, 'Field wajib tidak lengkap', null,
        'nama_diskon, persentase_diskon, tanggal_awal, dan tanggal_akhir diperlukan');
    }

    // Validasi persentase
    const persentase = parseFloat(persentase_diskon);
    if (persentase <= 0 || persentase > 100) {
      return sendResponse(res, 400, 'Persentase diskon tidak valid', null,
        'Persentase diskon harus antara 0 dan 100');
    }

    // Validasi tanggal
    const tglAwal = new Date(tanggal_awal);
    const tglAkhir = new Date(tanggal_akhir);
    if (tglAwal >= tglAkhir) {
      return sendResponse(res, 400, 'Tanggal tidak valid', null,
        'Tanggal awal harus lebih awal dari tanggal akhir');
    }

    // Cek nama unik dalam scope maker
    const existing = await prisma.diskon.findFirst({
      where: { nama_diskon, makerId }
    });
    if (existing) {
      return sendResponse(res, 409, 'Nama diskon sudah digunakan', null,
        'Nama diskon sudah terdaftar dalam sistem');
    }

    const diskon = await prisma.diskon.create({
      data: {
        nama_diskon,
        persentase_diskon: persentase,
        tanggal_awal: tglAwal,
        tanggal_akhir: tglAkhir,
        makerId
      }
    });

    return sendResponse(res, 201, 'Diskon berhasil ditambahkan', { diskon });
  } catch (error) {
    console.error('Admin create diskon error:', error);
    return sendResponse(res, 500, 'Gagal menambahkan diskon', null, error.message);
  }
};

/**
 * GET /api/admin/diskon/:id
 * Detail diskon by ID
 */
const getById = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;

    const diskon = await prisma.diskon.findFirst({
      where: {
        id: parseInt(id),
        makerId
      }
    });

    if (!diskon) {
      return sendResponse(res, 404, 'Diskon tidak ditemukan', null, 'Diskon dengan id tersebut tidak ditemukan');
    }

    const now = new Date();
    return sendResponse(res, 200, 'Detail diskon berhasil diambil', {
      diskon: {
        ...diskon,
        is_active: diskon.tanggal_awal <= now && diskon.tanggal_akhir >= now
      }
    });
  } catch (error) {
    console.error('Admin get diskon by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail diskon', null, error.message);
  }
};

/**
 * PUT /api/admin/diskon/:id
 * Update diskon
 */
const update = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;

    const diskon = await prisma.diskon.findFirst({
      where: { id: parseInt(id), makerId }
    });

    if (!diskon) {
      return sendResponse(res, 404, 'Diskon tidak ditemukan', null, 'Diskon tidak ditemukan');
    }

    const { nama_diskon, persentase_diskon, tanggal_awal, tanggal_akhir } = req.body;

    const updateData = {};
    if (nama_diskon && nama_diskon !== diskon.nama_diskon) {
      // Cek nama unik
      const existing = await prisma.diskon.findFirst({
        where: { nama_diskon, makerId, id: { not: parseInt(id) } }
      });
      if (existing) {
        return sendResponse(res, 409, 'Nama diskon sudah digunakan', null,
          'Nama diskon sudah terdaftar dalam sistem');
      }
      updateData.nama_diskon = nama_diskon;
    }

    if (persentase_diskon !== undefined) {
      const persentase = parseFloat(persentase_diskon);
      if (persentase <= 0 || persentase > 100) {
        return sendResponse(res, 400, 'Persentase diskon tidak valid', null,
          'Persentase diskon harus antara 0 dan 100');
      }
      updateData.persentase_diskon = persentase;
    }

    if (tanggal_awal) updateData.tanggal_awal = new Date(tanggal_awal);
    if (tanggal_akhir) updateData.tanggal_akhir = new Date(tanggal_akhir);

    // Validasi tanggal jika keduanya diupdate
    const finalAwal = updateData.tanggal_awal || diskon.tanggal_awal;
    const finalAkhir = updateData.tanggal_akhir || diskon.tanggal_akhir;
    if (finalAwal >= finalAkhir) {
      return sendResponse(res, 400, 'Tanggal tidak valid', null,
        'Tanggal awal harus lebih awal dari tanggal akhir');
    }

    const updatedDiskon = await prisma.diskon.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return sendResponse(res, 200, 'Diskon berhasil diupdate', { diskon: updatedDiskon });
  } catch (error) {
    console.error('Admin update diskon error:', error);
    return sendResponse(res, 500, 'Gagal mengupdate diskon', null, error.message);
  }
};

/**
 * DELETE /api/admin/diskon/:id
 * Hapus diskon
 */
const remove = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;

    const diskon = await prisma.diskon.findFirst({
      where: { id: parseInt(id), makerId }
    });

    if (!diskon) {
      return sendResponse(res, 404, 'Diskon tidak ditemukan', null, 'Diskon tidak ditemukan');
    }

    // Cek apakah diskon digunakan di reservasi aktif (via detail_reservasi)
    const activeUsage = await prisma.detailReservasi.findFirst({
      where: {
        id_diskon: parseInt(id),
        reservasi: { status: { in: ['belum_dikonfirm', 'disetujui', 'aktif'] } }
      }
    });

    if (activeUsage) {
      return sendResponse(res, 400, 'Tidak dapat menghapus diskon', null,
        'Diskon sedang digunakan dalam reservasi yang aktif');
    }

    await prisma.diskon.delete({ where: { id: parseInt(id) } });

    return sendResponse(res, 200, 'Diskon berhasil dihapus', null);
  } catch (error) {
    console.error('Admin delete diskon error:', error);
    return sendResponse(res, 500, 'Gagal menghapus diskon', null, error.message);
  }
};

module.exports = { getAll, create, getById, update, remove };
