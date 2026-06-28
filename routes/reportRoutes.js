const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { verifyToken, verifyAdmin } = require("../utils/authMiddleware");

router.use(verifyToken, verifyAdmin);

router.get("/attendance/pdf", reportController.exportAttendancePDF);
router.get("/attendance/excel", reportController.exportAttendanceExcel);

module.exports = router;
