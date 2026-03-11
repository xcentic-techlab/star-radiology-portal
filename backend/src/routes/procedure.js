import express from 'express';
import protect  from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import Procedure from '../models/Procedure.js';

const router = express.Router();

router.get('/admin/procedures', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await Procedure.countDocuments(query);
    const procedures = await Procedure.find(query)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ ok: true, procedures, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/admin/procedures', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, description, priceRange, preparationInstructions, isActive } = req.body;
    if (!name || !category) return res.status(400).json({ ok: false, error: 'name and category required' });

    const procedure = await Procedure.create({ name, category, description, priceRange, preparationInstructions, isActive });
    res.status(201).json({ ok: true, procedure });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/admin/procedures/:id', protect, adminOnly, async (req, res) => {
  try {
    const procedure = await Procedure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!procedure) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, procedure });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/admin/procedures/:id', protect, adminOnly, async (req, res) => {
  try {
    await Procedure.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


router.get('/api/procedures', async (req, res) => {
  try {
    const { category } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;

    const procedures = await Procedure.find(query)
      .select('name category description priceRange preparationInstructions')
      .sort({ category: 1, name: 1 })
      .lean();

    const grouped = {};
    procedures.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    res.json({ ok: true, procedures, grouped });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;