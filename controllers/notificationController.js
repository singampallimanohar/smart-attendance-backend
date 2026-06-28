const notificationRepository = require('../repositories/notificationRepository');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await notificationRepository.getNotificationsByUserId(userId);
        const unreadCount = await notificationRepository.getUnreadCount(userId);
        
        res.json({ 
            success: true, 
            data: { notifications, unreadCount } 
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.body; // 'all' or specific ID
        
        await notificationRepository.markAsRead(userId, notificationId || 'all');
        
        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Error marking notifications read:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
