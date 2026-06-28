const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
exports.verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ success: false, message: 'Invalid token.' });
    }
};

exports.verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    next();
};

exports.verifyStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Access denied. Student only.' });
    }
    next();
};
