const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { verifyToken, verifyStudent } = require("../middleware/authMiddleware");

// ================= STUDENT PROFILE =================
router.get("/profile", verifyToken, verifyStudent, studentController.getProfile);

// ================= STUDENT ATTENDANCE =================
router.get("/attendance", verifyToken, verifyStudent, studentController.getAttendanceHistory);

module.exports = router;