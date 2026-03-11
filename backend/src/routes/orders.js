
import express from "express";
import Appointment from "../models/Appointment.js";
import protect from "../middleware/auth.js";

const router = express.Router();


router.get("/", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const orders = appointments.map((appt, index) => {
      const year = new Date(appt.createdAt).getFullYear();
      const serial = String(index + 1).padStart(3, "0");
      const orderNo = `ORD-${year}-${serial}`;

      let orderStatus = "Pending";
      const s = (appt.status || "").toLowerCase();
      if (s === "completed" || s === "reportready" || s === "report ready") {
        orderStatus = "Completed";
      } else if (s === "cancelled") {
        orderStatus = "Cancelled";
      } else if (
        s === "pending" ||
        s === "labprocessing" ||
        s === "lab processing" ||
        s === "doctorreview" ||
        s === "doctor review"
      ) {
        orderStatus = "Pending";
      }


      const d = new Date(appt.date || appt.createdAt);
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const displayDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

      return {
        id: appt._id,
        orderNo,
        testName: appt.procedure || "",
        labName: appt.centerName || "",
        date: displayDate,
        status: orderStatus,
        amount: appt.amount || 0,
        paymentMethod: appt.paymentMethod || "Pay at Center",
        paymentStatus: appt.paymentStatus || "Pending",
        time: appt.time || "",
        fullName: appt.fullName || "",
      };
    });

    return res.json({ ok: true, orders });
  } catch (err) {
    console.error("Fetch Orders Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;