import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    source: { type: String, enum: ['landing-page', 'app'], default: 'landing-page' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);
