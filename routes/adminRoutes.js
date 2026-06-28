const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');
const multer = require('multer');

// Configure multer for saving face images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/faces/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'face-' + uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.use(verifyToken, verifyAdmin); // Apply admin auth to all routes below

router.get('/dashboard', adminController.getDashboardStats);
router.post('/students', upload.fields([
    { name: 'face_left', maxCount: 1 },
    { name: 'face_center', maxCount: 1 },
    { name: 'face_right', maxCount: 1 }
]), adminController.addStudent);
router.get('/students', adminController.getAllStudents);
router.put('/students/:id', adminController.editStudent);
router.delete('/students/:id', adminController.deleteStudent);
router.get('/attendance', adminController.getAllAttendance);

module.exports = router;
