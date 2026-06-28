const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const {
  verifyToken,
  verifyAdmin
} = require("../utils/authMiddleware");

// If you use Multer for student photo uploads
let upload;

try {
  upload = require("../middleware/upload");
} catch (err) {
  // Continue even if upload middleware doesn't exist
  upload = null;
}

// ==========================================
// Protect all admin routes
// ==========================================

router.use(verifyToken);
router.use(verifyAdmin);

// ==========================================
// Dashboard
// ==========================================

router.get(
  "/dashboard",
  adminController.getDashboardStats
);

// ==========================================
// Student Routes
// ==========================================

// Add Student
if (
  upload &&
  typeof upload.fields === "function"
) {
  router.post(
    "/students",
    upload.fields([
      {
        name: "photo",
        maxCount: 1
      },
      {
        name: "faceImage",
        maxCount: 1
      }
    ]),
    adminController.addStudent
  );
} else {
  router.post(
    "/students",
    adminController.addStudent
  );
}

// Get All Students
router.get(
  "/students",
  adminController.getAllStudents
);

// Edit Student
router.put(
  "/students/:id",
  adminController.editStudent
);

// Delete Student
router.delete(
  "/students/:id",
  adminController.deleteStudent
);

// ==========================================
// Attendance
// ==========================================

// Get Attendance
router.get(
  "/attendance",
  adminController.getAllAttendance
);

// ==========================================

module.exports = router;