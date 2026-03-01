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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Procedure } from '@/types';

const categories = ['MRI', 'CT Scan', 'Pathology', 'Ultrasound', 'X-Ray', 'Other'] as const;
const emptyProc: Partial<Procedure> = { name: '', category: 'MRI', description: '', priceRange: '', preparationInstructions: '', isActive: true };

const AdminProcedures: React.FC = () => {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Procedure>>(emptyProc);
  const [deleteTarget, setDeleteTarget] = useState<Procedure | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['procedures', page],
    queryFn: async () => { const res = await api.get('/admin/procedures', { params: { page, limit: 10 } }); return res.data; },
  });

  const procedures: Procedure[] = data?.procedures || data || [];
  const totalPages = data?.totalPages || 1;

  const save = useMutation({
    mutationFn: (p: Partial<Procedure>) => p._id ? api.put(`/admin/procedures/${p._id}`, p) : api.post('/admin/procedures', p),
    onSuccess: () => { toast.success(edit._id ? 'Updated' : 'Created'); qc.invalidateQueries({ queryKey: ['procedures'] }); setSheetOpen(false); },
    onError: () => toast.error('Failed to save'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/procedures/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['procedures'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const columns = [
    { key: 'name', header: 'Name', render: (p: Procedure) => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Category', render: (p: Procedure) => <span className="badge-pill badge-info">{p.category}</span> },
    { key: 'description', header: 'Description', render: (p: Procedure) => <span className="text-muted-foreground truncate max-w-[200px] block">{p.description || '—'}</span> },
    { key: 'priceRange', header: 'Price Range', render: (p: Procedure) => p.priceRange || '—' },
    { key: 'isActive', header: 'Status', render: (p: Procedure) => <StatusBadge status={String(p.isActive)} type="account" /> },
    {
      key: 'actions', header: 'Actions',
      render: (p: Procedure) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEdit({ ...p }); setSheetOpen(true); }}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AppHeader title="Procedures" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => toast.info('Feature coming soon')}><Upload size={14} className="mr-1.5" /> Import PDF</Button>
          <Button size="sm" onClick={() => { setEdit({ ...emptyProc }); setSheetOpen(true); }}><Plus size={14} className="mr-1.5" /> Add Procedure</Button>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <DataTable columns={columns} data={procedures} loading={isLoading} emptyTitle="No procedures yet" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={(p) => p._id} />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>{edit._id ? 'Edit Procedure' : 'Add Procedure'}</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }} className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v as Procedure['category'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} /></div>
            <div className="space-y-1.5"><Label>Price Range</Label><Input value={edit.priceRange || ''} onChange={(e) => setEdit({ ...edit, priceRange: e.target.value })} placeholder="e.g., ₹1500 - ₹3000" /></div>
            <div className="space-y-1.5"><Label>Preparation Instructions</Label><Textarea value={edit.preparationInstructions || ''} onChange={(e) => setEdit({ ...edit, preparationInstructions: e.target.value })} rows={3} /></div>
            <div className="flex items-center gap-3"><Switch checked={edit.isActive ?? true} onCheckedChange={(c) => setEdit({ ...edit, isActive: c })} /><Label>Active</Label></div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {edit._id ? 'Update' : 'Create'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleteTarget} title="Delete Procedure" message={`Delete "${deleteTarget?.name}"?`} onConfirm={() => deleteTarget && del.mutate(deleteTarget._id)} onCancel={() => setDeleteTarget(null)} loading={del.isPending} />
    </>
  );
};

export default AdminProcedures;
