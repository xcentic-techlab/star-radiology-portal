import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
    },

    path: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

imageSchema.index({ page: 1, imageKey: 1 }, { unique: true });

export default mongoose.model("Image", imageSchema);