import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import api from '@/lib/axios';
import type { CenterStaff } from '@/types';

const CenterStaffPage: React.FC = () => {
  const { centerId } = useParams();
  const [page, setPage] = useState(1);

  const { data: centerData } = useQuery({
    queryKey: ['center', centerId],
    queryFn: async () => {
      const res = await api.get(`/admin/centers`);
      const centers = res.data.centers || res.data || [];
      return centers.find((c: { _id: string }) => c._id === centerId);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['center-staff', centerId, page],
    queryFn: async () => {
      const res = await api.get('/admin/staff', { params: { centerId, page, limit: 10 } });
      return res.data;
    },
  });

  const staff: CenterStaff[] = data?.staff || data || [];
  const totalPages = data?.totalPages || 1;

  const columns = [
    { key: 'name', header: 'Name', render: (s: CenterStaff) => <span className="font-medium">{s.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (s: CenterStaff) => <span className="badge-pill badge-info">{s.role.replace('_', ' ')}</span> },
    { key: 'isActive', header: 'Status', render: (s: CenterStaff) => <StatusBadge status={String(s.isActive)} type="account" /> },
    {
      key: 'createdAt', header: 'Created',
      render: (s: CenterStaff) => new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
  ];

  return (
    <>
      <AppHeader title={`Staff — ${centerData?.centerName || 'Center'}`} />
      <div className="flex-1 p-6 overflow-y-auto">
        <nav className="text-xs text-muted-foreground mb-4 flex gap-1.5">
          <a href="/admin/centers" className="hover:text-foreground">Centers</a>
          <span>›</span>
          <span className="text-foreground">{centerData?.centerName || 'Staff'}</span>
        </nav>
        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={staff} loading={isLoading} emptyTitle="No staff assigned" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(s) => s._id} />
        </div>
      </div>
    </>
  );
};

export default CenterStaffPage;
