const reportRepository = require('../repositories/reportRepository');
const exportService = require('../services/exportService');

// Helper: Get IST date string (YYYY-MM-DD)
function getISTDate() {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date());
}

// Helper: Get date N days ago in IST
function getISTDateDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(d);
}

// Helper: Get first day of current month in IST
function getISTMonthStart() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    return `${y}-${m}-01`;
}

// GET /api/reports/daily
exports.getDailyReport = async (req, res) => {
    try {
        const today = getISTDate();
        const rows = await reportRepository.getAttendanceData(today, today);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/reports/weekly
exports.getWeeklyReport = async (req, res) => {
    try {
        const today = getISTDate();
        const weekAgo = getISTDateDaysAgo(7);
        const rows = await reportRepository.getAttendanceData(weekAgo, today);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/reports/monthly
exports.getMonthlyReport = async (req, res) => {
    try {
        const today = getISTDate();
        const monthStart = getISTMonthStart();
        const rows = await reportRepository.getAttendanceData(monthStart, today);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

function getExportParams(type) {
    let startDate, endDate, reportTitle;
    const today = getISTDate();
    switch (type) {
        case 'weekly':
            startDate = getISTDateDaysAgo(7);
            endDate = today;
            reportTitle = 'Weekly Attendance Report';
            break;
        case 'monthly':
            startDate = getISTMonthStart();
            endDate = today;
            reportTitle = 'Monthly Attendance Report';
            break;
        default:
            startDate = today;
            endDate = today;
            reportTitle = 'Daily Attendance Report';
    }
    return { startDate, endDate, reportTitle };
}

// GET /api/reports/export/pdf?type=daily|weekly|monthly
exports.exportPDF = async (req, res) => {
    try {
        const type = req.query.type || 'daily';
        const { startDate, endDate, reportTitle } = getExportParams(type);
        const rows = await reportRepository.getAttendanceData(startDate, endDate);
        const stats = await reportRepository.getStats(startDate, endDate);
        await exportService.generatePDF(res, reportTitle, startDate, endDate, stats, rows);
    } catch (error) {
        console.error('PDF Export Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
};

// GET /api/reports/export/excel?type=daily|weekly|monthly
exports.exportExcel = async (req, res) => {
    try {
        const type = req.query.type || 'daily';
        const { startDate, endDate, reportTitle } = getExportParams(type);
        const rows = await reportRepository.getAttendanceData(startDate, endDate);
        const stats = await reportRepository.getStats(startDate, endDate);
        await exportService.generateExcel(res, reportTitle, startDate, endDate, stats, rows);
    } catch (error) {
        console.error('Excel Export Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate Excel' });
    }
};

// GET /api/reports/export/csv?type=daily|weekly|monthly
exports.exportCSV = async (req, res) => {
    try {
        const type = req.query.type || 'daily';
        const { startDate, endDate, reportTitle } = getExportParams(type);
        const rows = await reportRepository.getAttendanceData(startDate, endDate);
        await exportService.generateCSV(res, reportTitle, startDate, endDate, rows);
    } catch (error) {
        console.error('CSV Export Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate CSV' });
    }
};
