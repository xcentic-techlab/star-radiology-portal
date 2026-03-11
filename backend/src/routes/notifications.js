
import express from 'express';
import { getNotifications, markRead, markAllRead } from '../controllers/notification.controller.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.get('/notifications',          protect, getNotifications);
router.put('/notifications/read-all', protect, markAllRead);
router.put('/notifications/:id/read', protect, markRead);

export default router;