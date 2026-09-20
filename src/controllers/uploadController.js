const path = require('path');
const fs = require('fs');

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
 * POST /api/upload/image
 * Upload gambar umum ke folder uploads/general
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, 'File tidak ditemukan', null,
        'Tidak ada file yang diupload. Pastikan menggunakan field name "image"');
    }

    const fileUrl = `${process.env.BASE_URL}/uploads/general/${req.file.filename}`;

    return sendResponse(res, 200, 'Gambar berhasil diupload', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      path: `/uploads/general/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return sendResponse(res, 500, 'Gagal mengupload gambar', null, error.message);
  }
};

/**
 * POST /api/upload/spaces
 * Upload foto space ke folder uploads/spaces
 */
const uploadSpaceImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, 'File tidak ditemukan', null,
        'Tidak ada file yang diupload. Pastikan menggunakan field name "foto"');
    }

    const fileUrl = `${process.env.BASE_URL}/uploads/spaces/${req.file.filename}`;

    return sendResponse(res, 200, 'Foto space berhasil diupload', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      path: `/uploads/spaces/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload space image error:', error);
    return sendResponse(res, 500, 'Gagal mengupload foto space', null, error.message);
  }
};

/**
 * POST /api/upload/members
 * Upload foto member ke folder uploads/members
 */
const uploadMemberImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, 'File tidak ditemukan', null,
        'Tidak ada file yang diupload. Pastikan menggunakan field name "foto"');
    }

    const fileUrl = `${process.env.BASE_URL}/uploads/members/${req.file.filename}`;

    return sendResponse(res, 200, 'Foto member berhasil diupload', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      path: `/uploads/members/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload member image error:', error);
    return sendResponse(res, 500, 'Gagal mengupload foto member', null, error.message);
  }
};

module.exports = { uploadImage, uploadSpaceImage, uploadMemberImage };
