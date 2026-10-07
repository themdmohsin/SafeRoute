import { Router } from 'express';
import { getRide, listRides, startRide, updateRide } from '../controllers/rideController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.use(protect);
router.route('/').post(asyncHandler(startRide)).get(asyncHandler(listRides));
router.route('/:id').get(asyncHandler(getRide)).patch(asyncHandler(updateRide));

export default router;
