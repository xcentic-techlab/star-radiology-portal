import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import centerCtrl      from '../controllers/centerController.js';
import procedureCtrl   from '../controllers/procedureController.js';
import staffCtrl       from '../controllers/centerStaffController.js';
import appointmentCtrl from '../controllers/websiteAppointmentController.js';
import reportCtrl      from '../controllers/websiteReportController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import {
  protectAdmin,
  protectCenterStaff,
  protectAdminOrCenterStaff,
} from '../middleware/websiteAuth.js';
import ScheduleRoutes from './Scheduleroutes.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/reports/'); },
  filename:    (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `report-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only PDF, JPG, JPEG, PNG files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/auth/staff/login', staffCtrl.loginStaff);
router.get('/auth/staff/me', protectCenterStaff, staffCtrl.getMe);
router.use('/schedule', ScheduleRoutes);
router.get('/centers',         centerCtrl.getAllCenters);
router.get('/centers/:id',     centerCtrl.getCenterById);
router.get('/procedures',      procedureCtrl.getAllProcedures);
router.get('/procedures/:id',  procedureCtrl.getProcedureById);
router.get('/dashboard/stats', protectAdminOrCenterStaff, appointmentCtrl.getDashboardStats);
router.get('/appointments',     protectAdminOrCenterStaff, appointmentCtrl.getAppointments);
router.get('/appointments/:id', protectAdminOrCenterStaff, appointmentCtrl.getAppointmentById);
router.put('/appointments/:id/status', protectAdminOrCenterStaff, appointmentCtrl.updateAppointmentStatus);
router.post('/reports/upload',           protectAdminOrCenterStaff, upload.single('file'), reportCtrl.uploadReport);
router.get('/reports/scan-types',        protectCenterStaff, reportCtrl.getScanTypes);
router.get('/reports/by-scan-type',      protectCenterStaff, reportCtrl.getAppointmentsByScanType);
router.get('/reports/paid-appointments', protectCenterStaff, reportCtrl.getPaidAppointments);
router.get('/reports',                   protectCenterStaff, reportCtrl.getReportsStaff);
router.get('/admin/appointments',            protectAdmin, appointmentCtrl.getAppointmentsAdmin);
router.patch('/admin/appointments/:id/status', protectAdmin, appointmentCtrl.updateAppointmentStatus); 
router.get('/admin/reports',              protectAdmin, reportCtrl.getReportsAdmin);
router.delete('/admin/reports/:id',       protectAdmin, reportCtrl.deleteReport);
router.patch('/admin/reports/:id/visibility', protectAdmin, reportCtrl.toggleVisibility);
router.get('/admin/centers',             protectAdmin, centerCtrl.getAllCentersAdmin);
router.post('/admin/centers',            protectAdmin, centerCtrl.createCenter);
router.put('/admin/centers/:id',         protectAdmin, centerCtrl.updateCenter);
router.delete('/admin/centers/:id',      protectAdmin, centerCtrl.deleteCenter);
router.get('/admin/centers/:id/staff',   protectAdmin, centerCtrl.getCenterStaffList);
router.get('/admin/procedures',          protectAdmin, procedureCtrl.getAllProceduresAdmin);
router.post('/admin/procedures',         protectAdmin, procedureCtrl.createProcedure);
router.put('/admin/procedures/:id',      protectAdmin, procedureCtrl.updateProcedure);
router.delete('/admin/procedures/:id',   protectAdmin, procedureCtrl.deleteProcedure);
router.post('/admin/staff',              protectAdmin, staffCtrl.createStaff);
router.get('/admin/staff',               protectAdmin, staffCtrl.getAllStaff);
router.put('/admin/staff/:id',           protectAdmin, staffCtrl.updateStaff);
router.delete('/admin/staff/:id',        protectAdmin, staffCtrl.deleteStaff);

router.use((req, res) => {
  res.status(404).json({ success: false, message: `Website route ${req.originalUrl} not found` });
});

export default router;