
import Report from "../models/Report.js";
import Appointment from "../models/Appointment.js";
import path from "path";
import { notify } from '../utils/notificationHelper.js';
import fs from "fs";

const getScanTypes = async (req, res) => {
  try {
    const centerId = req.centerId; 

    const scanTypes = await Appointment.distinct('scanType', {
      center: centerId,
      scanType: { $nin: ['', null] },
      paymentStatus: { $in: ['Paid'] },
      status: { $in: ['Paid', 'Completed'] },
    });

    res.json({ scanTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch scan types' });
  }
};

const getAppointmentsByScanType = async (req, res) => {
  try {
    const { scanType } = req.query;
   const centerId = req.centerId;

    if (!scanType) return res.status(400).json({ message: 'scanType is required' });

    const appointments = await Appointment.find({
      center: centerId,
      scanType,
      paymentStatus: 'Paid',
      status: { $in: ['Paid', 'Completed'] },
    })
      .sort({ date: -1 })
      .lean();

    const ids = appointments.map((a) => a._id);
    const existingReports = await Report.find({
      appointmentId: { $in: ids },
    }).distinct('appointmentId');

    const existingSet = new Set(existingReports.map(String));

    const result = appointments.map((a) => ({
      ...a,
      hasReport: existingSet.has(String(a._id)),
    }));

    res.json({ appointments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

const uploadReport = async (req, res) => {
  try {
    const { appointmentId, reportType, notes, remarks } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Report file is required" });
    }

    if (!appointmentId) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "appointmentId is required" });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("center", "centerName city isActive")
      .lean();

    if (!appointment) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (req.userRole !== "admin") {
      const apptCenter = appointment.center?._id?.toString() || appointment.center?.toString();
      const staffCenter = req.centerId?.toString();
      if (apptCenter !== staffCenter) {
        if (req.file?.path) fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, message: "Access denied — not your center's appointment" });
      }
    }

    const existingReport = await Report.findOne({ appointment: appointmentId });
    if (existingReport?.reportFile?.url) {
      const oldPath = path.join(process.cwd(), existingReport.reportFile.url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const fileUrl = `/uploads/reports/${req.file.filename}`;
    const report = await Report.findOneAndUpdate(
      { appointment: appointmentId },
      {
        $set: {
          appointment:   appointmentId,
          center:        appointment.center?._id || appointment.center,
          user:          appointment.user,
          uploadedBy:    req.userId,
          procedureName: appointment.procedureName || appointment.procedure || "",
          patientName:   appointment.fullName  || "",
          patientPhone:  appointment.mobile    || "",
          centerName:    appointment.center?.centerName || appointment.centerName || "",
          reportType:    reportType || "Diagnostic Report",
          notes:         notes      || "",
          remarks:       remarks    || "",
          reportFile: {
            url:        fileUrl,
            filename:   req.file.filename,
            mimetype:   req.file.mimetype || "",
            size:       req.file.size     || 0,
            uploadedAt: new Date(),
          },
          status:    "approved",
          isVisible: true,
        }
      },
      { upsert: true, new: true }
    );

    await Appointment.findByIdAndUpdate(appointmentId, {
      status:       "Completed",
      reportStatus: "uploaded",
    });

    if (appointment.user) {
      await notify(
        appointment.user,
        'report',
        'Report Ready!',
        `Your ${appointment.procedureName || appointment.procedure || 'report'} is now available.`
      );
    }

    res.status(201).json({
      success: true,
      message: "Report uploaded. Patient can view it in the app.",
      data: report,
    });

  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("UPLOAD REPORT ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const searchAppointmentForReport = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Search query too short (min 3 chars)" });
    }

    const filter = {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { mobile:   { $regex: search, $options: "i" } },
      ],
    };

    if (req.userRole !== "admin") {
      filter.center = req.centerId;
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: -1 })
      .limit(10)
      .populate("center", "centerName")
      .lean();
    const apptIds = appointments.map(a => a._id);
    const existingReports = await Report.find(
      { appointment: { $in: apptIds } },
      "appointment"
    ).lean();
    const reportedApptIds = new Set(existingReports.map(r => r.appointment.toString()));

    const result = appointments.map(a => ({
      ...a,
      hasReport: reportedApptIds.has(a._id.toString()),
    }));

    res.json({ success: true, appointments: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getReportsStaff = async (req, res) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const filter = { center: req.centerId };

    if (req.query.reportType) filter.reportType = req.query.reportType;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(req.query.dateTo + "T23:59:59");
    }

    const [total, reports] = await Promise.all([
      Report.countDocuments(filter),
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("appointment", "date time status paymentStatus amount fullName mobile")
        .populate("uploadedBy",  "name email")
        .lean(),
    ]);

    res.json({
      success: true,
      reports,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getReportsAdmin = async (req, res) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.query.centerId && req.query.centerId !== "all") {
      filter.center = req.query.centerId;
    }
    if (req.query.reportType) filter.reportType = req.query.reportType;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(req.query.dateTo + "T23:59:59");
    }
    if (req.query.search) {
      filter.$or = [
        { patientName:  { $regex: req.query.search, $options: "i" } },
        { patientPhone: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [total, reports] = await Promise.all([
      Report.countDocuments(filter),
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("appointment", "date time status paymentStatus amount fullName mobile")
        .populate("center",      "centerName city")
        .populate("uploadedBy",  "name email")
        .lean(),
    ]);

    res.json({
      success: true,
      reports,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (report.reportFile?.url) {
      const filePath = path.join(process.cwd(), report.reportFile.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleVisibility = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    report.isVisible = !report.isVisible;
    await report.save();

    res.json({
      success:   true,
      message:   `Report ${report.isVisible ? "now visible" : "hidden"} for patient`,
      isVisible: report.isVisible,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDepartments = async (req, res) => {
  try {
    const centerId = req.user.centerId; 
    const departments = await Appointment.distinct('department', { centerId });
    res.json({ departments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};


const getAppointmentsByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    const centerId = req.user.centerId;

    const appointments = await Appointment.find({
      centerId,
      department,
      paymentStatus: 'paid',  
    })
      .populate('patientId', 'fullName mobile')
      .sort({ date: -1 })
      .lean();

    const ids = appointments.map((a) => a._id);
    const existing = await Report.find({ appointmentId: { $in: ids } }).distinct('appointmentId');
    const existingSet = new Set(existing.map(String));

    const result = appointments.map((a) => ({
      ...a,
      hasReport: existingSet.has(String(a._id)),
    }));

    res.json({ appointments: result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};


const getPaidAppointments = async (req, res) => {
  try {
    const centerId = req.centerId; 

    const appointments = await Appointment.find({
      center:        centerId,
      paymentStatus: 'Paid',        
      status:        { $nin: ['Cancelled', 'No Show'] }, 
    })
      .sort({ date: -1 })
      .lean();
    const ids = appointments.map((a) => a._id);
    const existingReports = await Report.find({
      appointment: { $in: ids },
    }).distinct('appointment');

    const existingSet = new Set(existingReports.map(String));

    const result = appointments.map((a) => ({
      ...a,
      hasReport: existingSet.has(String(a._id)),
    }));

    res.json({ appointments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};



export default {
  getScanTypes,
  getAppointmentsByScanType,
  uploadReport,
  searchAppointmentForReport,
  getReportsStaff,
  getReportsAdmin,
  deleteReport,
  toggleVisibility,
  getPaidAppointments,
};