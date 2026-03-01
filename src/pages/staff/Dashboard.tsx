import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import StatusBadge from '@/components/StatusBadge';
import { CalendarDays, Clock, CheckCircle, FileText } from 'lucide-react';
import api from '@/lib/axios';
import type { DashboardStats, Appointment } from '@/types';
import { format } from 'date-fns';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = ({ icon, label, value }) => (
  <div className="stat-card rounded-lg">
    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">{icon}</div>
    <div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  </div>
);

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading: sl } = useQuery<DashboardStats>({
    queryKey: ['staff-stats'],
    queryFn: async () => { const res = await api.get('/dashboard/stats'); return res.data; },
  });

  const { data: appointments = [], isLoading: al } = useQuery<Appointment[]>({
    queryKey: ['staff-today-appts'],
    queryFn: async () => { const res = await api.get('/appointments', { params: { limit: 5, today: true } }); return res.data.appointments || res.data || []; },
  });

  return (
    <>
      <AppHeader title="Dashboard" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Welcome, {user?.name || 'Staff'}</h2>
          {user?.centerName && <p className="text-sm text-muted-foreground">{user.centerName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {sl ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="stat-card rounded-lg animate-skeleton-pulse h-[88px]" />) : (
            <>
              <StatCard icon={<CalendarDays size={20} />} label="Today's Appointments" value={stats?.todayAppointments ?? 0} />
              <StatCard icon={<Clock size={20} />} label="Pending Verification" value={stats?.pendingPayments ?? 0} />
              <StatCard icon={<CheckCircle size={20} />} label="Completed Today" value={stats?.completedToday ?? 0} />
              <StatCard icon={<FileText size={20} />} label="Reports This Week" value={stats?.reportsThisWeek ?? 0} />
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium">Today's Appointments</h3>
            <Link to="/staff/appointments" className="text-xs text-accent hover:underline">View All</Link>
          </div>
          {al ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No appointments today</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Patient</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Procedure</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Time</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Payment</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Report</th>
              </tr></thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a._id} className="table-row-hover border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{a.patientId?.name}</td>
                    <td className="px-4 py-3">{a.procedureId?.name}</td>
                    <td className="px-4 py-3">{a.appointmentTime}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.paymentStatus} type="payment" /></td>
                    <td className="px-4 py-3"><StatusBadge status={a.reportStatus} type="report" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default StaffDashboard;
