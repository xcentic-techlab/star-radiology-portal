import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Building2, Stethoscope, Users, CalendarDays } from 'lucide-react';
import api from '@/lib/axios';
import type { DashboardStats, Appointment } from '@/types';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; }> = ({ icon, label, value }) => (
  <div className="stat-card rounded-lg">
    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
  });

  const { data: appointments = [], isLoading: apptsLoading } = useQuery<Appointment[]>({
    queryKey: ['admin-recent-appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments', { params: { limit: 10 } });
      return res.data.appointments || res.data || [];
    },
  });

  const columns = [
    { key: 'patient', header: 'Patient', render: (a: Appointment) => a.patientId?.name || '—' },
    { key: 'center', header: 'Center', render: (a: Appointment) => a.centerId?.centerName || '—' },
    { key: 'procedure', header: 'Procedure', render: (a: Appointment) => a.procedureId?.name || '—' },
    {
      key: 'date', header: 'Date',
      render: (a: Appointment) => {
        try {
          return new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return '—'; }
      },
    },
    { key: 'payment', header: 'Payment', render: (a: Appointment) => <StatusBadge status={a.paymentStatus} type="payment" /> },
    { key: 'report', header: 'Report', render: (a: Appointment) => <StatusBadge status={a.reportStatus} type="report" /> },
  ];

  return (
    <>
      <AppHeader title="Dashboard" />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card rounded-lg animate-skeleton-pulse h-[88px]" />
            ))
          ) : (
            <>
              <StatCard icon={<Building2 size={20} />} label="Total Centers" value={stats?.totalCenters ?? 0} />
              <StatCard icon={<Stethoscope size={20} />} label="Total Procedures" value={stats?.totalProcedures ?? 0} />
              <StatCard icon={<Users size={20} />} label="Total Staff" value={stats?.totalStaff ?? 0} />
              <StatCard icon={<CalendarDays size={20} />} label="Today's Appointments" value={stats?.todayAppointments ?? 0} />
            </>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Recent Appointments</h2>
          </div>
          <DataTable
            columns={columns}
            data={appointments}
            loading={apptsLoading}
            emptyTitle="No appointments yet"
            rowKey={(a) => a._id}
          />
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
