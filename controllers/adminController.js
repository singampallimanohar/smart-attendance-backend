const getPool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getDashboardStats = async (req, res) => {
    if (global.dbFailed) {
        if (!global.mockStudents) global.mockStudents = [];
        return res.json({ success: true, data: { totalStudents: global.mockStudents.length, presentToday: 0, absentToday: 0, attendancePercentage: 0 } });
    }
    try {
        const pool = getPool();

        // Total registered students
        const [totalStudentsResult] = await pool.query('SELECT COUNT(*) as total FROM students');
        const totalStudents = totalStudentsResult[0].total;

        // Use IST date (Asia/Kolkata) instead of UTC
        const istDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = istDateFormatter.format(new Date());

        // Present today = distinct students who checked in today with status 'Present'
        const [presentResult] = await pool.query(
            'SELECT COUNT(DISTINCT student_id) as total FROM attendance WHERE date = ? AND status = ?',
            [today, 'Present']
        );
        const presentToday = presentResult[0].total;

        // Absent = total students minus present
        const absentToday = totalStudents - presentToday;

        // Attendance percentage as a number
        const attendancePercentage = totalStudents > 0 ? parseFloat(((presentToday / totalStudents) * 100).toFixed(2)) : 0;

        res.json({
            success: true,
            data: {
                totalStudents,
                presentToday,
                absentToday,
                attendancePercentage
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.addStudent = async (req, res) => {
    if (global.dbFailed) {
        if (!global.mockStudents) global.mockStudents = [];
        global.mockStudents.push({ 
            id: global.mockStudents.length + 1,
            student_id: req.body.student_id || `STU${global.mockStudents.length + 1}`,
            name: req.body.name, 
            email: req.body.email,
            department: req.body.department,
            phone: req.body.phone,
            year: req.body.year || '1st Year',
            status: 'active',
            created_by_admin: true,
            face_embedding: '[0.1, 0.2, 0.3]', // Dummy embedding
            face_registered: 1
        });
        if (global.mockStudentsCount !== undefined) global.mockStudentsCount++;
        return res.json({ success: true, message: 'Mock Student Registered successfully (DB offline)' });
    }
    try {
        const { student_id, name, email, password, phone, department, year } = req.body;
        const files = req.files;

        if (!files.face_left || !files.face_center || !files.face_right) {
            return res.status(400).json({ success: false, message: 'All 3 face images are required.' });
        }

        const pool = getPool();

        // Check if email or student_id exists
        const [existing] = await pool.query('SELECT id FROM students WHERE email = ? OR student_id = ?', [email, student_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email or Student ID already registered.' });
        }

        const hashedPwd = await bcrypt.hash(password, 10);
        const mockFaceEmbedding = '[0.1, 0.2, 0.3]'; // Simulating backend embedding generation

        const faceCenterPath = files.face_center[0].path;

        // Insert student
        const [studentResult] = await pool.query(
            'INSERT INTO students (student_id, name, email, password, phone, department, year, face_embedding, status, created_by_admin, face_registered, student_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [student_id, name, email, hashedPwd, phone, department, year, mockFaceEmbedding, 'active', true, true, faceCenterPath.replace(/\\/g, '/')]
        );
        const studentId = studentResult.insertId;

        // Insert faces
        const faceLeftPath = files.face_left[0].path;
        const faceRightPath = files.face_right[0].path;

        await pool.query(
            'INSERT INTO student_faces (student_id, face_left_image, face_center_image, face_right_image) VALUES (?, ?, ?, ?)',
            [studentId, faceLeftPath, faceCenterPath, faceRightPath]
        );

        res.json({ success: true, message: 'Student registered successfully with face data.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAllAttendance = async (req, res) => {
    if (global.dbFailed) {
        let mockAttendance = [];
        if (global.mockStudents && global.mockStudents.length > 0) {
            mockAttendance = global.mockStudents.map(student => ({
                id: student.id,
                studentName: student.name,
                date: new Date().toISOString().split('T')[0],
                status: 'Present',
                checkInTime: '09:00:00',
                checkOutTime: '17:00:00',
                faceVerificationStatus: student.face_registered ? 'Verified' : 'Failed',
                gpsStatus: 'Verified'
            }));
        } else {
            mockAttendance = [
                { id: 1, studentName: 'Test Student', date: new Date().toISOString().split('T')[0], status: 'Present', checkInTime: '09:00:00', checkOutTime: '16:00:00', faceVerificationStatus: 'Verified', gpsStatus: 'Verified' }
            ];
        }
        return res.json({ success: true, data: mockAttendance });
    }
    try {
        const pool = getPool();
        const { name, date, department } = req.query;
        let query = `
            SELECT 
                a.id, 
                s.student_id as studentCode,
                s.name as studentName, 
                s.department,
                a.date, 
                a.status, 
                a.check_in as checkInTime, 
                a.check_out as checkOutTime, 
                IF(a.face_verified = 1, 'Verified', 'Failed') as faceVerificationStatus, 
                IF(a.location_verified = 1, 'Verified', 'Failed') as gpsStatus
            FROM attendance a 
            JOIN students s ON a.student_id = s.id 
            WHERE 1=1
        `;
        const params = [];

        if (name) {
            query += ' AND s.name LIKE ?';
            params.push(`%${name}%`);
        }
        if (date) {
            query += ' AND a.date = ?';
            params.push(date);
        }
        if (department) {
            query += ' AND s.department = ?';
            params.push(department);
        }

        query += ' ORDER BY a.date DESC, a.check_in DESC';

        const [rows] = await pool.query(query, params);
        
        // Format dates correctly for JSON serialization
        const formattedRows = rows.map(row => {
            const dateObj = new Date(row.date);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            return {
                ...row,
                date: `${dd}-${mm}-${yyyy}`
            };
        });

        res.json({ success: true, data: formattedRows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAllStudents = async (req, res) => {
    if (global.dbFailed) {
        if (!global.mockStudents) global.mockStudents = [];
        return res.json({ success: true, data: global.mockStudents });
    }
    try {
        const pool = getPool();
        const [students] = await pool.query('SELECT id, name, email, department, phone, face_registered FROM students ORDER BY id DESC');
        res.json({ success: true, data: students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.editStudent = async (req, res) => {
    const { id } = req.params;
    const { name, email, department, phone } = req.body;

    if (global.dbFailed) {
        if (!global.mockStudents) return res.status(404).json({ success: false, message: 'Student not found' });
        const studentIndex = global.mockStudents.findIndex(s => s.id == id);
        if (studentIndex === -1) return res.status(404).json({ success: false, message: 'Student not found' });
        
        global.mockStudents[studentIndex] = { ...global.mockStudents[studentIndex], name, email, department, phone };
        return res.json({ success: true, message: 'Student updated successfully (Mock Mode)' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query(
            'UPDATE students SET name = ?, email = ?, department = ?, phone = ? WHERE id = ?',
            [name, email, department, phone, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteStudent = async (req, res) => {
    const { id } = req.params;

    if (global.dbFailed) {
        if (!global.mockStudents) return res.status(404).json({ success: false, message: 'Student not found' });
        const studentIndex = global.mockStudents.findIndex(s => s.id == id);
        if (studentIndex === -1) return res.status(404).json({ success: false, message: 'Student not found' });
        
        global.mockStudents.splice(studentIndex, 1);
        if (global.mockStudentsCount) global.mockStudentsCount--; // Keep dashboard count in sync

        return res.json({ success: true, message: 'Student deleted successfully (Mock Mode)' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
