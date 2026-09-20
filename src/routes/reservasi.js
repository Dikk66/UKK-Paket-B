const express = require('express');
const router = express.Router();
const { verifyToken, requireMember } = require('../middleware/auth');
const reservasiController = require('../controllers/reservasiController');

// Semua endpoint reservasi untuk member, wajib Bearer JWT
// POST /api/reservasi - buat reservasi baru
router.post('/', verifyToken, requireMember, reservasiController.create);

// GET /api/reservasi/my - daftar reservasi member
router.get('/my', verifyToken, requireMember, reservasiController.getMyReservations);

// GET /api/reservasi/my/history - riwayat reservasi (filter bulan/tahun)
router.get('/my/history', verifyToken, requireMember, reservasiController.getMyHistory);

// GET /api/reservasi/:id/e-ticket - ambil e-ticket
router.get('/:id/e-ticket', verifyToken, requireMember, reservasiController.getETicket);

// GET /api/reservasi/:id - detail reservasi
router.get('/:id', verifyToken, requireMember, reservasiController.getById);

// PATCH /api/reservasi/:id/cancel - batalkan reservasi
router.patch('/:id/cancel', verifyToken, requireMember, reservasiController.cancelReservasi);

module.exports = router;
