const getPool = require("../config/db");

// ==========================
// 📊 STATS (FIXED)
// ==========================
exports.getStats = async (req, res) => {
    try {
        const pool = getPool();

        // total students
        const [students] = await pool.query(
            "SELECT COUNT(*) AS total FROM students"
        );

        // present today (based on date + check_in)
        const [present] = await pool.query(`
            SELECT COUNT(DISTINCT student_id) AS present
            FROM attendance
            WHERE date = CURDATE()
            AND check_in IS NOT NULL
        `);

        const totalStudents = students[0].total;
        const presentToday = present[0].present;

        const absentToday = totalStudents - presentToday;

        const attendancePercentage =
            totalStudents === 0
                ? 0
                : ((presentToday / totalStudents) * 100).toFixed(2);

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
        console.error("Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load stats"
        });
    }
};
// ==========================
// 📜 RECENT ATTENDANCE
// ==========================
exports.getRecentLogs = async (req, res) => {
    try {
        const pool = getPool();

        const [rows] = await pool.query(`
            SELECT 
                a.id,
                s.name,
                s.student_id,
                a.date,
                a.check_in,
                a.attendance_status
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.check_in IS NOT NULL
            ORDER BY a.date DESC, a.check_in DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Recent Logs Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load recent logs"
        });
    }
};