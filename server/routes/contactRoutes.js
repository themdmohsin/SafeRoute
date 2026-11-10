import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createContactMessage } from '../controllers/contactController.js';

const router = Router();

router.post('/', asyncHandler(createContactMessage));

export default router;
