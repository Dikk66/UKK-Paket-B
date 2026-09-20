const bcrypt = require('bcryptjs');
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
 * GET /api/admin/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null,
        'Admin belum memiliki profil SpaceOwner');
    }

    return sendResponse(res, 200, 'Profil admin berhasil diambil', {
      user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
      profile: {
        id: user.spaceOwner.id,
        nama_coworking: user.spaceOwner.nama_coworking,
        nama_pemilik: user.spaceOwner.nama_pemilik,
        telp: user.spaceOwner.telp,
        alamat: user.spaceOwner.alamat,
        createdAt: user.spaceOwner.createdAt,
        updatedAt: user.spaceOwner.updatedAt
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    return sendResponse(res, 500, 'Gagal mengambil profil', null, error.message);
  }
};

/**
 * PUT /api/admin/profile
 * Body: nama_coworking, nama_pemilik, telp (sesuai UpdateCoworkingProfileDto)
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spaceOwner) {
      return sendResponse(res, 404, 'Profil admin tidak ditemukan', null,
        'Admin belum memiliki profil SpaceOwner');
    }

    const { nama_coworking, nama_pemilik, telp, alamat, password } = req.body;

    const updateData = {};
    if (nama_coworking) updateData.nama_coworking = nama_coworking;
    if (nama_pemilik) updateData.nama_pemilik = nama_pemilik;
    if (telp !== undefined) updateData.telp = telp;
    if (alamat !== undefined) updateData.alamat = alamat;

    const updatedSpaceOwner = await prisma.spaceOwner.update({
      where: { id: user.spaceOwner.id },
      data: updateData
    });

    if (password) {
      if (password.length < 6) {
        return sendResponse(res, 400, 'Password terlalu pendek', null, 'Password minimal 6 karakter');
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
    }

    return sendResponse(res, 200, 'Profil admin berhasil diupdate', { profile: updatedSpaceOwner });
  } catch (error) {
    console.error('Update admin profile error:', error);
    return sendResponse(res, 500, 'Gagal mengupdate profil', null, error.message);
  }
};

module.exports = { getProfile, updateProfile };
