const getPool = require("../config/db");
const excelJS = require("exceljs");
const PDFDocument = require("pdfkit");

exports.exportAttendanceExcel = async (req, res) => {
  try {
    const pool = getPool();
    const { startDate, endDate, department } = req.query;

    let query = `
      SELECT a.date, s.student_id, s.name, s.department, a.status, a.check_in, a.check_out
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += " AND a.date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    if (department) {
      query += " AND s.department = ?";
      params.push(department);
    }
    query += " ORDER BY a.date DESC, s.name ASC";

    const [rows] = await pool.query(query, params);

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Report");

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Student ID", key: "student_id", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Department", key: "department", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Check In", key: "check_in", width: 15 },
      { header: "Check Out", key: "check_out", width: 15 },
    ];

    rows.forEach((row) => {
      worksheet.addRow({
        date: new Date(row.date).toISOString().split('T')[0],
        student_id: row.student_id,
        name: row.name,
        department: row.department,
        status: row.status,
        check_in: row.check_in || "-",
        check_out: row.check_out || "-",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Export Error:", error);
    res.status(500).json({ success: false, message: "Error generating Excel report" });
  }
};

exports.exportAttendancePDF = async (req, res) => {
  try {
    const pool = getPool();
    const { startDate, endDate, department } = req.query;

    let query = `
      SELECT a.date, s.student_id, s.name, s.department, a.status, a.check_in, a.check_out
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += " AND a.date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    if (department) {
      query += " AND s.department = ?";
      params.push(department);
    }
    query += " ORDER BY a.date DESC, s.name ASC";

    const [rows] = await pool.query(query, params);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.pdf");

    doc.pipe(res);

    doc.fontSize(18).text("Smart Attendance Report", { align: "center" });
    doc.moveDown();

    if (startDate && endDate) {
      doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`);
    }
    if (department) {
      doc.fontSize(12).text(`Department: ${department}`);
    }
    doc.moveDown();

    // Table Header
    const startY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Date", 30, startY);
    doc.text("ID", 100, startY);
    doc.text("Name", 170, startY);
    doc.text("Dept", 300, startY);
    doc.text("Status", 370, startY);
    doc.text("In", 440, startY);
    doc.text("Out", 500, startY);

    let currentY = startY + 15;
    doc.font("Helvetica");

    rows.forEach((row) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 30;
      }
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      doc.text(dateStr, 30, currentY);
      doc.text(row.student_id, 100, currentY);
      doc.text(row.name, 170, currentY);
      doc.text(row.department, 300, currentY);
      doc.text(row.status, 370, currentY);
      doc.text(row.check_in || "-", 440, currentY);
      doc.text(row.check_out || "-", 500, currentY);
      
      currentY += 15;
    });

    doc.end();
  } catch (error) {
    console.error("PDF Export Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Error generating PDF report" });
    }
  }
};
