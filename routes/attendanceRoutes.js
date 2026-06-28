const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, verifyStudent } = require('../utils/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/temp/' }); // Temp storage for face verification

router.use(verifyToken, verifyStudent);

router.post('/check-in', upload.single('face_image'), attendanceController.checkIn);
router.post('/check-out', upload.single('face_image'), attendanceController.checkOut);

module.exports = router;
