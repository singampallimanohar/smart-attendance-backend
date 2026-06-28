const express = require("express");
const router = express.Router();

const {
  loginUser,
  loginStudent
} = require("../controllers/authController");

// Admin Login
router.post("/login", loginUser);

// Student Login
router.post("/student/login", loginStudent);

module.exports = router;