import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['commuter', 'admin'], default: 'commuter' },
    vehicleType: { type: String, trim: true, maxlength: 80 },
    vehicleNumber: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    homeArea: { type: String, trim: true, maxlength: 120, default: '' },
    preferences: {
      audibleAlerts: { type: Boolean, default: true },
      autoDetect: { type: Boolean, default: true },
      anonymousTelemetry: { type: Boolean, default: true },
      nightMap: { type: Boolean, default: false },
    },
    notificationsSeenAt: { type: Date, default: () => new Date(0) },
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema);
