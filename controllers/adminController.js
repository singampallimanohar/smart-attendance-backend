const getPool = require("../config/db");
const bcrypt = require("bcryptjs");

// ===========================================
// Dashboard Statistics
// ===========================================

exports.getDashboardStats = async (req, res) => {
  try {

    const pool = getPool();

    // Total Students
    const [totalResult] = await pool.query(
      "SELECT COUNT(*) AS totalStudents FROM students"
    );

    const totalStudents = totalResult[0].totalStudents;

    // Today's Date (IST)
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    // Present Students
    const [presentResult] = await pool.query(
      `
      SELECT COUNT(DISTINCT student_id) AS presentToday
      FROM attendance
      WHERE date = ?
      AND status = 'Present'
      `,
      [today]
    );

    const presentToday = presentResult[0].presentToday;

    const absentToday = totalStudents - presentToday;

    const attendancePercentage =
      totalStudents === 0
        ? 0
        : Number(
            ((presentToday / totalStudents) * 100).toFixed(2)
          );

    return res.json({
      success: true,
      data: {
        totalStudents,
        presentToday,
        absentToday,
        attendancePercentage
      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

// ===========================================
// Add Student
// ===========================================

exports.addStudent = async (req, res) => {

  try {

    const {
      student_id,
      name,
      email,
      password,
      phone,
      department,
      year
    } = req.body;

    if (
      !student_id ||
      !name ||
      !email ||
      !password ||
      !department
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    if (!req.files) {
      return res.status(400).json({
        success: false,
        message: "Face images are required."
      });
    }

    const {
      face_left,
      face_center,
      face_right
    } = req.files;

    if (
      !face_left ||
      !face_center ||
      !face_right
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload Left, Center and Right face images."
      });
    }

    const pool = getPool();

    // Check Existing Student
    const [existingStudent] = await pool.query(
      `
      SELECT id
      FROM students
      WHERE email = ?
      OR student_id = ?
      LIMIT 1
      `,
      [email, student_id]
    );

    if (existingStudent.length > 0) {

      return res.status(400).json({
        success: false,
        message:
          "Student Email or Student ID already exists."
      });

    }

    // Encrypt Password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Face Embedding
    // Replace with FaceAPI embedding later
    const faceEmbedding =
      JSON.stringify([0.1, 0.2, 0.3]);

    const centerPhoto =
      face_center[0].path.replace(/\\/g, "/");

    // Save Student
    const [student] = await pool.query(
      `
      INSERT INTO students
      (
        student_id,
        name,
        email,
        password,
        phone,
        department,
        year,
        face_embedding,
        status,
        created_by_admin,
        face_registered,
        student_photo
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        student_id,
        name,
        email,
        hashedPassword,
        phone,
        department,
        year,
        faceEmbedding,
        "active",
        1,
        1,
        centerPhoto
      ]
    );

    const studentDbId = student.insertId;

    await pool.query(
      `
      INSERT INTO student_faces
      (
        student_id,
        face_left_image,
        face_center_image,
        face_right_image
      )
      VALUES
      (?, ?, ?, ?)
      `,
      [
        studentDbId,
        face_left[0].path.replace(/\\/g, "/"),
        face_center[0].path.replace(/\\/g, "/"),
        face_right[0].path.replace(/\\/g, "/")
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Student registered successfully."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};
// ===========================================
// Get All Attendance
// ===========================================

exports.getAllAttendance = async (req, res) => {
  try {
    const pool = getPool();

    const { name, date, department } = req.query;

    let query = `
      SELECT
        a.id,
        s.student_id,
        s.name,
        s.department,
        a.date,
        a.status,
        a.check_in,
        a.check_out,
        a.face_verified,
        a.location_verified
      FROM attendance a
      INNER JOIN students s
      ON a.student_id = s.id
      WHERE 1 = 1
    `;

    const params = [];

    if (name) {
      query += " AND s.name LIKE ?";
      params.push(`%${name}%`);
    }

    if (department) {
      query += " AND s.department = ?";
      params.push(department);
    }

    if (date) {
      query += " AND a.date = ?";
      params.push(date);
    }

    query += " ORDER BY a.date DESC, a.check_in DESC";

    const [attendance] = await pool.query(query, params);

    const formattedAttendance = attendance.map((item) => {
      // Format date as YYYY-MM-DD
      const dateObj = new Date(item.date);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');

      return {
        id: item.id,
        studentId: item.student_id,
        studentName: item.name,
        department: item.department,
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
      message: "Failed to fetch attendance."
    });

  }
};

// ===========================================
// Get All Students
// ===========================================

exports.getAllStudents = async (req, res) => {

  try {

    const pool = getPool();

    const [students] = await pool.query(`
      SELECT
        id,
        student_id,
        name,
        email,
        phone,
        department,
        year,
        status,
        face_registered,
        student_photo
      FROM students
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students."
    });

  }

};
// ===========================================
// Edit Student
// ===========================================

exports.editStudent = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      name,
      email,
      phone,
      department,
      year,
      status
    } = req.body;

    const pool = getPool();

    // Check if student exists
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ?",
      [id]
    );

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    await pool.query(
      `
      UPDATE students
      SET
        name = ?,
        email = ?,
        phone = ?,
        department = ?,
        year = ?,
        status = ?
      WHERE id = ?
      `,
      [
        name,
        email,
        phone,
        department,
        year,
        status || "active",
        id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Student updated successfully."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

// ===========================================
// Delete Student
// ===========================================

exports.deleteStudent = async (req, res) => {

  try {

    const { id } = req.params;

    const pool = getPool();

    // Check student exists
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ?",
      [id]
    );

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    // Delete attendance
    await pool.query(
      "DELETE FROM attendance WHERE student_id = ?",
      [id]
    );

    // Delete face records
    await pool.query(
      "DELETE FROM student_faces WHERE student_id = ?",
      [id]
    );

    // Delete student
    await pool.query(
      "DELETE FROM students WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// ===========================================
// Change Student Status (Optional)
// ===========================================

exports.changeStudentStatus = async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;

    const pool = getPool();

    await pool.query(
      "UPDATE students SET status = ? WHERE id = ?",
      [status, id]
    );

    return res.json({
      success: true,
      message: "Student status updated."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};

// ===========================================
// Reset Student Password (Optional)
// ===========================================

exports.resetStudentPassword = async (req, res) => {

  try {

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required."
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const pool = getPool();

    await pool.query(
      "UPDATE students SET password = ? WHERE id = ?",
      [hashedPassword, id]
    );

    return res.json({
      success: true,
      message: "Password reset successfully."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};