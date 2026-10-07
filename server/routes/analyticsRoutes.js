import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.get('/summary', protect, asyncHandler(getAnalyticsSummary));

export default router;
