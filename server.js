require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const security = require("./middleware/security");

security(app);

app.use(cors());
app.use(express.json());

const { rateLimit } = require('express-rate-limit');

// Use the existing routes from the project structure
const adminRoutes = require('./routes/adminRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const studentRoutes = require('./routes/studentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Basic rate limiting for all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Limit each IP to 100 requests per `window`
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Stricter rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  }
});

// Assuming login is handled in studentRoutes or adminRoutes, we apply it conditionally or globally to the auth path if it exists
app.use('/api/student/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// Mount Routes
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Attendance API Running'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});