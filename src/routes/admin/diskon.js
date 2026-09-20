const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminDiskonController = require('../../controllers/adminDiskonController');

// GET /api/admin/diskon - daftar diskon
router.get('/', verifyToken, requireAdmin, adminDiskonController.getAll);

// POST /api/admin/diskon - tambah diskon baru
router.post('/', verifyToken, requireAdmin, adminDiskonController.create);

// GET /api/admin/diskon/:id - detail diskon
router.get('/:id', verifyToken, requireAdmin, adminDiskonController.getById);

// PUT /api/admin/diskon/:id - update diskon
router.put('/:id', verifyToken, requireAdmin, adminDiskonController.update);

// DELETE /api/admin/diskon/:id - hapus diskon
router.delete('/:id', verifyToken, requireAdmin, adminDiskonController.remove);

module.exports = router;
