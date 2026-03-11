import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';

interface Report {
  _id: string;
  patientName: string;
  patientPhone: string;
  procedureName: string;
  reportType: string;
  notes: string;
  createdAt: string;
  reportFile: { url: string; filename: string };
  uploadedBy?: { name: string };
}

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

const StaffReports: React.FC = () => {
  const [page, setPage]             = useState(1);
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff-reports', page, reportType, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string,string|number> = { page, limit: 10 };
      if (reportType && reportType !== 'all') params.reportType = reportType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await api.get('/reports', { params });
      return res.data;
    },
  });

  const reports: Report[] = data?.reports || [];
  const totalPages = data?.totalPages || 1;
  const hasFilters = (reportType && reportType !== 'all') || dateFrom || dateTo;

  const columns = [
    { key: 'patient', header: 'Patient', render: (r: Report) => (
      <div>
        <p style={{ fontWeight:600,fontSize:13,color:'#0f172a',margin:0 }}>{r.patientName || '—'}</p>
        <p style={{ fontSize:12,color:'#94a3b8',margin:0 }}>{r.patientPhone || ''}</p>
      </div>
    )},
    { key: 'procedure', header: 'Procedure', render: (r: Report) => <span style={{ fontSize:13,color:'#475569' }}>{r.procedureName || '—'}</span> },
    { key: 'type', header: 'Type', render: (r: Report) => <TypeBadge type={r.reportType} /> },
    { key: 'date', header: 'Uploaded', render: (r: Report) => {
      try { return <span style={{ fontSize:12,color:'#64748b',fontFamily:'monospace' }}>{format(new Date(r.createdAt),'dd MMM yyyy')}</span>; }
      catch { return '—'; }
    }},
    { key: 'by', header: 'Uploaded By', render: (r: Report) => <span style={{ fontSize:12,color:'#94a3b8' }}>{r.uploadedBy?.name || '—'}</span> },
{ key: 'notes', header: 'Notes', render: (r: Report) => (
  <span
    title={r.notes || ''} 
    style={{
      fontSize:12, color:'#94a3b8',
      display:'block',
      maxWidth:160,
      overflow:'hidden',
      textOverflow:'ellipsis',
      whiteSpace:'nowrap',
      cursor: r.notes ? 'help' : 'default',
    }}
  >
    {r.notes || '—'}
  </span>
)},
{ key: 'actions', header: '', render: (r: Report) => (
  <button onClick={() => {
    const url = r.reportFile?.url;
    if (!url) return;
    const fullUrl = url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
    window.open(fullUrl, '_blank');
  }} title="Download" style={{
    width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',
    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 0.15s',
  }}
  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='#eff6ff'; (e.currentTarget as HTMLElement).style.color='#2563eb'; (e.currentTarget as HTMLElement).style.borderColor='#bfdbfe'; }}
  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='#fff'; (e.currentTarget as HTMLElement).style.color='#64748b'; (e.currentTarget as HTMLElement).style.borderColor='#e2e8f0'; }}>
    <Download size={14} />
  </button>
)},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sr-wrap { flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){.sr-wrap{padding:16px;}}
        .sr-filters { display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:18px; }
        .sr-filter-label { font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px; }
        .sr-clear { font-size:12px;font-weight:600;color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px 12px;cursor:pointer; }
        .sr-card { background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden; }
        .sr-card-head { display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px; }
        .sr-card-title { font-size:15px;font-weight:700;color:#0f172a; }
        .sr-count { font-size:12px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 12px; }
      `}</style>

      <AppHeader title="Reports" />
      <div className="sr-wrap">
        <div className="sr-filters">
          <span className="sr-filter-label">Filter:</span>
          <div style={{ width:168 }}>
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
          {hasFilters && <button className="sr-clear" onClick={() => { setReportType(''); setDateFrom(''); setDateTo(''); }}>✕ Clear</button>}
        </div>

        <div className="sr-card">
          <div className="sr-card-head">
            <span className="sr-card-title">Reports</span>
            <span className="sr-count">{reports.length} records</span>
          </div>
          <DataTable columns={columns} data={reports} loading={isLoading} emptyTitle="No reports found" page={page} totalPages={totalPages} onPageChange={setPage} rowKey={r => r._id} />
        </div>
      </div>
    </>
  );
};

export default StaffReports;