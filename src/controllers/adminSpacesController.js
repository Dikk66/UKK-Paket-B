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
 * GET /api/admin/spaces
 */
const getAll = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil SpaceOwner');
    }

    const spaces = await prisma.space.findMany({
      where: { id_owner: user.spaceOwner.id },
      include: {
        _count: { select: { detail_reservasi: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = spaces.map(s => ({
      ...s,
      foto: s.foto ? `${process.env.BASE_URL}/uploads/spaces/${s.foto}` : null,
      total_reservasi: s._count.detail_reservasi
    }));

    return sendResponse(res, 200, 'Daftar space berhasil diambil', {
      total: formatted.length,
      spaces: formatted
    });
  } catch (error) {
    console.error('Admin get all spaces error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar space', null, error.message);
  }
};

/**
 * POST /api/admin/spaces
 */
const create = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil SpaceOwner');
    }

    const { nama_space, harga_per_jam, tipe, kapasitas, foto, deskripsi } = req.body;

    if (!nama_space || !harga_per_jam || !tipe || !kapasitas) {
      return sendResponse(res, 400, 'Field wajib tidak lengkap', null,
        'nama_space, harga_per_jam, tipe, dan kapasitas diperlukan');
    }

    const validTypes = ['desk', 'meeting_room', 'private_office'];
    if (!validTypes.includes(tipe)) {
      return sendResponse(res, 400, 'Tipe space tidak valid', null,
        `Tipe harus salah satu dari: ${validTypes.join(', ')}`);
    }

    const space = await prisma.space.create({
      data: {
        nama_space,
        harga_per_jam: parseFloat(harga_per_jam),
        tipe,
        kapasitas: parseInt(kapasitas),
        foto: foto || null,
        deskripsi: deskripsi || null,
        id_owner: user.spaceOwner.id
      }
    });

    return sendResponse(res, 201, 'Space berhasil ditambahkan', {
      space: {
        ...space,
        foto: space.foto ? `${process.env.BASE_URL}/uploads/spaces/${space.foto}` : null
      }
    });
  } catch (error) {
    console.error('Admin create space error:', error);
    return sendResponse(res, 500, 'Gagal menambahkan space', null, error.message);
  }
};

/**
 * GET /api/admin/spaces/:id
 */
const getById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const space = await prisma.space.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id },
      include: { _count: { select: { detail_reservasi: true } } }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak ditemukan atau bukan milik Anda');
    }

    return sendResponse(res, 200, 'Detail space berhasil diambil', {
      space: {
        ...space,
        foto: space.foto ? `${process.env.BASE_URL}/uploads/spaces/${space.foto}` : null,
        total_reservasi: space._count.detail_reservasi
      }
    });
  } catch (error) {
    console.error('Admin get space by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail space', null, error.message);
  }
};

/**
 * PUT /api/admin/spaces/:id
 */
const update = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const space = await prisma.space.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak ditemukan atau bukan milik Anda');
    }

    const { nama_space, harga_per_jam, tipe, kapasitas, foto, deskripsi } = req.body;

    const updateData = {};
    if (nama_space) updateData.nama_space = nama_space;
    if (harga_per_jam !== undefined) updateData.harga_per_jam = parseFloat(harga_per_jam);
    if (tipe) {
      const validTypes = ['desk', 'meeting_room', 'private_office'];
      if (!validTypes.includes(tipe)) {
        return sendResponse(res, 400, 'Tipe space tidak valid', null,
          `Tipe harus salah satu dari: ${validTypes.join(', ')}`);
      }
      updateData.tipe = tipe;
    }
    if (kapasitas !== undefined) updateData.kapasitas = parseInt(kapasitas);
    if (foto !== undefined) updateData.foto = foto;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;

    const updatedSpace = await prisma.space.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return sendResponse(res, 200, 'Space berhasil diupdate', {
      space: {
        ...updatedSpace,
        foto: updatedSpace.foto ? `${process.env.BASE_URL}/uploads/spaces/${updatedSpace.foto}` : null
      }
    });
  } catch (error) {
    console.error('Admin update space error:', error);
    return sendResponse(res, 500, 'Gagal mengupdate space', null, error.message);
  }
};

/**
 * DELETE /api/admin/spaces/:id
 */
const remove = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null, 'Admin belum memiliki profil');
    }

    const space = await prisma.space.findFirst({
      where: { id: parseInt(id), id_owner: user.spaceOwner.id }
    });

    if (!space) {
      return sendResponse(res, 404, 'Space tidak ditemukan', null, 'Space tidak ditemukan atau bukan milik Anda');
    }

    // Cek reservasi aktif via detail_reservasi
    const activeDetail = await prisma.detailReservasi.findFirst({
      where: {
        id_space: parseInt(id),
        reservasi: { status: { in: ['belum_dikonfirm', 'disetujui', 'aktif'] } }
      }
    });

    if (activeDetail) {
      return sendResponse(res, 400, 'Tidak dapat menghapus space', null,
        'Space masih memiliki reservasi yang aktif');
    }

    // Hapus detail_reservasi terkait dulu
    await prisma.detailReservasi.deleteMany({ where: { id_space: parseInt(id) } });
    await prisma.space.delete({ where: { id: parseInt(id) } });

    return sendResponse(res, 200, 'Space berhasil dihapus', null);
  } catch (error) {
    console.error('Admin delete space error:', error);
    return sendResponse(res, 500, 'Gagal menghapus space', null, error.message);
  }
};

module.exports = { getAll, create, getById, update, remove };
