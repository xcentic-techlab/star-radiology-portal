import express from 'express';
import protect from "../middleware/auth.js";
import {adminOnly} from '../middleware/admin.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      status,
      centerId,
      date,
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (centerId) query.center = centerId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { procedure: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('user', 'fullName mobile email')
      .populate('center', 'name address')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.json({
      ok: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      appointments,
    });
  } catch (err) {
    console.error('Admin Fetch Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/today', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      date: { $gte: today, $lt: tomorrow },
    })
      .populate('user', 'fullName mobile')
      .populate('center', 'name')
      .sort({ time: 1 })
      .lean();

    return res.json({ ok: true, appointments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, todayCount, pending, confirmed, completed, cancelled] =
      await Promise.all([
        Appointment.countDocuments(),
        Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
        Appointment.countDocuments({ status: 'Pending' }),
        Appointment.countDocuments({ status: 'Confirmed' }),
        Appointment.countDocuments({ status: 'Completed' }),
        Appointment.countDocuments({ status: 'Cancelled' }),
      ]);

    return res.json({
      ok: true,
      stats: { total, todayCount, pending, confirmed, completed, cancelled },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(adminNotes && { adminNotes }),
        ...(status === 'Cancelled' && { cancelledBy: 'admin' }),
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ ok: false, error: 'Appointment not found' });
    }

    return res.json({ ok: true, message: 'Status updated', appointment });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    return res.json({ ok: true, message: 'Appointment deleted' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;