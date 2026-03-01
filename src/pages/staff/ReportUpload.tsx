import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Search, Upload, CheckCircle, AlertTriangle, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import type { Appointment } from '@/types';

const ReportUpload: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [searchError, setSearchError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('Diagnostic Report');
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const searchAppointment = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setAppointment(null);
    try {
      const res = await api.get('/appointments', { params: { search: searchQuery } });
      const appts = res.data.appointments || res.data || [];
      if (appts.length > 0) {
        setAppointment(appts[0]);
      } else {
        setSearchError('No appointment found');
      }
    } catch {
      setSearchError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !appointment) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('appointmentId', appointment._id);
      fd.append('reportType', reportType);
      fd.append('notes', notes);
      return api.post('/reports/upload', fd, {
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
    },
    onSuccess: () => {
      setSuccess(true);
      toast.success('Report uploaded successfully');
    },
    onError: () => toast.error('Upload failed'),
  });

  const reset = () => {
    setAppointment(null);
    setFile(null);
    setNotes('');
    setUploadProgress(0);
    setSuccess(false);
    setSearchQuery('');
    setSearchError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else toast.error('File must be under 10MB');
  };

  if (success) {
    return (
      <>
        <AppHeader title="Upload Report" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Report Uploaded Successfully</h2>
            <p className="text-sm text-muted-foreground mb-4">Report for {appointment?.patientId?.name} has been uploaded.</p>
            <Button onClick={reset}>Upload Another</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Upload Report" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-3">Search Patient</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Appointment ID or Phone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchAppointment()}
                />
                <Button onClick={searchAppointment} disabled={searching}>
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </Button>
              </div>

              {searchError && (
                <div className="mt-4 text-center py-8">
                  <FileText size={32} className="text-muted-foreground/30 mx-auto mb-2" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">{searchError}</p>
                </div>
              )}

              {appointment && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><strong>{appointment.patientId?.name}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{appointment.patientId?.phone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Procedure</span><span>{appointment.procedureId?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Center</span><span>{appointment.centerId?.centerName}</span></div>
                  {appointment.reportStatus === 'uploaded' && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded text-amber-700 text-xs">
                      <AlertTriangle size={14} /> Report already exists. Uploading will replace it.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Upload */}
          <div className={`space-y-4 ${!appointment ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-medium">Upload File</h3>

              {/* Dropzone */}
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
                    else if (f) toast.error('File must be under 10MB');
                  }}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} className="text-accent" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drop PDF or image here, or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 10MB • PDF, JPG, PNG</p>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Report Type</Label>
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

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              {upload.isPending && <Progress value={uploadProgress} className="h-2" />}

              <Button className="w-full" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                {upload.isPending ? <><Loader2 size={14} className="mr-2 animate-spin" /> Uploading...</> : <><Upload size={14} className="mr-1.5" /> Upload Report</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportUpload;
