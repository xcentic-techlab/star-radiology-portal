import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { ArrowLeft, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import type { CenterStaff } from '@/types';

const ROLE_COLORS: Record<string,[string,string]> = {
  staff:  ['#eff6ff','#1e40af'],
  admin:  ['#fdf4ff','#7e22ce'],
};
const GRAD_COLORS = ['linear-gradient(135deg,#2563eb,#4f46e5)','linear-gradient(135deg,#7c3aed,#6d28d9)','linear-gradient(135deg,#0891b2,#0e7490)','linear-gradient(135deg,#059669,#047857)','linear-gradient(135deg,#d97706,#b45309)'];
const getGrad = (name: string) => GRAD_COLORS[(name?.charCodeAt(0)||0) % GRAD_COLORS.length];
const getInitials = (name: string) => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '??';

const CenterStaffPage: React.FC = () => {
  const { centerId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data: centerData } = useQuery({
    queryKey: ['center', centerId],
    queryFn: async () => {
      const res = await api.get('/admin/centers');
      const centers = res.data.centers || res.data || [];
      return centers.find((c: { _id: string }) => c._id === centerId);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['center-staff', centerId, page],
    queryFn: async () => {
      const res = await api.get('/admin/staff', { params:{ centerId, page, limit:10 } });
      return res.data;
    },
  });

  const staff: CenterStaff[] = data?.staff || data || [];
  const totalPages = data?.totalPages || 1;

  const columns = [
    { key: 'name', header: 'Staff Member', render: (s: CenterStaff) => (
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        <div style={{ width:34,height:34,borderRadius:'50%',background:getGrad(s.name),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:800,flexShrink:0 }}>
          {getInitials(s.name)}
        </div>
        <div>
          <div style={{ fontWeight:700,fontSize:13,color:'#0f172a' }}>{s.name}</div>
          <div style={{ fontSize:11,color:'#94a3b8' }}>{s.email}</div>
        </div>
      </div>
    )},
    { key: 'role', header: 'Role', render: (s: CenterStaff) => {
      const [bg, text] = ROLE_COLORS[s.role] ?? ['#f9fafb','#374151'];
      return <span style={{ padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:bg,color:text,textTransform:'capitalize' }}>{s.role.replace('_',' ')}</span>;
    }},
    { key: 'status', header: 'Status', render: (s: CenterStaff) => (
      <span style={{ padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:s.isActive?'#ecfdf5':'#fef2f2',color:s.isActive?'#065f46':'#991b1b' }}>
        {s.isActive ? '● Active' : '● Inactive'}
      </span>
    )},
    { key: 'createdAt', header: 'Joined', render: (s: CenterStaff) => (
      <span style={{ fontSize:12,color:'#94a3b8',fontFamily:'monospace' }}>
        {new Date(s.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
      </span>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cs-wrap { flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){.cs-wrap{padding:16px;}}
        .cs-breadcrumb { display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap; }
        .cs-back-btn { display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:#64748b;background:none;border:none;cursor:pointer;padding:0;transition:color 0.15s;font-family:'Plus Jakarta Sans',sans-serif; }
        .cs-back-btn:hover{color:#2563eb;}
        .cs-sep { color:#cbd5e1;font-size:16px; }
        .cs-breadcrumb-current { font-size:13px;font-weight:600;color:#0f172a; }
        .cs-header-card {
          background:#fff;border-radius:16px;border:1px solid #f1f5f9;
          box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);
          padding:22px 24px;margin-bottom:20px;
          display:flex;align-items:center;gap:16px;
        }
        .cs-center-icon { width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .cs-center-name { font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.3px; }
        .cs-center-sub { font-size:13px;color:#64748b;margin-top:3px; }
        .cs-count-badge { margin-left:auto;padding:6px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;font-size:13px;font-weight:700;color:#1e40af;flex-shrink:0; }
        .cs-table-card { background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden; }
      `}</style>

      <AppHeader title={`Staff — ${centerData?.centerName || 'Center'}`} />
      <div className="cs-wrap">
        <div className="cs-breadcrumb">
          <button className="cs-back-btn" onClick={() => navigate('/admin/centers')}>
            <ArrowLeft size={14} /> Centers
          </button>
          <span className="cs-sep">›</span>
          <span className="cs-breadcrumb-current">{centerData?.centerName || 'Staff'}</span>
        </div>
        <div className="cs-header-card">
          <div className="cs-center-icon">
            <Building2 size={22} color="#2563eb" />
          </div>
          <div>
            <div className="cs-center-name">{centerData?.centerName || 'Center'}</div>
            <div className="cs-center-sub">
              {[centerData?.city, centerData?.state].filter(Boolean).join(', ') || 'Staff Management'}
            </div>
          </div>
          <div className="cs-count-badge">{staff.length} staff</div>
        </div>
        <div className="cs-table-card">
          <DataTable
            columns={columns}
            data={staff}
            loading={isLoading}
            emptyTitle="No staff assigned to this center"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            rowKey={s => s._id}
          />
        </div>
      </div>
    </>
  );
};

export default CenterStaffPage;