import express from 'express';
import protect from '../middleware/auth.js';
import { adminOnly, staffOnly } from '../middleware/admin.js';
import upload from '../utils/upload.js';
import Center from '../models/Center.js';

const router = express.Router();

router.get('/admin/centers', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const total = await Center.countDocuments();
    const centers = await Center.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ ok: true, centers, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


router.post('/admin/centers', protect, adminOnly, async (req, res) => {
  try {
    const center = await Center.create(req.body);
    res.status(201).json({ ok: true, center });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/admin/centers/:id', protect, adminOnly, async (req, res) => {
  try {
    const center = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!center) return res.status(404).json({ ok: false, error: 'Center not found' });
    res.json({ ok: true, center });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/admin/centers/:id', protect, adminOnly, async (req, res) => {
  try {
    await Center.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post(
  '/admin/centers/:id/images',
  protect,
  adminOnly,
  upload.single('image'),
  async (req, res) => {
    try {
      const { imageKey } = req.body;
      if (!imageKey || !req.file) {
        return res.status(400).json({ ok: false, error: 'imageKey and image required' });
      }

      const center = await Center.findById(req.params.id);
      if (!center) return res.status(404).json({ ok: false, error: 'Center not found' });

      const imagePath = `/${req.file.path.replace(/\\/g, '/')}`;
      const idx = center.images.findIndex((img) => img.imageKey === imageKey);
      if (idx !== -1) {
        center.images[idx].path = imagePath;
      } else {
        center.images.push({ imageKey, path: imagePath });
      }

      await center.save();
      res.json({ ok: true, images: center.images });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

router.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true })
      .select('centerName city address phone images')
      .sort({ centerName: 1 })
      .lean();

    res.json({ ok: true, centers });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/centers/:id', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id)
      .select('-__v')
      .lean();
    if (!center) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, center });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/staff/my-center', protect, staffOnly, async (req, res) => {
  try {
    const center = await Center.findById(req.user.centerId).lean();
    if (!center) return res.status(404).json({ ok: false, error: 'Center not found' });
    res.json({ ok: true, center });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;