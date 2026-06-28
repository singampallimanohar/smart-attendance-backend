require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();

// Database Connection
require("./config/db");

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ======================
// Rate Limiters
// ======================

// Global Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use(globalLimiter);

// Login Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again after 15 minutes."
  }
});

// ======================
// Routes
// ======================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Authentication Route
app.use("/api", loginLimiter, authRoutes);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Student Routes
app.use("/api/student", studentRoutes);
app.use("/api/students", studentRoutes);

// Attendance
app.use("/api/attendance", attendanceRoutes);

// Settings
app.use("/api/settings", settingsRoutes);

// Reports
app.use("/api/reports", reportRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// ======================
// Health Check
// ======================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Smart Attendance Backend Running Successfully",
    version: "1.0.0"
  });
});

// ======================
// 404 Handler
// ======================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });
});

// ======================
// Global Error Handler
// ======================

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ======================
// Start Server
// ======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`======================================`);
  console.log(`🚀 Server Running on Port ${PORT}`);
  console.log(`🌍 http://localhost:${PORT}`);
  console.log(`======================================`);
});