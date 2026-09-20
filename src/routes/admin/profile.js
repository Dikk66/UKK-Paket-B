const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminProfileController = require('../../controllers/adminProfileController');

// GET /api/admin/profile - ambil profil admin
router.get('/', verifyToken, requireAdmin, adminProfileController.getProfile);

// PUT /api/admin/profile - update profil admin
router.put('/', verifyToken, requireAdmin, adminProfileController.updateProfile);

module.exports = router;
