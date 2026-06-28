const getPool = require('./config/db');

async function run() {
    try {
        const pool = getPool();
        await pool.query('ALTER TABLE students ADD COLUMN student_photo VARCHAR(255) NULL');
        console.log('Successfully added student_photo column.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column student_photo already exists.');
        } else {
            console.error('Error:', err.message);
        }
    }
    process.exit();
}

run();
