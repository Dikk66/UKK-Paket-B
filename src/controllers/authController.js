const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
 * POST /api/auth/register/member
 */
const registerMember = async (req, res) => {
  try {
    const makerId = req.makerId;
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

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, makerId: user.makerId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendResponse(res, 201, 'Registrasi member berhasil', {
      user: { id: user.id, username: user.username, role: user.role },
      member: {
        id: user.member.id,
        nama_member: user.member.nama_member,
        instansi: user.member.instansi,
        alamat: user.member.alamat,
        telp: user.member.telp,
        foto: user.member.foto
      },
      token
    });
  } catch (error) {
    console.error('Register member error:', error);
    return sendResponse(res, 500, 'Gagal registrasi member', null, error.message);
  }
};

/**
 * POST /api/auth/register/admin-space
 */
const registerAdminSpace = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { username, password, nama_coworking, nama_pemilik, telp, alamat } = req.body;

    if (!username || !password || !nama_coworking || !nama_pemilik) {
      return sendResponse(res, 400, 'Field wajib tidak lengkap', null,
        'username, password, nama_coworking, dan nama_pemilik diperlukan');
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
        role: 'admin_space',
        makerId,
        spaceOwner: {
          create: {
            nama_coworking,
            nama_pemilik,
            telp: telp || null,
            alamat: alamat || null
          }
        }
      },
      include: { spaceOwner: true }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, makerId: user.makerId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendResponse(res, 201, 'Registrasi admin space berhasil', {
      user: { id: user.id, username: user.username, role: user.role },
      spaceOwner: {
        id: user.spaceOwner.id,
        nama_coworking: user.spaceOwner.nama_coworking,
        nama_pemilik: user.spaceOwner.nama_pemilik,
        telp: user.spaceOwner.telp,
        alamat: user.spaceOwner.alamat
      },
      token
    });
  } catch (error) {
    console.error('Register admin space error:', error);
    return sendResponse(res, 500, 'Gagal registrasi admin space', null, error.message);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const makerId = req.makerId;
    const { username, password } = req.body;

    if (!username || !password) {
      return sendResponse(res, 400, 'Username dan password diperlukan', null,
        'Field username dan password wajib diisi');
    }

    const user = await prisma.user.findFirst({
      where: { username, makerId },
      include: { member: true, spaceOwner: true }
    });

    if (!user) {
      return sendResponse(res, 401, 'Kredensial tidak valid', null, 'Username atau password salah');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return sendResponse(res, 401, 'Kredensial tidak valid', null, 'Username atau password salah');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, makerId: user.makerId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    let profileData = null;
    if (user.role === 'member' && user.member) {
      profileData = {
        id: user.member.id,
        nama_member: user.member.nama_member,
        instansi: user.member.instansi,
        alamat: user.member.alamat,
        telp: user.member.telp,
        foto: user.member.foto
          ? `${process.env.BASE_URL}/uploads/members/${user.member.foto}`
          : null
      };
    } else if (user.role === 'admin_space' && user.spaceOwner) {
      profileData = {
        id: user.spaceOwner.id,
        nama_coworking: user.spaceOwner.nama_coworking,
        nama_pemilik: user.spaceOwner.nama_pemilik,
        telp: user.spaceOwner.telp,
        alamat: user.spaceOwner.alamat
      };
    }

    return sendResponse(res, 200, 'Login berhasil', {
      user: { id: user.id, username: user.username, role: user.role },
      profile: profileData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendResponse(res, 500, 'Gagal login', null, error.message);
  }
};

/**
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    let profileData = null;
    if (user.role === 'member' && user.member) {
      profileData = {
        id: user.member.id,
        nama_member: user.member.nama_member,
        instansi: user.member.instansi,
        alamat: user.member.alamat,
        telp: user.member.telp,
        foto: user.member.foto
          ? `${process.env.BASE_URL}/uploads/members/${user.member.foto}`
          : null
      };
    } else if (user.role === 'admin_space' && user.spaceOwner) {
      profileData = {
        id: user.spaceOwner.id,
        nama_coworking: user.spaceOwner.nama_coworking,
        nama_pemilik: user.spaceOwner.nama_pemilik,
        telp: user.spaceOwner.telp,
        alamat: user.spaceOwner.alamat
      };
    }

    return sendResponse(res, 200, 'Profil berhasil diambil', {
      user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
      profile: profileData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return sendResponse(res, 500, 'Gagal mengambil profil', null, error.message);
  }
};

module.exports = { registerMember, registerAdminSpace, login, getProfile };
