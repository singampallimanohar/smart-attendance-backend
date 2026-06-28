const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// 📊 Get live dashboard stats
router.get(
    "/stats",
    verifyToken,
    verifyAdmin,
    dashboardController.getStats
);

// 📜 Get recent attendance logs
router.get(
    "/recent",
    verifyToken,
    verifyAdmin,
    dashboardController.getRecentLogs
);

module.exports = router;