import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import { Upload, Eye, RefreshCw, Image as ImageIcon, Trash2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { format } from 'date-fns';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ImageRecord {
  _id: string; page: string; imageKey: string;
  path: string; updatedAt: string; createdAt: string;
}

const PAGE_KEYS: Record<string, { label: string; description: string; keys: { key: string; label: string }[] }> = {
  home: {
    label: 'Home Page',
    description: 'Images shown on the Flutter app home screen',
    keys: [
      { key: 'banner',     label: 'Main Banner'  },
      { key: 'ct_scan',    label: 'CT Scan'       },
      { key: 'ultrasound', label: 'Ultrasound'    },
      { key: 'mri',        label: 'MRI'           },
      { key: 'pathology',  label: 'Pathology'     },
      { key: 'promo_img',  label: 'Promo Banner'  },
    ],
  },
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://178.16.139.140:5000';
const fullUrl = (p?: string | null): string => {
  if (!p) return '';
  const trimmed = p.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = BASE_URL.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

const IconBtn: React.FC<{
  onClick: () => void; title?: string; danger?: boolean; loading?: boolean; children: React.ReactNode;
}> = ({ onClick, title, danger, loading, children }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={loading}
    style={{
      width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0',
      background: '#fff', color: danger ? '#ef4444' : '#64748b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: loading ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = danger ? '#fef2f2' : '#f8fafc'; }}
    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
  >
    {loading
      ? <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
      : children}
  </button>
);

const StatusBadge: React.FC<{ uploaded: boolean }> = ({ uploaded }) => (
  <span style={{
    padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: uploaded ? '#ecfdf5' : '#fef3c7',
    color: uploaded ? '#065f46' : '#92400e',
  }}>
    {uploaded ? 'Uploaded' : 'Empty'}
  </span>
);

const Lightbox: React.FC<{ src: string; label: string; onClose: () => void }> = ({ src, label, onClose }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(8px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: 20,
          maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          position: 'relative', minWidth: 240,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            border: 'none', background: '#f1f5f9', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <X size={16} />
        </button>

        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', paddingRight: 40 }}>
          {label}
        </p>
        <div style={{
          position: 'relative', minHeight: 120,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imgStatus === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, color: '#94a3b8', fontSize: 13,
            }}>
              <RefreshCw size={22} style={{ animation: 'spin 0.8s linear infinite' }} />
              Loading image…
            </div>
          )}
          {imgStatus === 'error' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 8, color: '#ef4444', fontSize: 13, padding: '24px 32px',
            }}>
              <AlertCircle size={28} />
              <span style={{ fontWeight: 600 }}>Could not load image</span>
              <span style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-all', maxWidth: 320, textAlign: 'center' }}>
                {src}
              </span>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 4, padding: '6px 14px', borderRadius: 8,
                  background: '#f1f5f9', color: '#334155', fontSize: 12,
                  textDecoration: 'none', fontWeight: 600,
                }}
              >
                Open in new tab ↗
              </a>
            </div>
          )}
          <img
            src={src}
            alt={label}
            onLoad={() => setImgStatus('ok')}
            onError={() => setImgStatus('error')}
            style={{
              maxWidth: '80vw', maxHeight: '70vh',
              borderRadius: 10, objectFit: 'contain',
              display: imgStatus === 'error' ? 'none' : 'block',
              opacity: imgStatus === 'loading' ? 0 : 1,
              transition: 'opacity 0.25s',
            }}
          />
        </div>
        {imgStatus === 'ok' && (
          <p style={{ margin: 0, fontSize: 10, color: '#cbd5e1', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {src}
          </p>
        )}
      </div>
    </div>
  );
};

const AdminImages: React.FC = () => {
  const qc = useQueryClient();
  const activePage = 'home';
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ src: string; label: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; label: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: imagesRaw, isLoading } = useQuery<ImageRecord[]>({
    queryKey: ['admin-images', activePage],
    queryFn: async () => {
      const res = await api.get(`/images/records?page=${activePage}`);
      return res.data?.images || [];
    },
  });

  const imagesMap: Record<string, string> = {};
  (imagesRaw || []).forEach(r => { imagesMap[r.imageKey] = r.path; });
  const getRecord = (key: string) => (imagesRaw || []).find(r => r.imageKey === key);

  const uploadMutation = useMutation({
    mutationFn: async ({ imageKey, file }: { imageKey: string; file: File }) => {
      const fd = new FormData();
      fd.append('page', activePage);
      fd.append('imageKey', imageKey);
      fd.append('image', file);
      const res = await api.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Image updated successfully');
      qc.invalidateQueries({ queryKey: ['admin-images', activePage] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Upload failed'),
    onSettled: () => setUploadingKey(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageKey: string) => {
      const res = await api.delete(`/images/delete?page=${activePage}&imageKey=${imageKey}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Image deleted');
      qc.invalidateQueries({ queryKey: ['admin-images', activePage] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const handleFile = (imageKey: string, file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2MB'); return; }
    setUploadingKey(imageKey);
    uploadMutation.mutate({ imageKey, file });
  };

  const openPreview = (key: string, label: string) => {
    const raw = imagesMap[key];
    if (!raw) return;
    const url = fullUrl(raw);
    console.debug('[AdminImages] preview url:', url); 
    setPreviewTarget({ src: url, label });
  };

  const pageConf = PAGE_KEYS[activePage];
  const uploadedCount = pageConf?.keys.filter(k => imagesMap[k.key]).length ?? 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ai-wrap { flex:1; padding:28px; overflow-y:auto; background:#f8fafc; font-family:'Plus Jakarta Sans',sans-serif; }
        @media(max-width:640px){ .ai-wrap { padding:14px; } }
        .ai-stats-row { display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:12px; color:#64748b; }
        .ai-total { font-weight:700; color:#0f172a; }
        .ai-card { background:#fff; border-radius:16px; border:1px solid #f1f5f9; box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04); overflow:hidden; }
        .ai-card-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #f1f5f9; flex-wrap:wrap; gap:8px; }
        .ai-card-title { font-size:15px; font-weight:700; color:#0f172a; }
        .ai-card-sub { font-size:12px; color:#94a3b8; margin-top:2px; }
        .ai-table-wrap { overflow-x:auto; }
        .ai-table { width:100%; border-collapse:collapse; min-width:540px; }
        .ai-table th { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.6px; padding:10px 20px; text-align:left; background:#fafbfc; border-bottom:1px solid #f1f5f9; white-space:nowrap; }
        .ai-table td { padding:11px 20px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
        .ai-table tr:last-child td { border-bottom:none; }
        .ai-table tr:hover td { background:#fafbfc; }
        @media(max-width:640px){ .ai-table-wrap { display:none; } }
        .ai-mobile-list { display:none; }
        @media(max-width:640px){ .ai-mobile-list { display:flex; flex-direction:column; } }
        .ai-mobile-row { display:flex; align-items:center; gap:12px; padding:13px 16px; border-bottom:1px solid #f1f5f9; }
        .ai-mobile-row:last-child { border-bottom:none; }
        .ai-mobile-thumb { width:56px; height:40px; border-radius:8px; overflow:hidden; flex-shrink:0; border:1px solid #e2e8f0; cursor:pointer; background:#f1f5f9; display:flex; align-items:center; justify-content:center; }
        .ai-mobile-thumb img { width:100%; height:100%; object-fit:cover; }
        .ai-mobile-info { flex:1; min-width:0; }
        .ai-mobile-label { font-size:13px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ai-mobile-key { font-size:10px; color:#94a3b8; font-family:monospace; margin-top:1px; }
        .ai-mobile-meta { display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap; }
        .ai-mobile-actions { display:flex; gap:4px; flex-shrink:0; }
        .ai-empty { padding:48px 22px; text-align:center; color:#94a3b8; font-size:13px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ai-thumb-img { width:100%; height:100%; object-fit:cover; transition:opacity 0.2s; }
        .ai-thumb-img:hover { opacity:0.85; }
      `}</style>

      <AppHeader title="Image Manager" />

      <div className="ai-wrap">
        <div className="ai-stats-row">
          <span className="ai-total">{uploadedCount}</span> of {pageConf?.keys.length ?? 0} images uploaded
        </div>

        <div className="ai-card">
          <div className="ai-card-head">
            <div>
              <p className="ai-card-title">{pageConf?.label}</p>
              <p className="ai-card-sub">{pageConf?.description}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="ai-empty">
              <RefreshCw size={28} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 8px', display: 'block', color: '#94a3b8' }} />
              Loading images…
            </div>
          ) : (
            <>
              <div className="ai-table-wrap">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Preview</th><th>Image Key</th><th>Status</th><th>Last Updated</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageConf?.keys.map(k => {
                      const src = imagesMap[k.key];
                      const rec = getRecord(k.key);
                      const isUploading = uploadingKey === k.key;
                      return (
                        <tr key={k.key}>
                          <td style={{ width: 90 }}>
                            {src ? (
                              <div
                                onClick={() => openPreview(k.key, k.label)}
                                style={{ width: 64, height: 44, borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #e2e8f0' }}
                              >
                                <img
                                  src={fullUrl(src)}
                                  alt={k.label}
                                  className="ai-thumb-img"
                                  onError={e => {
                                    e.currentTarget.style.opacity = '0.15';
                                    e.currentTarget.title = 'Image failed to load';
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{ width: 64, height: 44, borderRadius: 8, background: '#f1f5f9', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageIcon size={16} color="#94a3b8" />
                              </div>
                            )}
                          </td>
                          <td>
                            <p style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', margin: 0 }}>{k.label}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{k.key}</p>
                          </td>
                          <td><StatusBadge uploaded={!!src} /></td>
                          <td>
                            {rec
                              ? <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{format(new Date(rec.updatedAt), 'dd MMM yyyy, hh:mm a')}</span>
                              : <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                            }
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {src && (
                                <IconBtn onClick={() => openPreview(k.key, k.label)} title="Preview">
                                  <Eye size={13} />
                                </IconBtn>
                              )}
                              <IconBtn onClick={() => fileRefs.current[k.key]?.click()} title={src ? 'Replace' : 'Upload'} loading={isUploading}>
                                <Upload size={13} />
                              </IconBtn>
                              {src && (
                                <IconBtn onClick={() => setDeleteTarget(k)} title="Delete" danger>
                                  <Trash2 size={13} />
                                </IconBtn>
                              )}
                              <input
                                ref={el => (fileRefs.current[k.key] = el)}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={e => { handleFile(k.key, e.target.files?.[0]); e.target.value = ''; }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ai-mobile-list">
                {pageConf?.keys.map(k => {
                  const src = imagesMap[k.key];
                  const rec = getRecord(k.key);
                  const isUploading = uploadingKey === k.key;
                  return (
                    <div key={k.key} className="ai-mobile-row">
                      <div className="ai-mobile-thumb" onClick={() => src && openPreview(k.key, k.label)}>
                        {src
                          ? <img src={fullUrl(src)} alt={k.label} className="ai-thumb-img"
                              onError={e => { e.currentTarget.style.opacity = '0.15'; }} />
                          : <ImageIcon size={15} color="#94a3b8" />
                        }
                      </div>
                      <div className="ai-mobile-info">
                        <div className="ai-mobile-label">{k.label}</div>
                        <div className="ai-mobile-key">{k.key}</div>
                        <div className="ai-mobile-meta">
                          <StatusBadge uploaded={!!src} />
                          {rec && <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{format(new Date(rec.updatedAt), 'dd MMM yy')}</span>}
                        </div>
                      </div>
                      <div className="ai-mobile-actions">
                        {src && <IconBtn onClick={() => openPreview(k.key, k.label)} title="Preview"><Eye size={13} /></IconBtn>}
                        <IconBtn onClick={() => fileRefs.current[k.key]?.click()} title={src ? 'Replace' : 'Upload'} loading={isUploading}>
                          <Upload size={13} />
                        </IconBtn>
                        {src && <IconBtn onClick={() => setDeleteTarget(k)} title="Delete" danger><Trash2 size={13} /></IconBtn>}
                        <input
                          ref={el => (fileRefs.current[k.key] = el)}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={e => { handleFile(k.key, e.target.files?.[0]); e.target.value = ''; }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {previewTarget && (
        <Lightbox
          src={previewTarget.src}
          label={previewTarget.label}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Image"
        message={`"${deleteTarget?.label}" image delete karna chahte ho? App mein default image dikhegi.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
};

export default AdminImages;