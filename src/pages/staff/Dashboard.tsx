import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import { CalendarDays, Clock, CheckCircle, FileText, Phone, X, ArrowRight, TrendingUp } from 'lucide-react';
import api from '@/lib/axios';
import type { DashboardStats, Appointment } from '@/types';

type DrawerKey = 'todayAppointments' | 'pendingPayments' | 'completedToday' | 'reportsThisWeek' | null;

const STAT_CONFIG = [
  {
    key: 'todayAppointments',
    label: "Today's Appointments",
    icon: CalendarDays,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    accent: '#dbeafe',
  },
  {
    key: 'completedToday',
    label: 'Completed Today',
    icon: CheckCircle,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    accent: '#d1fae5',
  },
  {
    key: 'reportsThisWeek',
    label: 'Reports This Week',
    icon: FileText,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    accent: '#ede9fe',
  },
] as const;

const PAY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Pending':   { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  'Paid':      { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'Completed': { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'Failed':    { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
};
const APPT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Pending':        { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  'Lab Processing': { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
  'Doctor Review':  { bg: '#f5f3ff', text: '#5b21b6', dot: '#8b5cf6' },
  'Completed':      { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'Report Ready':   { bg: '#ecfdf5', text: '#064e3b', dot: '#059669' },
  'Cancelled':      { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
};
const RPT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Pending':  { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  'Uploaded': { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
  'Ready':    { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
};

type BadgeMap = Record<string, { bg: string; text: string; dot: string }>;

const Badge: React.FC<{ status: string; map: BadgeMap }> = ({ status, map }) => {
  const c = map[status] ?? { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: 'Good morning' };
  if (h >= 12 && h < 17) return { text: 'Good afternoon' };
  if (h >= 17 && h < 21) return { text: 'Good evening' };
  return                         { text: 'Good night'};
}

const getPatient   = (a: any) => a.patientId?.name || a.fullName || a.user?.name || a.patientName || '—';
const getPhone     = (a: any) => a.mobile || a.user?.phone || a.phone || '—';
const getProcedure = (a: any) => a.procedureId?.name || a.procedureName || a.procedure?.name || a.procedure || '—';
const getTime      = (a: any) => a.appointmentTime || a.time || '—';

const DetailDrawer: React.FC<{ drawerKey: DrawerKey; onClose: () => void }> = ({ drawerKey, onClose }) => {
  const cfg = STAT_CONFIG.find(s => s.key === drawerKey);
  const Icon = cfg?.icon;

  const { data, isLoading } = useQuery({
    queryKey: ['sf-drawer', drawerKey],
    enabled: !!drawerKey,
    staleTime: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      if (drawerKey === 'todayAppointments')
        return (await api.get('/appointments', { params: { today: true, limit: 50 } })).data;
      if (drawerKey === 'pendingPayments')
        return (await api.get('/appointments', { params: { paymentStatus: 'Pending', limit: 50 } })).data;
      if (drawerKey === 'completedToday')
        return (await api.get('/appointments', { params: { status: 'Completed', dateFrom: today, dateTo: today, limit: 50 } })).data;
      if (drawerKey === 'reportsThisWeek') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        return (await api.get('/appointments', { params: { status: 'Report Ready', dateFrom: weekAgo, dateTo: today, limit: 50 } })).data;
      }
    },
  });

  const appts: any[] = data?.appointments ?? (Array.isArray(data) ? data : []);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(4px)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, maxWidth: '100vw',
        background: '#fff', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        animation: 'drwIn 0.24s cubic-bezier(0.22,1,0.36,1)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`
          @keyframes drwIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
          @keyframes spin { to { transform: rotate(360deg) } }
          .drw-item { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px; border:1px solid #f1f5f9; margin-bottom:8px; background:#fff; transition: border-color 0.15s, box-shadow 0.15s; cursor:default; }
          .drw-item:hover { border-color:#e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
          .drw-avatar { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; flex-shrink:0; }
          .drw-scroll { flex:1; overflow-y:auto; padding:12px; scrollbar-width:thin; scrollbar-color:#e2e8f0 transparent; }
          .drw-scroll::-webkit-scrollbar { width:4px; }
          .drw-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
          .drw-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 7px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; font-size:11px; font-weight:600; color:#64748b; }
        `}</style>

        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {Icon && cfg && (
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={cfg.color} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cfg?.label}</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>
                {isLoading ? '…' : `${appts.length} records`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={14} />
          </button>
        </div>


        <div className="drw-scroll">
          {isLoading && (
            <div style={{ padding: '56px 0', textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${cfg?.accent}`, borderTopColor: cfg?.color, animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: '#94a3b8', fontSize: 12 }}>Loading…</p>
            </div>
          )}

          {!isLoading && appts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: '#94a3b8', fontSize: 13 }}>
              {drawerKey === 'todayAppointments'  && 'No appointments today'}
              {drawerKey === 'completedToday'     && 'No completions today'}
              {drawerKey === 'reportsThisWeek'    && 'No reports this week'}
            </div>
          )}

          {!isLoading && appts.map((a: any) => (
            <div key={a._id} className="drw-item">
              <div
                className="drw-avatar"
                style={{ background: cfg?.accent, color: cfg?.color }}
              >
                {getPatient(a).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getPatient(a)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getProcedure(a)}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  {getTime(a) !== '—' && <span className="drw-chip">🕐 {getTime(a)}</span>}
                  {getPhone(a) !== '—' && (
                    <span className="drw-chip">
                      <Phone size={10} /> {getPhone(a)}
                    </span>
                  )}
                  {a.date && (
                    <span className="drw-chip">
                      {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                <Badge status={a.status} map={APPT_COLORS} />
                <Badge status={a.paymentStatus} map={PAY_COLORS} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { text} = useMemo(() => getGreeting(), []);
  const displayName = user?.name?.split(' ')[0] || 'Staff';
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);

  const { data: stats, isLoading: sl } = useQuery<DashboardStats>({
    queryKey: ['staff-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });

  const { data: appointmentsData, isLoading: al } = useQuery({
    queryKey: ['staff-today-appts'],
    queryFn: async () => {
  const today = new Date().toISOString().split('T')[0];
  const res = await api.get('/appointments', { 
    params: { limit: 8, dateFrom: today, dateTo: today } 
  });
  console.log(res.data);
  return res.data;
},
  });

const appointments: any[] = appointmentsData?.appointments ?? (Array.isArray(appointmentsData) ? appointmentsData : []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .sf-root {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          background: #f6f8fb;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }
        @media (max-width: 640px) { .sf-root { padding: 16px; } }

        /* ── Topbar ── */
        .sf-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sf-greeting {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.4px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        @media (max-width: 480px) { .sf-greeting { font-size: 17px; } }
        .sf-name { color: #2563eb; }
        .sf-sub {
          font-size: 13px;
          color: '#64748b';
          margin-top: 4px;
          font-weight: 400;
          color: #64748b;
        }
        .sf-center-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 999px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          font-size: 11.5px;
          font-weight: 700;
          color: #0369a1;
        }
        .sf-center-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #0ea5e9;
        }

        /* ── Stats Grid ── */
        .sf-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        @media (max-width: 1024px) { .sf-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .sf-stats { grid-template-columns: 1fr 1fr; gap: 10px; } }

        .sf-stat {
          background: #fff;
          border-radius: 14px;
          padding: 18px;
          border: 1px solid #eef2f7;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03);
          cursor: pointer;
          transition: transform 0.16s, box-shadow 0.16s, border-color 0.16s;
          user-select: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sf-stat:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.09);
          border-color: #e2e8f0;
        }
        .sf-stat:active { transform: translateY(-1px); }
        .sf-stat-row { display: flex; align-items: center; justify-content: space-between; }
        .sf-stat-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .sf-stat-link {
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: gap 0.15s;
        }
        .sf-stat:hover .sf-stat-link { gap: 5px; }
        .sf-stat-val {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -1px;
          line-height: 1;
        }
        @media (max-width: 480px) { .sf-stat-val { font-size: 24px; } }
        .sf-stat-lbl {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          margin-top: 4px;
        }

        /* skeleton */
        .sf-skel {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 14px;
          height: 108px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        /* ── Table Card ── */
        .sf-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #eef2f7;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .sf-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sf-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .sf-card-sub {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .sf-viewall {
          font-size: 12px;
          font-weight: 700;
          color: #2563eb;
          text-decoration: none;
          padding: 5px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 7px;
          transition: background 0.14s;
          white-space: nowrap;
        }
        .sf-viewall:hover { background: #dbeafe; }

        .sf-table-wrap { overflow-x: auto; }
        .sf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .sf-table th {
          text-align: left;
          padding: 9px 20px;
          font-size: 10.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
        }
        .sf-table td {
          padding: 12px 20px;
          border-bottom: 1px solid #f8fafc;
          color: #374151;
          vertical-align: middle;
        }
        .sf-table tr:last-child td { border-bottom: none; }
        .sf-table tbody tr:hover td { background: #fafbfd; }
        .td-name { font-weight: 600; color: #0f172a; }
        .td-mute { font-size: 12px; color: #64748b; }
        .td-mono { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }

        .sf-empty, .sf-loading {
          text-align: center;
          padding: 44px 20px;
          color: #94a3b8;
          font-size: 13px;
        }
      `}</style>

      <AppHeader title="Dashboard" />
      <div className="sf-root">

        <div className="sf-topbar">
          <div>
            <div className="sf-greeting">
              {text},&nbsp;<span className="sf-name">{displayName}</span>
              {user?.centerName && (
                <span className="sf-center-pill">
                  <span className="sf-center-dot" />
                  {user.centerName}
                </span>
              )}
            </div>
            <p className="sf-sub">Here's your center activity for today.</p>
          </div>
        </div>

        <div className="sf-stats">
          {sl
            ? STAT_CONFIG.map((_, i) => <div key={i} className="sf-skel" />)
            : STAT_CONFIG.map((s) => {
                const val = (stats as any)?.[s.key] ?? 0;
                const Icon = s.icon;
                return (
                  <div
                    className="sf-stat"
                    key={s.key}
                    onClick={() => setActiveDrawer(s.key as DrawerKey)}
                  >
                    <div className="sf-stat-row">
                      <div
                        className="sf-stat-icon"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                      >
                        <Icon size={16} color={s.color} />
                      </div>
                      <span className="sf-stat-link" style={{ color: s.color }}>
                        View <ArrowRight size={11} />
                      </span>
                    </div>
                    <div>
                      <div className="sf-stat-val">{val}</div>
                      <div className="sf-stat-lbl">{s.label}</div>
                    </div>
                  </div>
                );
              })}
        </div>
        <div className="sf-card">
          <div className="sf-card-head">
            <div>
              <div className="sf-card-title">Today's Appointments</div>
              <div className="sf-card-sub">Scheduled visits for today</div>
            </div>
            <Link to="/staff/appointments" className="sf-viewall">View All →</Link>
          </div>

          {al ? (
            <div className="sf-loading">Loading appointments…</div>
          ) : appointments.length === 0 ? (
            <div className="sf-empty">No appointments scheduled for today</div>
          ) : (
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Procedure</th>
                    <th>Time</th>
                    <th>Payment</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a: any) => (
                    <tr key={a._id}>
                      <td className="td-name">{getPatient(a)}</td>
                      <td className="td-mute">{getProcedure(a)}</td>
                      <td className="td-mono">{getTime(a)}</td>
                      <td><Badge status={a.paymentStatus} map={PAY_COLORS} /></td>
                      <td><Badge status={a.reportStatus || 'Pending'} map={RPT_COLORS} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {activeDrawer && (
        <DetailDrawer
          drawerKey={activeDrawer}
          onClose={() => setActiveDrawer(null)}
        />
      )}
    </>
  );
};

export default StaffDashboard;