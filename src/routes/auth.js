const express = require('express');
const router = express.Router();
const { verifyMakerKey } = require('../middleware/makerKey');
const { verifyToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// POST /api/auth/register/member - registrasi member (header: x-maker-key)
router.post('/register/member', verifyMakerKey, authController.registerMember);

// POST /api/auth/register/admin-space - registrasi admin_space (header: x-maker-key)
router.post('/register/admin-space', verifyMakerKey, authController.registerAdminSpace);

// POST /api/auth/login - login semua user (header: x-maker-key)
router.post('/login', verifyMakerKey, authController.login);

// GET /api/auth/profile - ambil profil user (auth: Bearer JWT + x-maker-key)
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
