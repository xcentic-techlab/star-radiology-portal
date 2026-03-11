import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: '',
    },
    referringDoctor: {
      type: String,
      default: '',
    },

    procedure: {
      type: String,
      required: true,
    },
    scanType: {
      type: String,
      default: '',
    },
    procedureDescription: {
      type: String,
      default: '',
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
    },
    centerName: {
      type: String,
      default: '',
    },

    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Pay Now', 'Pay at Center'],
      default: 'Pay at Center',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Refunded', 'Failed'],   
      default: 'Pending',
    },
    amount: {
      type: Number,
      default: 549,
    },
    couponCode: {
      type: String,
      default: '',
    },
    discountAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Lab Processing',
        'Doctor Review',
        'Completed',
        'Report Ready',
        'Cancelled',
        'No Show',
      ],
      default: 'Pending',
    },

    adminNotes: {
      type: String,
      default: '',
    },
    statusNote: {
      type: String,
      default: '',
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'admin', 'staff', ''],
      default: '',
    },
    cancelReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ user: 1, date: -1 });
appointmentSchema.index({ center: 1, date: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: -1 });

export default mongoose.model('Appointment', appointmentSchema);