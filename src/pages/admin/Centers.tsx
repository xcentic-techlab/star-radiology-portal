import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, Users, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import type { Center } from '@/types';

const emptyCenter: Partial<Center> = {
  centerName: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', googleMapsLink: '', isActive: true,
};

const AdminCenters: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Center>>(emptyCenter);
  const [deleteTarget, setDeleteTarget] = useState<Center | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['centers', page],
    queryFn: async () => {
      const res = await api.get('/admin/centers', { params: { page, limit: 10 } });
      return res.data;
    },
  });

  const centers: Center[] = data?.centers || data || [];
  const totalPages = data?.totalPages || 1;

  const saveMutation = useMutation({
    mutationFn: async (center: Partial<Center>) => {
      if (center._id) {
        return api.put(`/admin/centers/${center._id}`, center);
      }
      return api.post('/admin/centers', center);
    },
    onSuccess: () => {
      toast.success(editItem._id ? 'Center updated' : 'Center created');
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      setSheetOpen(false);
    },
    onError: () => toast.error('Failed to save center'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/centers/${id}`),
    onSuccess: () => {
      toast.success('Center deleted');
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete center'),
  });

  const openCreate = () => { setEditItem({ ...emptyCenter }); setSheetOpen(true); };
  const openEdit = (c: Center) => { setEditItem({ ...c }); setSheetOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editItem);
  };

  const columns = [
    { key: 'centerName', header: 'Name', render: (c: Center) => <span className="font-medium">{c.centerName}</span> },
    { key: 'city', header: 'City' },
    { key: 'phone', header: 'Contact' },
    { key: 'isActive', header: 'Status', render: (c: Center) => <StatusBadge status={String(c.isActive)} type="account" /> },
    {
      key: 'actions', header: 'Actions',
      render: (c: Center) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/centers/${c._id}/staff`)}><Users size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AppHeader title="Centers" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info('Feature coming soon — please add centers manually')}>
              <Upload size={14} className="mr-1.5" /> Import PDF
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} className="mr-1.5" /> Add Center
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={centers} loading={isLoading} emptyTitle="No centers yet" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(c) => c._id} />
        </div>
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editItem._id ? 'Edit Center' : 'Add Center'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Center Name *</Label>
              <Input value={editItem.centerName || ''} onChange={(e) => setEditItem({ ...editItem, centerName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={editItem.address || ''} onChange={(e) => setEditItem({ ...editItem, address: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>City</Label><Input value={editItem.city || ''} onChange={(e) => setEditItem({ ...editItem, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>State</Label><Input value={editItem.state || ''} onChange={(e) => setEditItem({ ...editItem, state: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Pincode</Label><Input value={editItem.pincode || ''} onChange={(e) => setEditItem({ ...editItem, pincode: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editItem.phone || ''} onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editItem.email || ''} onChange={(e) => setEditItem({ ...editItem, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Google Maps Link</Label><Input value={editItem.googleMapsLink || ''} onChange={(e) => setEditItem({ ...editItem, googleMapsLink: e.target.value })} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={editItem.isActive ?? true} onCheckedChange={(checked) => setEditItem({ ...editItem, isActive: checked })} />
              <Label>Active</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editItem._id ? 'Update Center' : 'Create Center'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Center"
        message={`Are you sure you want to delete "${deleteTarget?.centerName}"? This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
};

export default AdminCenters;
