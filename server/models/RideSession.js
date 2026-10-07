import mongoose from 'mongoose';

const rideSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startTime: { type: Date, default: Date.now, required: true },
    endTime: { type: Date, default: null },
    distanceKm: { type: Number, min: 0, default: 0 },
    durationMinutes: { type: Number, min: 0, default: 0 },
    hazardsDetectedCount: { type: Number, min: 0, default: 0 },
    hazardsReportedCount: { type: Number, min: 0, default: 0 },
    safetyScore: { type: Number, min: 0, max: 100, default: 100 },
    route: {
      type: [{ lat: { type: Number, required: true }, lng: { type: Number, required: true } }],
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

rideSessionSchema.index({ user: 1, createdAt: -1 });
rideSessionSchema.index({ startTime: -1 });

export default mongoose.models.RideSession || mongoose.model('RideSession', rideSessionSchema);
