import { Router } from 'express';
import { listMessages, listUsers, updateUserRole } from '../controllers/adminController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, requireAdmin } from '../middleware/protect.js';

const router = Router();
router.use(protect, requireAdmin);
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id', asyncHandler(updateUserRole));
router.get('/messages', asyncHandler(listMessages));

export default router;
