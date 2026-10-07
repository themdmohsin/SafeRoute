import express from 'express';
import { createMlHazard, inferMlWindow } from '../controllers/mlController.js';
import { protect } from '../middleware/protect.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.post('/infer', asyncHandler(inferMlWindow));
router.post('/hazard', protect, asyncHandler(createMlHazard));

export default router;
