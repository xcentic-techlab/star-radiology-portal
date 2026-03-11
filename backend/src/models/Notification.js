import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, default: 'appointment' },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  actionUrl: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);