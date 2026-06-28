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
let db;

async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log("✅ Connected to MySQL database");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}

// ================= ROUTES =================
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));

// ================= START =================
const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log("🚀 Starting Smart Attendance Backend...");

  await connectDB();

  app.listen(PORT, () => {
    console.log("===================================");
    console.log(`🚀 Server running on ${PORT}`);
    console.log("===================================");
  });
}

startServer();