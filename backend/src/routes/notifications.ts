import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../controllers/notificationController';

const router = Router();

// Get smart notifications for the authenticated user
router.get('/', authenticateToken, getNotifications);

// Mark all notifications as read
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);

// Mark a notification as read
router.patch('/:id/read', authenticateToken, markNotificationAsRead);

export default router;
