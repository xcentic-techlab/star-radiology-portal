import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { Building2, Stethoscope, Users, CalendarDays, X, MapPin, Phone, Mail } from 'lucide-react';
import api from '@/lib/axios';
import type { DashboardStats, Appointment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

type DrawerKey = 'totalCenters' | 'totalProcedures' | 'totalStaff' | 'todayAppointments' | null;

const STAT_CONFIG = [
  { key: 'totalCenters',      label: 'Total Centers',        Icon: Building2,    color: '#2563eb', lightBg: '#eff6ff', lightBorder: '#bfdbfe' },
  { key: 'totalProcedures',   label: 'Total Procedures',     Icon: Stethoscope,  color: '#7c3aed', lightBg: '#f5f3ff', lightBorder: '#ddd6fe' },
  { key: 'totalStaff',        label: 'Total Staff',          Icon: Users,        color: '#0891b2', lightBg: '#ecfeff', lightBorder: '#a5f3fc' },
  { key: 'todayAppointments', label: "Today's Appointments", Icon: CalendarDays, color: '#059669', lightBg: '#ecfdf5', lightBorder: '#a7f3d0' },
] as const;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Pending':        { bg: '#fffbeb', color: '#92400e' },
  'Lab Processing': { bg: '#eff6ff', color: '#1e40af' },
  'Doctor Review':  { bg: '#f5f3ff', color: '#5b21b6' },
  'Completed':      { bg: '#ecfdf5', color: '#065f46' },
  'Report Ready':   { bg: '#ecfdf5', color: '#064e3b' },
  'Cancelled':      { bg: '#fef2f2', color: '#991b1b' },
  'Paid':           { bg: '#ecfdf5', color: '#065f46' },
  'Failed':         { bg: '#fef2f2', color: '#991b1b' },
  'Refunded':       { bg: '#eff6ff', color: '#1e40af' },
};

const Tag = ({ label }: { label: string }) => {
  const c = STATUS_COLORS[label] ?? { bg: '#f1f5f9', color: '#475569' };
  return <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>{label}</span>;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text:'Good morning', sub:"Here's what's happening across all centers today." };
  if (h >= 12 && h < 17) return { text:'Good afternoon', sub:"Here's your midday overview across all centers." };
  if (h >= 17 && h < 21) return { text:'Good evening', sub:"Here's today's summary across all centers." };
  return                         { text:'Good night', sub:"Wrapping up? Here's the day's overview." };
}

const getPatient   = (a: any) => a.fullName || a.user?.name || a.patientName || '—';
const getPhone     = (a: any) => a.mobile || a.user?.phone || a.phone || null;
const getProcedure = (a: any) => a.procedureName || a.procedure?.name || a.procedureId?.name || a.procedure || '—';
const getCenter    = (a: any) => a.centerName || a.center?.centerName || a.center || '—';
const fmtDate      = (d: string) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '—'; } };

const Drawer: React.FC<{ dk: DrawerKey; onClose: () => void }> = ({ dk, onClose }) => {
  const cfg = STAT_CONFIG.find(s => s.key === dk)!;

  const { data, isLoading } = useQuery({
    queryKey: ['drw', dk],
    enabled: !!dk,
    staleTime: 30_000,
    queryFn: async () => {
      if (dk === 'totalCenters')      return (await api.get('/centers')).data;
      if (dk === 'totalProcedures')   return (await api.get('/procedures')).data;
      if (dk === 'totalStaff')        return (await api.get('/admin/staff')).data;
      if (dk === 'todayAppointments') {
        const t = new Date().toISOString().split('T')[0];
        return (await api.get('/admin/appointments', { params:{ dateFrom:t, dateTo:t, limit:50 } })).data;
      }
    },
  });

  const centers = data?.centers ?? [];
  const procs   = data?.procedures ?? data?.data ?? [];
  const staff   = data?.staff ?? data?.data ?? [];
  const appts   = data?.appointments ?? [];

  const count = dk==='totalCenters' ? centers.length : dk==='totalProcedures' ? procs.length : dk==='totalStaff' ? staff.length : appts.length;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(15,23,42,0.2)',backdropFilter:'blur(2px)',zIndex:200 }} />
      <div style={{ position:'fixed',top:0,right:0,bottom:0,width:390,maxWidth:'100vw',background:'#fff',zIndex:201,display:'flex',flexDirection:'column',boxShadow:'-2px 0 24px rgba(0,0,0,0.09)',animation:'sIn .22s cubic-bezier(.22,1,.36,1)',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes sIn{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes sp{to{transform:rotate(360deg)}}`}</style>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:cfg.lightBg, border:`1px solid ${cfg.lightBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <cfg.Icon size={15} color={cfg.color} />
            </div>
            <div>
              <div style={{ fontSize:13.5, fontWeight:700, color:'#0f172a' }}>{cfg.label}</div>
              <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:1 }}>{isLoading ? '…' : count} {dk==='totalCenters'?'centers':dk==='totalProcedures'?'procedures':dk==='totalStaff'?'members':'appointments'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',flexShrink:0 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>

          {isLoading && (
            <div style={{ paddingTop:56, textAlign:'center' }}>
              <div style={{ width:26,height:26,borderRadius:'50%',border:`2px solid ${cfg.lightBorder}`,borderTopColor:cfg.color,animation:'sp .7s linear infinite',margin:'0 auto 10px' }} />
              <p style={{ color:'#94a3b8',fontSize:12 }}>Loading…</p>
            </div>
          )}

          {!isLoading && dk==='totalCenters' && (centers.length===0
            ? <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,paddingTop:40}}>No centers found</p>
            : centers.map((c:any) => (
              <div key={c._id} style={{ padding:'11px 13px',borderRadius:9,border:'1px solid #f1f5f9',marginBottom:7,background:'#fff' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:'#0f172a' }}>{c.centerName||c.name||'Unnamed'}</span>
                  <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,background:c.isActive?'#ecfdf5':'#fef2f2',color:c.isActive?'#065f46':'#991b1b' }}>
                    {c.isActive?'Active':'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize:12,color:'#64748b',marginBottom:5 }}>{[c.address,c.city,c.state].filter(Boolean).join(', ')}</div>
                <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
                  {c.phone && <span style={{ fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:3 }}><Phone size={9}/>{c.phone}</span>}
                  {c.email && <span style={{ fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:3 }}><Mail size={9}/>{c.email}</span>}
                </div>
              </div>
            ))
          )}
          {!isLoading && dk==='totalProcedures' && (procs.length===0
            ? <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,paddingTop:40}}>No procedures found</p>
            : procs.map((p:any) => (
              <div key={p._id} style={{ padding:'11px 13px',borderRadius:9,border:'1px solid #f1f5f9',marginBottom:7,background:'#fff' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:'#0f172a' }}>{p.name||p.procedureName||'Unnamed'}</span>
                  <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,background:p.isActive!==false?'#ecfdf5':'#fef2f2',color:p.isActive!==false?'#065f46':'#991b1b' }}>
                    {p.isActive!==false?'Active':'Inactive'}
                  </span>
                </div>
                {p.description && <div style={{ fontSize:12,color:'#64748b',marginBottom:5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{p.description}</div>}
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {p.price    && <span style={{ fontSize:11,color:'#475569',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:4,padding:'1px 7px',fontWeight:600 }}>₹{p.price}</span>}
                  {p.duration && <span style={{ fontSize:11,color:'#475569',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:4,padding:'1px 7px',fontWeight:600 }}>{p.duration} min</span>}
                  {p.category && <span style={{ fontSize:11,color:'#475569',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:4,padding:'1px 7px',fontWeight:600 }}>{p.category}</span>}
                </div>
              </div>
            ))
          )}

          {!isLoading && dk==='totalStaff' && (staff.length===0
            ? <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,paddingTop:40}}>No staff found</p>
            : staff.map((s:any) => (
              <div key={s._id} style={{ padding:'11px 13px',borderRadius:9,border:'1px solid #f1f5f9',marginBottom:7,background:'#fff',display:'flex',alignItems:'center',gap:11 }}>
                <div style={{ width:34,height:34,borderRadius:8,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#64748b',flexShrink:0 }}>
                  {(s.name||s.username||'S').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.name||s.username||'—'}</div>
                  <div style={{ fontSize:11.5,color:'#64748b' }}>{s.email||'—'}</div>
                  <div style={{ display:'flex',gap:6,marginTop:4,flexWrap:'wrap',alignItems:'center' }}>
                    {s.role && <span style={{ fontSize:11,color:'#475569',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:4,padding:'1px 7px',fontWeight:600,textTransform:'capitalize' }}>{s.role}</span>}
                    {(s.center?.centerName||s.centerName) && <span style={{ fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:3 }}><MapPin size={9}/>{s.center?.centerName||s.centerName}</span>}
                  </div>
                </div>
                <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,background:s.isActive!==false?'#ecfdf5':'#fef2f2',color:s.isActive!==false?'#065f46':'#991b1b',flexShrink:0 }}>
                  {s.isActive!==false?'Active':'Inactive'}
                </span>
              </div>
            ))
          )}
          {!isLoading && dk==='todayAppointments' && (appts.length===0
            ? <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,paddingTop:40}}>No appointments today</p>
            : appts.map((a:any) => (
              <div key={a._id} style={{ padding:'11px 13px',borderRadius:9,border:'1px solid #f1f5f9',marginBottom:7,background:'#fff' }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:5 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{getPatient(a)}</div>
                    <div style={{ fontSize:12,color:'#64748b',marginTop:1 }}>{getProcedure(a)}</div>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end',flexShrink:0 }}>
                    <Tag label={a.status} />
                    <Tag label={a.paymentStatus} />
                  </div>
                </div>
                <div style={{ display:'flex',gap:12,flexWrap:'wrap',alignItems:'center' }}>
                  {a.time && <span style={{ fontSize:11,color:'#64748b' }}>🕐 {a.time}</span>}
                  {getPhone(a) && <span style={{ fontSize:11,color:'#64748b',display:'flex',alignItems:'center',gap:3 }}><Phone size={9}/>{getPhone(a)}</span>}
                  <span style={{ fontSize:11,color:'#94a3b8' }}>{getCenter(a)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { text, sub } = useMemo(() => getGreeting(), []);
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);

  const { data: stats, isLoading: sl } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });

  const { data: appointments = [], isLoading: al } = useQuery<Appointment[]>({
    queryKey: ['admin-recent-appointments'],
    queryFn: async () => {
      const res = await api.get('/admin/appointments', { params:{ limit:10 } });
      return res.data.appointments || res.data || [];
    },
  });

  const columns = [
    { key:'patient',   header:'Patient',   render:(a:any) => <span style={{fontWeight:600,color:'#0f172a',fontSize:13}}>{getPatient(a)}</span> },
    { key:'center',    header:'Center',    render:(a:any) => <span style={{fontSize:13,color:'#475569'}}>{getCenter(a)}</span> },
    { key:'procedure', header:'Procedure', render:(a:any) => <span style={{fontSize:13,color:'#475569'}}>{getProcedure(a)}</span> },
    { key:'date',      header:'Date',      render:(a:any) => <span style={{fontSize:12,color:'#64748b',fontFamily:'monospace'}}>{fmtDate(a.date)}</span> },
    { key:'payment',   header:'Payment',   render:(a:any) => <Tag label={a.paymentStatus} /> },
    { key:'status',    header:'Status',    render:(a:any) => <Tag label={a.status} /> },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .adm-wrap{flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;}
        @media(max-width:640px){.adm-wrap{padding:16px;}}
        .adm-topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:10px;}
        .adm-title{font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;}
        .adm-sub{font-size:13px;color:#64748b;margin-top:3px;}
        .adm-live{display:flex;align-items:center;gap:6px;padding:5px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;font-size:12px;font-weight:700;color:#15803d;align-self:flex-start;}
        .adm-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:p 2s infinite;}
        @keyframes p{0%,100%{opacity:1}50%{opacity:.4}}

        .adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        @media(max-width:1024px){.adm-stats{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:480px){.adm-stats{grid-template-columns:1fr 1fr;gap:10px;}}

        .adm-stat{background:#fff;border-radius:12px;padding:16px 18px;border:1px solid #f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:12px;cursor:pointer;transition:border-color .14s,box-shadow .14s,transform .14s;user-select:none;}
        .adm-stat:hover{border-color:#e2e8f0;box-shadow:0 4px 14px rgba(0,0,0,0.08);transform:translateY(-2px);}
        .adm-stat:active{transform:translateY(0);}
        .adm-stat-top{display:flex;align-items:center;justify-content:space-between;}
        .adm-stat-ico{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;}
        .adm-stat-hint{font-size:10.5px;font-weight:600;color:#cbd5e1;transition:color .14s;}
        .adm-stat:hover .adm-stat-hint{color:#94a3b8;}
        .adm-stat-num{font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1;}
        @media(max-width:480px){.adm-stat-num{font-size:21px;}}
        .adm-stat-lbl{font-size:11.5px;color:#64748b;font-weight:500;margin-top:3px;}

        .adm-card{background:#fff;border-radius:12px;border:1px solid #f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,0.04);overflow:hidden;}
        .adm-card-head{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid #f8fafc;flex-wrap:wrap;gap:8px;}
        .adm-card-title{font-size:14px;font-weight:700;color:#0f172a;}
        .adm-card-sub{font-size:11.5px;color:#94a3b8;margin-top:1px;}
        .adm-badge{font-size:11px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:3px 10px;}

        .adm-skel{background:linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%);background-size:200% 100%;animation:sk 1.4s infinite;border-radius:12px;}
        @keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <AppHeader title="Dashboard" />
      <div className="adm-wrap">

        <div className="adm-topbar">
          <div>
            <h2 className="adm-title">{text}, <span style={{ color: '#2563eb' }}>{user?.name || 'Admin'}</span></h2>
            <p className="adm-sub">{sub}</p>
          </div>
          <div className="adm-live"><span className="adm-dot" /> Live</div>
        </div>

        <div className="adm-stats">
          {sl
            ? STAT_CONFIG.map((_,i) => <div key={i} className="adm-skel" style={{height:104}} />)
            : STAT_CONFIG.map(s => {
                const val = (stats as any)?.[s.key] ?? 0;
                return (
                  <div key={s.key} className="adm-stat" onClick={() => setActiveDrawer(s.key as DrawerKey)}>
                    <div className="adm-stat-top">
                      <div className="adm-stat-ico" style={{ background:s.lightBg, border:`1px solid ${s.lightBorder}` }}>
                        <s.Icon size={16} color={s.color} />
                      </div>
                      <span className="adm-stat-hint">View →</span>
                    </div>
                    <div>
                      <div className="adm-stat-num">{val}</div>
                      <div className="adm-stat-lbl">{s.label}</div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <p className="adm-card-title">Recent Appointments</p>
              <p className="adm-card-sub">Latest activity across all centers</p>
            </div>
            <span className="adm-badge">{(appointments as Appointment[]).length} records</span>
          </div>
          <DataTable columns={columns} data={appointments} loading={al} emptyTitle="No appointments yet" rowKey={(a)=>a._id} />
        </div>
      </div>

      {activeDrawer && <Drawer dk={activeDrawer} onClose={() => setActiveDrawer(null)} />}
    </>
  );
};

export default AdminDashboard;