export interface Center {
  _id: string;
  centerName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  googleMapsLink?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Procedure {
  _id: string;
  name: string;
  category: 'MRI' | 'CT Scan' | 'Pathology' | 'Ultrasound' | 'X-Ray' | 'Other';
  description?: string;
  priceRange?: string;
  preparationInstructions?: string;
  isActive: boolean;
}

export interface CenterStaff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  centerId: Center;
  role: 'center_staff' | 'center_admin';
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  patientId: {
    name: string;
    phone: string;
  };
  centerId: Center;
  procedureId: Procedure;
  appointmentDate: string;
  appointmentTime: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  reportStatus: 'not_uploaded' | 'uploaded' | 'completed';
  status: string;
  note?: string;
}

export interface Report {
  _id: string;
  appointmentId: Appointment;
  uploadedBy: CenterStaff;
  fileUrl: string;
  reportType: string;
  notes?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  role: 'admin' | 'center_staff' | 'center_admin';
  name?: string;
  centerId?: string;
  centerName?: string;
}

export interface DashboardStats {
  totalCenters?: number;
  totalProcedures?: number;
  totalStaff?: number;
  todayAppointments: number;
  pendingPayments?: number;
  completedToday?: number;
  reportsThisWeek?: number;
}
