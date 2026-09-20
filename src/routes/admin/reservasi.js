const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminReservasiController = require('../../controllers/adminReservasiController');

// GET /api/admin/reservasi - daftar reservasi (dengan filter)
router.get('/', verifyToken, requireAdmin, adminReservasiController.getAll);

// PATCH /api/admin/reservasi/:id/status - update status reservasi
router.patch('/:id/status', verifyToken, requireAdmin, adminReservasiController.updateStatus);

// POST /api/admin/reservasi/:id/check-in - check-in
router.post('/:id/check-in', verifyToken, requireAdmin, adminReservasiController.checkIn);

// POST /api/admin/reservasi/:id/check-out - check-out
router.post('/:id/check-out', verifyToken, requireAdmin, adminReservasiController.checkOut);

module.exports = router;
