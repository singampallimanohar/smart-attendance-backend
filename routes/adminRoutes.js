const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const { email, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;