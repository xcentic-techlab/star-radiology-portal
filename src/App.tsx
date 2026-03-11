import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCenters from "./pages/admin/Centers";
import CenterStaffPage from "./pages/admin/CenterStaff";
import AdminProcedures from "./pages/admin/Procedures";
import AdminStaff from "./pages/admin/Staff";
import AdminAppointments from "./pages/admin/Appointments";
import AdminReports from "./pages/admin/Reports";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffAppointments from "./pages/staff/Appointments";
import ReportUpload from "./pages/staff/ReportUpload";
import StaffReports from "./pages/staff/Reports";
import NotFound from "./pages/NotFound";
import ImageManager from "./pages/admin/Imagemanager";
import ScheduleManagement from "./pages/admin/Schedulemanagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<ProtectedRoute allowedRoles={['admin']}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/centers" element={<AdminCenters />} />
              <Route path="/admin/centers/:centerId/staff" element={<CenterStaffPage />} />
              <Route path="/admin/procedures" element={<AdminProcedures />} />
              <Route path="/admin/staff" element={<AdminStaff />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/images" element={<ImageManager />} />
              <Route path="/admin/schedule" element={<ScheduleManagement />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']}><AppLayout /></ProtectedRoute>}>
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/staff/appointments" element={<StaffAppointments />} />
              <Route path="/staff/reports/upload" element={<ReportUpload />} />
              <Route path="/staff/reports" element={<StaffReports />} />

            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;