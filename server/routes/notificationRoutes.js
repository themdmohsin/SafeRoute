import { Router } from 'express';
import { listNotifications, markNotificationsRead } from '../controllers/notificationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(listNotifications));
router.post('/read', asyncHandler(markNotificationsRead));

export default router;
