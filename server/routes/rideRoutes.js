import { Router } from 'express';
import { getRide, listRides, startRide, updateRide } from '../controllers/rideController.js';
import { getTelemetry, postTelemetry } from '../controllers/telemetryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/protect.js';

const router = Router();
router.use(protect);
router.route('/').post(asyncHandler(startRide)).get(asyncHandler(listRides));
router.route('/:id').get(asyncHandler(getRide)).patch(asyncHandler(updateRide));
// Ride telemetry (sensor windows). Mounted under the same protected /rides
// router so authentication and ride-ownership rules cannot be bypassed.
router.route('/:id/telemetry').post(asyncHandler(postTelemetry)).get(asyncHandler(getTelemetry));

export default router;
