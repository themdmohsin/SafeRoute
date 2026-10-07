import mongoose from 'mongoose';

const hazardReportSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    hazardType: {
      type: String,
      enum: ['pothole', 'waterlogging', 'open_manhole', 'speed_breaker', 'other'],
      required: true,
      index: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    photoUrl: { type: String, trim: true, default: null },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) => coordinates.length === 2,
          message: 'Location coordinates must be [longitude, latitude].',
        },
      },
    },
    roadName: { type: String, trim: true, maxlength: 160, default: '' },
    area: { type: String, trim: true, maxlength: 120, default: '' },
    status: { type: String, enum: ['reported', 'verified', 'resolved'], default: 'reported', index: true },
    source: { type: String, enum: ['manual', 'sensor-detected', 'ml'], default: 'manual' },
    mlLabel: { type: String, enum: ['normal', 'speed_breaker', 'pothole'], default: null },
    mlConfidence: { type: Number, min: 0, max: 1, default: null },
    modelVersion: { type: String, default: null },
    rideId: { type: String, default: null, index: true },
    windowId: { type: String, default: null },
    timestamp: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

hazardReportSchema.index({ location: '2dsphere' });
hazardReportSchema.index({ createdAt: -1 });
hazardReportSchema.index({ hazardType: 1, severity: 1, createdAt: -1 });
hazardReportSchema.index({ area: 1, createdAt: -1 });

export default mongoose.models.HazardReport || mongoose.model('HazardReport', hazardReportSchema);
