
import express from "express";
import protect from "../middleware/auth.js";
import Appointment from "../models/Appointment.js";
import { staffOnly } from "../middleware/admin.js";

const router = express.Router();

router.get('/', protect, staffOnly, async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;

    const query = { center: req.user.centerId };

    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('user', 'fullName mobile email')
      .sort({ date: -1, time: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.json({ ok: true, total, appointments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});


router.get('/today', protect, staffOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      center: req.user.centerId,
      date: { $gte: today, $lt: tomorrow },
      status: { $ne: 'Cancelled' },
    })
      .populate('user', 'fullName mobile')
      .sort({ time: 1 })
      .lean();

    return res.json({ ok: true, appointments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/:id/status', protect, staffOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Confirmed', 'Completed', 'No Show'];
    if (!allowedStatuses.includes(status)) {
      return res.status(403).json({ ok: false, error: 'Staff cannot set this status' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      center: req.user.centerId,
    });

    if (!appointment) {
      return res.status(404).json({ ok: false, error: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    return res.json({ ok: true, message: 'Status updated', appointment });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default  router;