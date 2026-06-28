const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initDB() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'smart_attendance',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        await pool.getConnection();
        console.log('Connected to MySQL database: smart_attendance');
        
        await createTables();
    } catch (error) {
        console.error('DATABASE CONNECTION FAILED');
        console.error(error);
        global.dbFailed = true; 
    }
}

async function createTables() {
    // Existing Tables (Normalized)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            department VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT,
            date DATE NOT NULL,
            check_in TIME,
            check_out TIME,
            status VARCHAR(50) DEFAULT 'Absent',
            face_verified BOOLEAN DEFAULT FALSE,
            location_verified BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            morning_start TIME NOT NULL,
            morning_end TIME NOT NULL,
            evening_start TIME NOT NULL,
            evening_end TIME NOT NULL,
            radius INT NOT NULL DEFAULT 100,
            location_name VARCHAR(255),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8)
        )
    `);

    // [NEW] Enterprise Logging Tables
    await pool.query(`
        CREATE TABLE IF NOT EXISTS login_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            role ENUM('admin', 'student'),
            ip_address VARCHAR(45),
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(255) NOT NULL,
            performed_by VARCHAR(255),
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Database schema ensured with Enterprise Logging Tables.');
}

function getPool() {
    if (!pool) {
        throw new Error('Database not initialized');
    }
    return pool;
}

initDB();

module.exports = getPool;
