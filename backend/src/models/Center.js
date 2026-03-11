
import mongoose from "mongoose";

const centerSchema = new mongoose.Schema(
  {
    centerName: {
      type: String,
      required: true,
      trim: true,
    },
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    email: String,
    googleMapsLink: String,
    isActive: { type: Boolean, default: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Center", centerSchema);