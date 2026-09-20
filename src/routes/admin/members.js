const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminMembersController = require('../../controllers/adminMembersController');

// GET /api/admin/members - daftar member (search opsional)
router.get('/', verifyToken, requireAdmin, adminMembersController.getAll);

// POST /api/admin/members - tambah member baru
router.post('/', verifyToken, requireAdmin, adminMembersController.create);

// GET /api/admin/members/:id - detail member
router.get('/:id', verifyToken, requireAdmin, adminMembersController.getById);

// PUT /api/admin/members/:id - update member
router.put('/:id', verifyToken, requireAdmin, adminMembersController.update);

// DELETE /api/admin/members/:id - hapus member
router.delete('/:id', verifyToken, requireAdmin, adminMembersController.remove);

module.exports = router;
