const express = require('express');
const router = express.Router();
const { verifyMakerToken, verifyMakerTokenOrKey } = require('../middleware/auth');
const makerController = require('../controllers/makerController');

// POST /api/maker/register - registrasi app maker baru
router.post('/register', makerController.register);

// POST /api/maker/login - login app maker
router.post('/login', makerController.login);

// GET /api/maker/me - info maker yang sedang login (Bearer maker token)
router.get('/me', verifyMakerToken, makerController.getMe);

// GET /api/maker/stats - statistik maker (Bearer token atau x-maker-key)
router.get('/stats', verifyMakerTokenOrKey, makerController.getStats);

// GET /api/maker/list - daftar semua maker (public)
router.get('/list', makerController.getList);

module.exports = router;
