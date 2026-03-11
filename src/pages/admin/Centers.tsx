import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import BulkImportModal, { BulkImportConfig } from './Bulkimportmodal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, Users, Loader2, Building2, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import type { Center } from '@/types';

const CENTERS_IMPORT_CONFIG: BulkImportConfig = {
  title: 'Import Centers',
  entityLabel: 'center',
  endpoint: '/admin/centers',
  accentColor: '#2563eb',
  fields: [
    { key: 'centerName', label: 'Center Name', aliases: ['name', 'center', 'Name'], required: true },
    { key: 'address',    label: 'Address',     aliases: ['Address', 'addr'] },
    { key: 'city',       label: 'City',        aliases: ['City'] },
    { key: 'state',      label: 'State',       aliases: ['State'] },
    { key: 'pincode',    label: 'Pincode',     aliases: ['pin', 'Pin', 'Pincode', 'zip'] },
    { key: 'phone',      label: 'Phone',       aliases: ['Phone', 'mobile', 'Mobile', 'contact'] },
    { key: 'email',      label: 'Email',       aliases: ['Email', 'mail'] },
    { key: 'isActive',   label: 'Active',      aliases: ['active', 'status'], transform: v => String(v).toLowerCase() !== 'false' && v !== '0' },
  ],
  buildPayload: (d) => ({
    centerName: d.centerName,
    address: d.address || '',
    city: d.city || '',
    state: d.state || '',
    pincode: d.pincode || '',
    phone: d.phone || '',
    email: d.email || '',
    isActive: d.isActive ?? true,
  }),
  templateRows: [
    ['Apollo Diagnostics', '12 MG Road', 'Bengaluru', 'Karnataka', '560001', '9876543210', 'apollo@example.com', 'true'],
    ['Pathcare Labs',      '45 Park St',  'Kolkata',   'West Bengal','700016', '9123456789', 'pathcare@example.com','true'],
  ],
  pdfPrompt: `Extract all diagnostic center records from this document. Return ONLY a valid JSON array, no markdown fences, no preamble.
Each object must have: centerName (required), address, city, state, pincode, phone, email, isActive (boolean default true).
Return [] if no centers found.`,
};

const emptyCenter: Partial<Center> = { centerName:'', address:'', city:'', state:'', pincode:'', phone:'', email:'', googleMapsLink:'', isActive:true };

const validate = (item: Partial<Center>) => {
  const errors: Record<string,string> = {};
  if (!item.centerName?.trim()) errors.centerName = 'Center name is required';
  if (item.phone && !/^[6-9]\d{9}$/.test(item.phone.replace(/\s/g,''))) errors.phone = 'Please enter a valid 10-digit mobile number';
  if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) errors.email = 'Please enter a valid email address';
  if (item.pincode && !/^\d{6}$/.test(item.pincode)) errors.pincode = 'Pincode must be exactly 6 digits';
  if (item.googleMapsLink && !/^https?:\/\/.+/.test(item.googleMapsLink)) errors.googleMapsLink = 'Please enter a valid URL (https://...)';
  return errors;
};

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
    <label style={{ fontSize:11.5,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.5px' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize:11,color:'#ef4444',fontWeight:500,marginTop:1 }}>⚠ {error}</span>}
  </div>
);

const IconBtn: React.FC<{ onClick: () => void; title?: string; danger?: boolean; children: React.ReactNode }> = ({ onClick, title, danger, children }) => (
  <button onClick={onClick} title={title} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:danger?'#ef4444':'#64748b',transition:'all 0.15s' }}
    onMouseEnter={e=>{ const el=e.currentTarget; el.style.background=danger?'#fef2f2':'#f8fafc'; el.style.borderColor=danger?'#fecaca':'#cbd5e1'; }}
    onMouseLeave={e=>{ const el=e.currentTarget; el.style.background='#fff'; el.style.borderColor='#e2e8f0'; }}>
    {children}
  </button>
);

const AdminCenters: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [bulkOpen, setBulkOpen]         = useState(false);
  const [editItem, setEditItem]         = useState<Partial<Center>>(emptyCenter);
  const [errors, setErrors]             = useState<Record<string,string>>({});
  const [touched, setTouched]           = useState<Record<string,boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Center|null>(null);
  const [page, setPage]                 = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState, setFilterState]   = useState('all');
  const [search, setSearch]             = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['centers', page],
    queryFn: async () => { const res = await api.get('/admin/centers', { params:{ page, limit:100 } }); return res.data; },
  });

  const allCenters: Center[] = data?.centers || data || [];
  const totalPages = data?.totalPages || 1;
  const uniqueStates = useMemo(() => [...new Set(allCenters.map(c=>c.state).filter(Boolean))].sort(), [allCenters]);

  const filteredCenters = useMemo(() => allCenters.filter(c => {
    if (search) { const q=search.toLowerCase(); if (!c.centerName?.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q)) return false; }
    if (filterStatus==='active' && !c.isActive) return false;
    if (filterStatus==='inactive' && c.isActive) return false;
    if (filterState!=='all' && c.state !== filterState) return false;
    return true;
  }), [allCenters, search, filterStatus, filterState]);

  const hasFilters = search || filterStatus!=='all' || filterState!=='all';
  const clearFilters = () => { setSearch(''); setFilterStatus('all'); setFilterState('all'); };

  const saveMutation = useMutation({
    mutationFn: (center: Partial<Center>) => center._id ? api.put(`/admin/centers/${center._id}`, center) : api.post('/admin/centers', center),
    onSuccess: () => { toast.success(editItem._id ? 'Center updated' : 'Center created'); qc.invalidateQueries({ queryKey: ['centers'] }); setSheetOpen(false); },
    onError: () => toast.error('Failed to save center.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/centers/${id}`),
    onSuccess: () => { toast.success('Center deleted'); qc.invalidateQueries({ queryKey: ['centers'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete center.'),
  });

  const handleChange = (field: keyof Center, value: string | boolean) => {
    const updated = { ...editItem, [field]: value };
    setEditItem(updated);
    if (touched[field]) { const e=validate(updated); setErrors(prev=>({...prev,[field]:e[field]||''})); }
  };
  const handleBlur = (field: keyof Center) => {
    setTouched(prev=>({...prev,[field]:true}));
    const e=validate(editItem); setErrors(prev=>({...prev,[field]:e[field]||''}));
  };
  const handleSubmit = () => {
    const allErrors=validate(editItem);
    const allTouched: Record<string,boolean> = {};
    Object.keys(editItem).forEach(k=>allTouched[k]=true);
    setTouched(allTouched); setErrors(allErrors);
    if (Object.values(allErrors).some(Boolean)) { toast.error('Please fix the errors before saving'); return; }
    saveMutation.mutate(editItem);
  };
  const openSheet = (item: Partial<Center>) => { setEditItem({...item}); setErrors({}); setTouched({}); setSheetOpen(true); };
  const inputStyle = (field: string) => touched[field]&&errors[field] ? { borderColor:'#fca5a5', boxShadow:'0 0 0 2px rgba(239,68,68,0.1)' } : {};

  const columns = [
    { key:'name', header:'Center Name', render:(c:Center) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#eff6ff,#dbeafe)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Building2 size={15} color="#2563eb"/></div>
        <div><div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{c.centerName}</div><div style={{fontSize:11,color:'#94a3b8'}}>{c.email||''}</div></div>
      </div>
    )},
    { key:'city',    header:'Location', render:(c:Center) => <span style={{fontSize:13,color:'#475569'}}>{[c.city,c.state].filter(Boolean).join(', ')||'—'}</span> },
    { key:'phone',   header:'Phone',    render:(c:Center) => <span style={{fontSize:13,color:'#475569',fontFamily:'monospace'}}>{c.phone||'—'}</span> },
    { key:'isActive',header:'Status',   render:(c:Center) => (
      <span style={{padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:c.isActive?'#ecfdf5':'#fef2f2',color:c.isActive?'#065f46':'#991b1b'}}>{c.isActive?'● Active':'● Inactive'}</span>
    )},
    { key:'actions', header:'Actions', render:(c:Center) => (
      <div style={{display:'flex',gap:6}}>
        <IconBtn onClick={()=>openSheet({...c})} title="Edit"><Pencil size={13}/></IconBtn>
        <IconBtn onClick={()=>navigate(`/admin/centers/${c._id}/staff`)} title="View Staff"><Users size={13}/></IconBtn>
        <IconBtn onClick={()=>setDeleteTarget(c)} title="Delete" danger><Trash2 size={13}/></IconBtn>
      </div>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ac-wrap{flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;}
        @media(max-width:640px){.ac-wrap{padding:16px;}}
        .ac-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;}
        .ac-title{font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;}
        .ac-title-sub{font-size:13px;color:#64748b;margin-top:2px;}
        .ac-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .ac-btn-import{display:flex;align-items:center;gap:6px;padding:9px 16px;background:#fff;color:#475569;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;}
        .ac-btn-import:hover{background:#f8fafc;border-color:#cbd5e1;color:#0f172a;}
        .ac-btn-add{display:flex;align-items:center;gap:6px;padding:9px 18px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 3px 10px rgba(79,70,229,0.25);transition:opacity 0.2s,transform 0.15s;}
        .ac-btn-add:hover{opacity:0.92;transform:translateY(-1px);}
        .ac-card{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden;}
        .ac-filterbar{display:flex;align-items:center;gap:0;padding:10px 16px;background:#fff;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow-x:auto;}
        .ac-filter-label{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;margin-right:12px;flex-shrink:0;}
        .ac-filter-sep{width:1px;height:22px;background:#e2e8f0;flex-shrink:0;margin:0 10px;}
        .ac-fselect{height:34px !important;min-width:120px;max-width:160px;font-size:12px !important;border-radius:8px !important;border:1px solid #e2e8f0 !important;flex-shrink:0;}
        .ac-fsearch{height:34px;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;min-width:150px;color:#0f172a;flex-shrink:0;}
        .ac-fsearch:focus{border-color:#93c5fd;box-shadow:0 0 0 2px rgba(59,130,246,0.1);}
        .ac-clear-btn{display:flex;align-items:center;gap:4px;padding:0 10px;height:34px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;font-size:12px;font-weight:600;color:#ef4444;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;margin-left:12px;flex-shrink:0;}
        .ac-clear-btn:hover{background:#fee2e2;}
        .ac-result-count{font-size:12px;color:#94a3b8;font-weight:500;margin-bottom:8px;}
        .ac-sheet-form{display:flex;flex-direction:column;gap:12px;padding:16px 0;}
        .ac-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        @media(max-width:480px){.ac-grid-2{grid-template-columns:1fr;}}
        .ac-submit-btn{width:100%;height:46px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(79,70,229,0.3);transition:opacity 0.2s;}
        .ac-submit-btn:hover:not(:disabled){opacity:0.92;} .ac-submit-btn:disabled{opacity:0.6;cursor:not-allowed;}
        @keyframes ac-spin{to{transform:rotate(360deg);}} .ac-spin{animation:ac-spin 0.8s linear infinite;}
      `}</style>

      <AppHeader title="Centers"/>
      <div className="ac-wrap">
        <div className="ac-topbar">
          <div><h2 className="ac-title">Centers</h2><p className="ac-title-sub">Manage all diagnostic centers</p></div>
          <div className="ac-actions">
            <button className="ac-btn-import" onClick={() => setBulkOpen(true)}>
              <Upload size={14} /> Bulk Import
            </button>
            <button className="ac-btn-add" onClick={() => openSheet({...emptyCenter})}>
              <Plus size={15}/> Add Center
            </button>
          </div>
        </div>

        <div className="ac-filterbar">
          <span className="ac-filter-label">Filter:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="ac-fselect"><SelectValue placeholder="All Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="ac-filter-sep"/>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="ac-fselect"><SelectValue placeholder="All States"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {uniqueStates.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ac-filter-sep"/>
          <input className="ac-fsearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search center..."/>
          {hasFilters&&<button className="ac-clear-btn" onClick={clearFilters}><X size={11}/> Clear</button>}
        </div>

        {hasFilters&&<div className="ac-result-count">Showing {filteredCenters.length} of {allCenters.length} centers</div>}

        <div className="ac-card">
          <DataTable columns={columns} data={filteredCenters} loading={isLoading}
            emptyTitle={hasFilters?'No centers found matching your filters':'No centers yet'}
            page={page} totalPages={totalPages} onPageChange={setPage} rowKey={c=>c._id}/>
        </div>
      </div>

      <BulkImportModal
        open={bulkOpen}
        config={CENTERS_IMPORT_CONFIG}
        onClose={() => setBulkOpen(false)}
        onComplete={() => { setBulkOpen(false); qc.invalidateQueries({ queryKey: ['centers'] }); }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{width:'480px',maxWidth:'100vw',display:'flex',flexDirection:'column',height:'100vh',padding:0,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          <div style={{padding:'18px 24px 14px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
            <SheetTitle style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>{editItem._id?'Edit Center':'Add Center'}</SheetTitle>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'0 24px'}}>
            <div className="ac-sheet-form">
              <Field label="Center Name *" error={touched.centerName?errors.centerName:''}>
                <Input value={editItem.centerName||''} onChange={e=>handleChange('centerName',e.target.value)} onBlur={()=>handleBlur('centerName')} style={inputStyle('centerName')}/>
              </Field>
              <Field label="Address">
                <Textarea value={editItem.address||''} onChange={e=>handleChange('address',e.target.value)} rows={2}/>
              </Field>
              <div className="ac-grid-2">
                <Field label="City"><Input value={editItem.city||''} onChange={e=>handleChange('city',e.target.value)}/></Field>
                <Field label="State"><Input value={editItem.state||''} onChange={e=>handleChange('state',e.target.value)}/></Field>
              </div>
              <div className="ac-grid-2">
                <Field label="Pincode" error={touched.pincode?errors.pincode:''}>
                  <Input value={editItem.pincode||''} onChange={e=>handleChange('pincode',e.target.value.replace(/\D/g,'').slice(0,6))} onBlur={()=>handleBlur('pincode')} maxLength={6} placeholder="6-digit" style={inputStyle('pincode')}/>
                </Field>
                <Field label="Phone" error={touched.phone?errors.phone:''}>
                  <Input value={editItem.phone||''} onChange={e=>handleChange('phone',e.target.value.replace(/\D/g,'').slice(0,10))} onBlur={()=>handleBlur('phone')} maxLength={10} placeholder="10-digit mobile" style={inputStyle('phone')}/>
                </Field>
              </div>
              <Field label="Email" error={touched.email?errors.email:''}>
                <Input type="email" value={editItem.email||''} onChange={e=>handleChange('email',e.target.value)} onBlur={()=>handleBlur('email')} placeholder="example@email.com" style={inputStyle('email')}/>
              </Field>
              <Field label="Google Maps Link" error={touched.googleMapsLink?errors.googleMapsLink:''}>
                <Input value={editItem.googleMapsLink||''} onChange={e=>handleChange('googleMapsLink',e.target.value)} onBlur={()=>handleBlur('googleMapsLink')} placeholder="https://maps.google.com/..." style={inputStyle('googleMapsLink')}/>
              </Field>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:10}}>
                <Switch checked={editItem.isActive??true} onCheckedChange={c=>handleChange('isActive',c)}/>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>Active</span>
              </div>
            </div>
          </div>
          <div style={{padding:'14px 24px',borderTop:'1px solid #f1f5f9',flexShrink:0,background:'#fff'}}>
            <button type="button" className="ac-submit-btn" disabled={saveMutation.isPending} onClick={handleSubmit}>
              {saveMutation.isPending&&<Loader2 size={14} className="ac-spin"/>}
              {editItem._id?'Update Center':'Create Center'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleteTarget} title="Delete Center"
        message={`Are you sure you want to delete "${deleteTarget?.centerName}"? This action cannot be undone.`}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget._id)}
        onCancel={()=>setDeleteTarget(null)} loading={deleteMutation.isPending}/>
    </>
  );
};

export default AdminCenters;