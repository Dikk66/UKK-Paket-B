const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token autentikasi diperlukan',
        error: 'Authorization header tidak ditemukan atau format salah (gunakan Bearer <token>)',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        member: true,
        spaceOwner: true,
        maker: true
      }
    });

    if (!user) {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'User tidak ditemukan',
        error: 'Token tidak valid, user tidak ada',
        timestamp: new Date().toISOString()
      });
    }

    req.user = user;
    req.makerId = user.makerId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token tidak valid', error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token telah kadaluarsa', error: 'Silakan login kembali',
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
};

const requireMember = (req, res, next) => {
  if (req.user.role !== 'member') {
    return res.status(403).json({
      status: false, statusCode: 403,
      message: 'Akses ditolak', error: 'Hanya member yang dapat mengakses endpoint ini',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin_space') {
    return res.status(403).json({
      status: false, statusCode: 403,
      message: 'Akses ditolak', error: 'Hanya admin_space yang dapat mengakses endpoint ini',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

const verifyMakerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token autentikasi maker diperlukan',
        error: 'Authorization header tidak ditemukan atau format salah',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'maker') {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token bukan milik maker', error: 'Gunakan token maker yang valid',
        timestamp: new Date().toISOString()
      });
    }

    const maker = await prisma.appMaker.findUnique({ where: { id: decoded.id } });
    if (!maker) {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Maker tidak ditemukan', error: 'Token tidak valid',
        timestamp: new Date().toISOString()
      });
    }

    req.maker = maker;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: false, statusCode: 401,
        message: 'Token tidak valid atau kadaluarsa', error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
};

const verifyMakerTokenOrKey = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const makerKey = req.headers['x-maker-key'] || req.headers['x-app-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === 'maker') {
        const maker = await prisma.appMaker.findUnique({ where: { id: decoded.id } });
        if (maker) { req.maker = maker; return next(); }
      }
    }

    if (makerKey) {
      const maker = await prisma.appMaker.findUnique({ where: { app_key: makerKey } });
      if (maker) { req.maker = maker; return next(); }
    }

    return res.status(401).json({
      status: false, statusCode: 401,
      message: 'Autentikasi diperlukan',
      error: 'Berikan Bearer token maker atau x-maker-key header',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyToken, requireMember, requireAdmin, verifyMakerToken, verifyMakerTokenOrKey };
