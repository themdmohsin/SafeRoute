import { Router } from 'express';
import { createHazard, deleteHazard, getHazard, listHazards, updateHazard } from '../controllers/hazardController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.use(protect);
router.route('/').post(asyncHandler(createHazard)).get(asyncHandler(listHazards));
router.route('/:id').get(asyncHandler(getHazard)).patch(asyncHandler(updateHazard)).delete(asyncHandler(deleteHazard));

export default router;
