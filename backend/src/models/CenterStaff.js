import mongoose from "mongoose";
import bcrypt from "bcrypt";


const centerStaffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
    },

    role: {
      type: String,
      default: 'staff',
      enum: ['staff', 'admin'],
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

centerStaffSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

centerStaffSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('CenterStaff', centerStaffSchema);