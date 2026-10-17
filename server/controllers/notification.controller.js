const { query } = require('../config/db');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await query(
      `SELECT 
         n.notification_id,
         n.type,
         n.message,
         n.entity_type,
         n.entity_id,
         n.is_read,
         n.created_at,
         u.name as sender_name
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.user_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.', error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return res.status(200).json({ success: true, unreadCount: result[0].unread_count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count.', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.', error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.', error: error.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
