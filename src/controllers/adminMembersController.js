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
 * GET /api/admin/members
 * Daftar semua member dalam scope maker yang sama
 */
const getAll = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { search } = req.query;

    const whereClause = { user: { makerId } };

    if (search) {
      whereClause.OR = [
        { nama_member: { contains: search } },
        { instansi: { contains: search } },
        { telp: { contains: search } },
        { user: { username: { contains: search } } }
      ];
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, username: true, role: true, createdAt: true } },
        _count: { select: { reservasi: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = members.map(m => ({
      id: m.id,
      nama_member: m.nama_member,
      instansi: m.instansi,
      alamat: m.alamat,
      telp: m.telp,
      foto: m.foto ? `${process.env.BASE_URL}/uploads/members/${m.foto}` : null,
      total_reservasi: m._count.reservasi,
      user: m.user,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    return sendResponse(res, 200, 'Daftar member berhasil diambil', {
      total: formatted.length,
      members: formatted
    });
  } catch (error) {
    console.error('Admin get all members error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar member', null, error.message);
  }
};

/**
 * POST /api/admin/members
 * Tambah member baru (oleh admin)
 * Body: username, password, nama_member, instansi, alamat, telp, foto (optional)
 */
const create = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { username, password, nama_member, instansi, alamat, telp, foto } = req.body;

    if (!username || !password || !nama_member) {
      return sendResponse(res, 400, 'Field wajib tidak lengkap', null,
        'username, password, dan nama_member diperlukan');
    }

    if (password.length < 6) {
      return sendResponse(res, 400, 'Password terlalu pendek', null, 'Password minimal 6 karakter');
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return sendResponse(res, 409, 'Username sudah digunakan', null, 'Username sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'member',
        makerId,
        member: {
          create: {
            nama_member,
            instansi: instansi || null,
            alamat: alamat || null,
            telp: telp || null,
            foto: foto || null
          }
        }
      },
      include: { member: true }
    });

    return sendResponse(res, 201, 'Member berhasil ditambahkan', {
      user: { id: user.id, username: user.username, role: user.role },
      member: {
        ...user.member,
        foto: user.member.foto
          ? `${process.env.BASE_URL}/uploads/members/${user.member.foto}`
          : null
      }
    });
  } catch (error) {
    console.error('Admin create member error:', error);
    return sendResponse(res, 500, 'Gagal menambahkan member', null, error.message);
  }
};

/**
 * GET /api/admin/members/:id
 * Detail member by ID
 */
const getById = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;

    const member = await prisma.member.findFirst({
      where: { id: parseInt(id), user: { makerId } },
      include: {
        user: { select: { id: true, username: true, role: true, createdAt: true } },
        reservasi: {
          include: {
            detail_reservasi: {
              include: { space: { select: { nama_space: true, tipe: true } } }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!member) {
      return sendResponse(res, 404, 'Member tidak ditemukan', null, 'Member tidak ditemukan');
    }

    const formatted = {
      ...member,
      foto: member.foto ? `${process.env.BASE_URL}/uploads/members/${member.foto}` : null
    };

    return sendResponse(res, 200, 'Detail member berhasil diambil', { member: formatted });
  } catch (error) {
    console.error('Admin get member by id error:', error);
    return sendResponse(res, 500, 'Gagal mengambil detail member', null, error.message);
  }
};

/**
 * PUT /api/admin/members/:id
 * Update data member
 */
const update = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;
    const { nama_member, instansi, alamat, telp, foto, password } = req.body;

    const member = await prisma.member.findFirst({
      where: { id: parseInt(id), user: { makerId } },
      include: { user: true }
    });

    if (!member) {
      return sendResponse(res, 404, 'Member tidak ditemukan', null, 'Member tidak ditemukan');
    }

    const updateData = {};
    if (nama_member) updateData.nama_member = nama_member;
    if (instansi !== undefined) updateData.instansi = instansi;
    if (alamat !== undefined) updateData.alamat = alamat;
    if (telp !== undefined) updateData.telp = telp;
    if (foto !== undefined) updateData.foto = foto;

    const updatedMember = await prisma.member.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    if (password) {
      if (password.length < 6) {
        return sendResponse(res, 400, 'Password terlalu pendek', null, 'Password minimal 6 karakter');
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: member.id_user },
        data: { password: hashedPassword }
      });
    }

    return sendResponse(res, 200, 'Data member berhasil diupdate', {
      member: {
        ...updatedMember,
        foto: updatedMember.foto
          ? `${process.env.BASE_URL}/uploads/members/${updatedMember.foto}`
          : null
      }
    });
  } catch (error) {
    console.error('Admin update member error:', error);
    return sendResponse(res, 500, 'Gagal mengupdate member', null, error.message);
  }
};

/**
 * DELETE /api/admin/members/:id
 * Hapus member
 */
const remove = async (req, res) => {
  try {
    const makerId = req.user.makerId;
    const { id } = req.params;

    const member = await prisma.member.findFirst({
      where: { id: parseInt(id), user: { makerId } }
    });

    if (!member) {
      return sendResponse(res, 404, 'Member tidak ditemukan', null, 'Member tidak ditemukan');
    }

    // Cek reservasi aktif
    const activeReservasi = await prisma.reservasi.findFirst({
      where: {
        id_member: parseInt(id),
        status: { in: ['belum_dikonfirm', 'disetujui', 'aktif'] }
      }
    });

    if (activeReservasi) {
      return sendResponse(res, 400, 'Tidak dapat menghapus member', null,
        'Member masih memiliki reservasi yang aktif');
    }

    // Hapus detail_reservasi dulu, lalu reservasi, lalu member, lalu user
    const reservasiIds = await prisma.reservasi.findMany({
      where: { id_member: parseInt(id) },
      select: { id: true }
    });
    const ids = reservasiIds.map(r => r.id);

    if (ids.length > 0) {
      await prisma.detailReservasi.deleteMany({ where: { id_reservasi: { in: ids } } });
      await prisma.reservasi.deleteMany({ where: { id_member: parseInt(id) } });
    }

    await prisma.member.delete({ where: { id: parseInt(id) } });
    await prisma.user.delete({ where: { id: member.id_user } });

    return sendResponse(res, 200, 'Member berhasil dihapus', null);
  } catch (error) {
    console.error('Admin delete member error:', error);
    return sendResponse(res, 500, 'Gagal menghapus member', null, error.message);
  }
};

module.exports = { getAll, create, getById, update, remove };
