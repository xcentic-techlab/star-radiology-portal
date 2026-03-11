import { useEffect, useState, useCallback } from 'react';
import adminApi from '../../lib/axios';
import AppHeader from '@/components/layout/AppHeader';
import { X } from 'lucide-react';

interface TimeSlot      { time: string; label: string; isActive: boolean; }
interface BlockedDate   { date: string; reason: string; }
interface CenterOverride {
  centerId: string; centerName: string;
  timeSlots: TimeSlot[]; blockedDates: string[]; workingDays?: number[];
}
interface Settings {
  globalTimeSlots: TimeSlot[];
  globalBlockedDates: BlockedDate[];
  globalWorkingDays: number[];
  maxPerSlot: number;
  advanceBookingDays: number;
  centerOverrides: CenterOverride[];
}
interface Center { _id: string; centerName?: string; name?: string; city?: string; address?: string; }

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getCenterName = (c: Center) => c.centerName || c.name || (c.city && c.address ? `${c.city} — ${c.address}` : c.city || c.address || 'Unknown');
const convertTime = (val: string) => {
  const [h, m] = val.split(':');
  const hour = parseInt(h);
  return `${(hour % 12 || 12).toString().padStart(2, '0')}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const fmtDate = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function ScheduleManagement() {
  const [settings,       setSettings]       = useState<Settings | null>(null);
  const [centers,        setCenters]        = useState<Center[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState<string | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab,      setActiveTab]      = useState<'global' | 'centers'>('global');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [newDate,        setNewDate]        = useState('');
  const [newReason,      setNewReason]      = useState('');
  const [newSlotTime,    setNewSlotTime]    = useState('');
  const [newSlotLabel,   setNewSlotLabel]   = useState('');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, cRes] = await Promise.all([
        adminApi.get('/schedule/admin/settings'),
        adminApi.get('/centers'),
      ]);
      setSettings(sRes.data.settings);
      setCenters(cRes.data.centers ?? []);
    } catch {
      showToast('Failed to load settings', false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (endpoint: string, data: object, label: string) => {
    try {
      setSaving(label);
      const res = await adminApi.put(`/schedule/admin/${endpoint}`, data);
      setSettings(res.data.settings);
      showToast(`${label} saved`);
    } catch { showToast(`Failed to save ${label}`, false); }
    finally { setSaving(null); }
  };

  const currentOverride  = selectedCenter ? (settings?.centerOverrides.find(o => o.centerId === selectedCenter) ?? null) : null;
  const effectiveSlots   = currentOverride?.timeSlots?.length ? currentOverride.timeSlots : (settings?.globalTimeSlots ?? []);
  const effectiveBlocked = currentOverride?.blockedDates ?? [];
  const effectiveDays    = currentOverride?.workingDays ?? settings?.globalWorkingDays ?? [];

  const toggleGlobalSlot = (i: number) => {
    if (!settings) return;
    save('global-slots', { slots: settings.globalTimeSlots.map((s, idx) => idx === i ? { ...s, isActive: !s.isActive } : s) }, 'Time Slots');
  };
  const deleteGlobalSlot = (i: number) => {
    if (!settings) return;
    save('global-slots', { slots: settings.globalTimeSlots.filter((_, idx) => idx !== i) }, 'Time Slots');
  };
  const addGlobalSlot = () => {
    if (!settings || !newSlotTime) return;
    save('global-slots', { slots: [...settings.globalTimeSlots, { time: newSlotTime, label: newSlotLabel, isActive: true }] }, 'Time Slots');
    setNewSlotTime(''); setNewSlotLabel('');
  };

  const addBlockedDate = async () => {
    if (!newDate) return;
    try {
      setSaving('blocked');
      const res = await adminApi.post('/schedule/admin/blocked-dates', { date: newDate, reason: newReason });
      setSettings(res.data.settings); setNewDate(''); setNewReason('');
      showToast('Date blocked');
    } catch (e: any) { showToast(e?.response?.data?.msg ?? 'Error', false); }
    finally { setSaving(null); }
  };

  const removeBlockedDate = async (date: string) => {
    try {
      setSaving(`del-${date}`);
      const res = await adminApi.delete(`/schedule/admin/blocked-dates/${date}`);
      setSettings(res.data.settings); showToast('Removed');
    } catch { showToast('Error', false); }
    finally { setSaving(null); }
  };

  const saveCenterOverride = (patch: Partial<CenterOverride>) => {
    if (!selectedCenter) return;
    const cObj = centers.find(c => c._id === selectedCenter);
    const current = currentOverride ?? { centerId: selectedCenter, centerName: getCenterName(cObj ?? {}), timeSlots: [], blockedDates: [], workingDays: undefined };
    adminApi.put(`/schedule/admin/center-override/${selectedCenter}`, { ...current, ...patch })
      .then(r => { setSettings(r.data.settings); showToast('Center saved'); })
      .catch(() => showToast('Error saving center', false));
  };

  const deleteCenterOverride = async () => {
    if (!selectedCenter) return;
    await adminApi.delete(`/schedule/admin/center-override/${selectedCenter}`);
    setSettings(s => s ? { ...s, centerOverrides: s.centerOverrides.filter(o => o.centerId !== selectedCenter) } : s);
    showToast('Override removed');
  };

  if (loading) return (
    <>
      <AppHeader title="Schedule" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1e3a8a', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Loading schedule settings…</span>
      </div>
    </>
  );

  if (!settings) return (
    <>
      <AppHeader title="Schedule" />
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <p style={{ color: '#ef4444', marginBottom: 16 }}>Failed to load settings</p>
        <button onClick={load} style={{ padding: '8px 22px', background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* ── layout shell — same as aa-wrap ── */
        .sm-wrap { flex: 1; padding: 28px; overflow-y: auto; background: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; }
        @media(max-width:640px){ .sm-wrap{ padding: 16px; } }

        /* ── topbar ── */
        .sm-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .sm-title    { font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
        .sm-subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }

        /* ── filter / tab bar — identical to aa-filterbar ── */
        .sm-tabbar { display: flex; align-items: center; gap: 0; padding: 10px 16px; background: #fff; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
        .sm-filter-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; margin-right: 12px; flex-shrink: 0; }
        .sm-filter-sep { width: 1px; height: 22px; background: #e2e8f0; flex-shrink: 0; margin: 0 10px; }

        .sm-tab { padding: 7px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; font-family: inherit; transition: all 0.16s; white-space: nowrap; flex-shrink: 0; }
        .sm-tab-on  { background: linear-gradient(135deg,#1e3a8a,#2563eb); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.22); }
        .sm-tab-off { background: transparent; color: #64748b; }
        .sm-tab-off:hover { background: #f1f5f9; color: #1e293b; }

        /* ── card — same as aa-card ── */
        .sm-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 14px; }
        .sm-card-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 8px; }
        .sm-card-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .sm-count { font-size: 12px; font-weight: 600; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 12px; }
        .sm-card-body { padding: 18px 22px; }

        /* ── day pills ── */
        .day-pill { padding: 6px 14px; border-radius: 8px; border: 1.5px solid; cursor: pointer; font-size: 12.5px; font-weight: 700; font-family: inherit; transition: all 0.15s; }
        .day-pill-on  { background: linear-gradient(135deg,#1e3a8a,#2563eb); color: #fff; border-color: transparent; box-shadow: 0 2px 6px rgba(37,99,235,0.2); }
        .day-pill-off { background: #fff; color: #94a3b8; border-color: #e2e8f0; }
        .day-pill-off:hover { border-color: #93c5fd; color: #2563eb; }

        /* ── slot chips ── */
        .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; margin-bottom: 14px; }
        .slot-chip { display: flex; align-items: center; justify-content: space-between; padding: 8px 11px; border-radius: 9px; border: 1px solid; font-size: 12px; font-weight: 600; }
        .slot-on   { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .slot-off  { background: #f8fafc; border-color: #e2e8f0; color: #94a3b8; }
        .slot-act  { background: none; border: none; cursor: pointer; padding: 2px 4px; border-radius: 4px; font-size: 11px; font-weight: 700; line-height: 1; color: inherit; }
        .slot-act:hover { background: rgba(0,0,0,0.07); }

        /* ── inputs ── */
        .sm-input { border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; background: #fff; color: #0f172a; }
        .sm-input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,0.14); }
        .sm-input::placeholder { color: #cbd5e1; }

        /* ── buttons ── */
        .sm-btn { padding: 8px 15px; border-radius: 9px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 700; font-family: inherit; transition: all 0.15s; }
        .sm-btn-blue   { background: linear-gradient(135deg,#1e3a8a,#2563eb); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.18); }
        .sm-btn-blue:hover  { box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
        .sm-btn-blue:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
        .sm-btn-red    { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .sm-btn-red:hover   { background: #fee2e2; }
        .sm-btn-red:disabled { opacity: 0.5; cursor: not-allowed; }
        .sm-btn-orange { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
        .sm-btn-orange:hover { background: #ffedd5; }

        /* ── center select ── */
        .sm-select { width: 100%; padding: 9px 36px 9px 13px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; appearance: none; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 13px center; color: #0f172a; transition: border-color 0.15s; }
        .sm-select:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,0.14); }

        /* ── blocked rows ── */
        .bl-row     { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 9px; }
        .bl-red     { border: 1px solid #fecaca; background: #fff5f5; }
        .bl-orange  { border: 1px solid #fed7aa; background: #fff7ed; }

        /* ── banners ── */
        .banner      { padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-bottom: 14px; border: 1px solid; }
        .banner-blue { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .banner-ind  { background: #eef2ff; border-color: #c7d2fe; color: #4338ca; }

        /* ── config grid ── */
        .cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cfg-label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        @media(max-width:480px){ .cfg-grid{ grid-template-columns: 1fr; } }

        /* ── flex helpers ── */
        .flex-wrap  { display: flex; flex-wrap: wrap; gap: 8px; }
        .flex-row   { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .space-y > * + * { margin-top: 8px; }
        .sm-empty { text-align: center; padding: 22px 0; color: #cbd5e1; font-size: 13px; }

        /* ── toast ── */
        .sm-toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; padding: 11px 17px; border-radius: 11px; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 28px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 8px; animation: toastIn 0.22s ease; }
        @keyframes toastIn { from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:translateY(0); } }
        .toast-ok  { background: #1e3a8a; color: #fff; }
        .toast-err { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        @media(max-width:600px){
          .slot-grid { grid-template-columns: repeat(auto-fill,minmax(96px,1fr)); }
          .sm-card-body { padding: 14px 16px; }
          .sm-card-head { padding: 14px 16px; }
        }
      `}</style>
      {toast && (
        <div className={`sm-toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>
          <span>{toast.ok ? '✓' : '✕'}</span> {toast.msg}
        </div>
      )}
      <AppHeader title="Schedule" />

      <div className="sm-wrap">
        <div className="sm-topbar">
          <div>
            <h2 className="sm-title">Schedule Management</h2>
            <p className="sm-subtitle">Configure time slots, holidays &amp; per-center overrides</p>
          </div>
        </div>
        <div className="sm-tabbar">
          <span className="sm-filter-label">View:</span>
          <button className={`sm-tab ${activeTab === 'global' ? 'sm-tab-on' : 'sm-tab-off'}`} onClick={() => setActiveTab('global')}>
            Global Settings
          </button>
          <div className="sm-filter-sep" />
          <button className={`sm-tab ${activeTab === 'centers' ? 'sm-tab-on' : 'sm-tab-off'}`} onClick={() => setActiveTab('centers')}>
            Center Overrides
            {settings.centerOverrides.length > 0 && (
              <span style={{ marginLeft: 7, background: activeTab === 'centers' ? 'rgba(255,255,255,0.25)' : '#eff6ff', color: activeTab === 'centers' ? '#fff' : '#1d4ed8', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>
                {settings.centerOverrides.length}
              </span>
            )}
          </button>
        </div>
        {activeTab === 'global' && (
          <>
            <div className="sm-card">
              <div className="sm-card-head">
                <span className="sm-card-title">Working Days</span>
                <span className="sm-count">{settings.globalWorkingDays.length} / 7 active</span>
              </div>
              <div className="sm-card-body">
                <div className="flex-wrap" style={{ marginBottom: 10 }}>
                  {DAY_NAMES.map((day, i) => {
                    const active = settings.globalWorkingDays.includes(i);
                    return (
                      <button key={i} className={`day-pill ${active ? 'day-pill-on' : 'day-pill-off'}`}
                        onClick={() => {
                          const updated = active
                            ? settings.globalWorkingDays.filter(d => d !== i)
                            : [...settings.globalWorkingDays, i].sort();
                          save('global-working-days', { workingDays: updated }, 'Working Days');
                        }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Applies to all centers without a custom override.</p>
              </div>
            </div>
            <div className="sm-card">
              <div className="sm-card-head">
                <span className="sm-card-title">Time Slots</span>
                <span className="sm-count">{settings.globalTimeSlots.filter(s => s.isActive).length} active</span>
              </div>
              <div className="sm-card-body">
                {settings.globalTimeSlots.length === 0
                  ? <div className="sm-empty">No slots yet — add one below</div>
                  : (
                    <div className="slot-grid">
                      {settings.globalTimeSlots.map((slot, i) => (
                        <div key={i} className={`slot-chip ${slot.isActive ? 'slot-on' : 'slot-off'}`}>
                          <span>{slot.time}</span>
                          <div style={{ display: 'flex', gap: 1 }}>
                            <button className="slot-act" onClick={() => toggleGlobalSlot(i)} title="Toggle">
                              {slot.isActive ? '●' : '○'}
                            </button>
                            <button className="slot-act" style={{ color: '#ef4444' }} onClick={() => deleteGlobalSlot(i)} title="Remove">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
                <div className="flex-row">
                  <input className="sm-input" type="time" style={{ width: 136 }}
                    onChange={e => setNewSlotTime(convertTime(e.target.value))} />
                  <input className="sm-input" placeholder="Label (optional)" value={newSlotLabel}
                    onChange={e => setNewSlotLabel(e.target.value)} style={{ flex: 1, minWidth: 110 }} />
                  <button className="sm-btn sm-btn-blue" onClick={addGlobalSlot} disabled={!newSlotTime}>
                    + Add Slot
                  </button>
                </div>
              </div>
            </div>
            <div className="sm-card">
              <div className="sm-card-head">
                <span className="sm-card-title">Holidays &amp; Blocked Dates</span>
                <span className="sm-count">{settings.globalBlockedDates.length} blocked</span>
              </div>
              <div className="sm-card-body">
                {settings.globalBlockedDates.length === 0
                  ? <div className="sm-empty" style={{ marginBottom: 14 }}>No blocked dates — all days are open</div>
                  : (
                    <div className="space-y" style={{ marginBottom: 14 }}>
                      {[...settings.globalBlockedDates].sort((a, b) => a.date.localeCompare(b.date)).map(b => (
                        <div key={b.date} className="bl-row bl-red">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>{fmtDate(b.date)}</div>
                            {b.reason && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{b.reason}</div>}
                          </div>
                          <button className="sm-btn sm-btn-red" style={{ padding: '5px 12px', fontSize: 12 }}
                            onClick={() => removeBlockedDate(b.date)} disabled={saving === `del-${b.date}`}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
                <div className="flex-row">
                  <input className="sm-input" type="date" value={newDate}
                    min={new Date().toISOString().split('T')[0]} onChange={e => setNewDate(e.target.value)} />
                  <input className="sm-input" placeholder="Reason (e.g. Diwali)" value={newReason}
                    onChange={e => setNewReason(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
                  <button className="sm-btn sm-btn-red" onClick={addBlockedDate}
                    disabled={!newDate || saving === 'blocked'}>
                    {saving === 'blocked' ? 'Adding…' : '+ Block Date'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'centers' && (
          <>
            <div className="sm-card">
              <div className="sm-card-head">
                <span className="sm-card-title">Select Center</span>
                <span className="sm-count">{centers.length} centers</span>
              </div>
              <div className="sm-card-body">
                <select className="sm-select" value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
                  <option value="">— Choose a center —</option>
                  {centers.map(c => (
                    <option key={c._id} value={c._id}>
                      {getCenterName(c)}
                      {settings.centerOverrides.find(o => o.centerId === c._id) ? '  ★ override' : ''}
                    </option>
                  ))}
                </select>
                {selectedCenter && currentOverride && (
                  <button onClick={deleteCenterOverride}
                    style={{ marginTop: 10, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                    Remove override → revert to global settings
                  </button>
                )}
              </div>
            </div>

            {selectedCenter && (
              <>
                {!currentOverride
                  ? <div className="banner banner-blue">ℹ️ No override — this center uses global settings. Any change below will create an override.</div>
                  : <div className="banner banner-ind">★ This center has an active custom override.</div>
                }
                <div className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-card-title">Working Days</span>
                    <span className="sm-count">{effectiveDays.length} / 7 active</span>
                  </div>
                  <div className="sm-card-body">
                    <div className="flex-wrap" style={{ marginBottom: 10 }}>
                      {DAY_NAMES.map((day, i) => {
                        const active = effectiveDays.includes(i);
                        return (
                          <button key={i} className={`day-pill ${active ? 'day-pill-on' : 'day-pill-off'}`}
                            onClick={() => {
                              const updated = active ? effectiveDays.filter(d => d !== i) : [...effectiveDays, i].sort();
                              saveCenterOverride({ workingDays: updated });
                            }}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Overrides global working days for this center only.</p>
                  </div>
                </div>
                <div className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-card-title">Time Slots</span>
                    <span className="sm-count">{effectiveSlots.filter(s => s.isActive).length} active</span>
                  </div>
                  <div className="sm-card-body">
                    {!currentOverride?.timeSlots?.length && (
                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                        Showing global slots — any change creates center-specific slots.
                      </p>
                    )}
                    <div className="slot-grid">
                      {effectiveSlots.map((slot, i) => (
                        <div key={i} className={`slot-chip ${slot.isActive ? 'slot-on' : 'slot-off'}`}>
                          <span>{slot.time}</span>
                          <button className="slot-act" onClick={() => {
                            const updated = effectiveSlots.map((s, idx) => idx === i ? { ...s, isActive: !s.isActive } : s);
                            saveCenterOverride({ timeSlots: updated });
                          }}>{slot.isActive ? '●' : '○'}</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex-row">
                      <input className="sm-input" type="time" style={{ width: 136 }}
                        onChange={e => setNewSlotTime(convertTime(e.target.value))} />
                      <button className="sm-btn sm-btn-blue" onClick={() => {
                        if (!newSlotTime) return;
                        saveCenterOverride({ timeSlots: [...effectiveSlots, { time: newSlotTime, label: '', isActive: true }] });
                        setNewSlotTime('');
                      }}>+ Add Slot</button>
                    </div>
                  </div>
                </div>
                <div className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-card-title">Blocked Dates (Center Only)</span>
                    <span className="sm-count">{effectiveBlocked.length} blocked</span>
                  </div>
                  <div className="sm-card-body">
                    {effectiveBlocked.length === 0
                      ? <div className="sm-empty" style={{ marginBottom: 14 }}>No center-specific blocked dates</div>
                      : (
                        <div className="space-y" style={{ marginBottom: 14 }}>
                          {[...effectiveBlocked].sort().map(date => (
                            <div key={date} className="bl-row bl-orange">
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#c2410c' }}>{fmtDate(date)}</span>
                              <button className="sm-btn sm-btn-orange" style={{ padding: '5px 12px', fontSize: 12 }}
                                onClick={() => saveCenterOverride({ blockedDates: effectiveBlocked.filter(d => d !== date) })}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    <div className="flex-row">
                      <input className="sm-input" type="date" value={newDate}
                        min={new Date().toISOString().split('T')[0]} onChange={e => setNewDate(e.target.value)} />
                      <button className="sm-btn sm-btn-orange" onClick={() => {
                        if (!newDate || effectiveBlocked.includes(newDate)) return;
                        saveCenterOverride({ blockedDates: [...effectiveBlocked, newDate] });
                        setNewDate('');
                      }} disabled={!newDate}>
                        + Block Date
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </>
  );
}