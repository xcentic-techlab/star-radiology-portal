
import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CenterStaff",
      default: null,
    },

    reportType: {
      type: String,
      enum: ["Lab Report", "Scan Images", "Diagnostic Report", "Other"],
      default: "Diagnostic Report",
    },

    procedureName: { type: String, default: "" },
    patientName:   { type: String, default: "" },
    patientPhone:  { type: String, default: "" },
    centerName:    { type: String, default: "" },

    indication:      { type: String, default: "" },
    technique:       { type: String, default: "" },
    clinicalHistory: { type: String, default: "" },
    findings:        { type: String, default: "" },
    impression:      { type: String, default: "" },
    conclusion:      { type: String, default: "" },
    notes:           { type: String, default: "" },
    remarks:         { type: String, default: "" },
    reportFile: {
      url:        { type: String, required: true },
      filename:   { type: String, default: "" },
      mimetype:   { type: String, default: "" },
      size:       { type: Number, default: 0 },
      uploadedAt: { type: Date,   default: Date.now },
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ appointment: 1 });
reportSchema.index({ user: 1, createdAt: -1 });    
reportSchema.index({ center: 1, createdAt: -1 });  
reportSchema.index({ isVisible: 1, user: 1 });

export default mongoose.model("Report", reportSchema);