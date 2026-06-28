const getPool = require('../config/db');

class ReportRepository {
    async getAttendanceData(startDate, endDate) {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT 
                s.student_id as studentCode,
                s.name as studentName,
                a.date,
                a.check_in as checkInTime,
                a.check_out as checkOutTime,
                a.status,
                IF(a.face_verified = 1, 'Verified', 'Failed') as faceStatus,
                IF(a.location_verified = 1, 'Verified', 'Failed') as gpsStatus
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.date BETWEEN ? AND ?
            ORDER BY a.date DESC, s.name ASC
        `, [startDate, endDate]);
        return rows;
    }

    async getStats(startDate, endDate) {
        const pool = getPool();
        const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM students');
        const totalStudents = totalResult[0].total;

        const [presentResult] = await pool.query(
            'SELECT COUNT(DISTINCT student_id) as total FROM attendance WHERE date BETWEEN ? AND ? AND status = ?',
            [startDate, endDate, 'Present']
        );
        const present = presentResult[0].total;
        const absent = totalStudents - present;
        const percentage = totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0;

        return { totalStudents, present, absent, percentage };
    }
}

module.exports = new ReportRepository();
