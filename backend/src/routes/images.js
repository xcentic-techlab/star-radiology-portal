import express from "express";
import upload from "../utils/upload.js";
import Image from "../models/Image.js";
import { protectAdmin } from '../middleware/websiteAuth.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get("/records", protectAdmin, async (req, res) => {
  const { page } = req.query;
  if (!page) return res.status(400).json({ message: "page required" });
  const images = await Image.find({ page }).lean();
  res.json({ images });
});

router.post("/upload", protectAdmin, upload.single("image"), async (req, res) => {
  const { page, imageKey } = req.body;
  if (!page || !imageKey) return res.status(400).json({ message: "page and imageKey required" });
  if (!req.file) return res.status(400).json({ message: "image file required" });

  const image = await Image.findOneAndUpdate(
    { page, imageKey },
    { page, imageKey, path: `/${req.file.path.replace(/\\/g, "/")}` },
    { upsert: true, new: true }
  );
  res.json({ message: "Image uploaded", image });
});

router.delete("/delete", protectAdmin, async (req, res) => {
  const { page, imageKey } = req.query;
  if (!page || !imageKey) return res.status(400).json({ message: "page and imageKey required" });

  const image = await Image.findOne({ page, imageKey });
  if (!image) return res.status(404).json({ message: "Image not found" });

  try {
    const filePath = path.join(process.cwd(), image.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn("File delete warning:", e.message);
  }

  await Image.deleteOne({ page, imageKey });
  res.json({ message: "Image deleted" });
});

router.get("/", async (req, res) => {
  const { page } = req.query;
  if (!page) return res.status(400).json({ message: "page query required" });
  const images = await Image.find({ page });
  const result = {};
  images.forEach(img => { result[img.imageKey] = img.path; });
  res.json(result);
});

export default router;