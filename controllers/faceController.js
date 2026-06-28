const faceapi = require("face-api.js");
const db = require("../config/db");
const antiSpoofCheck = require("../utils/antiSpoof");
const path = require("path");
const fs = require("fs");

// ===============================
// MODEL PATH (production safe)
// ===============================
const MODEL_PATH = path.resolve(__dirname, "../models");

// ===============================
// HELPER: Get Image Buffer
// Supports multer OR base64 fallback
// ===============================
function getImageBuffer(req) {
    if (req.files && req.files.image) {
        return req.files.image.data;
    }

    if (req.body && req.body.image) {
        // base64 support (Flutter fallback)
        return Buffer.from(req.body.image, "base64");
    }

    return null;
}

// ===============================
// REGISTER FACE (ADMIN ONLY)
// ===============================
exports.registerFace = async (req, res) => {
    try {
        const { student_id, name, descriptor } = req.body;

        if (!student_id || !descriptor) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        await db.query(
            "INSERT INTO face_embeddings (student_id, name, descriptor) VALUES (?, ?, ?)",
            [student_id, name, JSON.stringify(descriptor)]
        );

        return res.json({
            success: true,
            message: "Face registered successfully"
        });

    } catch (err) {
        console.error("[REGISTER FACE ERROR]", err);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

// ===============================
// RECOGNIZE FACE (PRODUCTION CORE)
// ===============================
exports.recognizeFace = async (req, res) => {
    try {

        // 1. Get image buffer
        const imageBuffer = getImageBuffer(req);

        if (!imageBuffer) {
            return res.status(400).json({
                success: false,
                message: "No image provided"
            });
        }

        // 2. 🔐 ANTI-SPOOF CHECK
        const spoof = antiSpoofCheck(imageBuffer);

        if (spoof.spoof) {
            return res.json({
                success: false,
                message: "Spoof detected 🚫",
                reason: spoof.reason
            });
        }

        // 3. FACE DETECTION
        const detections = await faceapi
            .detectSingleFace(imageBuffer)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            return res.json({
                success: false,
                message: "No face detected"
            });
        }

        const queryDescriptor = detections.descriptor;

        // 4. FETCH STORED FACES
        const [rows] = await db.query("SELECT * FROM face_embeddings");

        if (!rows || rows.length === 0) {
            return res.json({
                success: false,
                message: "No registered faces found"
            });
        }

        // 5. MATCHING LOGIC
        let bestMatch = null;
        let minDistance = 0.55; // stricter for production

        for (let row of rows) {
            try {
                const storedDescriptor = JSON.parse(row.descriptor);

                const distance = faceapi.euclideanDistance(
                    queryDescriptor,
                    storedDescriptor
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = row;
                }
            } catch (e) {
                console.warn("Invalid descriptor skipped");
            }
        }

        // 6. NO MATCH
        if (!bestMatch) {
            return res.json({
                success: false,
                message: "Face not recognized"
            });
        }

        // 7. DUPLICATE ATTENDANCE CHECK (TODAY ONLY)
        const today = new Date().toISOString().split("T")[0];

        const [existing] = await db.query(
            "SELECT id FROM attendance WHERE student_id = ? AND DATE(time) = ?",
            [bestMatch.student_id, today]
        );

        if (existing.length > 0) {
            return res.json({
                success: false,
                message: "Attendance already marked today"
            });
        }

        // 8. MARK ATTENDANCE
        await db.query(
            "INSERT INTO attendance (student_id, time) VALUES (?, NOW())",
            [bestMatch.student_id]
        );

        // 9. SUCCESS RESPONSE
        return res.json({
            success: true,
            message: "Attendance marked successfully",
            student: {
                id: bestMatch.student_id,
                name: bestMatch.name
            },
            confidence: (1 - minDistance).toFixed(2)
        });

    } catch (err) {
        console.error("[FACE RECOGNITION ERROR]", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};