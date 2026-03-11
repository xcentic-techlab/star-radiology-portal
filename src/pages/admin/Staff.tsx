import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Loader2, RefreshCw, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { CenterStaff, Center } from '@/types';

const ROLE_COLORS: Record<string,[string,string]> = {
  staff: ['#eff6ff','#1e40af'],
  admin: ['#fdf4ff','#7e22ce'],
};

const Field: React.FC<{ label: string; error?: string; hint?: string; children: React.ReactNode }> = ({ label, error, hint, children }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
    <label style={{ fontSize:11.5,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.5px' }}>{label}</label>
    {children}
    {hint && !error && <span style={{ fontSize:11,color:'#94a3b8',fontWeight:500 }}>{hint}</span>}
    {error && <span style={{ fontSize:11,color:'#ef4444',fontWeight:500 }}>⚠ {error}</span>}
  </div>
);

type EditState = {
  _id?: string; name: string; email: string; password: string;
  phone: string; centerId: string; role: string; isActive?: boolean;
};

const emptyCreate: EditState = { name:'', email:'', password:'', phone:'', centerId:'', role:'staff' };

const validate = (s: EditState, isCreate: boolean) => {
  const errors: Record<string,string> = {};
  if (!s.name?.trim()) errors.name = 'Name is required';
  if (!s.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errors.email = 'Please enter a valid email address';
  if (isCreate) {
    if (!s.password?.trim()) errors.password = 'Password is required';
    else if (s.password.length < 6) errors.password = 'Password must be at least 6 characters';
  } else {
    if (s.password?.trim() && s.password.length < 6) errors.password = 'Password must be at least 6 characters';
  }
  if (s.phone && !/^[6-9]\d{9}$/.test(s.phone.replace(/\s/g,''))) errors.phone = 'Please enter a valid 10-digit mobile number';
  return errors;
};

const AdminStaff: React.FC = () => {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [isCreate, setIsCreate]         = useState(false);
  const [edit, setEdit]                 = useState<EditState>(emptyCreate);
  const [errors, setErrors]             = useState<Record<string,string>>({});
  const [touched, setTouched]           = useState<Record<string,boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage]                 = useState(1);
  const [filterCenter, setFilterCenter] = useState('all');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: async () => { const res = await api.get('/admin/staff', { params:{ page, limit:100 } }); return res.data; },
  });

  const { data: centersData, isLoading: centersLoading } = useQuery({
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

  const allStaff: CenterStaff[] = Array.isArray(data?.staff) ? data.staff : [];
  const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1;
  const centers: Center[] = Array.isArray(centersData) ? centersData : [];

  const filteredStaff = useMemo(() => allStaff.filter(s => {
    const centerId = (s.centerId as Center)?._id || (s.centerId as string) || '';
    if (search) { const q = search.toLowerCase(); if (!s.name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q)) return false; }
    if (filterCenter !== 'all' && centerId !== filterCenter) return false;
    if (filterRole !== 'all' && s.role !== filterRole) return false;
    if (filterStatus === 'active' && !s.isActive) return false;
    if (filterStatus === 'inactive' && s.isActive) return false;
    return true;
  }), [allStaff, search, filterCenter, filterRole, filterStatus]);

  const hasFilters = search || filterCenter !== 'all' || filterRole !== 'all' || filterStatus !== 'all';
  const clearFilters = () => { setSearch(''); setFilterCenter('all'); setFilterRole('all'); setFilterStatus('all'); };

  const save = useMutation({
    mutationFn: (s: EditState) => {
      const payload = isCreate ? s : { ...s, ...(s.password?.trim() ? { password: s.password } : { password: undefined }) };
      return isCreate ? api.post('/admin/staff', payload) : api.put(`/admin/staff/${s._id}`, payload);
    },
    onSuccess: () => { toast.success(isCreate ? 'Staff account created successfully' : 'Staff updated successfully'); qc.invalidateQueries({ queryKey: ['staff'] }); setSheetOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save. Please try again.'),
  });

  const handleChange = (field: keyof EditState, value: string | boolean) => {
    const updated = { ...edit, [field]: value };
    setEdit(updated);
    if (touched[field]) { const e = validate(updated, isCreate); setErrors(prev => ({ ...prev, [field]: e[field] || '' })); }
  };
  const handleBlur = (field: keyof EditState) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const e = validate(edit, isCreate);
    setErrors(prev => ({ ...prev, [field]: e[field] || '' }));
  };
  const handleSubmit = () => {
    const allErrors = validate(edit, isCreate);
    const allTouched: Record<string,boolean> = {};
    ['name','email','password','phone','centerId','role'].forEach(k => allTouched[k] = true);
    setTouched(allTouched); setErrors(allErrors);
    if (Object.values(allErrors).some(Boolean)) { toast.error('Please fix the errors before saving'); return; }
    save.mutate(edit);
  };
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pw = ''; for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random()*chars.length)];
    handleChange('password', pw); setShowPassword(true); toast.success('Password generated');
  };
  const openCreate = () => { setIsCreate(true); setEdit(emptyCreate); setErrors({}); setTouched({}); setShowPassword(false); setSheetOpen(true); };
  const openEdit = (s: CenterStaff) => {
    setIsCreate(false);
    setEdit({ _id:s._id, name:s.name, email:s.email||'', password:'', phone:s.phone||'', centerId:(s.centerId as Center)?._id ?? '', role:s.role, isActive:s.isActive });
    setErrors({}); setTouched({}); setShowPassword(false); setSheetOpen(true);
  };
  const errStyle = (field: string) => touched[field] && errors[field] ? { borderColor:'#fca5a5', boxShadow:'0 0 0 2px rgba(239,68,68,0.1)' } : {};
  const getInitials = (name: string) => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '??';
  const GRAD = ['linear-gradient(135deg,#2563eb,#4f46e5)','linear-gradient(135deg,#7c3aed,#6d28d9)','linear-gradient(135deg,#0891b2,#0e7490)','linear-gradient(135deg,#059669,#047857)','linear-gradient(135deg,#d97706,#b45309)'];
  const getGrad = (name: string) => GRAD[(name?.charCodeAt(0)||0) % GRAD.length];

  const columns = [
    { key:'name', header:'Staff Member', render:(s:CenterStaff) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:getGrad(s.name),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:800,flexShrink:0}}>{getInitials(s.name)}</div>
        <div><div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{s.name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{s.email}</div></div>
      </div>
    )},
    { key:'center', header:'Center', render:(s:CenterStaff) => {
      const name = (s.centerId as Center)?.centerName || centers.find(c=>c._id===(s.centerId as any)?._id)?.centerName;
      return <span style={{fontSize:13,color:'#475569'}}>{name||'—'}</span>;
    }},
    { key:'role', header:'Role', render:(s:CenterStaff) => {
      const [bg,text] = ROLE_COLORS[s.role]??['#f9fafb','#374151'];
      return <span style={{padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:bg,color:text,textTransform:'capitalize'}}>{s.role.replace('_',' ')}</span>;
    }},
    { key:'status', header:'Status', render:(s:CenterStaff) => (
      <span style={{padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:s.isActive?'#ecfdf5':'#fef2f2',color:s.isActive?'#065f46':'#991b1b'}}>{s.isActive?'● Active':'● Inactive'}</span>
    )},
    { key:'createdAt', header:'Joined', render:(s:CenterStaff) => <span style={{fontSize:12,color:'#94a3b8',fontFamily:'monospace'}}>{new Date(s.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>},
    { key:'actions', header:'', render:(s:CenterStaff) => (
      <button onClick={()=>openEdit(s)} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 0.15s'}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#eff6ff';(e.currentTarget as HTMLElement).style.color='#2563eb';(e.currentTarget as HTMLElement).style.borderColor='#bfdbfe';}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#fff';(e.currentTarget as HTMLElement).style.color='#64748b';(e.currentTarget as HTMLElement).style.borderColor='#e2e8f0';}}>
        <Pencil size={13}/>
      </button>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .as-wrap{flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;}
        @media(max-width:640px){.as-wrap{padding:16px;}}
        .as-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;}
        .as-title{font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;}
        .as-title-sub{font-size:13px;color:#64748b;margin-top:2px;}
        .as-btn-add{display:flex;align-items:center;gap:6px;padding:9px 18px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 3px 10px rgba(79,70,229,0.25);transition:opacity 0.2s,transform 0.15s;}
        .as-btn-add:hover{opacity:0.92;transform:translateY(-1px);}
        .as-card{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden;}
        .as-filterbar{display:flex;align-items:center;gap:0;padding:10px 16px;background:#fff;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow-x:auto;}
        .as-filter-label{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;margin-right:12px;flex-shrink:0;}
        .as-filter-sep{width:1px;height:22px;background:#e2e8f0;flex-shrink:0;margin:0 10px;}
        .as-fselect{height:34px !important;min-width:120px;max-width:160px;font-size:12px !important;border-radius:8px !important;border:1px solid #e2e8f0 !important;flex-shrink:0;}
        .as-fsearch{height:34px;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;min-width:150px;color:#0f172a;flex-shrink:0;}
        .as-fsearch:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(59,130,246,0.1);}
        .as-clear-btn{display:flex;align-items:center;gap:4px;padding:0 10px;height:34px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;font-size:12px;font-weight:600;color:#ef4444;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;margin-left:12px;flex-shrink:0;}
        .as-clear-btn:hover{background:#fee2e2;}
        .as-result-count{font-size:12px;color:#94a3b8;font-weight:500;margin-bottom:8px;}
        .as-sheet-form{display:flex;flex-direction:column;gap:12px;padding:16px 0;}
        .as-submit-btn{width:100%;height:46px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(79,70,229,0.3);transition:opacity 0.2s;}
        .as-submit-btn:hover:not(:disabled){opacity:0.92;}
        .as-submit-btn:disabled{opacity:0.6;cursor:not-allowed;}
        .as-gen-btn{display:flex;align-items:center;gap:5px;padding:0 12px;height:36px;border:1.5px solid #e2e8f0;border-radius:9px;background:#fff;font-size:12px;font-weight:600;color:#475569;cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:'Plus Jakarta Sans',sans-serif;}
        .as-gen-btn:hover{background:#eff6ff;border-color:#bfdbfe;color:#2563eb;}
        @keyframes as-spin{to{transform:rotate(360deg);}} .as-spin{animation:as-spin 0.8s linear infinite;}
      `}</style>

      <AppHeader title="Staff Management" />
      <div className="as-wrap">
        <div className="as-topbar">
          <div><h2 className="as-title">Staff Management</h2><p className="as-title-sub">Manage all staff accounts across centers</p></div>
          <button className="as-btn-add" onClick={openCreate}><Plus size={15}/> Create Staff</button>
        </div>

        <div className="as-filterbar">
          <span className="as-filter-label">Filter:</span>
          <Select value={filterCenter} onValueChange={setFilterCenter}>
            <SelectTrigger className="as-fselect"><SelectValue placeholder="All Centers"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centers</SelectItem>
              {centers.map(c=><SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="as-filter-sep"/>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="as-fselect"><SelectValue placeholder="All Roles"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <div className="as-filter-sep"/>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="as-fselect"><SelectValue placeholder="All Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="as-filter-sep"/>
          <input className="as-fsearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member..."/>
          {hasFilters && <button className="as-clear-btn" onClick={clearFilters}><X size={11}/> Clear</button>}
        </div>

        {hasFilters && <div className="as-result-count">Showing {filteredStaff.length} of {allStaff.length} staff members</div>}

        <div className="as-card">
          <DataTable columns={columns} data={filteredStaff} loading={isLoading} emptyTitle={hasFilters?'No staff found matching your filters':'No staff accounts'} page={page} totalPages={totalPages} onPageChange={setPage} rowKey={s=>s._id}/>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{width:'480px',maxWidth:'100vw',display:'flex',flexDirection:'column',height:'100vh',padding:0,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          <div style={{padding:'18px 24px 14px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
            <SheetTitle style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>{isCreate?'Create Staff Account':'Edit Staff'}</SheetTitle>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'0 24px'}}>
            <div className="as-sheet-form">
              <Field label="Full Name *" error={touched.name?errors.name:''}>
                <Input value={edit.name} onChange={e=>handleChange('name',e.target.value)} onBlur={()=>handleBlur('name')} style={errStyle('name')}/>
              </Field>
              <Field label="Email *" error={touched.email?errors.email:''}>
                <Input type="email" value={edit.email} onChange={e=>handleChange('email',e.target.value)} onBlur={()=>handleBlur('email')} style={errStyle('email')}/>
              </Field>
              <Field label={isCreate?'Password *':'New Password'} error={touched.password?errors.password:''} hint={!isCreate?'Leave blank to keep current password':''}>
                <div style={{display:'flex',gap:8}}>
                  <div style={{flex:1,position:'relative'}}>
                    <Input type={showPassword?'text':'password'} value={edit.password} onChange={e=>handleChange('password',e.target.value)} onBlur={()=>handleBlur('password')} placeholder={isCreate?'Min. 6 characters':'Leave blank to keep current'} style={{paddingRight:40,...errStyle('password')}}/>
                    <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',display:'flex',alignItems:'center'}}>
                      {showPassword?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                  <button type="button" className="as-gen-btn" onClick={generatePassword}><RefreshCw size={13}/> Generate</button>
                </div>
              </Field>
              <Field label="Phone" error={touched.phone?errors.phone:''}>
                <Input value={edit.phone} onChange={e=>handleChange('phone',e.target.value.replace(/\D/g,'').slice(0,10))} onBlur={()=>handleBlur('phone')} placeholder="10-digit mobile number" maxLength={10} style={errStyle('phone')}/>
              </Field>
              <Field label={centersLoading?'Center (Loading...)':'Center'}>
                <Select value={edit.centerId} onValueChange={v=>handleChange('centerId',v)}>
                  <SelectTrigger><SelectValue placeholder={centersLoading?'Loading...':centers.length===0?'No centers available':'Select a center'}/></SelectTrigger>
                  <SelectContent>
                    {centers.length===0&&!centersLoading&&<SelectItem value="none" disabled>No centers available</SelectItem>}
                    {centers.map(c=><SelectItem key={c._id} value={c._id}>{c.centerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Role">
                <Select value={edit.role} onValueChange={v=>handleChange('role',v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Center Staff</SelectItem>
                    <SelectItem value="admin">Center Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {!isCreate&&(
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:10}}>
                  <Switch checked={edit.isActive??true} onCheckedChange={c=>handleChange('isActive',c)}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>Active</span>
                </div>
              )}
            </div>
          </div>
          <div style={{padding:'14px 24px',borderTop:'1px solid #f1f5f9',flexShrink:0,background:'#fff'}}>
            <button type="button" className="as-submit-btn" disabled={save.isPending} onClick={handleSubmit}>
              {save.isPending&&<Loader2 size={14} className="as-spin"/>}
              {isCreate?'Create Account':'Update Staff'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminStaff;