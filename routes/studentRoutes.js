const express = require("express");
const router = express.Router();

const studentController = require("../controllers/studentController");
const {
  verifyToken,
  verifyStudent
} = require("../utils/authMiddleware");

// =========================================
// Protect All Student Routes
// =========================================
router.use(verifyToken);
router.use(verifyStudent);

// =========================================
// Student Profile
// =========================================
router.get(
  "/profile",
  studentController.getProfile
);

// =========================================
// Attendance History
// =========================================
router.get(
  "/attendance-history",
  studentController.getAttendanceHistory
);

module.exports = router;