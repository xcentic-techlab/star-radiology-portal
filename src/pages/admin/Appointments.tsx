import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import api from '@/lib/axios';
import type { Appointment, Center } from '@/types';
import { format } from 'date-fns';

const AdminAppointments: React.FC = () => {
  const [page, setPage] = useState(1);
  const [centerId, setCenterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewAppt, setViewAppt] = useState<Appointment | null>(null);

  const { data: centersData } = useQuery({
    queryKey: ['centers-list'],
    queryFn: async () => { const res = await api.get('/centers'); return res.data.centers || res.data || []; },
  });
  const centers: Center[] = centersData || [];

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, centerId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (centerId) params.centerId = centerId;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/appointments', { params });
      return res.data;
    },
  });

  const appointments: Appointment[] = data?.appointments || data || [];
  const totalPages = data?.totalPages || 1;

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
  };

  const columns = [
    { key: 'patient', header: 'Patient', render: (a: Appointment) => <span className="font-medium">{a.patientId?.name || '—'}</span> },
    { key: 'phone', header: 'Phone', render: (a: Appointment) => a.patientId?.phone || '—' },
    { key: 'center', header: 'Center', render: (a: Appointment) => a.centerId?.centerName || '—' },
    { key: 'procedure', header: 'Procedure', render: (a: Appointment) => a.procedureId?.name || '—' },
    { key: 'date', header: 'Date', render: (a: Appointment) => formatDate(a.appointmentDate) },
    { key: 'payment', header: 'Payment', render: (a: Appointment) => <StatusBadge status={a.paymentStatus} type="payment" /> },
    { key: 'report', header: 'Report', render: (a: Appointment) => <StatusBadge status={a.reportStatus} type="report" /> },
    {
      key: 'actions', header: '',
      render: (a: Appointment) => <Button variant="ghost" size="sm" onClick={() => setViewAppt(a)}><Eye size={14} /></Button>,
    },
  ];

  return (
    <>
      <AppHeader title="Appointments" />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-48">
            <Select value={centerId} onValueChange={setCenterId}>
              <SelectTrigger><SelectValue placeholder="All Centers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Centers</SelectItem>
                {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
        </div>

        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={appointments} loading={isLoading} emptyTitle="No appointments found" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(a) => a._id} />
        </div>
      </div>

      <Dialog open={!!viewAppt} onOpenChange={() => setViewAppt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Appointment Details</DialogTitle></DialogHeader>
          {viewAppt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Patient:</span> <strong>{viewAppt.patientId?.name}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> {viewAppt.patientId?.phone}</div>
                <div><span className="text-muted-foreground">Center:</span> {viewAppt.centerId?.centerName}</div>
                <div><span className="text-muted-foreground">Procedure:</span> {viewAppt.procedureId?.name}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(viewAppt.appointmentDate)}</div>
                <div><span className="text-muted-foreground">Time:</span> {viewAppt.appointmentTime}</div>
              </div>
              <div className="flex gap-3 pt-2">
                <StatusBadge status={viewAppt.paymentStatus} type="payment" />
                <StatusBadge status={viewAppt.reportStatus} type="report" />
              </div>
              {viewAppt.note && <p className="text-muted-foreground border-t border-border pt-2">{viewAppt.note}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminAppointments;
