
import express from "express";
import Report from "../models/Report.js";
import protectMobileUser from "../middleware/auth.js"; 

const router = express.Router();

router.get("/", protectMobileUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const reports = await Report.find({ user: userId, isVisible: true })
      .sort({ createdAt: -1 })
      .populate("center", "centerName city")
      .populate("appointment", "date time procedure fullName mobile")
      .lean();

    const formatted = reports.map(r => ({
      _id:        r._id,
      fullName:   r.patientName  || r.appointment?.fullName || "",
      procedure:  r.procedureName || r.appointment?.procedure || "",
      centerName: r.centerName   || r.center?.centerName || "",
      reportType: r.reportType,
      createdAt:  r.createdAt,

      age:       "",   
      gender:    "",   
      labNumber: r._id.toString().slice(-10), 

      indication:      r.indication,
      technique:       r.technique,
      clinicalHistory: r.clinicalHistory,
      findings:        r.findings,
      impression:      r.impression,
      conclusion:      r.conclusion,
      notes:           r.notes,

      reportFile: {
        ...r.reportFile,
        url: r.reportFile?.url?.startsWith('http')
          ? r.reportFile.url
          : `http://178.16.139.140:5000${r.reportFile?.url}`,
      },

      appointmentDate: r.appointment?.date,
      appointmentTime: r.appointment?.time,
    }));

    res.json({ ok: true, reports: formatted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id", protectMobileUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const report = await Report.findOne({
      _id:       req.params.id,
      user:      userId,
      isVisible: true,
    })
      .populate("center",      "centerName city address phone")
      .populate("appointment", "date time procedure fullName mobile")
      .lean();

    if (!report) {
      return res.status(404).json({ ok: false, error: "Report not found" });
    }

    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;