const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// ================= ADMIN DASHBOARD =================
router.get("/dashboard-stats", verifyToken, verifyAdmin, adminController.getDashboardStats);

// ================= STUDENT MANAGEMENT =================
router.get("/students", verifyToken, verifyAdmin, adminController.getAllStudents);
router.post("/students", verifyToken, verifyAdmin, adminController.addStudent);
router.put("/students/:id", verifyToken, verifyAdmin, adminController.editStudent);
router.delete("/students/:id", verifyToken, verifyAdmin, adminController.deleteStudent);
router.put("/students/:id/status", verifyToken, verifyAdmin, adminController.changeStudentStatus);
router.post("/students/:id/reset-password", verifyToken, verifyAdmin, adminController.resetStudentPassword);

// ================= ATTENDANCE MANAGEMENT =================
router.get("/attendance", verifyToken, verifyAdmin, adminController.getAllAttendance);

module.exports = router;