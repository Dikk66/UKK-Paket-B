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
 * GET /api/diskon/active
 * Daftar diskon yang sedang aktif (berdasarkan tanggal hari ini)
 */
const getActive = async (req, res) => {
  try {
    const makerId = req.makerId;
    const now = new Date();

    const diskons = await prisma.diskon.findMany({
      where: {
        makerId,
        tanggal_awal: { lte: now },
        tanggal_akhir: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendResponse(res, 200, 'Diskon aktif berhasil diambil', {
      total: diskons.length,
      diskons
    });
  } catch (error) {
    console.error('Get active diskon error:', error);
    return sendResponse(res, 500, 'Gagal mengambil diskon aktif', null, error.message);
  }
};

/**
 * POST /api/diskon/check
 * Cek validitas kode diskon
 * Body: { nama_diskon, total_harga }
 */
const checkDiskon = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { nama_diskon, total_harga } = req.body;

    if (!nama_diskon) {
      return sendResponse(res, 400, 'Nama diskon diperlukan', null, 'Field nama_diskon wajib diisi');
    }

    const now = new Date();

    const diskon = await prisma.diskon.findFirst({
      where: {
        nama_diskon,
        makerId,
        tanggal_awal: { lte: now },
        tanggal_akhir: { gte: now }
      }
    });

    if (!diskon) {
      return sendResponse(res, 404, 'Kode diskon tidak valid atau sudah kadaluarsa', null,
        'Kode diskon tidak ditemukan atau tidak aktif');
    }

    let potongan = 0;
    let total_setelah_diskon = total_harga || 0;

    if (total_harga) {
      potongan = (parseFloat(total_harga) * diskon.persentase_diskon) / 100;
      total_setelah_diskon = parseFloat(total_harga) - potongan;
    }

    return sendResponse(res, 200, 'Kode diskon valid', {
      diskon: {
        id: diskon.id,
        nama_diskon: diskon.nama_diskon,
        persentase_diskon: diskon.persentase_diskon,
        tanggal_awal: diskon.tanggal_awal,
        tanggal_akhir: diskon.tanggal_akhir
      },
      kalkulasi: total_harga ? {
        total_harga_awal: parseFloat(total_harga),
        potongan_diskon: potongan,
        total_bayar: total_setelah_diskon
      } : null
    });
  } catch (error) {
    console.error('Check diskon error:', error);
    return sendResponse(res, 500, 'Gagal mengecek diskon', null, error.message);
  }
};

/**
 * GET /api/diskon/:id
 * Detail diskon by ID
 */
const getById = async (req, res) => {
  try {
    const makerId = req.makerId;
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
    const isActive = diskon.tanggal_awal <= now && diskon.tanggal_akhir >= now;

    return sendResponse(res, 200, 'Detail diskon berhasil diambil', {
      diskon: {
        ...diskon,
        is_active: isActive
      }
    });
  } catch (error) {
    console.error('Get diskon by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail diskon', null, error.message);
  }
};

module.exports = { getActive, checkDiskon, getById };
