const getPool = require('../config/db');

let mockLocationState = {
    location_name: 'Campus',
    latitude: 17.0163949,
    longitude: 81.7805841,
    allowed_radius: 100
};

exports.getSettings = async (req, res) => {
    if (global.dbFailed) {
        return res.json({ success: true, data: { morning_start: '10:00:00', morning_end: '11:00:00', evening_start: '16:00:00', evening_end: '17:00:00', allowed_latitude: 0, allowed_longitude: 0, allowed_radius: 100 }});
    }
    try {
        const pool = getPool();
        const [settings] = await pool.query('SELECT * FROM attendance_settings LIMIT 1');
        
        if (settings.length === 0) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: settings[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateSettings = async (req, res) => {
    if (global.dbFailed) {
        return res.json({ success: true, message: 'Settings mock-updated successfully (DB offline)' });
    }
    try {
        const pool = getPool();
        const { morning_start, morning_end, evening_start, evening_end, allowed_latitude, allowed_longitude, allowed_radius } = req.body;

        const [settings] = await pool.query('SELECT id FROM attendance_settings LIMIT 1');
        
        if (settings.length === 0) {
            await pool.query(
                `INSERT INTO attendance_settings (morning_start, morning_end, evening_start, evening_end) 
                 VALUES (?, ?, ?, ?)`,
                [morning_start, morning_end, evening_start, evening_end]
            );
        } else {
            await pool.query(
                `UPDATE attendance_settings SET 
                 morning_start = ?, morning_end = ?, evening_start = ?, evening_end = ? 
                 WHERE id = ?`,
                [morning_start, morning_end, evening_start, evening_end, settings[0].id]
            );
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLocationSettings = async (req, res) => {
    if (global.dbFailed) {
        return res.json({ success: true, data: mockLocationState });
    }
    try {
        const pool = getPool();
        const [locations] = await pool.query('SELECT * FROM attendance_settings LIMIT 1');
        
        if (locations.length === 0) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: locations[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateLocationSettings = async (req, res) => {
    const { location_name, latitude, longitude, radius } = req.body;
    
    if (global.dbFailed) {
        mockLocationState = { location_name, latitude, longitude, radius };
        return res.json({ success: true, message: 'Location mock-updated successfully (DB offline)' });
    }
    try {
        const pool = getPool();

        const [locations] = await pool.query('SELECT id FROM attendance_settings LIMIT 1');
        
        if (locations.length === 0) {
            await pool.query(
                `INSERT INTO attendance_settings (location_name, latitude, longitude, radius, updated_at) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [location_name || 'Campus', latitude, longitude, radius]
            );
        } else {
            await pool.query(
                `UPDATE attendance_settings SET 
                 location_name = ?, latitude = ?, longitude = ?, radius = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [location_name || 'Campus', latitude, longitude, radius, locations[0].id]
            );
        }

        res.json({ success: true, message: 'Location settings updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getServerTime = (req, res) => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Kolkata', 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
    // Format: YYYY-MM-DD, HH:MM:SS
    // To make it parseable by DateTime.parse, we can replace the comma with 'T'
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    const h = parts.find(p => p.type === 'hour').value;
    const min = parts.find(p => p.type === 'minute').value;
    const s = parts.find(p => p.type === 'second').value;
    
    // Construct local ISO string (without Z)
    const localIsoString = `${y}-${m}-${d}T${h}:${min}:${s}`;
    res.json({ success: true, serverTime: localIsoString });
};
