import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, Save, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Appointment, Center } from '@/types';
import { format } from 'date-fns';

const APPT_STAGES = [
  { key: 'Pending',        icon: '⏳' },
  { key: 'Lab Processing', icon: '🔬' },
  { key: 'Doctor Review',  icon: '🩺' },
  { key: 'Completed',      icon: '✅' },
  { key: 'Report Ready',   icon: '📋' },
] as const;

type ApptStage    = typeof APPT_STAGES[number]['key'];
type PaymentStage = 'Pending' | 'Paid' | 'Refunded' | 'Failed' | 'Completed';

const PAYMENT_OPTIONS: { value: PaymentStage; label: string }[] = [
  { value: 'Pending',  label: 'Pending'  },
  { value: 'Paid',     label: 'Paid'     },
  { value: 'Refunded', label: 'Refunded' },
  { value: 'Failed',   label: 'Failed'   },
];

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
  'Refunded':  ['#eff6ff','#1e40af','#3b82f6'],
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
                  width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                  background: done || active ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : '#f1f5f9',
                  border: active ? '2.5px solid #4f46e5' : done ? '2px solid transparent' : '2px solid #e2e8f0',
                  boxShadow: active ? '0 0 0 4px rgba(79,70,229,0.12)' : 'none',
                  color: done || active ? '#fff' : '#cbd5e1', transition:'all 0.25s',
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

const getCenter  = (a: any): string => a.centerName || a.center?.centerName || a.center || '—';
const getProcedure = (a: any): string => a.procedure || a.procedure?.name || a.procedureId?.name || a.procedureName || '—';
const getPatient = (a: any): string => a.fullName || a.user?.name || a.patientName || '—';
const getPhone   = (a: any): string => a.mobile || a.user?.phone || a.phone || '—';

const UpdateDialog: React.FC<{ appt: any; onClose: () => void }> = ({ appt, onClose }) => {
  const qc = useQueryClient();
  const [newStatus,  setNewStatus]  = useState<ApptStage>(appt.status as ApptStage);
  const [newPayment, setNewPayment] = useState<PaymentStage>(appt.paymentStatus as PaymentStage);
  const [note, setNote] = useState(appt.adminNotes ?? appt.statusNote ?? '');

  const fmtDate = (d: string) => { try { return format(new Date(d),'dd MMM yyyy'); } catch { return '—'; } };

  const mutation = useMutation({
    mutationFn: () => api.patch(`/admin/appointments/${appt._id}/status`, {
      status: newStatus,
      paymentStatus: newPayment,
      statusNote: note,
    }),
    onSuccess: () => {
      toast.success('Updated successfully');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: () => toast.error('Failed to update. Please try again.'),
  });

  const changed = newStatus !== appt.status || newPayment !== appt.paymentStatus || note !== (appt.adminNotes ?? appt.statusNote ?? '');

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
      <DialogHeader style={{ paddingBottom: 0, marginBottom: 0 }}>
        <DialogTitle style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
          Appointment Details
        </DialogTitle>
      </DialogHeader>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '6px 12px',
          background: '#f8fafc',
          borderRadius: 10,
          padding: '10px 12px',
          border: '1px solid #f1f5f9',
        }}
      >
        <InfoRow label="Patient"    value={getPatient(appt)} />
        <InfoRow label="Phone"      value={getPhone(appt)} />
        <InfoRow label="Center"     value={getCenter(appt)} />
        <InfoRow label="Procedure"  value={getProcedure(appt)} />
        <InfoRow label="Date"       value={fmtDate(appt.date)} />
        <InfoRow label="Time"       value={appt.time || '—'} />
        {appt.amount && <InfoRow label="Amount" value={`₹${appt.amount}`} />}
        {appt.discountAmount > 0 && (
          <InfoRow
            label="Discount"
            value={`₹${appt.discountAmount}${appt.couponCode ? ` (${appt.couponCode})` : ''}`}
          />
        )}
        <InfoRow label="Pay Method" value={appt.paymentMethod || '—'} />
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '8px 12px',
          overflowX: 'auto',
        }}
      >
        <ProgressTracker status={newStatus} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Appt. Status
          </Label>
          <Select value={newStatus} onValueChange={(v: string) => setNewStatus(v as ApptStage)}>
            <SelectTrigger style={{ height: 34, fontSize: 13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPT_STAGES.map(s => (
                <SelectItem key={s.key} value={s.key}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{s.key}</span>
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="Cancelled">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Cancelled</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Payment Status
          </Label>
          <Select value={newPayment} onValueChange={(v: string) => setNewPayment(v as PaymentStage)}>
            <SelectTrigger style={{ height: 34, fontSize: 13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Internal Note (optional)
        </Label>
        <Input
          placeholder="e.g. Sample collected, awaiting results..."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ height: 34, fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
        <Button variant="outline" onClick={onClose} style={{ height: 34, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          disabled={!changed || mutation.isPending}
          onClick={() => mutation.mutate()}
          style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', border: 'none', gap: 6, height: 34, fontSize: 13 }}
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Changes
        </Button>
      </div>

      {mutation.isError && (
        <p style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', margin: 0 }}>
          Failed to update. Please try again.
        </p>
      )}
    </DialogContent>
  </Dialog>
);
};

const AdminAppointments: React.FC = () => {
  const [page,       setPage]       = useState(1);
  const [filterCenter, setFilterCenter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [search,     setSearch]     = useState('');
  const [editAppt,   setEditAppt]   = useState<any | null>(null);

  const { data: centersData } = useQuery({
    queryKey: ['all-centers-admin'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/centers', { params:{ limit:100 } });
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.centers)) return d.centers;
        return [];
      } catch {
        const res = await api.get('/centers', { params:{ limit:100 } });
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.centers)) return d.centers;
        return [];
      }
    },
    staleTime: 5*60*1000,
  });
  const centers: Center[] = Array.isArray(centersData) ? centersData : [];

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, filterCenter, filterStatus, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterCenter && filterCenter !== 'all') params.centerId = filterCenter;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await api.get('/admin/appointments', { params });
      return res.data;
    },
  });

  const allAppointments: any[] = Array.isArray(data?.appointments) ? data.appointments : [];
  const totalPages = data?.totalPages || 1;


  const appointments = search
    ? allAppointments.filter(a => {
        const q = search.toLowerCase();
        return getPatient(a).toLowerCase().includes(q) || getPhone(a).includes(q);
      })
    : allAppointments;

  const hasFilters = (filterCenter && filterCenter !== 'all') || (filterStatus && filterStatus !== 'all') || dateFrom || dateTo || search;
  const clearFilters = () => { setFilterCenter('all'); setFilterStatus('all'); setDateFrom(''); setDateTo(''); setSearch(''); };

  const fmtDate = (d: string) => { try { return format(new Date(d),'dd MMM yyyy'); } catch { return '—'; } };

  const columns = [
    { key:'patient',   header:'Patient',   render:(a:any) => <span style={{ fontWeight:600,fontSize:13,color:'#0f172a' }}>{getPatient(a)}</span> },
    { key:'phone',     header:'Phone',     render:(a:any) => <span style={{ fontSize:13,color:'#64748b' }}>{getPhone(a)}</span> },
    { key:'center',    header:'Center',    render:(a:any) => <span style={{ fontSize:13,color:'#475569' }}>{getCenter(a)}</span> },
    { key:'procedure', header:'Procedure', render:(a:any) => <span style={{ fontSize:13,color:'#475569' }}>{getProcedure(a)}</span> },
    { key:'date',      header:'Date',      render:(a:any) => <span style={{ fontSize:12,color:'#64748b',fontFamily:'monospace' }}>{fmtDate(a.date)}</span> },
    { key:'status',    header:'Status',    render:(a:any) => <Badge status={a.status} map={apptColors} /> },
    { key:'payment',   header:'Payment',   render:(a:any) => <Badge status={a.paymentStatus} map={payColors} /> },
    { key:'actions',   header:'',          render:(a:any) => (
      <button onClick={() => setEditAppt(a)}
        style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 0.15s' }}
        onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.background='#eff6ff'; el.style.borderColor='#bfdbfe'; el.style.color='#2563eb'; }}
        onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.background='#fff'; el.style.borderColor='#e2e8f0'; el.style.color='#64748b'; }}>
        <Eye size={14}/>
      </button>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .aa-wrap{flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;}
        @media(max-width:640px){.aa-wrap{padding:16px;}}
        .aa-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;}
        .aa-title{font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;}
        .aa-title-sub{font-size:13px;color:#64748b;margin-top:2px;}
        .aa-card{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden;}
        .aa-card-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px;}
        .aa-card-title{font-size:15px;font-weight:700;color:#0f172a;}
        .aa-count{font-size:12px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 12px;}
        .aa-filterbar{display:flex;align-items:center;gap:0;padding:10px 16px;background:#fff;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow-x:auto;}
        .aa-filter-label{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;margin-right:12px;flex-shrink:0;}
        .aa-filter-sep{width:1px;height:22px;background:#e2e8f0;flex-shrink:0;margin:0 10px;}
        .aa-fselect{height:34px !important;min-width:130px;max-width:170px;font-size:12px !important;border-radius:8px !important;border:1px solid #e2e8f0 !important;flex-shrink:0;}
        .aa-fdate{height:34px;border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;color:#0f172a;flex-shrink:0;width:140px;}
        .aa-fdate:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(59,130,246,0.1);}
        .aa-fsearch{height:34px;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;min-width:150px;color:#0f172a;flex-shrink:0;}
        .aa-fsearch:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(59,130,246,0.1);}
        .aa-clear-btn{display:flex;align-items:center;gap:4px;padding:0 10px;height:34px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;font-size:12px;font-weight:600;color:#ef4444;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;margin-left:12px;flex-shrink:0;}
        .aa-clear-btn:hover{background:#fee2e2;}
        .aa-result-count{font-size:12px;color:#94a3b8;font-weight:500;margin-bottom:8px;}
      `}</style>

      <AppHeader title="Appointments"/>
      <div className="aa-wrap">
        <div className="aa-topbar">
          <div>
            <h2 className="aa-title">Appointments</h2>
            <p className="aa-title-sub">View and manage all patient appointments</p>
          </div>
        </div>

        <div className="aa-filterbar">
          <span className="aa-filter-label">Filter:</span>

          <Select value={filterCenter} onValueChange={setFilterCenter}>
            <SelectTrigger className="aa-fselect"><SelectValue placeholder="All Centers"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centers</SelectItem>
              {centers.map(c => <SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="aa-filter-sep"/>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="aa-fselect"><SelectValue placeholder="All Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {APPT_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.key}</SelectItem>)}
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <div className="aa-filter-sep"/>

          <input className="aa-fdate" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date"/>

          <div className="aa-filter-sep"/>

          <input className="aa-fdate" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date"/>

          <div className="aa-filter-sep"/>

          <input className="aa-fsearch" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..."/>

          {hasFilters && (
            <button className="aa-clear-btn" onClick={clearFilters}><X size={11}/> Clear</button>
          )}
        </div>

        {hasFilters && (
          <div className="aa-result-count">Showing {appointments.length} of {allAppointments.length} appointments</div>
        )}

        <div className="aa-card">
          <div className="aa-card-head">
            <span className="aa-card-title">All Appointments</span>
            <span className="aa-count">{appointments.length} records</span>
          </div>
          <DataTable
            columns={columns}
            data={appointments}
            loading={isLoading}
            emptyTitle={hasFilters ? 'No appointments found matching your filters' : 'No appointments found'}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            rowKey={a => a._id}
          />
        </div>
      </div>

      {editAppt && <UpdateDialog appt={editAppt} onClose={() => setEditAppt(null)} />}
    </>
  );
};

export default AdminAppointments;