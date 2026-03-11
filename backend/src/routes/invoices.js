
import express from "express";
import Appointment from "../models/Appointment.js";
import protect from "../middleware/auth.js";
import PDFDocument from "pdfkit";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const invoices = appointments.map((appt, index) => {
      const year = new Date(appt.createdAt).getFullYear();
      const serial = String(index + 1).padStart(3, "0");
      const invoiceNo = `INV-${year}-${serial}`;

      const ps = (appt.paymentStatus || "").toLowerCase();
      let status = "Pending";
      if (ps === "paid" || ps === "completed") status = "Paid";
      else if (ps === "failed") status = "Failed";

      const d = new Date(appt.date || appt.createdAt);
      const months = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
      const displayDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

      return {
        id: appt._id,
        invoiceNo,
        testName: appt.procedure || "",
        labName: appt.centerName || "",
        date: displayDate,
        amount: appt.amount || 0,
        status,
        paymentMethod: appt.paymentMethod || "Pay at Center",
        fullName: appt.fullName || "",
        mobile: appt.mobile || "",
        time: appt.time || "",
        pdfUrl: `/mobile/invoices/${appt._id}/pdf`,
      };
    });

    return res.json({ ok: true, invoices });
  } catch (err) {
    console.error("Fetch Invoices Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id/pdf", protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!appt) {
      return res.status(404).json({ ok: false, error: "Invoice not found" });
    }

    const year = new Date(appt.createdAt).getFullYear();
    const invoiceNo = `INV-${year}-${appt._id.toString().slice(-4).toUpperCase()}`;

    const d = new Date(appt.date || appt.createdAt);
    const months = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
    const displayDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoiceNo}.pdf"`
    );
    doc.pipe(res);

    doc
      .fontSize(24)
      .fillColor("#2C5B97")
      .font("Helvetica-Bold")
      .text("Star Radiology", 50, 50);

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text("Advanced Diagnostic & Imaging Center", 50, 80)
      .text("info@starradiology.com  |  9711119014", 50, 95);
    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor("#E5E7EB")
      .lineWidth(1)
      .stroke();
    doc
      .fontSize(20)
      .fillColor("#1F2937")
      .font("Helvetica-Bold")
      .text("INVOICE", 50, 130);

    doc
      .fontSize(11)
      .fillColor("#7B5FCF")
      .font("Helvetica-Bold")
      .text(invoiceNo, 50, 155);

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`Date: ${displayDate}`, 400, 130, { align: "right", width: 145 })
      .text(`Time: ${appt.time || "N/A"}`, 400, 145, { align: "right", width: 145 });

    doc
      .roundedRect(50, 175, 245, 90, 8)
      .fillColor("#F8F9FE")
      .fill();

    doc
      .fontSize(9)
      .fillColor("#9CA3AF")
      .font("Helvetica-Bold")
      .text("BILL TO", 65, 188);

    doc
      .fontSize(13)
      .fillColor("#1F2937")
      .font("Helvetica-Bold")
      .text(appt.fullName || "Patient", 65, 202);

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`Mobile: ${appt.mobile || "N/A"}`, 65, 220)
      .text(`Email: ${appt.email || "N/A"}`, 65, 235)
      .text(`Ref. Doctor: ${appt.referringDoctor || "N/A"}`, 65, 250);

    doc
      .roundedRect(310, 175, 235, 90, 8)
      .fillColor("#F8F9FE")
      .fill();

    doc
      .fontSize(9)
      .fillColor("#9CA3AF")
      .font("Helvetica-Bold")
      .text("SERVICE CENTER", 325, 188);

    doc
      .fontSize(12)
      .fillColor("#1F2937")
      .font("Helvetica-Bold")
      .text(appt.centerName || "Star Radiology", 325, 202);

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`Appointment: ${displayDate}`, 325, 220)
      .text(`Time: ${appt.time || "N/A"}`, 325, 235);

    doc
      .roundedRect(50, 280, 495, 32, 4)
      .fillColor("#2C5B97")
      .fill();

    doc
      .fontSize(10)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("PROCEDURE", 65, 291)
      .text("TYPE", 270, 291)
      .text("AMOUNT", 450, 291);

    doc
      .roundedRect(50, 312, 495, 40, 4)
      .fillColor("#F8F9FE")
      .fill();

    doc
      .fontSize(11)
      .fillColor("#1F2937")
      .font("Helvetica-Bold")
      .text(appt.procedure || "N/A", 65, 323, { width: 190 });

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(appt.scanType || "Diagnostic", 270, 323)
      .text(`Rs. ${appt.amount || 0}`, 450, 323);

    let yPos = 362;
    if (appt.discountAmount && appt.discountAmount > 0) {
      doc
        .roundedRect(50, yPos, 495, 32, 4)
        .fillColor("#FFF7ED")
        .fill();

      doc
        .fontSize(10)
        .fillColor("#92400E")
        .font("Helvetica")
        .text(`Discount (${appt.couponCode || "Applied"})`, 65, yPos + 10)
        .text(`- Rs. ${appt.discountAmount}`, 450, yPos + 10);

      yPos += 42;
    }

    doc
      .roundedRect(350, yPos, 195, 45, 6)
      .fillColor("#2C5B97")
      .fill();

    doc
      .fontSize(10)
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .text("TOTAL AMOUNT", 365, yPos + 8);

    doc
      .fontSize(16)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(`Rs. ${appt.amount || 0}`, 365, yPos + 22);

    yPos += 60;
    const ps = (appt.paymentStatus || "").toLowerCase();
    const isPaid = ps === "paid" || ps === "completed";
    const statusColor = isPaid ? "#16A34A" : "#F59E0B";
    const statusBg = isPaid ? "#D1FAE5" : "#FEF3C7";
    const statusText = isPaid ? "PAID" : "PAYMENT PENDING";

    doc
      .roundedRect(50, yPos, 130, 30, 6)
      .fillColor(statusBg)
      .fill();

    doc
      .fontSize(11)
      .fillColor(statusColor)
      .font("Helvetica-Bold")
      .text(statusText, 65, yPos + 9);

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`Payment Method: ${appt.paymentMethod || "N/A"}`, 200, yPos + 9);

    doc
      .moveTo(50, 720)
      .lineTo(545, 720)
      .strokeColor("#E5E7EB")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(9)
      .fillColor("#9CA3AF")
      .font("Helvetica")
      .text("Thank you for choosing Star Radiology.", 50, 730, {
        align: "center",
        width: 495,
      })
      .text(
        "For queries: info@starradiology.com | 9711119014",
        50, 745,
        { align: "center", width: 495 }
      );

    doc.end();
  } catch (err) {
    console.error("PDF Generate Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;