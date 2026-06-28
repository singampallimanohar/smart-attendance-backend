const express = require("express");
const router = express.Router();

// Get all students
router.post("/save-face", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { student_id, face_descriptor } = req.body;

    if (!student_id || !face_descriptor) {
      return res.json({
        success: false,
        message: "Missing data",
      });
    }

    await db.query(
      "UPDATE students SET face_descriptor = ? WHERE student_id = ?",
      [JSON.stringify(face_descriptor), student_id]
    );

    res.json({
      success: true,
      message: "Face data saved successfully",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;