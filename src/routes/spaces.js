const express = require('express');
const router = express.Router();
const { verifyMakerKey, optionalMakerKey } = require('../middleware/makerKey');
const spacesController = require('../controllers/spacesController');

// GET /api/spaces/types - daftar tipe space (x-maker-key optional)
router.get('/types', optionalMakerKey, spacesController.getTypes);

// GET /api/spaces/availability - cek ketersediaan (x-maker-key required)
router.get('/availability', verifyMakerKey, spacesController.checkAvailability);

// GET /api/spaces - daftar semua space (x-maker-key required)
router.get('/', verifyMakerKey, spacesController.getAll);

// GET /api/spaces/:id - detail space (x-maker-key required)
router.get('/:id', verifyMakerKey, spacesController.getById);

module.exports = router;
