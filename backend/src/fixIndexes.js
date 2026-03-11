import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fixIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");

    const db = mongoose.connection.db;
    const collection = db.collection("images");

    const indexes = await collection.indexes();
    console.log("Existing Indexes:", indexes);

    const hasKeyIndex = indexes.find((i) => i.name === "key_1");

    if (hasKeyIndex) {
      await collection.dropIndex("key_1");
      console.log("key_1 index deleted SUCCESSFULLY");
    } else {
      console.log("key_1 index already removed");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error fixing indexes:", err);
    process.exit(1);
  }
}

fixIndexes();