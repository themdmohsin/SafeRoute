import { Router } from 'express';
import { askAssistant } from '../controllers/assistantController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.post('/ask', protect, asyncHandler(askAssistant));

export default router;
