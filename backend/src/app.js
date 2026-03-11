import express from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import ordersRouter from "./routes/orders.js";
import userRoutes from './routes/user.routes.js';
import mobileReportRoutes from "./routes/mobileReport.js";
import procedureRoutes from './routes/procedure.js';
import centerRoutes    from './routes/center.js';
import scheduleRoutes from "./routes/Scheduleroutes.js";
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import reportRoutes from "./routes/reports.js";
import imageRoutes from "./routes/images.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import websiteRoutes from "./routes/websiteRoutes.js"
import adminAppointments from "./routes/adminAppointments.js";
import adminDashboard from "./routes/adminDashboard.js";
import staffAppointmentRoutes from "./routes/staffAppointment.js";
import invoicesRouter from "./routes/invoices.js";
import notificationRoutes from './routes/notifications.js';
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) =>
    console.error("MongoDB Connection Error:", err.message)
  );

app.get("/", (req, res) => {
  res.json({ ok: true, message: "XStar App API Running 🚀" });
});

app.use("/auth", authRoutes);
app.use("/mobile/auth", authRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/mobile/appointments", appointmentRoutes);
app.use("/mobile/reports", reportRoutes);
app.use("/mobile/my-reports", mobileReportRoutes); 
app.use('/', procedureRoutes); 
app.use('/', centerRoutes);   
app.use("/mobile/orders", ordersRouter);
app.use('/api/website/images', imageRoutes);
app.use('/api/website', websiteRoutes);
app.use("/api/admin/login", adminAuthRoutes);
app.use('/api', notificationRoutes);
app.use('/api', userRoutes);
app.use("/mobile/invoices", invoicesRouter);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use("/api/admin/appointments", adminAppointments);
app.use('/staff/appointments', staffAppointmentRoutes);
app.use("/api/admin/dashboard", adminDashboard);


app.use('/api/schedule', scheduleRoutes);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

export default app;