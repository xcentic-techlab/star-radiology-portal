import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  time: { type: String, required: true },  
  label: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const centerOverrideSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  centerName: { type: String },
  timeSlots: [timeSlotSchema],               
  blockedDates: [{ type: String }],
  workingDays: {
    type: [Number],
    default: undefined,
  },
}, { _id: false });

const scheduleSettingsSchema = new mongoose.Schema({

  singleton: { type: Boolean, default: true, unique: true },

  globalTimeSlots: {
    type: [timeSlotSchema],
    default: [
      { time: '09:00 AM', isActive: true },
      { time: '10:00 AM', isActive: true },
      { time: '11:00 AM', isActive: true },
      { time: '12:00 PM', isActive: true },
      { time: '02:00 PM', isActive: true },
      { time: '04:00 PM', isActive: true },
      { time: '06:00 PM', isActive: true },
      { time: '08:00 PM', isActive: true },
    ],
  },

  globalBlockedDates: {
    type: [
      {
        date: { type: String, required: true },
        reason: { type: String, default: '' },
        _id: false,
      },
    ],
    default: [],
  },
  globalWorkingDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5, 6], 
  },

  maxPerSlot: { type: Number, default: 5 },

  advanceBookingDays: { type: Number, default: 60 },
  centerOverrides: {
    type: [centerOverrideSchema],
    default: [],
  },

}, { timestamps: true });

export default  mongoose.model('ScheduleSettings', scheduleSettingsSchema);