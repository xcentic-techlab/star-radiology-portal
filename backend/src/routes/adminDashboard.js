import express from "express";
import { adminOnly } from "../middleware/admin.js";
import protect from "../middleware/auth.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const totalUsers = await User.countDocuments();

    res.json({
      ok: true,
      stats: {
        totalAppointments,
        totalUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;