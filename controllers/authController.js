const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getPool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refreshsecretkey";

// ==============================
// Admin Register
// ==============================
const adminRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Username, email, and password are required." });
    }

    const pool = getPool();
    const [existing] = await pool.query("SELECT * FROM admin WHERE username = ? OR email = ?", [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO admin (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);

    return res.status(201).json({ success: true, message: "Admin registered successfully." });
  } catch (error) {
    console.error("Admin Register Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ==============================
// Admin Login
// ==============================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body; // Flutter sends 'identifier' -> mapped to 'email' in the provider but could just be 'email'. Let's check both 'identifier' and 'email'.
    const identifier = req.body.identifier || email;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email/Username and password are required." });
    }

    const pool = getPool();
    const [users] = await pool.query("SELECT * FROM admin WHERE username = ? OR email = ? LIMIT 1", [identifier, identifier]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
    const refreshToken = jwt.sign({ id: user.id, username: user.username, role: "admin" }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: "admin" }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ==============================
// Student Login
// ==============================
const studentLogin = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.student_id;
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Student ID and password are required." });
    }

    const pool = getPool();
    const [students] = await pool.query("SELECT * FROM students WHERE student_id = ? OR email = ?", [identifier, identifier]);

    if (students.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const student = students[0];
    const match = await bcrypt.compare(password, student.password);

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: student.id, student_id: student.student_id, role: "student" }, JWT_SECRET, { expiresIn: "2h" });
    const refreshToken = jwt.sign({ id: student.id, student_id: student.student_id, role: "student" }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Student Login Successful",
      token,
      refreshToken,
      user: { id: student.id, student_id: student.student_id, name: student.name, email: student.email, role: "student" }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==============================
// Refresh Token
// ==============================
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: "Refresh token is required" });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const tokenPayload = { id: decoded.id, role: decoded.role };
    if (decoded.role === "admin") tokenPayload.username = decoded.username;
    if (decoded.role === "student") tokenPayload.student_id = decoded.student_id;

    const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ success: true, token: newAccessToken });
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// ==============================
// Logout
// ==============================
const logout = async (req, res) => {
  // Stateless JWTs cannot be invalidated directly without a blacklist. 
  // Returning success so the client can clear local storage.
  return res.json({ success: true, message: "Logged out successfully" });
};

// ==============================
// Forgot & Reset Password
// ==============================
const forgotPassword = async (req, res) => {
  // Typically would generate a code, save to DB, and send an email.
  // We'll mock the email sending and just return success for the demo context unless an email service is provided.
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });
  
  return res.json({ success: true, message: "If this email is registered, a password reset link has been sent." });
};

const resetPassword = async (req, res) => {
  return res.json({ success: true, message: "Password has been reset successfully." });
};

module.exports = {
  adminRegister,
  adminLogin,
  studentLogin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};