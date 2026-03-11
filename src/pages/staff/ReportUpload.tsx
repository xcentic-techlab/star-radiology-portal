import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, AlertTriangle, FileText, Loader2, X, Calendar, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Appointment } from '@/types';
import { format } from 'date-fns';

interface AppointmentResult extends Appointment { hasReport?: boolean; }

const ReportUpload: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentResult[]>([]);
  const [filtered, setFiltered]         = useState<AppointmentResult[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [appointment, setAppointment]   = useState<AppointmentResult | null>(null);
  const [file, setFile]                 = useState<File | null>(null);
  const [reportType, setReportType]     = useState('Diagnostic Report');
  const [notes, setNotes]               = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports/paid-appointments');
        const data: AppointmentResult[] = res.data.appointments || [];
        setAppointments(data); setFiltered(data);
      } catch { toast.error('Could not load appointments'); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    setFiltered(!q ? appointments : appointments.filter(a =>
      a.fullName?.toLowerCase().includes(q) || a.mobile?.includes(q) || a.procedure?.toLowerCase().includes(q) || (a as any).scanType?.toLowerCase().includes(q)
    ));
  }, [searchQuery, appointments]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !appointment) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('appointmentId', appointment._id);
      fd.append('reportType', reportType);
      fd.append('notes', notes);
      return api.post('/reports/upload', fd, { onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded*100)/e.total)); } });
    },
    onSuccess: () => {
      setAppointments(prev => prev.map(a => a._id === appointment?._id ? { ...a, hasReport: true } : a));
      setSuccess(true); toast.success('Report uploaded successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Upload failed'),
  });

  const reset = () => { setAppointment(null); setFile(null); setNotes(''); setUploadProgress(0); setSuccess(false); };
  const fmtDate = (d: string) => { try { return format(new Date(d),'dd MMM yyyy'); } catch { return d; } };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.size <= 10*1024*1024) setFile(f); else toast.error('File must be under 10MB');
  };

  if (success) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');.ru-success{flex:1;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;padding:24px;}`}</style>
      <AppHeader title="Upload Report" />
      <div className="ru-success">
        <div style={{ textAlign:'center',maxWidth:380 }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'#ecfdf5',border:'2px solid #a7f3d0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
            <CheckCircle size={34} color="#10b981" />
          </div>
          <h2 style={{ fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.4px',marginBottom:8 }}>Report Uploaded! 🎉</h2>
          <p style={{ fontSize:14,color:'#64748b',marginBottom:4 }}>Patient: <strong>{appointment?.fullName || '—'}</strong></p>
          <p style={{ fontSize:13,color:'#94a3b8',marginBottom:28 }}>Patient can now view this report in their app.</p>
          <button onClick={reset} style={{ padding:'12px 28px',background:'linear-gradient(135deg,#2563eb,#4f46e5)',color:'#fff',border:'none',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans',boxShadow:'0 4px 14px rgba(79,70,229,0.3)' }}>
            Upload Another Report
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ru-wrap { flex:1;padding:28px;overflow-y:auto;background:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){.ru-wrap{padding:16px;}}
        .ru-grid { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
        @media(max-width:900px){.ru-grid{grid-template-columns:1fr;}}
        .ru-card { background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);padding:24px;display:flex;flex-direction:column;gap:16px; }
        .ru-card-title { font-size:14px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px; }
        .ru-step-badge { width:22px;height:22px;borderRadius:'50%';background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0; }

        /* Search */
        .ru-search-wrap { position:relative; }
        .ru-search-icon { position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none; }
        .ru-search { width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px 0 34px;font-size:13px;background:#fafafa;color:#0f172a;outline:none;transition:border-color 0.2s,box-shadow 0.2s;font-family:'Plus Jakarta Sans',sans-serif; }
        .ru-search::placeholder{color:#94a3b8;}
        .ru-search:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,0.1);background:#fff;}

        /* Patient count */
        .ru-count { font-size:12px;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:3px 10px; }

        /* Patient list */
        .ru-list { max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px; }
        .ru-list::-webkit-scrollbar{width:4px;}
        .ru-list::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px;}
        .ru-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}

        .ru-patient-btn {
          width:100%;text-align:left;padding:14px;border-radius:12px;
          border:1.5px solid #f1f5f9;background:#fafafa;cursor:pointer;
          transition:all 0.15s;
        }
        .ru-patient-btn:hover{border-color:#bfdbfe;background:#eff6ff;}
        .ru-patient-name{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px;}
        .ru-patient-sub{font-size:12px;color:#94a3b8;}
        .ru-patient-meta{display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;margin-top:2px;}
        .ru-paid-pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#ecfdf5;color:#065f46;}
        .ru-exists-pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fffbeb;color:#92400e;margin-left:4px;}

        /* Selected card */
        .ru-selected-card { padding:14px;background:#eff6ff;border-radius:12px;border:1.5px solid #bfdbfe;display:flex;flex-direction:column;gap:10px; }
        .ru-selected-header { display:flex;align-items:center;justify-content:space-between; }
        .ru-selected-label { font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px; }
        .ru-change-btn { font-size:12px;font-weight:600;color:#64748b;background:none;border:none;cursor:pointer;padding:0; }
        .ru-change-btn:hover{color:#ef4444;}
        .ru-info-row { display:flex;justify-content:space-between;font-size:12.5px; }
        .ru-info-key { color:#64748b; }
        .ru-info-val { font-weight:600;color:#0f172a; }

        /* Dimmed right panel */
        .ru-right-dim { opacity:0.4;pointer-events:none;transition:opacity 0.2s; }
        .ru-right-active { opacity:1;pointer-events:all;transition:opacity 0.2s; }

        /* Dropzone */
        .ru-dropzone {
          border:2px dashed #e2e8f0;border-radius:12px;padding:32px 20px;
          text-align:center;cursor:pointer;background:#fafafa;
          transition:border-color 0.2s,background 0.2s;
        }
        .ru-dropzone:hover{border-color:#4f46e5;background:#f5f3ff;}
        .ru-dropzone-icon{color:#cbd5e1;margin:0 auto 10px;}
        .ru-dropzone-text{font-size:14px;font-weight:600;color:#475569;}
        .ru-dropzone-sub{font-size:12px;color:#94a3b8;margin-top:4px;}
        .ru-file-info{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600;color:#2563eb;}
        .ru-file-remove{color:#94a3b8;background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:0;}
        .ru-file-remove:hover{color:#ef4444;}

        /* Progress bar */
        .ru-progress-wrap{background:#f1f5f9;border-radius:999px;height:6px;overflow:hidden;}
        .ru-progress-fill{height:100%;background:linear-gradient(90deg,#2563eb,#4f46e5);border-radius:999px;transition:width 0.3s;}
        .ru-progress-text{font-size:12px;color:#64748b;text-align:center;margin-top:6px;}

        /* Upload btn */
        .ru-btn {
          width:100%;height:46px;border-radius:11px;
          background:linear-gradient(135deg,#2563eb,#4f46e5);
          color:#fff;border:none;cursor:pointer;
          font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s;
          box-shadow:0 4px 14px rgba(79,70,229,0.3);
        }
        .ru-btn:hover:not(:disabled){opacity:0.92;transform:translateY(-1px);}
        .ru-btn:disabled{opacity:0.5;cursor:not-allowed;}
        @keyframes ru-spin{to{transform:rotate(360deg);}}
        .ru-spin{animation:ru-spin 0.8s linear infinite;}

        .ru-field-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;}

        .ru-warn{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;font-size:12px;color:#92400e;}

        .ru-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;color:#94a3b8;}
        .ru-empty-icon{margin-bottom:10px;color:#e2e8f0;}
        .ru-empty-text{font-size:13px;font-weight:500;}
        .ru-loading{display:flex;align-items:center;justify-content:center;padding:48px 20px;}
      `}</style>

      <AppHeader title="Upload Report" />
      <div className="ru-wrap">
        <div className="ru-grid">
          <div className="ru-card">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div className="ru-card-title">
                <span className="ru-step-badge">1</span>
                Select Patient
              </div>
              {!loading && <span className="ru-count">{filtered.length} patients</span>}
            </div>

            {!appointment && (
              <div className="ru-search-wrap">
                <Search size={14} className="ru-search-icon" />
                <input className="ru-search" placeholder="Search by name, phone or scan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            )}

            {loading && <div className="ru-loading"><Loader2 size={22} color="#94a3b8" className="ru-spin" /></div>}

            {!loading && filtered.length === 0 && !appointment && (
              <div className="ru-empty">
                <User size={28} className="ru-empty-icon" />
                <p className="ru-empty-text">{searchQuery ? 'No results found' : 'No paid appointments'}</p>
              </div>
            )}

            {!loading && filtered.length > 0 && !appointment && (
              <div className="ru-list">
                {filtered.map(a => (
                  <button key={a._id} className="ru-patient-btn" onClick={() => setAppointment(a)}>
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10 }}>
                      <div style={{ minWidth:0 }}>
                        <div className="ru-patient-name">{a.fullName}</div>
                        <div className="ru-patient-sub">{a.mobile}</div>
                        <div className="ru-patient-meta">
                          <Calendar size={11} />
                          {fmtDate(a.date)}
                          {(a as any).scanType && <> · {(a as any).scanType}</>}
                        </div>
                      </div>
                      <div style={{ flexShrink:0,textAlign:'right' }}>
                        <span className="ru-paid-pill">{a.paymentStatus}</span>
                        {a.hasReport && <span className="ru-exists-pill">Uploaded</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {appointment && (
              <div className="ru-selected-card">
                <div className="ru-selected-header">
                  <span className="ru-selected-label">✓ Selected Patient</span>
                  <button className="ru-change-btn" onClick={() => setAppointment(null)}>Change</button>
                </div>
                {[
                  ['Patient',   appointment.fullName],
                  ['Phone',     appointment.mobile || '—'],
                  ['Scan',      (appointment as any).scanType || '—'],
                  ['Procedure', (appointment as any).procedureDescription || appointment.procedure || '—'],
                  ['Date',      fmtDate(appointment.date)],
                  ['Payment',   appointment.paymentStatus],
                ].map(([k, v]) => (
                  <div key={k} className="ru-info-row">
                    <span className="ru-info-key">{k}</span>
                    <span className="ru-info-val">{v}</span>
                  </div>
                ))}
                {appointment.hasReport && (
                  <div className="ru-warn">
                    <AlertTriangle size={13} />
                    Report already exists. Uploading will add another.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={appointment ? 'ru-right-active' : 'ru-right-dim'}>
            <div className="ru-card">
              <div className="ru-card-title">
                <span className="ru-step-badge">2</span>
                Upload File
              </div>

              <div className="ru-dropzone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 10*1024*1024) setFile(f); else if (f) toast.error('File must be under 10MB');
                  }} />
                {file ? (
                  <div className="ru-file-info">
                    <FileText size={16} />
                    <span>{file.name}</span>
                    <span style={{ fontSize:11,color:'#94a3b8' }}>({(file.size/1024/1024).toFixed(2)} MB)</span>
                    <button className="ru-file-remove" onClick={e => { e.stopPropagation(); setFile(null); }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="ru-dropzone-icon" />
                    <p className="ru-dropzone-text">Drop file here, or click to browse</p>
                    <p className="ru-dropzone-sub">PDF, JPG, PNG · Max 10MB</p>
                  </>
                )}
              </div>
              <div>
                <label className="ru-field-label">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lab Report">Lab Report</SelectItem>
                    <SelectItem value="Scan Images">Scan Images</SelectItem>
                    <SelectItem value="Diagnostic Report">Diagnostic Report</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="ru-field-label">Notes (optional)</label>
                <Textarea placeholder="e.g. Sample collected, urgent report..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>
              {upload.isPending && (
                <div>
                  <div className="ru-progress-wrap"><div className="ru-progress-fill" style={{ width:`${uploadProgress}%` }} /></div>
                  <p className="ru-progress-text">{uploadProgress}% uploaded</p>
                </div>
              )}

              <button className="ru-btn" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                {upload.isPending
                  ? <><Loader2 size={15} className="ru-spin" /> Uploading...</>
                  : <><Upload size={15} /> Upload Report</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportUpload;