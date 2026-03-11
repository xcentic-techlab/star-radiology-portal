
import { notify } from '../utils/notificationHelper.js';
import Appointment from '../models/Appointment.js';
import Center from '../models/Center.js';
import Procedure  from '../models/Procedure.js';
import CenterStaff from '../models/CenterStaff.js';

const getAppointments = async (req, res) => {
  try {
    const { status, date, search, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (req.userRole !== 'admin') {
      filter.center = req.centerId; 
    } else if (req.query.centerId) {
      filter.center = req.query.centerId;
    }

    if (status) filter.status = status;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (req.query.today === 'true') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: todayStart, $lte: todayEnd };
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { _id: search.match(/^[a-f\d]{24}$/i) ? search : undefined }.center,
      ].filter(Boolean);

      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Appointment.countDocuments(filter);

    const appointments = await Appointment.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('center', 'centerName city address')
      .lean();

    res.json({
      success: true,
      ok: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      appointments,
    });
  } catch (err) {
    console.error('getAppointments ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('center', 'centerName city address phone')
      .lean();

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }


    if (req.userRole !== 'admin') {
      if (appointment.center?._id?.toString() !== req.centerId?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, statusNote } = req.body;

    const allowed = ['Pending', 'Lab Processing', 'Doctor Review', 'Completed', 'Report Ready', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, msg: 'Invalid status value' });
    }

    const updateFields = { status };
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (statusNote !== undefined) updateFields.statusNote = statusNote;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ ok: false, msg: 'Appointment not found' });
    }

    res.json({ ok: true, appointment });

  } catch (err) {
    console.error('updateAppointmentStatus error:', err);
    res.status(500).json({ ok: false, msg: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.userRole === 'admin';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const apptFilter = isAdmin ? {} : { center: req.centerId };

    if (isAdmin) {
      const [
        totalCenters,
        totalProcedures,
        totalStaff,
        todayAppointments,
        pendingPayments,
        completedToday,
      ] = await Promise.all([
        Center.countDocuments({ isActive: true }),
        Procedure.countDocuments({ isActive: true }),
        CenterStaff.countDocuments({ isActive: true }),
        Appointment.countDocuments({ date: { $gte: today, $lte: todayEnd } }),
        Appointment.countDocuments({ paymentStatus: 'Pending' }),
        Appointment.countDocuments({ status: 'Completed', date: { $gte: today, $lte: todayEnd } }),
      ]);

      return res.json({
        success: true,
        totalCenters,
        totalProcedures,
        totalStaff,
        todayAppointments,
        pendingPayments,
        completedToday,
        reportsThisWeek: 0, 
      });

    } else {
      const [total, todayCount, pending, confirmed, completed] = await Promise.all([
        Appointment.countDocuments(apptFilter),
        Appointment.countDocuments({ ...apptFilter, date: { $gte: today, $lte: todayEnd } }),
        Appointment.countDocuments({ ...apptFilter, status: 'Pending' }),
        Appointment.countDocuments({ ...apptFilter, status: 'Confirmed' }),
        Appointment.countDocuments({ ...apptFilter, status: 'Completed' }),
      ]);

      return res.json({
        success: true,
        data: { total, today: todayCount, pending, confirmed, completed },
        todayAppointments: todayCount,
        pendingPayments:   pending,
        completedToday:    completed,
        reportsThisWeek:   0,
      });
    }

  } catch (err) {
    console.error('DASHBOARD ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAppointmentsAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.centerId && req.query.centerId !== 'all') {
      query.center = req.query.centerId;
    }
    if (req.query.status) query.status = req.query.status;
    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   query.date.$lte = new Date(req.query.dateTo);
    }

    const appointments = await Appointment.find(query)
      .populate('center', 'centerName city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      appointments,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('getAppointmentsAdmin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getDashboardStats,
  getAppointmentsAdmin,
};