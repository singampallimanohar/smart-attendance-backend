const { matchFace } = require("../services/faceService");

// ================= FACE ATTENDANCE =================
router.post("/face-mark", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { descriptor } = req.body;

    // Get all students with face data
    const [students] = await db.query(
      "SELECT student_id, face_descriptor FROM students WHERE face_descriptor IS NOT NULL"
    );

    const match = await matchFace(descriptor, students);

    if (!match) {
      return res.json({
        success: false,
        message: "No face match found",
      });
    }

    await db.query(
      "INSERT INTO attendance (student_id, date, status, time_in) VALUES (?, CURDATE(), 'present', CURTIME())",
      [match]
    );

    res.json({
      success: true,
      message: "Attendance marked",
      student_id: match,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});