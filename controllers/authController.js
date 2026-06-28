const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const getPool = require("../config/db");

// ==============================
// Admin Login
// ==============================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate Input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Username and password are required."
      });
    }

    const pool = getPool();

    // Find Admin by Email OR Username
    const [users] = await pool.query(
      `
      SELECT *
      FROM admin
      WHERE username = ?
      LIMIT 1
      `,
      [email] // Since the admin table only has username according to db.js, we check username.
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    const user = users[0];

    // Compare Password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: "admin"
      },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn: "24h"
      }
    );

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: "admin"
      }
    });

  } catch (error) {

    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

// ==============================
// Student Login
// ==============================

const loginStudent = async (req, res) => {

  try {

    const { student_id, password } = req.body;

    if (!student_id || !password) {

      return res.status(400).json({
        success: false,
        message: "Student ID and password are required."
      });

    }

    const pool = getPool();

    const [students] = await pool.query(
      "SELECT * FROM students WHERE student_id = ?",
      [student_id]
    );

    if (students.length === 0) {

      return res.status(401).json({
        success: false,
        message: "Invalid Student ID or Password."
      });

    }

    const student = students[0];

    const match = await bcrypt.compare(
      password,
      student.password
    );

    if (!match) {

      return res.status(401).json({
        success: false,
        message: "Invalid Student ID or Password."
      });

    }

    const token = jwt.sign(
      {
        id: student.id,
        student_id: student.student_id,
        role: "student"
      },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn: "24h"
      }
    );

    return res.json({
      success: true,
      message: "Student Login Successful",
      token,
      user: {
        id: student.id,
        student_id: student.student_id,
        name: student.name,
        role: "student"
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

module.exports = {
    loginUser,
    loginStudent
};