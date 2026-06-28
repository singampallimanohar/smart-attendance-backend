const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');

router.use(verifyToken, verifyAdmin);

// JSON data endpoints
router.get('/daily', reportController.getDailyReport);
router.get('/weekly', reportController.getWeeklyReport);
router.get('/monthly', reportController.getMonthlyReport);

// File export endpoints
router.get('/export/pdf', reportController.exportPDF);
router.get('/export/excel', reportController.exportExcel);
router.get('/export/csv', reportController.exportCSV);

module.exports = router;
