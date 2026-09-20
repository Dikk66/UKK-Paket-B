const express = require('express');
const router = express.Router();
const { verifyMakerKey } = require('../middleware/makerKey');
const diskonController = require('../controllers/diskonController');

// GET /api/diskon/active - daftar diskon aktif (x-maker-key required)
router.get('/active', verifyMakerKey, diskonController.getActive);

// POST /api/diskon/check - cek validitas kode diskon (x-maker-key required)
router.post('/check', verifyMakerKey, diskonController.checkDiskon);

// GET /api/diskon/:id - detail diskon (x-maker-key required)
router.get('/:id', verifyMakerKey, diskonController.getById);

module.exports = router;
