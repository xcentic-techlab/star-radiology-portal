import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Appointment } from '@/types';
import { format } from 'date-fns';

const StaffAppointments: React.FC = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewAppt, setViewAppt] = useState<Appointment | null>(null);
  const [statusModal, setStatusModal] = useState<Appointment | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff-appointments', page],
    queryFn: async () => { const res = await api.get('/appointments', { params: { page, limit: 10 } }); return res.data; },
  });

  const appointments: Appointment[] = data?.appointments || data || [];
  const totalPages = data?.totalPages || 1;

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      api.put(`/appointments/${id}/status`, { status, note }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['staff-appointments'] }); setStatusModal(null); },
    onError: () => toast.error('Failed to update'),
  });

  const fmt = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; } };

  const columns = [
    { key: 'patient', header: 'Patient', render: (a: Appointment) => <span className="font-medium">{a.patientId?.name || '—'}</span> },
    { key: 'phone', header: 'Phone', render: (a: Appointment) => a.patientId?.phone || '—' },
    { key: 'procedure', header: 'Procedure', render: (a: Appointment) => a.procedureId?.name || '—' },
    { key: 'date', header: 'Date & Time', render: (a: Appointment) => `${fmt(a.appointmentDate)}, ${a.appointmentTime || ''}` },
    { key: 'payment', header: 'Payment', render: (a: Appointment) => <StatusBadge status={a.paymentStatus} type="payment" /> },
    { key: 'report', header: 'Report', render: (a: Appointment) => <StatusBadge status={a.reportStatus} type="report" /> },
    {
      key: 'actions', header: 'Actions',
      render: (a: Appointment) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewAppt(a)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setStatusModal(a); setNewStatus(a.paymentStatus); setNote(''); }}><RefreshCw size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AppHeader title="Appointments" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={appointments} loading={isLoading} emptyTitle="No appointments" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(a) => a._id} />
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={!!viewAppt} onOpenChange={() => setViewAppt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Appointment Details</DialogTitle></DialogHeader>
          {viewAppt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Patient:</span> <strong>{viewAppt.patientId?.name}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> {viewAppt.patientId?.phone}</div>
                <div><span className="text-muted-foreground">Procedure:</span> {viewAppt.procedureId?.name}</div>
                <div><span className="text-muted-foreground">Date:</span> {fmt(viewAppt.appointmentDate)}</div>
                <div><span className="text-muted-foreground">Time:</span> {viewAppt.appointmentTime}</div>
              </div>
              <div className="flex gap-3 pt-2">
                <StatusBadge status={viewAppt.paymentStatus} type="payment" />
                <StatusBadge status={viewAppt.reportStatus} type="report" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={!!statusModal} onOpenChange={() => setStatusModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); statusModal && updateStatus.mutate({ id: statusModal._id, status: newStatus, note }); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></div>
            <Button type="submit" className="w-full" disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Update
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffAppointments;
