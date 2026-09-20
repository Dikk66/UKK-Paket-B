const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = new PrismaClient();

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
 * POST /api/maker/register
 * Registrasi app maker baru
 */
const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return sendResponse(res, 400, 'Semua field wajib diisi', null,
        'name, username, email, dan password diperlukan');
    }

    // Cek username unik
    const existingUsername = await prisma.appMaker.findUnique({ where: { username } });
    if (existingUsername) {
      return sendResponse(res, 409, 'Username sudah digunakan', null, 'Username sudah terdaftar');
    }

    // Cek email unik
    const existingEmail = await prisma.appMaker.findUnique({ where: { email } });
    if (existingEmail) {
      return sendResponse(res, 409, 'Email sudah digunakan', null, 'Email sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate app_key: mk_ + random hex 32 chars
    const app_key = 'mk_' + crypto.randomBytes(16).toString('hex');

    const maker = await prisma.appMaker.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        app_key
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: maker.id, username: maker.username, type: 'maker' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendResponse(res, 201, 'Registrasi maker berhasil', {
      maker: {
        id: maker.id,
        name: maker.name,
        username: maker.username,
        email: maker.email,
        app_key: maker.app_key,
        createdAt: maker.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Maker register error:', error);
    return sendResponse(res, 500, 'Gagal registrasi', null, error.message);
  }
};

/**
 * POST /api/maker/login
 * Login app maker
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendResponse(res, 400, 'Username dan password diperlukan', null,
        'Field username dan password wajib diisi');
    }

    // Cari berdasarkan username atau email
    const maker = await prisma.appMaker.findFirst({
      where: {
        OR: [{ username }, { email: username }]
      }
    });

    if (!maker) {
      return sendResponse(res, 401, 'Kredensial tidak valid', null, 'Username atau password salah');
    }

    const isValidPassword = await bcrypt.compare(password, maker.password);
    if (!isValidPassword) {
      return sendResponse(res, 401, 'Kredensial tidak valid', null, 'Username atau password salah');
    }

    const token = jwt.sign(
      { id: maker.id, username: maker.username, type: 'maker' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendResponse(res, 200, 'Login maker berhasil', {
      maker: {
        id: maker.id,
        name: maker.name,
        username: maker.username,
        email: maker.email,
        app_key: maker.app_key
      },
      token
    });
  } catch (error) {
    console.error('Maker login error:', error);
    return sendResponse(res, 500, 'Gagal login', null, error.message);
  }
};

/**
 * GET /api/maker/me
 * Info maker yang sedang login (auth: Bearer maker token)
 */
const getMe = async (req, res) => {
  try {
    const maker = req.maker;

    // Hitung statistik
    const [userCount, diskonCount] = await Promise.all([
      prisma.user.count({ where: { makerId: maker.id } }),
      prisma.diskon.count({ where: { makerId: maker.id } })
    ]);

    return sendResponse(res, 200, 'Data maker berhasil diambil', {
      id: maker.id,
      name: maker.name,
      username: maker.username,
      email: maker.email,
      app_key: maker.app_key,
      stats: {
        total_users: userCount,
        total_diskons: diskonCount
      },
      createdAt: maker.createdAt,
      updatedAt: maker.updatedAt
    });
  } catch (error) {
    console.error('Maker getMe error:', error);
    return sendResponse(res, 500, 'Gagal mengambil data', null, error.message);
  }
};

/**
 * GET /api/maker/stats
 * Statistik maker (auth: Bearer maker token atau x-maker-key)
 */
const getStats = async (req, res) => {
  try {
    const maker = req.maker;

    const [
      totalUsers,
      totalMembers,
      totalAdmins,
      totalSpaces,
      totalDiskons,
      totalReservasi,
      reservasiByStatus
    ] = await Promise.all([
      prisma.user.count({ where: { makerId: maker.id } }),
      prisma.user.count({ where: { makerId: maker.id, role: 'member' } }),
      prisma.user.count({ where: { makerId: maker.id, role: 'admin_space' } }),
      prisma.space.count({
        where: { owner: { user: { makerId: maker.id } } }
      }),
      prisma.diskon.count({ where: { makerId: maker.id } }),
      prisma.reservasi.count({
        where: { member: { user: { makerId: maker.id } } }
      }),
      prisma.reservasi.groupBy({
        by: ['status'],
        where: { member: { user: { makerId: maker.id } } },
        _count: { id: true }
      })
    ]);

    const statusCounts = {};
    reservasiByStatus.forEach(item => {
      statusCounts[item.status] = item._count.id;
    });

    return sendResponse(res, 200, 'Statistik maker berhasil diambil', {
      maker: {
        id: maker.id,
        name: maker.name,
        username: maker.username,
        app_key: maker.app_key
      },
      stats: {
        total_users: totalUsers,
        total_members: totalMembers,
        total_admins: totalAdmins,
        total_spaces: totalSpaces,
        total_diskons: totalDiskons,
        total_reservasi: totalReservasi,
        reservasi_by_status: statusCounts
      }
    });
  } catch (error) {
    console.error('Maker getStats error:', error);
    return sendResponse(res, 500, 'Gagal mengambil statistik', null, error.message);
  }
};

/**
 * GET /api/maker/list
 * Daftar semua maker (public)
 */
const getList = async (req, res) => {
  try {
    const makers = await prisma.appMaker.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedMakers = makers.map(m => ({
      id: m.id,
      name: m.name,
      username: m.username,
      total_users: m._count.users,
      createdAt: m.createdAt
    }));

    return sendResponse(res, 200, 'Daftar maker berhasil diambil', {
      total: formattedMakers.length,
      makers: formattedMakers
    });
  } catch (error) {
    console.error('Maker getList error:', error);
    return sendResponse(res, 500, 'Gagal mengambil daftar maker', null, error.message);
  }
};

module.exports = { register, login, getMe, getStats, getList };
