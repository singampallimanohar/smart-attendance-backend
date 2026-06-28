const getPool = require('../config/db');

exports.getProfile = async (req, res) => {
    if (global.dbFailed) {
        if (!global.mockStudents) global.mockStudents = [];
        const student = global.mockStudents.find(s => s.id === req.user.id);
        
        if (!global.mockAttendance) global.mockAttendance = [];
        const myAttendance = global.mockAttendance.filter(a => a.student_id === req.user.id);
        const presentDays = myAttendance.filter(a => a.status === 'Present').length;
        const absentDays = myAttendance.filter(a => a.status === 'Absent').length;
        const totalClasses = presentDays + absentDays > 0 ? presentDays + absentDays : 27; // Dummy base if 0
        const calcAbsent = totalClasses - presentDays;
        const attendancePercentage = totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(2) : '0.00';
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecord = myAttendance.find(a => a.date === todayStr);

        if (student) {
            return res.json({ 
                success: true, 
                data: { 
                    ...student, 
                    full_name: student.name, 
                    roll_number: student.student_id, 
                    face_registered_status: student.face_registered,
                    student_photo: student.student_photo || 'uploads/dummy.jpg',
                    stats: { 
                        presentDays: presentDays, 
                        absentDays: calcAbsent, 
                        totalClasses: totalClasses,
                        attendancePercentage: attendancePercentage,
                        today_checkin: todayRecord?.check_in || null,
                        today_checkout: todayRecord?.check_out || null
                    },
                    campusLocation: { location_name: 'Campus', latitude: 17.0163949, longitude: 81.7805841, radius: 100 }
                }
            });
        }
        return res.status(404).json({ success: false, message: 'Mock student not found' });
    }
    try {
        const pool = getPool();
        const studentId = req.user.id;

        const [students] = await pool.query(`
            SELECT id as database_id, student_id, student_id as roll_number, name as full_name, email, phone, department, face_registered as face_registered_status, created_at, student_photo 
            FROM students
            WHERE id = ?
        `, [studentId]);
        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const [attendanceStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days
            FROM attendance WHERE student_id = ?
        `, [studentId]);

        const [todayAttendance] = await pool.query(`
            SELECT check_in, check_out 
            FROM attendance 
            WHERE student_id = ? AND date = CURRENT_DATE()
        `, [studentId]);

        const stats = attendanceStats[0];
        const totalClasses = stats.total_days > 0 ? stats.total_days : 27; // Base 27 if 0 to show UI
        const presentDays = stats.present_days || 0;
        const absentDays = totalClasses - presentDays;
        const attendancePercentage = ((presentDays / totalClasses) * 100).toFixed(2);
        
        const todayRecord = todayAttendance.length > 0 ? todayAttendance[0] : null;

        const [locations] = await pool.query('SELECT * FROM attendance_locations LIMIT 1');
        const campusLocation = locations.length > 0 ? locations[0] : null;

        res.json({
            success: true,
            data: {
                ...students[0],
                stats: {
                    presentDays: presentDays,
                    absentDays: absentDays,
                    totalClasses: totalClasses,
                    attendancePercentage: attendancePercentage,
                    today_checkin: todayRecord?.check_in || null,
                    today_checkout: todayRecord?.check_out || null
                },
                campusLocation
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAttendanceHistory = async (req, res) => {
    if (global.dbFailed) {
        if (!global.mockAttendance) global.mockAttendance = [];
        const myAttendance = global.mockAttendance.filter(a => a.student_id === req.user.id);
        return res.json({ success: true, data: myAttendance.reverse() });
    }
    try {
        const pool = getPool();
        const studentId = req.user.id;
        const { filter } = req.query; // 'today', 'week', 'month'

        let query = 'SELECT * FROM attendance WHERE student_id = ?';
        const params = [studentId];

        if (filter === 'today') {
            query += ' AND date = CURRENT_DATE()';
        } else if (filter === 'week') {
            query += ' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)';
        } else if (filter === 'month') {
            query += ' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)';
        }

        query += ' ORDER BY date DESC';

        const [history] = await pool.query(query, params);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
