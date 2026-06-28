const express = require("express");
const router = express.Router();

const {
  adminLogin,
  adminRegister,
  studentLogin,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require("../controllers/authController");

const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const schemas = require("../middleware/schemas");

// Admin Routes
router.post("/admin/login", authLimiter, validate(schemas.login), adminLogin);
router.post("/admin/register", authLimiter, validate(schemas.login), adminRegister);

// Student Routes
// Note: student login in this app receives 'identifier' and 'password'
// We might need a separate schema, or adjust the frontend. Assuming the frontend sends 'identifier'
// I'll apply rate limiting but skip Joi validation for now if the schema is mismatched, or create a quick custom schema.
const Joi = require("joi");
const studentLoginSchema = Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().min(6).required()
});
router.post("/student/login", authLimiter, validate(studentLoginSchema), studentLogin);

// Shared Routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

module.exports = router;