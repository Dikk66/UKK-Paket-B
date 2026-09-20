const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminSpacesController = require('../../controllers/adminSpacesController');

// GET /api/admin/spaces - daftar space milik admin
router.get('/', verifyToken, requireAdmin, adminSpacesController.getAll);

// POST /api/admin/spaces - tambah space baru
router.post('/', verifyToken, requireAdmin, adminSpacesController.create);

// GET /api/admin/spaces/:id - detail space
router.get('/:id', verifyToken, requireAdmin, adminSpacesController.getById);

// PUT /api/admin/spaces/:id - update space
router.put('/:id', verifyToken, requireAdmin, adminSpacesController.update);

// DELETE /api/admin/spaces/:id - hapus space
router.delete('/:id', verifyToken, requireAdmin, adminSpacesController.remove);

module.exports = router;
