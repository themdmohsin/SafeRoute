import { Router } from 'express';
import { forgotPassword, login, me, myStats, register, resetPassword, updateMe } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', protect, asyncHandler(me));
router.patch('/me', protect, asyncHandler(updateMe));
router.get('/me/stats', protect, asyncHandler(myStats));

export default router;
