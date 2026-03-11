import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  patientId: String, 
  gender: String,
  dob: String,
  address: String,
});

export default mongoose.model("Patient", patientSchema);
