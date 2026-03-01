import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Report, Center } from '@/types';
import { format } from 'date-fns';

const AdminReports: React.FC = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [centerId, setCenterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const { data: centersData } = useQuery({
    queryKey: ['centers-list'],
    queryFn: async () => { const res = await api.get('/centers'); return res.data.centers || res.data || []; },
  });
  const centers: Center[] = centersData || [];

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page, centerId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (centerId) params.centerId = centerId;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/reports', { params });
      return res.data;
    },
  });

  const reports: Report[] = data?.reports || data || [];
  const totalPages = data?.totalPages || 1;

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reports/${id}`),
    onSuccess: () => { toast.success('Report deleted'); qc.invalidateQueries({ queryKey: ['reports'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const columns = [
    { key: 'patient', header: 'Patient', render: (r: Report) => <span className="font-medium">{r.appointmentId?.patientId?.name || '—'}</span> },
    { key: 'center', header: 'Center', render: (r: Report) => r.appointmentId?.centerId?.centerName || '—' },
    { key: 'procedure', header: 'Procedure', render: (r: Report) => r.appointmentId?.procedureId?.name || '—' },
    { key: 'date', header: 'Upload Date', render: (r: Report) => { try { return format(new Date(r.createdAt), 'dd MMM yyyy'); } catch { return '—'; } } },
    { key: 'uploadedBy', header: 'Uploaded By', render: (r: Report) => r.uploadedBy?.name || '—' },
    {
      key: 'actions', header: 'Actions',
      render: (r: Report) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => window.open(r.fileUrl, '_blank')}><Download size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AppHeader title="Reports" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <Select value={centerId} onValueChange={setCenterId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Centers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All Centers</SelectItem>
              {centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={reports} loading={isLoading} emptyTitle="No reports found" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(r) => r._id} />
        </div>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Report" message="Are you sure you want to delete this report?" onConfirm={() => deleteTarget && del.mutate(deleteTarget._id)} onCancel={() => setDeleteTarget(null)} loading={del.isPending} />
    </>
  );
};

export default AdminReports;
