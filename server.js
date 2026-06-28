require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mysql = require("mysql2/promise");

const app = express();

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// ================= HEALTH =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Attendance Backend Running 🚀"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date()
  });
});

// ================= DB =================
require("./config/db"); // This triggers initDB() in db.js

// ================= ROUTES =================
app.use("/api", require("./routes/authRoutes")); // Mounts /admin/login, /student/login, /forgot-password, etc.
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/face", require("./routes/faceRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/legal", require("./routes/legalRoutes"));

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("===================================");
  console.log(`🚀 Server running on ${PORT}`);
  console.log("===================================");
});