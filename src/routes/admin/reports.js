const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const adminReportsController = require('../../controllers/adminReportsController');

// GET /api/admin/reports/monthly - laporan bulanan
router.get('/monthly', verifyToken, requireAdmin, adminReportsController.getMonthlyReport);

// GET /api/admin/reports/income - laporan pendapatan
router.get('/income', verifyToken, requireAdmin, adminReportsController.getIncomeReport);

module.exports = router;
