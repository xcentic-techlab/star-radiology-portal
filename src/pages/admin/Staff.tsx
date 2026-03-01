import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { CenterStaff, Center } from '@/types';

const AdminStaff: React.FC = () => {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [edit, setEdit] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: async () => { const res = await api.get('/admin/staff', { params: { page, limit: 10 } }); return res.data; },
  });

  const { data: centersData } = useQuery({
    queryKey: ['centers-list'],
    queryFn: async () => { const res = await api.get('/centers'); return res.data.centers || res.data || []; },
  });

  const staff: CenterStaff[] = data?.staff || data || [];
  const centers: Center[] = centersData || [];
  const totalPages = data?.totalPages || 1;

  const save = useMutation({
    mutationFn: (s: Record<string, unknown>) => {
      if (isCreate) return api.post('/admin/staff', s);
      return api.put(`/admin/staff/${s._id}`, s);
    },
    onSuccess: () => { toast.success(isCreate ? 'Staff created' : 'Staff updated'); qc.invalidateQueries({ queryKey: ['staff'] }); setSheetOpen(false); },
    onError: () => toast.error('Failed to save'),
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setEdit({ ...edit, password: pw });
    toast.success('Password generated');
  };

  const openCreate = () => { setIsCreate(true); setEdit({ name: '', email: '', password: '', phone: '', centerId: '', role: 'center_staff' }); setSheetOpen(true); };
  const openEdit = (s: CenterStaff) => {
    setIsCreate(false);
    setEdit({ _id: s._id, name: s.name, phone: s.phone, centerId: typeof s.centerId === 'object' ? s.centerId._id : s.centerId, role: s.role, isActive: s.isActive });
    setSheetOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Name', render: (s: CenterStaff) => <span className="font-medium">{s.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'center', header: 'Center', render: (s: CenterStaff) => <span className="badge-pill badge-info">{typeof s.centerId === 'object' ? s.centerId.centerName : '—'}</span> },
    { key: 'role', header: 'Role', render: (s: CenterStaff) => s.role.replace('_', ' ') },
    { key: 'isActive', header: 'Status', render: (s: CenterStaff) => <StatusBadge status={String(s.isActive)} type="account" /> },
    { key: 'createdAt', header: 'Created', render: (s: CenterStaff) => new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
    {
      key: 'actions', header: 'Actions',
      render: (s: CenterStaff) => <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={14} /></Button>,
    },
  ];

  return (
    <>
      <AppHeader title="Staff Management" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Create Staff Account</Button>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={staff} loading={isLoading} emptyTitle="No staff accounts" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(s) => s._id} />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>{isCreate ? 'Create Staff Account' : 'Edit Staff'}</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={String(edit.name || '')} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></div>
            {isCreate && (
              <>
                <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={String(edit.email || '')} onChange={(e) => setEdit({ ...edit, email: e.target.value })} required /></div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <div className="flex gap-2">
                    <Input value={String(edit.password || '')} onChange={(e) => setEdit({ ...edit, password: e.target.value })} required className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={generatePassword}><RefreshCw size={14} className="mr-1" /> Generate</Button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5"><Label>Phone</Label><Input value={String(edit.phone || '')} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Center</Label>
              <Select value={String(edit.centerId || '')} onValueChange={(v) => setEdit({ ...edit, centerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>{centers.map((c) => <SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={String(edit.role || 'center_staff')} onValueChange={(v) => setEdit({ ...edit, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center_staff">Center Staff</SelectItem>
                  <SelectItem value="center_admin">Center Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isCreate && (
              <div className="flex items-center gap-3"><Switch checked={edit.isActive as boolean ?? true} onCheckedChange={(c) => setEdit({ ...edit, isActive: c })} /><Label>Active</Label></div>
            )}
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {isCreate ? 'Create Account' : 'Update Staff'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminStaff;
