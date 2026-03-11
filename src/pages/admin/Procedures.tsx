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
import { Plus, Pencil, Trash2, Loader2, Stethoscope, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import adminApi from '@/lib/axios';
import type { Procedure } from '@/types';

const categories = ['MRI', 'CT Scan', 'Pathology', 'Ultrasound', 'X-Ray', 'Other'] as const;
const emptyProc: Partial<Procedure> = { name:'', category:'MRI', description:'', priceRange:'', preparationInstructions:'', isActive:true };

const PROCEDURES_IMPORT_CONFIG: BulkImportConfig = {
  title: 'Import Procedures',
  entityLabel: 'procedure',
  endpoint: '/admin/procedures',
  accentColor: '#059669',
  fields: [
    { key: 'name',        label: 'Name',        aliases: ['Procedure','procedure_name','Name'],  required: true },
    { key: 'category',    label: 'Category',    aliases: ['Category','type','Type'],
      transform: v => {
        const map: Record<string,string> = {
          mri:'MRI', 'ct scan':'CT Scan', 'ct':'CT Scan',
          pathology:'Pathology', ultrasound:'Ultrasound',
          'x-ray':'X-Ray', xray:'X-Ray', other:'Other',
        };
        return map[v.toLowerCase()] ?? 'Other';
      }
    },
    { key: 'description',              label: 'Description',   aliases: ['desc','Description'] },
    { key: 'priceRange',               label: 'Price Range',   aliases: ['price','Price','price_range','Price Range'] },
    { key: 'preparationInstructions',  label: 'Preparation',   aliases: ['preparation','instructions','Preparation Instructions'] },
    { key: 'isActive', label: 'Active', aliases: ['active','status','Active'],
      transform: v => String(v).toLowerCase() !== 'false' && v !== '0'
    },
  ],
  buildPayload: (d) => ({
    name:                    d.name,
    code:                    d.name.trim().toUpperCase().replace(/\s+/g, '_'),
    category:                d.category   || 'Other',
    description:             d.description || '',
    priceRange:              d.priceRange  || '',
    preparationInstructions: d.preparationInstructions || '',
    price:                   0,
    duration:                30,
    isActive:                d.isActive ?? true,
  }),
  templateRows: [
    ['Brain MRI',       'MRI',       'Full brain scan', '₹3000 - ₹5000', 'No metal objects', 'true'],
    ['Chest X-Ray',     'X-Ray',     'Chest radiograph', '₹300 - ₹600',  'Remove jewellery', 'true'],
    ['CBC Blood Test',  'Pathology', 'Complete blood count', '₹200 - ₹400', 'Fasting 8 hrs', 'true'],
  ],
  pdfPrompt: `Extract all diagnostic procedure records from this document. Return ONLY a valid JSON array, no markdown fences, no preamble.
Each object must have: name (required), category (one of: MRI, CT Scan, Pathology, Ultrasound, X-Ray, Other), description, priceRange, preparationInstructions, isActive (boolean default true).
Return [] if no procedures found.`,
};

const CAT_COLORS: Record<string,[string,string]> = {
  'MRI':        ['#eff6ff','#1e40af'],
  'CT Scan':    ['#f5f3ff','#5b21b6'],
  'Pathology':  ['#ecfdf5','#065f46'],
  'Ultrasound': ['#fff7ed','#9a3412'],
  'X-Ray':      ['#fdf4ff','#7e22ce'],
  'Other':      ['#f9fafb','#374151'],
};

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
    <label style={{ fontSize:11.5,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.5px' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize:11,color:'#ef4444',fontWeight:500 }}>⚠ {error}</span>}
  </div>
);

const IconBtn: React.FC<{ onClick: () => void; danger?: boolean; title?: string; children: React.ReactNode }> = ({ onClick, danger, title, children }) => (
  <button onClick={onClick} title={title} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:danger?'#ef4444':'#64748b',transition:'all 0.15s' }}
    onMouseEnter={e=>{ const el=e.currentTarget; el.style.background=danger?'#fef2f2':'#f8fafc'; el.style.borderColor=danger?'#fecaca':'#cbd5e1'; }}
    onMouseLeave={e=>{ const el=e.currentTarget; el.style.background='#fff'; el.style.borderColor='#e2e8f0'; }}>
    {children}
  </button>
);

const validate = (p: Partial<Procedure>) => {
  const errors: Record<string,string> = {};
  if (!p.name?.trim()) errors.name = 'Procedure name is required';
  return errors;
};

const AdminProcedures: React.FC = () => {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [bulkOpen, setBulkOpen]             = useState(false);
  const [edit, setEdit]                     = useState<Partial<Procedure>>(emptyProc);
  const [errors, setErrors]                 = useState<Record<string,string>>({});
  const [touched, setTouched]               = useState<Record<string,boolean>>({});
  const [deleteTarget, setDeleteTarget]     = useState<Procedure|null>(null);
  const [page, setPage]                     = useState(1);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [search, setSearch]                 = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['procedures', page],
    queryFn: async () => {
      const res = await adminApi.get('/admin/procedures', { params:{ page, limit:100 } });
      return res.data;
    },
  });

  const allProcedures: Procedure[] = data?.procedures || data || [];
  const totalPages = data?.totalPages || 1;

  const filteredProcedures = useMemo(() => allProcedures.filter(p => {
    if (search) { const q=search.toLowerCase(); if (!p.name?.toLowerCase().includes(q)) return false; }
    if (filterCategory!=='all' && p.category !== filterCategory) return false;
    if (filterStatus==='active' && !p.isActive) return false;
    if (filterStatus==='inactive' && p.isActive) return false;
    return true;
  }), [allProcedures, search, filterCategory, filterStatus]);

  const hasFilters = search || filterCategory!=='all' || filterStatus!=='all';
  const clearFilters = () => { setSearch(''); setFilterCategory('all'); setFilterStatus('all'); };

  const save = useMutation({
    mutationFn: (p: Partial<Procedure>) => {
      const payload = {
        name: p.name,
        code: p.name?.trim().toUpperCase().replace(/\s+/g,'_'),
        description: p.description,
        category: p.category,
        priceRange: p.priceRange,
        preparationInstructions: p.preparationInstructions,
        price: 0, duration: 30,
        isActive: p.isActive ?? true,
      };
      return p._id ? adminApi.put(`/admin/procedures/${p._id}`, payload) : adminApi.post('/admin/procedures', payload);
    },
    onSuccess: () => { toast.success(edit._id?'Procedure updated':'Procedure created'); qc.invalidateQueries({ queryKey: ['procedures'] }); setSheetOpen(false); },
    onError: () => toast.error('Failed to save procedure.'),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/procedures/${id}`),
    onSuccess: () => { toast.success('Procedure deleted'); qc.invalidateQueries({ queryKey: ['procedures'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete procedure.'),
  });

  const handleChange = (field: keyof Procedure, value: string | boolean) => {
    const updated = { ...edit, [field]: value };
    setEdit(updated);
    if (touched[field]) { const e=validate(updated); setErrors(prev=>({...prev,[field]:e[field]||''})); }
  };
  const handleBlur = (field: keyof Procedure) => {
    setTouched(prev=>({...prev,[field]:true}));
    const e=validate(edit); setErrors(prev=>({...prev,[field]:e[field]||''}));
  };
  const handleSubmit = () => {
    const allErrors=validate(edit);
    setTouched({name:true}); setErrors(allErrors);
    if (Object.values(allErrors).some(Boolean)) { toast.error('Please fix the errors before saving'); return; }
    save.mutate(edit);
  };
  const openSheet = (item: Partial<Procedure>) => { setEdit({...item}); setErrors({}); setTouched({}); setSheetOpen(true); };
  const errStyle = (field: string) => touched[field]&&errors[field] ? { borderColor:'#fca5a5', boxShadow:'0 0 0 2px rgba(239,68,68,0.1)' } : {};

  const columns = [
    { key:'name', header:'Procedure', render:(p:Procedure) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Stethoscope size={15} color="#059669"/>
        </div>
        <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{p.name}</div>
      </div>
    )},
    { key:'category', header:'Category', render:(p:Procedure) => {
      const [bg,text] = CAT_COLORS[p.category] ?? CAT_COLORS['Other'];
      return <span style={{padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:bg,color:text}}>{p.category}</span>;
    }},
    { key:'description', header:'Description', render:(p:Procedure) => (
      <span style={{fontSize:13,color:'#94a3b8',display:'block',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description||'—'}</span>
    )},
    { key:'priceRange', header:'Price Range', render:(p:Procedure) => (
      <span style={{fontSize:13,fontWeight:600,color:'#059669'}}>{p.priceRange||'—'}</span>
    )},
    { key:'isActive', header:'Status', render:(p:Procedure) => (
      <span style={{padding:'3px 10px',borderRadius:999,fontSize:12,fontWeight:600,background:p.isActive?'#ecfdf5':'#fef2f2',color:p.isActive?'#065f46':'#991b1b'}}>{p.isActive?'● Active':'● Inactive'}</span>
    )},
    { key:'actions', header:'Actions', render:(p:Procedure) => (
      <div style={{display:'flex',gap:6}}>
        <IconBtn onClick={()=>openSheet({...p})}><Pencil size={13}/></IconBtn>
        <IconBtn onClick={()=>setDeleteTarget(p)} danger><Trash2 size={13}/></IconBtn>
      </div>
    )},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ap-wrap{flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;}
        @media(max-width:640px){.ap-wrap{padding:16px;}}
        .ap-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;}
        .ap-title{font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;}
        .ap-title-sub{font-size:13px;color:#64748b;margin-top:2px;}
        .ap-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .ap-btn-add{display:flex;align-items:center;gap:6px;padding:9px 18px;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 3px 10px rgba(5,150,105,0.25);transition:opacity 0.2s,transform 0.15s;}
        .ap-btn-add:hover{opacity:0.92;transform:translateY(-1px);}
        .ap-btn-import{display:flex;align-items:center;gap:6px;padding:9px 16px;background:#fff;color:#475569;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;}
        .ap-btn-import:hover{background:#f8fafc;border-color:#cbd5e1;color:#0f172a;}
        .ap-card{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);overflow:hidden;}
        .ap-filterbar{display:flex;align-items:center;gap:0;padding:10px 16px;background:#fff;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow-x:auto;}
        .ap-filter-label{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;margin-right:12px;flex-shrink:0;}
        .ap-filter-sep{width:1px;height:22px;background:#e2e8f0;flex-shrink:0;margin:0 10px;}
        .ap-fselect{height:34px !important;min-width:120px;max-width:160px;font-size:12px !important;border-radius:8px !important;border:1px solid #e2e8f0 !important;flex-shrink:0;}
        .ap-fsearch{height:34px;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;min-width:150px;color:#0f172a;flex-shrink:0;}
        .ap-fsearch:focus{border-color:#6ee7b7;box-shadow:0 0 0 2px rgba(5,150,105,0.1);}
        .ap-clear-btn{display:flex;align-items:center;gap:4px;padding:0 10px;height:34px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;font-size:12px;font-weight:600;color:#ef4444;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;margin-left:12px;flex-shrink:0;}
        .ap-clear-btn:hover{background:#fee2e2;}
        .ap-result-count{font-size:12px;color:#94a3b8;font-weight:500;margin-bottom:8px;}
        .ap-sheet-form{display:flex;flex-direction:column;gap:12px;padding:16px 0;}
        .ap-submit-btn{width:100%;height:46px;border-radius:11px;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(5,150,105,0.3);transition:opacity 0.2s;}
        .ap-submit-btn:hover:not(:disabled){opacity:0.92;} .ap-submit-btn:disabled{opacity:0.6;cursor:not-allowed;}
        @keyframes ap-spin{to{transform:rotate(360deg);}} .ap-spin{animation:ap-spin 0.8s linear infinite;}
      `}</style>

      <AppHeader title="Procedures"/>
      <div className="ap-wrap">
        <div className="ap-topbar">
          <div><h2 className="ap-title">Procedures</h2><p className="ap-title-sub">Manage diagnostic procedures and scan types</p></div>
          <div className="ap-actions">
            <button className="ap-btn-import" onClick={() => setBulkOpen(true)}>
              <Upload size={14} /> Bulk Import
            </button>
            <button className="ap-btn-add" onClick={() => openSheet({...emptyProc})}>
              <Plus size={15}/> Add Procedure
            </button>
          </div>
        </div>

        <div className="ap-filterbar">
          <span className="ap-filter-label">Filter:</span>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="ap-fselect"><SelectValue placeholder="All Types"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ap-filter-sep"/>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="ap-fselect"><SelectValue placeholder="All Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="ap-filter-sep"/>
          <input className="ap-fsearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search procedure..."/>
          {hasFilters&&<button className="ap-clear-btn" onClick={clearFilters}><X size={11}/> Clear</button>}
        </div>

        {hasFilters&&<div className="ap-result-count">Showing {filteredProcedures.length} of {allProcedures.length} procedures</div>}

        <div className="ap-card">
          <DataTable columns={columns} data={filteredProcedures} loading={isLoading}
            emptyTitle={hasFilters?'No procedures found matching your filters':'No procedures yet'}
            page={page} totalPages={totalPages} onPageChange={setPage} rowKey={p=>p._id}/>
        </div>
      </div>

      <BulkImportModal
        open={bulkOpen}
        config={PROCEDURES_IMPORT_CONFIG}
        onClose={() => setBulkOpen(false)}
        onComplete={() => { setBulkOpen(false); qc.invalidateQueries({ queryKey: ['procedures'] }); }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{width:'480px',maxWidth:'100vw',display:'flex',flexDirection:'column',height:'100vh',padding:0,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          <div style={{padding:'18px 24px 14px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
            <SheetTitle style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>{edit._id?'Edit Procedure':'Add Procedure'}</SheetTitle>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'0 24px'}}>
            <div className="ap-sheet-form">
              <Field label="Name *" error={touched.name?errors.name:''}>
                <Input value={edit.name||''} onChange={e=>handleChange('name',e.target.value)} onBlur={()=>handleBlur('name')} style={errStyle('name')}/>
              </Field>
              <Field label="Category">
                <Select value={edit.category} onValueChange={v=>handleChange('category',v as Procedure['category'])}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea value={edit.description||''} onChange={e=>handleChange('description',e.target.value)} rows={2}/>
              </Field>
              <Field label="Price Range">
                <Input value={edit.priceRange||''} onChange={e=>handleChange('priceRange',e.target.value)} placeholder="e.g. ₹1500 - ₹3000"/>
              </Field>
              <Field label="Preparation Instructions">
                <Textarea value={edit.preparationInstructions||''} onChange={e=>handleChange('preparationInstructions',e.target.value)} rows={3}/>
              </Field>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:10}}>
                <Switch checked={edit.isActive??true} onCheckedChange={c=>handleChange('isActive',c)}/>
                <span style={{fontSize:13,fontWeight:600,color:'#374151'}}>Active</span>
              </div>
            </div>
          </div>
          <div style={{padding:'14px 24px',borderTop:'1px solid #f1f5f9',flexShrink:0,background:'#fff'}}>
            <button type="button" className="ap-submit-btn" disabled={save.isPending} onClick={handleSubmit}>
              {save.isPending&&<Loader2 size={14} className="ap-spin"/>}
              {edit._id?'Update Procedure':'Create Procedure'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleteTarget} title="Delete Procedure"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={()=>deleteTarget&&del.mutate(deleteTarget._id)}
        onCancel={()=>setDeleteTarget(null)} loading={del.isPending}/>
    </>
  );
};

export default AdminProcedures;