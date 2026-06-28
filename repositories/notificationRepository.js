const getPool = require('../config/db');

class NotificationRepository {
    async getNotificationsByUserId(userId, limit = 50) {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
        return rows;
    }

    async getUnreadCount(userId) {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        return rows[0].count;
    }

    async markAsRead(userId, notificationId) {
        const pool = getPool();
        if (notificationId === 'all') {
            await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
        } else {
            await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
        }
    }

    async createNotification(userId, title, message, type = 'info') {
        const pool = getPool();
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [userId, title, message, type]
        );
    }
}

module.exports = new NotificationRepository();
