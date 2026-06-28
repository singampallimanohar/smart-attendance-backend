const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Attendance API Running",
    time: new Date()
  });
});

module.exports = router;