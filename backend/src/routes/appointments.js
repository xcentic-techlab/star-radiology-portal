import express from "express";
import Appointment from "../models/Appointment.js";
import Center from "../models/Center.js"; 
import protect from '../middleware/auth.js';

const router = express.Router();
router.post('/', protect, async (req, res) => {
  try {
    const {
      procedure,
      scanType,
      procedureDescription,
      centerId,
      centerName,
      fullName,
      mobile,
      email,
      referringDoctor,
      date,
      time,
      paymentMethod,
      couponCode,
      discountAmount,
      amount,
    } = req.body;

    if (!procedure || !date || !time || !fullName || !mobile) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    let resolvedCenterId = centerId;
    let resolvedCenterName = centerName || '';

    if (!resolvedCenterId) {
      const foundCenter = await Center.findOne({
        centerName: { $regex: centerName, $options: 'i' },
      });
      if (foundCenter) {
        resolvedCenterId = foundCenter._id;
        resolvedCenterName = foundCenter.centerName;
      } else {
        return res.status(400).json({ ok: false, error: 'Center not found' });
      }
    } else {
      const foundCenter = await Center.findById(resolvedCenterId);
      if (foundCenter) resolvedCenterName = foundCenter.centerName;
    }
    const appointment = await Appointment.create({
      user: req.user._id,
      fullName,
      mobile,
      email: email || '',
      referringDoctor: referringDoctor || '',
      procedure,
      scanType: scanType || '',
      procedureDescription: procedureDescription || '',
      center: resolvedCenterId,       
      centerName: resolvedCenterName, 
      date: (() => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
      })(),
      time,
      paymentMethod: paymentMethod || 'Pay at Center',
      paymentStatus: paymentMethod === 'Pay Now' ? 'Paid' : 'Pending',
      amount: amount || 549,
      couponCode: couponCode || '',
      discountAmount: discountAmount || 0,
      status: 'Pending',
    });

    return res.status(201).json({
      ok: true,
      message: 'Appointment booked successfully',
      appointment,
    });

  } catch (err) {
    console.error('Book Appointment Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .sort({ date: -1 })
      .lean();

    return res.json({ ok: true, appointments });
  } catch (err) {
    console.error('Fetch Appointments Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ ok: false, error: 'Appointment not found' });
    }

    if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
      return res.status(400).json({
        ok: false,
        error: `Cannot reschedule a ${appointment.status} appointment`,
      });
    }

    const { date, time } = req.body;
    if (date) {
      const d = new Date(date);
      appointment.date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    }
    if (time) appointment.time = time;
    appointment.status = 'Pending';

    await appointment.save();

    return res.json({ ok: true, message: 'Appointment rescheduled', appointment });
  } catch (err) {
    console.error(' Reschedule Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ ok: false, error: 'Appointment not found' });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({ ok: false, error: 'Cannot cancel a completed appointment' });
    }

    appointment.status = 'Cancelled';
    appointment.cancelledBy = 'user';
    appointment.cancelReason = req.body.reason || 'Cancelled by user';
    await appointment.save();

    return res.json({ ok: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Cancel Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;