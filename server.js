require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

// ================= SECURITY =================
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ================= RATE LIMIT =================
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

// ================= DB =================
let db;

async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log("✅ Connected to MySQL database");
    app.locals.db = db; // make DB available in routes
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
  }
}

// ================= FACE MODEL LOADER (SAFE MODE) =================
let faceApiLoaded = false;

async function loadFaceModels() {
  try {
    const fs = require("fs");
    const faceapi = require("face-api.js");
    const canvas = require("canvas");

    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    const modelPath = path.join(__dirname, "models");

    const requiredFiles = [
      "ssd_mobilenetv1_model-weights_manifest.json",
      "face_landmark_68_model-weights_manifest.json",
      "face_recognition_model-weights_manifest.json",
    ];

    const missing = requiredFiles.filter(
      (f) => !fs.existsSync(path.join(modelPath, f))
    );

    if (missing.length > 0) {
      console.warn("⚠️ Face models missing:");
      console.warn(missing);
      console.warn("⚠️ Running WITHOUT face recognition");
      return;
    }

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    faceApiLoaded = true;
    console.log("✅ Face API loaded successfully");
  } catch (err) {
    console.error("❌ Face API error:", err.message);
  }
}

// ================= ROUTES =================
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Attendance Backend Running",
    time: new Date(),
  });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Smart Attendance API Running 🚀");
});

// ================= USE ROUTES =================
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

// ================= DASHBOARD API =================
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const [[students]] = await db.query(
      "SELECT COUNT(*) AS count FROM students"
    );

    const [[present]] = await db.query(
      "SELECT COUNT(*) AS count FROM attendance WHERE status='present' AND date=CURDATE()"
    );

    const [[absent]] = await db.query(
      "SELECT COUNT(*) AS count FROM attendance WHERE status='absent' AND date=CURDATE()"
    );

    const total = students.count || 0;
    const percentage =
      total === 0 ? 0 : ((present.count / total) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        totalStudents: total,
        presentToday: present.count || 0,
        absentToday: absent.count || 0,
        attendancePercentage: percentage,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log("🚀 Starting Smart Attendance Backend...");

  await connectDB();
  await loadFaceModels();

  app.listen(PORT, () => {
    console.log("======================================");
    console.log(`🚀 Server Running on Port ${PORT}`);
    console.log("======================================");
  });
}

startServer();