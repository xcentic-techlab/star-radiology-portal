import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import reportController from "../controllers/websiteReportController.js";
import { protectCenterStaff, protectAdmin } from "../middleware/websiteAuth.js";

const router = express.Router();
const uploadsDir = path.join(process.cwd(), "uploads", "reports");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `report-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only PDF, JPG, PNG files allowed"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/scan-types",    protectCenterStaff, reportController.getScanTypes);
router.get("/by-scan-type",  protectCenterStaff, reportController.getAppointmentsByScanType);

router.get("/search-appointment", protectCenterStaff, reportController.searchAppointmentForReport);

router.post("/upload", protectCenterStaff, upload.single("file"), reportController.uploadReport);

router.get("/", protectCenterStaff, reportController.getReportsStaff);
router.get("/admin",                protectAdmin, reportController.getReportsAdmin);
router.delete("/admin/:id",         protectAdmin, reportController.deleteReport);
router.patch("/admin/:id/visibility", protectAdmin, reportController.toggleVisibility);

export default router;