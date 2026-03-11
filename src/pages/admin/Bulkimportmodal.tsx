import React, { useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X, Upload, FileSpreadsheet, FileText, CheckCircle2,
  AlertCircle, Loader2, Download, ArrowRight, Trash2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

export interface FieldConfig {
  key: string;
  label: string;
  aliases?: string[];
  required?: boolean;
  transform?: (v: string) => any;
}

export interface BulkImportConfig {
  title: string;
  entityLabel: string;
  endpoint: string;
  fields: FieldConfig[];
  buildPayload: (data: Record<string, any>) => Record<string, any>;
  templateRows: any[][];
  pdfPrompt?: string;
  accentColor?: string;
}

interface ParsedRow {
  id: string;
  data: Record<string, any>;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BulkImportModalProps {
  open: boolean;
  config: BulkImportConfig;
  onClose: () => void;
  onComplete: () => void;
  extraPayload?: Record<string, any>;
}


function resolveField(row: Record<string, any>, field: FieldConfig): string {
  const keys = [field.key, field.label, ...(field.aliases || [])];
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== '') return String(v).trim();
  }
  return '';
}

function rowToRecord(raw: Record<string, any>, fields: FieldConfig[], idx: number): ParsedRow {
  const data: Record<string, any> = {};
  for (const f of fields) {
    const val = resolveField(raw, f);

    data[f.key] = f.transform ? f.transform(val) : val;
  }
  return { id: `row-${idx}-${Date.now()}`, data, status: 'pending' };
}

async function parsePdf(file: File, prompt: string): Promise<any[]> {
  const base64 = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  const d = await resp.json();
  const text = d.content?.map((c: any) => c.text || '').join('') || '';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return []; }
}

function downloadTemplate(config: BulkImportConfig) {
  const ws = XLSX.utils.aoa_to_sheet([config.fields.map(f => f.key), ...config.templateRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.entityLabel);
  XLSX.writeFile(wb, `${config.entityLabel.replace(/\s+/g, '_')}_template.xlsx`);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@keyframes _fade  { from{opacity:0} to{opacity:1} }
@keyframes _slide { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
@keyframes _spin  { to{transform:rotate(360deg)} }
@keyframes _row   { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:none} }

.bim-ov {
  position:fixed; inset:0;
  background:rgba(15,23,42,0.48);
  backdrop-filter:blur(8px) saturate(0.8);
  z-index:400; display:flex; align-items:center; justify-content:center;
  padding:16px; animation:_fade 0.18s ease;
  font-family:'Plus Jakarta Sans',sans-serif;
}
.bim-box {
  width:100%; max-width:780px; max-height:92vh;
  background:#fff; border-radius:16px; overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 24px 60px rgba(0,0,0,0.14);
  animation:_slide 0.26s cubic-bezier(0.16,1,0.3,1);
}
.bim-hd {
  background:#fff; border-bottom:1px solid #e8edf4;
  padding:16px 22px;
  display:flex; align-items:center; justify-content:space-between; gap:14px;
  flex-shrink:0;
}
.bim-hd-l { display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
.bim-hd-ico {
  width:36px; height:36px; border-radius:9px;
  background:#eff6ff; border:1px solid #bfdbfe;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.bim-hd-title { font-size:15px; font-weight:800; color:#0f172a; letter-spacing:-0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bim-hd-sub   { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.bim-hd-x {
  width:30px; height:30px; border-radius:7px;
  background:#f8fafc; border:1px solid #e2e8f0;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#94a3b8;
  transition:background 0.14s,color 0.14s,border-color 0.14s; flex-shrink:0;
}
.bim-hd-x:hover { background:#fef2f2; border-color:#fecaca; color:#dc2626; }

.bim-bd {
  flex:1; overflow-y:auto; padding:22px;
  scrollbar-width:thin; scrollbar-color:#d4d9e3 transparent;
}
.bim-bd::-webkit-scrollbar { width:4px; }
.bim-bd::-webkit-scrollbar-thumb { background:#d4d9e3; border-radius:99px; }

.bim-zone {
  border:1.5px dashed #d4dde8; border-radius:12px;
  padding:46px 24px; text-align:center; cursor:pointer;
  background:#f8fafc; transition:border-color 0.18s,background 0.18s;
}
.bim-zone.over,.bim-zone:hover { border-color:#2563eb; background:#eff6ff; }
.bim-z-ico {
  width:52px; height:52px; border-radius:13px;
  background:#eff6ff; border:1px solid #bfdbfe;
  display:flex; align-items:center; justify-content:center; margin:0 auto 14px;
}
.bim-z-title { font-size:15px; font-weight:800; color:#0f172a; margin-bottom:6px; }
.bim-z-sub   { font-size:13px; color:#64748b; line-height:1.7; }
.bim-z-sub b { color:#2563eb; font-weight:700; }
.bim-z-fmts  { display:flex; gap:8px; justify-content:center; margin-top:16px; flex-wrap:wrap; }
.bim-z-fmt {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 11px; border:1px solid #e2e8f0; border-radius:7px;
  font-size:11.5px; font-weight:700; color:#475569; background:#fff;
}
.bim-ai-tag {
  display:inline-flex; align-items:center; gap:3px;
  padding:2px 6px; background:#7c3aed; color:#fff;
  font-size:9.5px; font-weight:800; letter-spacing:0.4px;
  border-radius:4px; margin-left:5px;
}
.bim-parse-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; padding:8px 0; }
.bim-parse-ring { width:34px; height:34px; border:2.5px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation:_spin 0.72s linear infinite; }
.bim-parse-lbl  { font-size:14px; font-weight:700; color:#0f172a; }
.bim-parse-sub  { font-size:12px; color:#94a3b8; }

.bim-err {
  display:flex; align-items:flex-start; gap:9px;
  padding:11px 14px; background:#fef2f2; border-left:3px solid #dc2626;
  margin-top:14px; border-radius:0 8px 8px 0;
  font-size:12.5px; color:#7f1d1d; font-weight:500;
}

.bim-tpl {
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; flex-wrap:wrap;
  padding:12px 16px; background:#f8fafc; border:1px solid #e8edf4;
  border-radius:10px; margin-top:14px;
}
.bim-tpl-txt { font-size:12.5px; color:#475569; font-weight:500; }
.bim-tpl-btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 13px; border-radius:8px;
  background:#fff; border:1px solid #e2e8f0; color:#2563eb;
  font-size:12px; font-weight:700; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif;
  transition:background 0.14s,border-color 0.14s;
}
.bim-tpl-btn:hover { background:#eff6ff; border-color:#bfdbfe; }

.bim-ptop {
  display:flex; align-items:flex-start; justify-content:space-between;
  margin-bottom:16px; flex-wrap:wrap; gap:10px;
}
.bim-ptitle { font-size:15px; font-weight:800; color:#0f172a; }
.bim-psub   { font-size:12px; color:#94a3b8; margin-top:3px; }
.bim-badges { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.bim-badge  {
  display:inline-flex; align-items:center; gap:5px;
  padding:4px 10px; border-radius:7px; border:1px solid #e2e8f0;
  font-size:11.5px; font-weight:700;
}
.bim-bdot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

.bim-prog { margin-bottom:16px; }
.bim-prog-row { display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:7px; }
.bim-prog-pct { color:#2563eb; }
.bim-prog-track { height:4px; background:#f1f5f9; border-radius:99px; overflow:hidden; }
.bim-prog-fill { height:100%; background:linear-gradient(90deg,#2563eb,#4f46e5); border-radius:99px; transition:width 0.35s ease; }

.bim-twrap { border:1px solid #e8edf4; border-radius:10px; overflow-x:auto; }
.bim-tbl { width:100%; border-collapse:collapse; font-size:12.5px; min-width:460px; }
.bim-tbl thead tr { background:#f8fafc; }
.bim-tbl th {
  padding:9px 14px; text-align:left;
  font-size:10px; font-weight:700; letter-spacing:0.6px;
  color:#94a3b8; text-transform:uppercase; white-space:nowrap;
  border-bottom:1px solid #e8edf4;
}
.bim-tbl td { padding:10px 14px; border-bottom:1px solid #f4f6fa; vertical-align:middle; }
.bim-tbl tr:last-child td { border-bottom:none; }
.bim-tbl tbody tr { animation:_row 0.18s ease both; }
.bim-tbl tbody tr:hover td { background:#fafbfd; }
.bim-num    { color:#c8d0dc; font-size:11px; width:28px; font-variant-numeric:tabular-nums; }
.bim-cprim  { font-weight:700; color:#0f172a; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bim-cmute  { color:#94a3b8; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; }
.bim-pill   { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:5px; font-size:11px; font-weight:700; }
.bim-del    {
  width:27px; height:27px; border-radius:6px;
  border:1px solid #e2e8f0; background:#fff;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#c0cad8; transition:all 0.13s;
}
.bim-del:hover { background:#fef2f2; border-color:#fca5a5; color:#dc2626; }

.bim-done { display:flex; flex-direction:column; align-items:center; text-align:center; padding:26px 0 8px; gap:7px; }
.bim-done-ico {
  width:58px; height:58px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:15px;
  display:flex; align-items:center; justify-content:center; margin-bottom:8px;
}
.bim-done-ttl { font-size:17px; font-weight:800; color:#0f172a; }
.bim-done-sub { font-size:13px; color:#64748b; }

.bim-ft {
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;
  gap:10px; padding:13px 22px;
  border-top:1px solid #eef1f6; background:#f8fafc; flex-shrink:0;
}
.bim-ft-hint { font-size:12px; color:#94a3b8; font-weight:500; }
.bim-ft-r    { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }

.bim-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:9px 18px; border-radius:9px; border:none;
  font-size:12.5px; font-weight:700; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif;
  transition:opacity 0.14s,transform 0.12s; white-space:nowrap;
}
.bim-btn:hover:not(:disabled) { opacity:0.87; transform:translateY(-1px); }
.bim-btn:active:not(:disabled){ transform:none; }
.bim-btn:disabled { opacity:0.42; cursor:not-allowed; transform:none !important; }
.bim-btn-ghost   { background:#fff; color:#64748b; border:1px solid #e2e8f0 !important; }
.bim-btn-ghost:hover:not(:disabled) { color:#0f172a; border-color:#c0cad8 !important; opacity:1; }
.bim-btn-primary { background:linear-gradient(135deg,#2563eb,#4f46e5); color:#fff; box-shadow:0 3px 10px rgba(79,70,229,0.2); }
.bim-btn-green   { background:linear-gradient(135deg,#059669,#047857); color:#fff; box-shadow:0 3px 10px rgba(5,150,105,0.2); }

.spin { animation:_spin 0.72s linear infinite; }

@media(max-width:600px){
  .bim-ov   { padding:0; align-items:flex-end; }
  .bim-box  { max-height:96vh; border-radius:16px 16px 0 0; max-width:100%; }
  .bim-hd   { padding:14px 16px; }
  .bim-bd   { padding:14px 16px; }
  .bim-zone { padding:32px 14px; }
  .bim-ft   { padding:11px 16px; }
  .bim-tpl  { flex-direction:column; align-items:flex-start; }
}
`;

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  open, config, onClose, onComplete, extraPayload = {},
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage]           = useState<'upload'|'preview'|'importing'|'done'>('upload');
  const [rows, setRows]             = useState<ParsedRow[]>([]);
  const [parsing, setParsing]       = useState(false);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver]     = useState(false);
  const [fileName, setFileName]     = useState('');
  const [progress, setProgress]     = useState({ done: 0, total: 0, failed: 0 });

  const accent = config.accentColor || '#2563eb';

  const reset = () => {
    setStage('upload'); setRows([]); setParsing(false);
    setParseError(''); setFileName(''); setProgress({ done: 0, total: 0, failed: 0 });
  };
  const handleClose = () => { reset(); onClose(); };

  const parseFile = useCallback(async (file: File) => {
    setParsing(true); setParseError(''); setFileName(file.name);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: ParsedRow[] = [];

      if (ext === 'pdf') {
        const prompt = config.pdfPrompt ||
          `Extract all records from this document. Return ONLY a valid JSON array, no markdown fences, no preamble. Each object must have these keys: ${config.fields.map(f => f.key).join(', ')}. Return [] if nothing found.`;
        const raw = await parsePdf(file, prompt);
        parsed = (Array.isArray(raw) ? raw : []).map((r, i) => rowToRecord(r, config.fields, i));
      } else {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(buf, { type: 'array' });
        const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        parsed = raw.map((r, i) => rowToRecord(r, config.fields, i));
      }

      const required = config.fields.filter(f => f.required).map(f => f.key);
      const valid = parsed.filter(r => required.every(k => r.data[k]));

      if (!valid.length) {
        setParseError(`No valid records found. Required columns: ${required.join(', ')}`);
        return;
      }
      setRows(valid); setStage('preview');
    } catch (e: any) {
      setParseError(e?.message || 'Failed to parse file.');
    } finally { setParsing(false); }
  }, [config]);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'pdf'].includes(ext || '')) {
      setParseError('Unsupported format. Use Excel, CSV, or PDF.'); return;
    }
    parseFile(file);
  };

  const removeRow = (id: string) => setRows(p => p.filter(r => r.id !== id));

  const handleImport = async () => {
    const toImport = rows.filter(r => r.status === 'pending');
    setStage('importing'); setProgress({ done: 0, total: toImport.length, failed: 0 });
    let done = 0, failed = 0;

    for (const row of toImport) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'uploading' } : r));
      try {
        await api.post(config.endpoint, { ...config.buildPayload(row.data), ...extraPayload });
        done++;
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'success' } : r));
      } catch (e: any) {
        failed++;
        const msg = e?.response?.data?.message || 'Upload failed';
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', error: msg } : r));
      }
      setProgress({ done: done + failed, total: toImport.length, failed });
    }

    setStage('done');
    failed === 0
      ? toast.success(`${done} ${config.entityLabel}${done !== 1 ? 's' : ''} imported!`)
      : toast.warning(`${done} imported, ${failed} failed.`);
    onComplete();
  };

  if (!open) return null;

  const successCount = rows.filter(r => r.status === 'success').length;
  const errorCount   = rows.filter(r => r.status === 'error').length;
  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const previewFields = config.fields.slice(0, 4);

  return (
    <>
      <style>{CSS}</style>
      <div className="bim-ov">
        <div className="bim-box">

          <div className="bim-hd">
            <div className="bim-hd-l">
              <div className="bim-hd-ico"><Upload size={17} color={accent} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bim-hd-title">
                  {stage === 'upload'    && config.title}
                  {stage === 'preview'   && `Preview — ${fileName}`}
                  {stage === 'importing' && `Importing ${config.entityLabel}s…`}
                  {stage === 'done'      && 'Import Complete'}
                </div>
                <div className="bim-hd-sub">
                  {stage === 'upload'    && 'Excel · CSV · PDF supported'}
                  {stage === 'preview'   && `${rows.length} records found`}
                  {stage === 'importing' && `${progress.done} / ${progress.total} processed`}
                  {stage === 'done'      && `${successCount} succeeded · ${errorCount} failed`}
                </div>
              </div>
            </div>
            <button className="bim-hd-x" onClick={handleClose}><X size={14} /></button>
          </div>

          <div className="bim-bd">
            {stage === 'upload' && (
              <>
                <div
                  className={`bim-zone${dragOver ? ' over' : ''}`}
                  onClick={() => !parsing && inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                >
                  <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

                  {parsing ? (
                    <div className="bim-parse-wrap">
                      <div className="bim-parse-ring" />
                      <div className="bim-parse-lbl">Parsing file…</div>
                      <div className="bim-parse-sub">Extracting records, please wait</div>
                    </div>
                  ) : (
                    <>
                      <div className="bim-z-ico"><Upload size={22} color={accent} /></div>
                      <div className="bim-z-title">Drop your file here</div>
                      <div className="bim-z-sub">Drag & drop, or <b>click to browse</b><br />Max 500 rows per import</div>
                      <div className="bim-z-fmts">
                        <span className="bim-z-fmt"><FileSpreadsheet size={12} color="#059669" /> Excel .xlsx</span>
                        <span className="bim-z-fmt"><FileSpreadsheet size={12} color="#2563eb" /> CSV .csv</span>
                        <span className="bim-z-fmt">
                          <FileText size={12} color="#7c3aed" /> PDF .pdf
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {parseError && (
                  <div className="bim-err">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {parseError}
                  </div>
                )}

                <div className="bim-tpl">
                  <div className="bim-tpl-txt">
                    📋 Required columns: <strong>{config.fields.filter(f => f.required).map(f => f.key).join(', ')}</strong>
                    {' '}— download template to get started.
                  </div>
                  <button className="bim-tpl-btn" onClick={() => downloadTemplate(config)}>
                    <Download size={12} /> Download Template
                  </button>
                </div>
              </>
            )}

            {(stage === 'preview' || stage === 'importing' || stage === 'done') && (
              <>
                <div className="bim-ptop">
                  <div>
                    <div className="bim-ptitle">{rows.length} {config.entityLabel}{rows.length !== 1 ? 's' : ''} found</div>
                    <div className="bim-psub">
                      {stage === 'preview'   && "Remove rows you don't want, then click Import."}
                      {stage === 'importing' && 'Upload in progress — do not close this window.'}
                      {stage === 'done'      && 'All done. You can close this window.'}
                    </div>
                  </div>
                  <div className="bim-badges">
                    {successCount > 0 && (
                      <span className="bim-badge" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
                        <span className="bim-bdot" style={{ background: '#10b981' }} />{successCount} Done
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="bim-badge" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                        <span className="bim-bdot" style={{ background: '#ef4444' }} />{errorCount} Failed
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="bim-badge" style={{ color: '#64748b' }}>
                        <span className="bim-bdot" style={{ background: '#cbd5e1' }} />{pendingCount} Pending
                      </span>
                    )}
                  </div>
                </div>

                {stage === 'importing' && (
                  <div className="bim-prog">
                    <div className="bim-prog-row">
                      <span>Uploading…</span>
                      <span className="bim-prog-pct">{pct}%</span>
                    </div>
                    <div className="bim-prog-track">
                      <div className="bim-prog-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="bim-twrap">
                  <table className="bim-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>#</th>
                        {previewFields.map(f => <th key={f.key}>{f.label}</th>)}
                        <th>Status</th>
                        {stage === 'preview' && <th style={{ width: 32 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.id} style={{ animationDelay: `${Math.min(i * 15, 180)}ms` }}>
                          <td className="bim-num">{i + 1}</td>
                          {previewFields.map((f, fi) => {
                            const val = row.data[f.key];
                            return (
                              <td key={f.key}>
                                {fi === 0 ? (
                                  <div className="bim-cprim">{String(val || '—')}</div>
                                ) : typeof val === 'boolean' ? (
                                  <span className="bim-pill" style={{ background: val ? '#ecfdf5' : '#fef2f2', color: val ? '#065f46' : '#991b1b' }}>
                                    {val ? '● Active' : '● Inactive'}
                                  </span>
                                ) : (
                                  <div className="bim-cmute">{String(val || '—')}</div>
                                )}
                              </td>
                            );
                          })}
                          <td>
                            {row.status === 'pending'   && <span style={{ fontSize: 11, color: '#c8d0dc', fontWeight: 700 }}>—</span>}
                            {row.status === 'uploading' && <Loader2 size={14} color={accent} className="spin" />}
                            {row.status === 'success'   && <CheckCircle2 size={15} color="#059669" />}
                            {row.status === 'error'     && (
                              <span title={row.error} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={14} color="#dc2626" />
                                <span style={{ fontSize: 11, color: '#dc2626', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.error}</span>
                              </span>
                            )}
                          </td>
                          {stage === 'preview' && (
                            <td>
                              <button className="bim-del" onClick={() => removeRow(row.id)} title="Remove">
                                <Trash2 size={11} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {stage === 'done' && (
                  <div className="bim-done">
                    <div className="bim-done-ico"><CheckCircle2 size={26} color="#059669" /></div>
                    <div className="bim-done-ttl">Import Complete</div>
                    <div className="bim-done-sub">
                      {successCount} {config.entityLabel}{successCount !== 1 ? 's' : ''} added
                      {errorCount > 0 && ` · ${errorCount} failed`}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bim-ft">
            <div className="bim-ft-hint">
              {stage === 'upload'    && 'Excel, CSV, or PDF — max 500 rows'}
              {stage === 'preview'   && `${pendingCount} record${pendingCount !== 1 ? 's' : ''} will be created`}
              {stage === 'importing' && `${progress.done} of ${progress.total} · ${errorCount} error${errorCount !== 1 ? 's' : ''}`}
              {stage === 'done'      && `Done · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
            <div className="bim-ft-r">
              {stage === 'upload' && (
                <button className="bim-btn bim-btn-ghost" onClick={handleClose}>Cancel</button>
              )}
              {stage === 'preview' && (
                <>
                  <button className="bim-btn bim-btn-ghost" onClick={reset}>← Back</button>
                  <button className="bim-btn bim-btn-green" disabled={pendingCount === 0} onClick={handleImport}>
                    Import {pendingCount} {pendingCount === 1 ? config.entityLabel : `${config.entityLabel}s`}
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
              {stage === 'importing' && (
                <button className="bim-btn bim-btn-ghost" disabled>Importing…</button>
              )}
              {stage === 'done' && (
                <button className="bim-btn bim-btn-primary" onClick={handleClose}>
                  <CheckCircle2 size={13} /> Close
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default BulkImportModal;