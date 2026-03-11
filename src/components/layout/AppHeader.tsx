import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, X, LogOut, User, Mail, Shield, Building2, CheckCheck, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';

interface AppHeaderProps {
  title: string;
}
const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'appointment', title: 'New Appointment Booked', message: 'Patient Ravi Kumar booked for X-Ray at 10:30 AM', time: '2 min ago', read: false },
  { id: '2', type: 'report',      title: 'Report Ready',           message: 'Blood test report for Priya Singh is now available', time: '15 min ago', read: false },
  { id: '3', type: 'payment',     title: 'Payment Received',       message: '₹1,200 received for appointment #APT-4821', time: '1 hr ago', read: false },
  { id: '4', type: 'system',      title: 'Center Status Updated',  message: 'City Diagnostic Center marked as active', time: '3 hr ago', read: true },
  { id: '5', type: 'appointment', title: 'Appointment Cancelled',  message: 'Appointment #APT-4819 has been cancelled by patient', time: 'Yesterday', read: true },
];

const notifIcon = (type: string) => {
  switch (type) {
    case 'appointment': return <Calendar size={14} />;
    case 'report':      return <FileText size={14} />;
    case 'payment':     return <CheckCheck size={14} />;
    case 'system':      return <AlertCircle size={14} />;
    default:            return <Bell size={14} />;
  }
};

const notifColor = (type: string) => {
  switch (type) {
    case 'appointment': return { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' };
    case 'report':      return { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' };
    case 'payment':     return { bg: '#ecfdf5', color: '#059669', dot: '#10b981' };
    case 'system':      return { bg: '#fff7ed', color: '#d97706', dot: '#f59e0b' };
    default:            return { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' };
  }
};

const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);


  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);


  const initials = user?.name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    || 'U';

  const roleLabel =
    user?.role === 'admin'        ? 'Super Admin'  :
    user?.role === 'center_admin' ? 'Center Admin' : 'Staff Member';
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        .hdr-root {
          height: 60px;
          background: #ffffff;
          border-bottom: 1px solid #f0f2f5;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px;
          flex-shrink: 0;
          font-family: 'Outfit', sans-serif;
          position: relative; z-index: 30;
        }
        .hdr-title {
          font-size: 17px; font-weight: 700; color: #0f172a;
          letter-spacing: -0.3px;
          padding-left: 40px;
        }
        @media(min-width:1024px){ .hdr-title{ padding-left: 0; } }

        .hdr-actions { display: flex; align-items: center; gap: 6px; }

        /* Bell button */
        .hdr-bell-btn {
          position: relative;
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid #f0f2f5;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748b;
          transition: all 0.15s;
        }
        .hdr-bell-btn:hover { background: #f8fafc; border-color: #e2e8f0; color: #1e293b; }
        .hdr-bell-btn.active { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }

        .hdr-badge {
          position: absolute; top: 5px; right: 5px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #ef4444; color: #fff;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff;
          animation: hdr-pop 0.3s ease;
        }
        @keyframes hdr-pop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        /* Profile button */
        .hdr-profile-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 8px 4px 4px;
          border-radius: 10px; border: 1px solid #f0f2f5;
          background: #fff; cursor: pointer;
          transition: all 0.15s; min-width: 0;
        }
        .hdr-profile-btn:hover { background: #f8fafc; border-color: #e2e8f0; }
        .hdr-profile-btn.active { background: #eff6ff; border-color: #bfdbfe; }

        .hdr-avatar {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 1.5px solid #93c5fd;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #1d4ed8;
          flex-shrink: 0; letter-spacing: 0.5px;
        }
        .hdr-profile-name {
          font-size: 13px; font-weight: 600; color: #0f172a;
          white-space: nowrap; max-width: 100px;
          overflow: hidden; text-overflow: ellipsis;
        }
        @media(max-width:480px){ .hdr-profile-name{ display: none; } }

        /* Dropdown shared */
        .hdr-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #fff; border: 1px solid #f0f2f5;
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
          z-index: 100;
          animation: hdr-slide 0.18s ease;
          overflow: hidden;
        }
        @keyframes hdr-slide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Notification dropdown ── */
        .hdr-notif-panel { width: 360px; }
        @media(max-width:480px){ .hdr-notif-panel{ width: calc(100vw - 24px); right: -12px; } }

        .hdr-notif-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f0f2f5;
        }
        .hdr-notif-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .hdr-notif-count {
          font-size: 11px; font-weight: 700;
          background: #fee2e2; color: #dc2626;
          padding: 2px 8px; border-radius: 999px;
        }
        .hdr-mark-all {
          font-size: 11px; font-weight: 600; color: #2563eb;
          background: none; border: none; cursor: pointer; padding: 0;
          transition: color 0.15s;
        }
        .hdr-mark-all:hover { color: #1d4ed8; }

        .hdr-notif-list { max-height: 340px; overflow-y: auto; }
        .hdr-notif-list::-webkit-scrollbar { width: 4px; }
        .hdr-notif-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .hdr-notif-item {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 16px; cursor: pointer;
          transition: background 0.12s; position: relative;
          border-bottom: 1px solid #f8fafc;
        }
        .hdr-notif-item:last-child { border-bottom: none; }
        .hdr-notif-item:hover { background: #f8fafc; }
        .hdr-notif-item.unread { background: #fafbff; }
        .hdr-notif-item.unread:hover { background: #f0f4ff; }

        .hdr-notif-dot {
          position: absolute; top: 14px; right: 14px;
          width: 7px; height: 7px; border-radius: 50%;
        }

        .hdr-notif-icon-wrap {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
        .hdr-notif-body { flex: 1; min-width: 0; }
        .hdr-notif-item-title {
          font-size: 13px; font-weight: 600; color: #0f172a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          padding-right: 16px;
        }
        .hdr-notif-item-msg {
          font-size: 12px; color: #64748b; margin-top: 2px;
          line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .hdr-notif-time {
          display: flex; align-items: center; gap: 3px;
          font-size: 11px; color: #94a3b8; margin-top: 4px;
        }

        .hdr-notif-footer {
          padding: 10px 16px;
          border-top: 1px solid #f0f2f5;
          text-align: center;
        }
        .hdr-view-all {
          font-size: 12px; font-weight: 600; color: #2563eb;
          background: none; border: none; cursor: pointer;
          transition: color 0.15s;
        }
        .hdr-view-all:hover { color: #1d4ed8; }

        .hdr-empty-notif {
          padding: 32px 16px; text-align: center;
          color: #94a3b8; font-size: 13px;
        }

        /* ── Profile dropdown ── */
        .hdr-profile-panel { width: 260px; }

        .hdr-profile-top {
          padding: 16px;
          border-bottom: 1px solid #f0f2f5;
          display: flex; align-items: center; gap: 12px;
        }
        .hdr-profile-avatar-lg {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 2px solid #93c5fd;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: #1d4ed8;
          flex-shrink: 0; letter-spacing: 0.5px;
        }
        .hdr-profile-fullname { font-size: 14px; font-weight: 700; color: #0f172a; }
        .hdr-profile-rolebadge {
          display: inline-flex; align-items: center;
          margin-top: 3px; padding: 2px 8px;
          background: #eff6ff; border-radius: 999px;
          font-size: 11px; font-weight: 600; color: #2563eb;
        }

        .hdr-profile-info { padding: 10px 16px; border-bottom: 1px solid #f0f2f5; }
        .hdr-info-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 0;
          font-size: 12.5px; color: #475569;
        }
        .hdr-info-row svg { color: #94a3b8; flex-shrink: 0; }
        .hdr-info-val {
          color: #334155; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
        }

        .hdr-profile-actions { padding: 8px; }
        .hdr-action-btn {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 8px 10px;
          border-radius: 8px; border: none; background: none;
          font-size: 13px; font-weight: 500;
          cursor: pointer; text-align: left;
          transition: background 0.12s, color 0.12s;
          font-family: 'Outfit', sans-serif;
          color: #475569;
        }
        .hdr-action-btn:hover { background: #f1f5f9; color: #0f172a; }
        .hdr-action-btn.danger { color: #ef4444; }
        .hdr-action-btn.danger:hover { background: #fef2f2; color: #dc2626; }
        .hdr-action-sep { height: 1px; background: #f0f2f5; margin: 4px 0; }
      `}</style>

      <header className="hdr-root">
        <h1 className="hdr-title">{title}</h1>
        <div className="hdr-actions">
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              className={`hdr-profile-btn${profileOpen ? ' active' : ''}`}
              onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
            >
              <div className="hdr-avatar">{initials}</div>
              <span className="hdr-profile-name">{user?.name || 'User'}</span>
            </button>

            {profileOpen && (
              <div className="hdr-dropdown hdr-profile-panel">
                <div className="hdr-profile-top">
                  <div className="hdr-profile-avatar-lg">{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="hdr-profile-fullname">{user?.name || 'User'}</div>
                  </div>
                </div>
                <div className="hdr-profile-info">
                  {user?.email && (
                    <div className="hdr-info-row">
                      <Mail size={13} />
                      <span className="hdr-info-val">{user.email}</span>
                    </div>
                  )}
                  {user?.centerName && (
                    <div className="hdr-info-row">
                      <Building2 size={13} />
                      <span className="hdr-info-val">{user.centerName}</span>
                    </div>
                  )}
                </div>

                <div className="hdr-profile-actions">
                  <div className="hdr-action-sep" />
                  <button className="hdr-action-btn danger" onClick={() => { logout(); setProfileOpen(false); }}>
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </header>
    </>
  );
};

export default AppHeader;