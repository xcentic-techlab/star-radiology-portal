import express from 'express'
import ScheduleSettings from '../models/Schedulesettings.js';

const router  = express.Router();

async function getSettings() {
  let settings = await ScheduleSettings.findOne({ singleton: true });
  if (!settings) settings = await ScheduleSettings.create({ singleton: true });
  return settings;
}

router.get('/availability', async (req, res) => {
  try {
    const { centerId, date } = req.query;
    const settings = await getSettings();
    const override = centerId
      ? settings.centerOverrides.find(o => o.centerId.toString() === centerId)
      : null;

    const rawSlots = override?.timeSlots?.length
      ? override.timeSlots
      : settings.globalTimeSlots;
    const timeSlots = rawSlots
      .filter(s => s.isActive)
      .map(s => s.time);
    const workingDays =
      override?.workingDays?.length
        ? override.workingDays
        : settings.globalWorkingDays;

    let isBlocked = false;
    let blockReason = '';

    if (date) {
      const globalBlock = settings.globalBlockedDates.find(b => b.date === date);
      if (globalBlock) { isBlocked = true; blockReason = globalBlock.reason; }
      if (!isBlocked && override?.blockedDates?.includes(date)) {
        isBlocked = true;
        blockReason = 'Center not available on this date';
      }
      if (!isBlocked) {
        const dayOfWeek = new Date(date).getDay();
        if (!workingDays.includes(dayOfWeek)) {
          isBlocked = true;
          blockReason = 'Not a working day';
        }
      }
    }

    res.json({
      ok: true,
      isBlocked,
      blockReason,
      timeSlots,
      workingDays,
      advanceBookingDays: settings.advanceBookingDays,
      maxPerSlot: settings.maxPerSlot,
      globalBlockedDates: settings.globalBlockedDates,
      centerBlockedDates: override?.blockedDates || [],
    });
  } catch (err) {
    console.error('schedule/availability error:', err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

router.get('/admin/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.put('/admin/global-slots', async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots)) return res.status(400).json({ ok: false, msg: 'slots must be array' });

    const settings = await getSettings();
    settings.globalTimeSlots = slots;
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

router.put('/admin/global-working-days', async (req, res) => {
  try {
    const { workingDays } = req.body;
    const settings = await getSettings();
    settings.globalWorkingDays = workingDays;
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.put('/admin/global-config', async (req, res) => {
  try {
    const { maxPerSlot, advanceBookingDays } = req.body;
    const settings = await getSettings();
    if (maxPerSlot !== undefined)        settings.maxPerSlot        = maxPerSlot;
    if (advanceBookingDays !== undefined) settings.advanceBookingDays = advanceBookingDays;
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.post('/admin/blocked-dates', async (req, res) => {
  try {
    const { date, reason = '' } = req.body;
    if (!date) return res.status(400).json({ ok: false, msg: 'date required' });

    const settings = await getSettings();
    const exists = settings.globalBlockedDates.find(b => b.date === date);
    if (exists) return res.status(400).json({ ok: false, msg: 'Date already blocked' });

    settings.globalBlockedDates.push({ date, reason });
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.delete('/admin/blocked-dates/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const settings = await getSettings();
    settings.globalBlockedDates = settings.globalBlockedDates.filter(b => b.date !== date);
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.put('/admin/center-override/:centerId', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { centerName, timeSlots, blockedDates, workingDays } = req.body;

    const settings = await getSettings();
    const idx = settings.centerOverrides.findIndex(
      o => o.centerId.toString() === centerId
    );

    const overrideData = {
      centerId,
      centerName,
      timeSlots:    timeSlots    ?? [],
      blockedDates: blockedDates ?? [],
      workingDays:  workingDays  ?? undefined,
    };

    if (idx >= 0) {
      settings.centerOverrides[idx] = overrideData;
    } else {
      settings.centerOverrides.push(overrideData);
    }

    settings.markModified('centerOverrides');
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});


router.delete('/admin/center-override/:centerId', async (req, res) => {
  try {
    const { centerId } = req.params;
    const settings = await getSettings();
    settings.centerOverrides = settings.centerOverrides.filter(
      o => o.centerId.toString() !== centerId
    );
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

export default router;