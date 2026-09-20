const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadController = require('../controllers/uploadController');

// Pastikan folder uploads ada
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Storage untuk gambar umum
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/general');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage untuk foto space
const spacesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/spaces');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'space-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage untuk foto member
const membersStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/members');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'member-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter: hanya terima gambar
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (jpeg, jpg, png, gif, webp)'), false);
  }
};

const uploadGeneral = multer({
  storage: generalStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadSpaces = multer({
  storage: spacesStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadMembers = multer({
  storage: membersStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Error handler untuk multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: 'Ukuran file terlalu besar',
        error: 'Maksimal ukuran file adalah 5MB',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(400).json({
      status: false,
      statusCode: 400,
      message: 'Error upload file',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  if (err) {
    return res.status(400).json({
      status: false,
      statusCode: 400,
      message: 'Error upload file',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// POST /api/upload/image - upload gambar umum
router.post('/image',
  (req, res, next) => {
    uploadGeneral.single('image')(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadController.uploadImage
);

// POST /api/upload/spaces - upload foto space
router.post('/spaces',
  (req, res, next) => {
    uploadSpaces.single('foto')(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadController.uploadSpaceImage
);

// POST /api/upload/members - upload foto member
router.post('/members',
  (req, res, next) => {
    uploadMembers.single('foto')(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadController.uploadMemberImage
);

module.exports = router;
