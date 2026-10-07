import mongoose from 'mongoose';

/**
 * One immutable sensor window produced by the client pipeline documented in
 * docs/SENSOR_WINDOW_CONTRACT.md. Windows are validated in
 * services/telemetryValidation.js before anything reaches this model.
 */
const rideTelemetryWindowSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'RideSession', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    schemaVersion: { type: Number, required: true, min: 1 },
    windowId: { type: String, required: true },
    seq: { type: Number, required: true, min: 0 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true, min: 0 },
    sampleCount: { type: Number, required: true, min: 0 },
    nominalIntervalMs: { type: Number, default: null },
    gps: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        accuracyM: { type: Number, default: null },
        speedMps: { type: Number, default: null },
        headingDeg: { type: Number, default: null },
        timestamp: { type: String, required: true },
      },
      default: null,
    },
    accel: {
      type: {
        mean: { x: Number, y: Number, z: Number },
        std: { x: Number, y: Number, z: Number },
        min: { x: Number, y: Number, z: Number },
        max: { x: Number, y: Number, z: Number },
        magnitude: { mean: Number, std: Number, max: Number },
      },
      default: null,
    },
    gravity: {
      type: { x: Number, y: Number, z: Number, tiltDeg: Number },
      default: null,
    },
    gyro: {
      type: {
        mean: { x: Number, y: Number, z: Number },
        std: { x: Number, y: Number, z: Number },
        maxMagnitudeDegPerS: Number,
      },
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

rideTelemetryWindowSchema.index({ ride: 1, seq: 1 }, { unique: true });
rideTelemetryWindowSchema.index({ user: 1, startedAt: -1 });

export default mongoose.models.RideTelemetryWindow ||
  mongoose.model('RideTelemetryWindow', rideTelemetryWindowSchema);
