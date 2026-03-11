import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Appointment } from '@/types';
import { format } from 'date-fns';

const APPT_STAGES = [
  { key: 'Pending',        icon: '⏳' },
  { key: 'Lab Processing', icon: '🔬' },
  { key: 'Doctor Review',  icon: '🩺' },
  { key: 'Completed',      icon: '✅' },
  { key: 'Report Ready',   icon: '📋' },
] as const;
type ApptStage = typeof APPT_STAGES[number]['key'];

const apptColors: Record<string,[string,string,string]> = {
  'Pending':        ['#fffbeb','#92400e','#f59e0b'],
  'Lab Processing': ['#eff6ff','#1e40af','#3b82f6'],
  'Doctor Review':  ['#f5f3ff','#5b21b6','#8b5cf6'],
  'Completed':      ['#ecfdf5','#065f46','#10b981'],
  'Report Ready':   ['#ecfdf5','#064e3b','#059669'],
  'Cancelled':      ['#fef2f2','#991b1b','#ef4444'],
};
const payColors: Record<string,[string,string,string]> = {
  'Pending':   ['#fffbeb','#92400e','#f59e0b'],
  'Paid':      ['#ecfdf5','#065f46','#10b981'],
  'Completed': ['#ecfdf5','#065f46','#10b981'],
  'Failed':    ['#fef2f2','#991b1b','#ef4444'],
};

const Badge: React.FC<{ status: string; map: Record<string,[string,string,string]> }> = ({ status, map }) => {
  const [bg, text, dot] = map[status] ?? ['#f9fafb','#374151','#9ca3af'];
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:bg,color:text,whiteSpace:'nowrap' }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:dot,flexShrink:0 }} />
      {status}
    </span>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
    <span style={{ fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.4px' }}>{label}</span>
    <span style={{ fontSize:13.5,fontWeight:600,color:'#0f172a' }}>{value || '—'}</span>
  </div>
);

const ProgressTracker: React.FC<{ status: string }> = ({ status }) => {
  const current = APPT_STAGES.findIndex(s => s.key === status);
  return (
    <div>
      <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12 }}>Appointment Progress</p>
      <div style={{ display:'flex',alignItems:'center' }}>
        {APPT_STAGES.map((s, i) => {
          const done = i < current, active = i === current;
          return (
            <React.Fragment key={s.key}>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center' }}>
                <div style={{
                  width:34,height:34,borderRadius:'50%',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                  background: done||active ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : '#f1f5f9',
                  border: active ? '2.5px solid #4f46e5' : done ? '2px solid transparent' : '2px solid #e2e8f0',
                  boxShadow: active ? '0 0 0 4px rgba(79,70,229,0.12)' : 'none',
                  color: done||active ? '#fff' : '#cbd5e1',
                }}>
                  {done ? '✓' : s.icon}
                </div>
                <span style={{ fontSize:9,width:54,textAlign:'center',marginTop:4,lineHeight:1.3,fontWeight:active?700:500,color:active?'#2563eb':done?'#64748b':'#cbd5e1' }}>
                  {s.key}
                </span>
              </div>
              {i < APPT_STAGES.length - 1 && (
                <div style={{ flex:1,height:3,marginBottom:20,borderRadius:2,background:i<current?'linear-gradient(90deg,#2563eb,#4f46e5)':'#f1f5f9',transition:'all 0.3s' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const UpdateDialog: React.FC<{ appt: Appointment; onClose: () => void }> = ({ appt, onClose }) => {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState<ApptStage>(appt.status as ApptStage);
  const [note, setNote] = useState(appt.statusNote ?? '');

  const fmtDate = (d: string) => { try { return format(new Date(d),'dd MMM yyyy'); } catch { return '—'; } };

  const mutation = useMutation({
    mutationFn: () => api.put(`/appointments/${appt._id}/status`, { status: newStatus, statusNote: note }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['staff-appointments'] }); onClose(); },
    onError: () => toast.error('Failed to update'),
  });

  const changed = newStatus !== appt.status || note !== (appt.statusNote ?? '');

  return (
<Dialog open onOpenChange={onClose}>
  <DialogContent
    style={{
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      width: '95vw',
      maxWidth: 520,
      maxHeight: '95dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 16px',
      gap: 10,
    }}
  >
    <DialogHeader style={{ paddingBottom: 0 }}>
      <DialogTitle style={{ fontSize:15,fontWeight:700,color:'#0f172a' }}>Appointment Details</DialogTitle>
    </DialogHeader>

    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))',
        gap:'6px 12px',
        background:'#f8fafc',borderRadius:10,padding:'10px 12px',border:'1px solid #f1f5f9'
      }}>
        <InfoRow label="Patient"   value={appt.user?.name || appt.fullName || ''} />
        <InfoRow label="Phone"     value={appt.user?.phone || appt.mobile || ''} />
        <InfoRow label="Center"    value={appt.center?.centerName || ''} />
        <InfoRow label="Procedure" value={typeof appt.procedure === 'string' ? appt.procedure : (appt.procedure as any)?.name || ''} />
        <InfoRow label="Date"      value={fmtDate(appt.date)} />
        <InfoRow label="Time"      value={appt.time} />
      </div>

      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10 }}>
        <span style={{ fontSize:12,fontWeight:600,color:'#64748b' }}>Payment:</span>
        <Badge status={appt.paymentStatus} map={payColors} />
        <span style={{ fontSize:11,color:'#94a3b8',fontStyle:'italic' }}>(Only admin can update)</span>
      </div>
      <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px 12px',overflowX:'auto' }}>
        <ProgressTracker status={newStatus} />
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
          <Label style={{ fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px' }}>Update Status</Label>
          <Select value={newStatus} onValueChange={v => setNewStatus(v as ApptStage)}>
            <SelectTrigger style={{ height:34,fontSize:13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPT_STAGES.map(s => <SelectItem key={s.key} value={s.key}><span style={{ display:'flex',alignItems:'center',gap:6 }}><span>{s.key}</span></span></SelectItem>)}
              <SelectItem value="Cancelled"><span style={{ display:'flex',alignItems:'center',gap:6 }}><span>Cancelled</span></span></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
          <Label style={{ fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px' }}>Note (optional)</Label>
          <Input placeholder="e.g. Sample collected..." value={note} onChange={e => setNote(e.target.value)} style={{ height:34,fontSize:13 }} />
        </div>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <Button variant="outline" onClick={onClose} style={{ height:34,fontSize:13 }}>Close</Button>
        <Button disabled={!changed || mutation.isPending} onClick={() => mutation.mutate()} style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)',border:'none',gap:6,height:34,fontSize:13 }}>
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </Button>
      </div>

      {mutation.isError && <p style={{ fontSize:11,color:'#ef4444',textAlign:'center',margin:0 }}>Failed to update. Please try again.</p>}
    </div>
  </DialogContent>
</Dialog>
  );
};

const StaffAppointments: React.FC = () => {
  const [page, setPage]     = useState(1);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff-appointments', page],
    queryFn: async () => {
      const res = await api.get('/appointments', { params: { page, limit: 10 } });
      return res.data;
    },
  });

  const appointments: Appointment[] = data?.appointments || data || [];
  const totalPages = data?.totalPages || data?.pages || 1;
  const fmtDate = (d: string) => { try { return format(new Date(d),'dd MMM yyyy'); } catch { return '—'; } };

  const columns = [
    { key: 'patient',   header: 'Patient',   render: (a: Appointment) => <span style={{ fontWeight:600,fontSize:13,color:'#0f172a' }}>{a.user?.name || a.fullName || '—'}</span> },
    { key: 'phone',     header: 'Phone',     render: (a: Appointment) => <span style={{ fontSize:13,color:'#64748b' }}>{a.user?.phone || a.mobile || '—'}</span> },
    { key: 'center',    header: 'Center',    render: (a: Appointment) => <span style={{ fontSize:13,color:'#475569' }}>{a.center?.centerName || '—'}</span> },
    { key: 'procedure', header: 'Procedure', render: (a: Appointment) => 
  <span style={{ fontSize:13,color:'#475569' }}>
    {typeof a.procedure === 'string' ? a.procedure : (a.procedure as any)?.name || '—'}
  </span>
},
    { key: 'date',      header: 'Date',      render: (a: Appointment) => <span style={{ fontSize:12,color:'#64748b',fontFamily:'monospace' }}>{fmtDate(a.date)}</span> },
    { key: 'status',    header: 'Status',    render: (a: Appointment) => <Badge status={a.status} map={apptColors} /> },
    { key: 'payment',   header: 'Payment',   render: (a: Appointment) => <Badge status={a.paymentStatus} map={payColors} /> },
    { key: 'actions',   header: '',          render: (a: Appointment) => (
      <button onClick={() => setEditAppt(a)} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='#eff6ff'; (e.currentTarget as HTMLElement).style.borderColor='#bfdbfe'; (e.currentTarget as HTMLElement).style.color='#2563eb'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='#fff'; (e.currentTarget as HTMLElement).style.borderColor='#e2e8f0'; (e.currentTarget as HTMLElement).style.color='#64748b'; }}>
        <Eye size={14} />
      </button>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sa-wrap { flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){.sa-wrap{padding:16px;}}
        .sa-card { background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden; }
        .sa-card-head { display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px; }
        .sa-card-title { font-size:15px;font-weight:700;color:#0f172a; }
        .sa-count { font-size:12px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 12px; }
      `}</style>

      <AppHeader title="Appointments" />
      <div className="sa-wrap">
        <div className="sa-card">
          <div className="sa-card-head">
            <span className="sa-card-title">My Appointments</span>
            <span className="sa-count">{appointments.length} records</span>
          </div>
          <DataTable columns={columns} data={appointments} loading={isLoading} emptyTitle="No appointments" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={a => a._id} />
        </div>
      </div>

      {editAppt && <UpdateDialog appt={editAppt} onClose={() => setEditAppt(null)} />}
    </>
  );
};

export default StaffAppointments;