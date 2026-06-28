const getPool = require('../config/db');
const { verifyFace } = require('../utils/faceUtils');
const notificationRepository = require('../repositories/notificationRepository');
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d;
}

exports.checkIn = async (req, res) => {
    const studentId = req.user.id;
    const { latitude, longitude } = req.body;
    const file = req.file;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentTime = formatter.format(now);

    if (global.dbFailed) {
        const isMorning = currentTime >= '10:00:00' && currentTime <= '11:00:00';
        if (!isMorning) return res.status(403).json({ success: false, message: 'Check-in time expired. Check-in is available from 10:00:00 to 11:00:00.' });

        if (!global.mockAttendance) global.mockAttendance = [];
        const today = now.toISOString().split('T')[0];
        
        const existing = global.mockAttendance.find(a => a.student_id === studentId && a.date === today);
        if (existing && existing.check_in) {
            return res.status(400).json({ success: false, message: 'Already checked in today.' });
        }

        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
        const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), 17.0163949, 81.7805841);
        if (distance > 100) return res.status(403).json({ success: false, message: 'Outside campus location. Distance is too far.' });

        global.mockAttendance.push({ student_id: studentId, date: today, check_in: currentTime, status: 'Present' });
        return res.json({ success: true, message: 'Checked in successfully (DB offline)' });
    }

    try {
        const pool = getPool();
        if (!file) return res.status(400).json({ success: false, message: 'Face image is required.' });
        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Location coordinates are required.' });

        // 1. Validate Location & Time Window
        const [locationRows] = await pool.query('SELECT * FROM attendance_settings LIMIT 1');
        const settings = locationRows.length > 0 ? locationRows[0] : { morning_start: '10:00:00', morning_end: '11:00:00', latitude: 17.0163949, longitude: 81.7805841, radius: 100 };

        const isMorning = currentTime >= settings.morning_start && currentTime <= settings.morning_end;
        if (!isMorning) {
            return res.status(403).json({ success: false, message: `Check-in time expired. Check-in is available from ${settings.morning_start} to ${settings.morning_end}.` });
        }

        let gpsStatus = 'Verified';
        let isGpsPassed = true;
        const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), settings.latitude, settings.longitude);
        if (distance > settings.radius) {
            gpsStatus = 'Failed';
            isGpsPassed = false;
        }

        // 2. Prevent duplicate check-in today
        const istDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = istDateFormatter.format(now); 

        const [existingAttendance] = await pool.query('SELECT * FROM attendance WHERE student_id = ? AND date = ?', [studentId, today]);
        if (existingAttendance.length > 0 && existingAttendance[0].check_in) {
            return res.status(400).json({ success: false, message: 'Already checked in today.' });
        }

        // 3. Face Verification
        const [studentRows] = await pool.query('SELECT face_embedding FROM students WHERE id = ?', [studentId]);
        if (studentRows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' });
        
        const [faces] = await pool.query('SELECT face_left_image, face_center_image, face_right_image FROM student_faces WHERE student_id = ?', [studentId]);
        if (faces.length === 0) return res.status(400).json({ success: false, message: 'No registered faces found.' });
        
        const savedFaces = [faces[0].face_left_image, faces[0].face_center_image, faces[0].face_right_image];
        const faceResult = await verifyFace(file.path, savedFaces);
        
        let faceVerificationStatus = 'Verified';
        let isFacePassed = true;
        if (!faceResult.success) {
            faceVerificationStatus = 'Failed';
            isFacePassed = false;
        }

        const faceScore = faceResult.score || 0;
        const livenessScore = parseFloat(req.body.liveness_score) || 100.0;
        
        const finalStatus = (isGpsPassed && isFacePassed) ? 'Present' : 'Absent';

        // 4. Save Attendance
        await pool.query(
            `INSERT INTO attendance (student_id, date, check_in, status, location_latitude, location_longitude, distance_from_campus, location_verified, face_verified, face_score, liveness_score, location_status, attendance_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), status = VALUES(status), distance_from_campus = VALUES(distance_from_campus), location_verified = VALUES(location_verified), face_verified = VALUES(face_verified), face_score = VALUES(face_score), location_status = VALUES(location_status), attendance_status = VALUES(attendance_status)`,
            [studentId, today, currentTime, finalStatus, latitude, longitude, distance.toFixed(2), isGpsPassed, isFacePassed, faceScore, livenessScore, gpsStatus, finalStatus]
        );

        if (!isGpsPassed) {
            return res.status(403).json({ success: false, message: 'Check-in failed. Outside campus boundaries.' });
        }
        if (!isFacePassed) {
            return res.status(403).json({ success: false, message: `Face verification failed. Match score (${faceResult.score}%) is below the required 75% threshold.` });
        }

        // Send Push Notification
        await notificationRepository.createNotification(
            studentId, 
            'Check-In Successful', 
            `You successfully checked in today at ${currentTime}.`
        );

        res.json({ success: true, message: 'Checked in successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.checkOut = async (req, res) => {
    const studentId = req.user.id;
    const { latitude, longitude } = req.body;
    const file = req.file;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentTime = formatter.format(now);

    if (global.dbFailed) {
        const isEvening = currentTime >= '16:00:00' && currentTime <= '17:00:00';
        if (!isEvening) return res.status(403).json({ success: false, message: 'Check-out time expired. Check-out is available from 16:00:00 to 17:00:00.' });

        if (!global.mockAttendance) global.mockAttendance = [];
        const today = now.toISOString().split('T')[0];
        const existing = global.mockAttendance.find(a => a.student_id === studentId && a.date === today);
        if (!existing || !existing.check_in) return res.status(400).json({ success: false, message: 'You must check-in before checking out.' });
        if (existing.check_out) return res.status(400).json({ success: false, message: 'Already checked out today.' });

        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
        const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), 17.0163949, 81.7805841);
        if (distance > 100) return res.status(403).json({ success: false, message: 'Outside campus location.' });

        existing.check_out = currentTime;
        return res.json({ success: true, message: 'Checked out successfully (DB offline)' });
    }

    try {
        const pool = getPool();
        if (!file) return res.status(400).json({ success: false, message: 'Face image is required.' });
        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Location coordinates are required.' });

        // 1. Validate Location & Time Window
        const [locationRows] = await pool.query('SELECT * FROM attendance_settings LIMIT 1');
        const settings = locationRows.length > 0 ? locationRows[0] : { evening_start: '16:00:00', evening_end: '17:00:00', latitude: 17.0163949, longitude: 81.7805841, radius: 100 };

        const isEvening = currentTime >= settings.evening_start && currentTime <= settings.evening_end;
        if (!isEvening) {
            return res.status(403).json({ success: false, message: `Check-out time expired. Check-out is available from ${settings.evening_start} to ${settings.evening_end}.` });
        }

        let gpsStatus = 'Verified';
        let isGpsPassed = true;
        const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), settings.latitude, settings.longitude);
        if (distance > settings.radius) {
            gpsStatus = 'Failed';
            isGpsPassed = false;
        }

        // 2. Check existing attendance record
        const istDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = istDateFormatter.format(now); 

        const [existingAttendance] = await pool.query('SELECT * FROM attendance WHERE student_id = ? AND date = ?', [studentId, today]);
        if (existingAttendance.length === 0 || !existingAttendance[0].check_in) {
            return res.status(400).json({ success: false, message: 'You must check-in before checking out.' });
        }
        if (existingAttendance[0].check_out) {
            return res.status(400).json({ success: false, message: 'Already checked out today.' });
        }

        // 3. Face Verification
        const [studentRows] = await pool.query('SELECT face_embedding FROM students WHERE id = ?', [studentId]);
        if (studentRows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' });
        
        const [faces] = await pool.query('SELECT face_left_image, face_center_image, face_right_image FROM student_faces WHERE student_id = ?', [studentId]);
        if (faces.length === 0) return res.status(400).json({ success: false, message: 'No registered faces found.' });
        
        const savedFaces = [faces[0].face_left_image, faces[0].face_center_image, faces[0].face_right_image];
        const faceResult = await verifyFace(file.path, savedFaces);
        
        let faceVerificationStatus = 'Verified';
        let isFacePassed = true;
        if (!faceResult.success) {
            faceVerificationStatus = 'Failed';
            isFacePassed = false;
        }

        const faceScore = faceResult.score || 0;
        const finalStatus = (!isGpsPassed || !isFacePassed || existingAttendance[0].status === 'Absent') ? 'Absent' : 'Present';

        // 4. Save Check Out
        await pool.query(
            `UPDATE attendance SET check_out = ?, status = ?, location_verified = ?, face_verified = ?, face_score = ?, location_status = ?, attendance_status = ? WHERE student_id = ? AND date = ?`,
            [currentTime, finalStatus, isGpsPassed, isFacePassed, faceScore, gpsStatus, finalStatus, studentId, today]
        );

        if (!isGpsPassed) {
            return res.status(403).json({ success: false, message: 'Check-out failed. Outside campus boundaries.' });
        }
        if (!isFacePassed) {
            return res.status(403).json({ success: false, message: `Face verification failed. Match score (${faceResult.score}%) is below the required 75% threshold.` });
        }

        // Send Push Notification
        await notificationRepository.createNotification(
            studentId, 
            'Check-Out Successful', 
            `You successfully checked out today at ${currentTime}.`
        );

        res.json({ success: true, message: 'Checked out successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
