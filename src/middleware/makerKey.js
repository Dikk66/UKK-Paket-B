const prisma = require('../lib/prisma');

/**
 * Middleware: verifikasi x-maker-key atau x-app-key header
 * Wajib untuk semua endpoint kecuali root, health, dan maker endpoints
 */
const verifyMakerKey = async (req, res, next) => {
  try {
    const makerKey = req.headers['x-maker-key'] || req.headers['x-app-key'];

    if (!makerKey) {
      return res.status(401).json({
        status: false,
        statusCode: 401,
        message: 'App key diperlukan',
        error: 'Header x-maker-key atau x-app-key tidak ditemukan',
        timestamp: new Date().toISOString()
      });
    }

    const maker = await prisma.appMaker.findUnique({
      where: { app_key: makerKey }
    });

    if (!maker) {
      return res.status(401).json({
        status: false,
        statusCode: 401,
        message: 'App key tidak valid',
        error: 'App key tidak ditemukan dalam sistem',
        timestamp: new Date().toISOString()
      });
    }

    req.maker = maker;
    req.makerId = maker.id;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: verifikasi maker key dari req.user (untuk endpoint yang sudah pakai JWT)
 * Mengambil makerId dari JWT user yang sudah ter-decode
 */
const verifyMakerKeyFromToken = async (req, res, next) => {
  try {
    // Jika sudah ada makerId dari JWT, ambil maker data
    if (req.user && req.user.makerId) {
      const maker = await prisma.appMaker.findUnique({
        where: { id: req.user.makerId }
      });

      if (maker) {
        req.maker = maker;
        req.makerId = maker.id;
        return next();
      }
    }

    // Fallback ke header
    const makerKey = req.headers['x-maker-key'] || req.headers['x-app-key'];
    if (makerKey) {
      const maker = await prisma.appMaker.findUnique({
        where: { app_key: makerKey }
      });

      if (maker) {
        // Pastikan maker dari header sama dengan maker dari token
        if (req.user && req.user.makerId !== maker.id) {
          return res.status(403).json({
            status: false,
            statusCode: 403,
            message: 'App key tidak sesuai dengan akun',
            error: 'App key yang diberikan tidak cocok dengan akun yang login',
            timestamp: new Date().toISOString()
          });
        }
        req.maker = maker;
        req.makerId = maker.id;
        return next();
      }
    }

    return res.status(401).json({
      status: false,
      statusCode: 401,
      message: 'App key diperlukan',
      error: 'Header x-maker-key atau x-app-key tidak ditemukan',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: optional maker key (tidak wajib, tapi jika ada harus valid)
 */
const optionalMakerKey = async (req, res, next) => {
  try {
    const makerKey = req.headers['x-maker-key'] || req.headers['x-app-key'];

    if (makerKey) {
      const maker = await prisma.appMaker.findUnique({
        where: { app_key: makerKey }
      });

      if (!maker) {
        return res.status(401).json({
          status: false,
          statusCode: 401,
          message: 'App key tidak valid',
          error: 'App key tidak ditemukan dalam sistem',
          timestamp: new Date().toISOString()
        });
      }

      req.maker = maker;
      req.makerId = maker.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyMakerKey,
  verifyMakerKeyFromToken,
  optionalMakerKey
};
