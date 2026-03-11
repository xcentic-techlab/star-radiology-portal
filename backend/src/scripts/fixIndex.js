import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  
  try {
    await mongoose.connection.db.collection("reports").dropIndex("caseNumber_1");
    console.log("Index dropped successfully!");
  } catch (e) {
    console.log("Index not found or already dropped:", e.message);
  }
  
  await mongoose.disconnect();
  process.exit(0);
};

run();