const getPool = require("../config/db");

// =====================================
// Student Profile
// =====================================
exports.getProfile = async (req, res) => {

  try {

    const pool = getPool();

    const studentId = req.user.id;

    const [students] = await pool.query(
      `
      SELECT
        id,
        student_id,
        name,
        email,
        phone,
        department,
        year,
        student_photo,
        status,
        face_registered
      FROM students
      WHERE id = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: students[0]
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// =====================================
// Attendance History
// =====================================
exports.getAttendanceHistory = async (req, res) => {

  try {

    const pool = getPool();

    const studentId = req.user.id;

    const [attendance] = await pool.query(
      `
      SELECT
        id,
        date,
        status,
        check_in,
        check_out,
        face_verified,
        location_verified
      FROM attendance
      WHERE student_id = ?
      ORDER BY date DESC
      `,
      [studentId]
    );

    const formattedAttendance = attendance.map((item) => {
      // Format date as YYYY-MM-DD
      const dateObj = new Date(item.date);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');

      return {
        id: item.id,
        date: `${yyyy}-${mm}-${dd}`,
        status: item.status,
        checkIn: item.check_in,
        checkOut: item.check_out,
        faceVerification: item.face_verified ? "Verified" : "Failed",
        gpsVerification: item.location_verified ? "Verified" : "Failed"
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedAttendance.length,
      data: formattedAttendance
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};