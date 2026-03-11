import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { format } from 'date-fns';

interface Report {
  _id: string;
  patientName: string;
  patientPhone: string;
  procedureName: string;
  centerName: string;
  reportType: string;
  notes: string;
  isVisible: boolean;
  createdAt: string;
  reportFile: { url: string };
  uploadedBy?: { name: string };
  center?: { _id: string; centerName: string };
}
interface Center { _id: string; centerName: string; }

const TYPE_COLORS: Record<string, [string, string]> = {
  'Lab Report':        ['#eff6ff', '#1e40af'],
  'Scan Images':       ['#f5f3ff', '#5b21b6'],
  'Diagnostic Report': ['#ecfdf5', '#065f46'],
  'Other':             ['#f9fafb', '#374151'],
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const [bg, text] = TYPE_COLORS[type] ?? TYPE_COLORS['Other'];
  return <span style={{ padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:bg,color:text }}>{type}</span>;
};

const IconBtn: React.FC<{ onClick: () => void; title?: string; danger?: boolean; active?: boolean; children: React.ReactNode }> = ({ onClick, title, danger, active, children }) => (
  <button onClick={onClick} title={title} style={{
    width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',
    background: active ? '#ecfdf5' : danger ? '#fff' : '#fff',
    color: active ? '#059669' : danger ? '#ef4444' : '#64748b',
    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s',
  }}
  onMouseEnter={e => { const el = e.currentTarget; el.style.background = danger?'#fef2f2':active?'#dcfce7':'#f8fafc'; }}
  onMouseLeave={e => { const el = e.currentTarget; el.style.background = active?'#ecfdf5':'#fff'; }}>
    {children}
  </button>
);

const AdminReports: React.FC = () => {
  const qc = useQueryClient();
  const [page, setPage]             = useState(1);
  const [centerId, setCenterId]     = useState('');
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [search, setSearch]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const { data: centersData } = useQuery({
    queryKey: ['admin-centers-list'],
    queryFn: async () => { const res = await api.get('/admin/centers'); return res.data; },
  });
  const centers: Center[] = centersData?.centers || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', page, centerId, reportType, dateFrom, dateTo, search],
    queryFn: async () => {
      const params: Record<string, string|number> = { page, limit: 10 };
      if (centerId   && centerId   !== 'all') params.centerId   = centerId;
      if (reportType && reportType !== 'all') params.reportType = reportType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      if (search)   params.search   = search;
      const res = await api.get('/admin/reports', { params });
      return res.data;
    },
  });

  const reports: Report[] = data?.reports || [];
  const totalPages = data?.totalPages || 1;

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reports/${id}`),
    onSuccess: () => { toast.success('Report deleted'); qc.invalidateQueries({ queryKey: ['admin-reports'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const toggleVis = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/reports/${id}/visibility`),
    onSuccess: () => { toast.success('Visibility updated'); qc.invalidateQueries({ queryKey: ['admin-reports'] }); },
    onError: () => toast.error('Failed to update'),
  });

  const hasFilters = centerId || reportType || dateFrom || dateTo || search;

  const columns = [
    { key: 'patient', header: 'Patient', render: (r: Report) => (
      <div>
        <p style={{ fontWeight:600,fontSize:13,color:'#0f172a',margin:0 }}>{r.patientName || '—'}</p>
        <p style={{ fontSize:12,color:'#94a3b8',margin:0 }}>{r.patientPhone || ''}</p>
      </div>
    )},
    { key: 'center', header: 'Center', render: (r: Report) => <span style={{ fontSize:13,color:'#475569' }}>{r.center?.centerName || r.centerName || '—'}</span> },
    { key: 'procedure', header: 'Procedure', render: (r: Report) => <span style={{ fontSize:13,color:'#475569' }}>{r.procedureName || '—'}</span> },
    { key: 'type', header: 'Type', render: (r: Report) => <TypeBadge type={r.reportType} /> },
    { key: 'date', header: 'Uploaded', render: (r: Report) => {
      try { return <span style={{ fontSize:12,color:'#64748b',fontFamily:'monospace' }}>{format(new Date(r.createdAt),'dd MMM yyyy')}</span>; }
      catch { return '—'; }
    }},
    { key: 'by', header: 'By', render: (r: Report) => <span style={{ fontSize:12,color:'#94a3b8' }}>{r.uploadedBy?.name || '—'}</span> },
    { key: 'vis', header: 'App', render: (r: Report) => (
      <span style={{ padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,
        background: r.isVisible ? '#ecfdf5' : '#fef2f2',
        color: r.isVisible ? '#065f46' : '#991b1b' }}>
        {r.isVisible ? 'Visible' : 'Hidden'}
      </span>
    )},
    { key: 'actions', header: 'Actions', render: (r: Report) => (
      <div style={{ display:'flex',gap:4 }}>
<IconBtn onClick={() => {
  const url = r.reportFile?.url;
  if (!url) return toast.error('No file found');
  const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://178.16.139.140:5000'}${url}`;
  window.open(fullUrl, '_blank');
}} title="Download">
  <Download size={13} />
</IconBtn>
        <IconBtn onClick={() => toggleVis.mutate(r._id)} title={r.isVisible?'Hide':'Show'} active={r.isVisible}>{r.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}</IconBtn>
        <IconBtn onClick={() => setDeleteTarget(r)} title="Delete" danger><Trash2 size={13} /></IconBtn>
      </div>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ar-wrap { flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){.ar-wrap{padding:16px;}}
        .ar-filters { display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:18px; }
        .ar-filter-label { font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px; }
        .ar-search { height:38px;border-radius:9px;border:1.5px solid #e2e8f0;padding:0 12px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;color:#0f172a;background:#fff;outline:none;transition:border-color 0.2s,box-shadow 0.2s; }
        .ar-search::placeholder{color:#94a3b8;}
        .ar-search:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,0.1);}
        .ar-clear { font-size:12px;font-weight:600;color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px 12px;cursor:pointer; }
        .ar-stats-row { display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:12px;color:#64748b; }
        .ar-total { font-weight:700;color:#0f172a; }
        .ar-card { background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden; }
        .ar-card-head { display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px; }
        .ar-card-title { font-size:15px;font-weight:700;color:#0f172a; }
        .ar-card-sub { font-size:12px;color:#94a3b8;margin-top:2px; }
      `}</style>

      <AppHeader title="Reports" />
      <div className="ar-wrap">
        <div className="ar-filters">
          <span className="ar-filter-label">Filter:</span>
          <div style={{ width:160 }}>
            <Select value={centerId} onValueChange={setCenterId}>
              <SelectTrigger><SelectValue placeholder="All Centers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                {centers.map(c => <SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div style={{ width:160 }}>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Lab Report">Lab Report</SelectItem>
                <SelectItem value="Scan Images">Scan Images</SelectItem>
                <SelectItem value="Diagnostic Report">Diagnostic Report</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width:145 }} />
          <Input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ width:145 }} />
          <input className="ar-search" placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:160 }} />
          {hasFilters && <button className="ar-clear" onClick={() => { setCenterId(''); setReportType(''); setDateFrom(''); setDateTo(''); setSearch(''); }}>✕ Clear</button>}
        </div>

        {data?.total !== undefined && (
          <div className="ar-stats-row">
            <span className="ar-total">{data.total}</span> report{data.total !== 1 ? 's' : ''} found
          </div>
        )}

        <div className="ar-card">
          <div className="ar-card-head">
            <div>
              <p className="ar-card-title">All Reports</p>
              <p className="ar-card-sub">Manage patient reports across all centers</p>
            </div>
          </div>
          <DataTable columns={columns} data={reports} loading={isLoading} emptyTitle="No reports found" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={r => r._id} />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Report"
        message={`Delete report for ${deleteTarget?.patientName}? This cannot be undone.`}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
        loading={del.isPending}
      />
    </>
  );
};

export default AdminReports;