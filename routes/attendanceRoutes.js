const express = require("express");
const router = express.Router();

// ===============================
// FACE MARK ATTENDANCE (DUMMY / SAFE VERSION)
// ===============================
router.post("/face-mark", async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID required"
      });
    }

    // TODO: later connect MySQL attendance table
    return res.json({
      success: true,
      message: "Attendance marked successfully (mock)",
      data: {
        studentId,
        status: "present",
        time: new Date()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===============================
// GET ATTENDANCE
// ===============================
router.get("/", async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Attendance route working"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;