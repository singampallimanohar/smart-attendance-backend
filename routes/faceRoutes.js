const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const { getDescriptor, compareFaces } = require("../services/faceService");

// ================= DB CONNECTION =================
async function db() {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

// ================= REGISTER STUDENT =================
router.post("/register", async (req, res) => {
    try {
        const { name, student_id, image } = req.body;

        const buffer = Buffer.from(image, "base64");
        const descriptor = await getDescriptor(buffer);

        const connection = await db();

        await connection.execute(
            "INSERT INTO students (name, student_id, face_descriptor) VALUES (?, ?, ?)",
            [name, student_id, JSON.stringify(descriptor)]
        );

        res.json({
            success: true,
            message: "Student registered successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ================= MARK ATTENDANCE =================
router.post("/attendance", async (req, res) => {
    try {
        const { image } = req.body;

        const buffer = Buffer.from(image, "base64");
        const inputDescriptor = await getDescriptor(buffer);

        const connection = await db();

        const [students] = await connection.query("SELECT * FROM students");

        let matched = null;

        for (let student of students) {
            const stored = JSON.parse(student.face_descriptor);

            const result = compareFaces(inputDescriptor, stored);

            if (result.match) {
                matched = student;
                break;
            }
        }

        if (!matched) {
            return res.json({
                success: false,
                message: "No matching face found"
            });
        }

        await connection.execute(
            "INSERT INTO attendance (student_id, date, status) VALUES (?, CURDATE(), ?)",
            [matched.student_id, "PRESENT"]
        );

        res.json({
            success: true,
            message: "Attendance marked",
            student: matched.name
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;