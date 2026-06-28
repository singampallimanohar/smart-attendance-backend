const jwt = require("jsonwebtoken");

// ===============================
// Verify JWT Token
// ===============================
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    // Expected format:
    // Authorization: Bearer <token>

    let token;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    );

    req.user = decoded;

    next();

  } catch (error) {
    console.error("JWT Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
};

// ===============================
// Verify Admin
// ===============================
const verifyAdmin = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only."
    });
  }

  next();
};

// ===============================
// Verify Student
// ===============================
const verifyStudent = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  if (req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Student access only."
    });
  }

  next();
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyStudent
};