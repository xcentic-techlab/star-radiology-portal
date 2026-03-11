import mongoose from 'mongoose';

const procedureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    code: {
      type: String,
      required: true,     
      unique: true,      
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ['MRI', 'CT Scan', 'Pathology', 'Ultrasound', 'X-Ray', 'Other'],
    },

    description: { type: String, default: '' },
    priceRange: { type: String, default: '' },
    preparationInstructions: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

procedureSchema.index({ category: 1, isActive: 1 });

export default mongoose.model('Procedure', procedureSchema);