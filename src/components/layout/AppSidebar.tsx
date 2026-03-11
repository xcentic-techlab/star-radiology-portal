import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, Stethoscope, Users, CalendarDays,
  FileText, Upload, Menu, X, LogOut, ImageIcon, CalendarClock
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard',        path: '/admin/dashboard',    icon: LayoutDashboard },
  { label: 'Centers',          path: '/admin/centers',      icon: Building2 },
  { label: 'Procedures',       path: '/admin/procedures',   icon: Stethoscope },
  { label: 'Staff',            path: '/admin/staff',        icon: Users },
  { label: 'Appointments',     path: '/admin/appointments', icon: CalendarDays },
  { label: 'Reports',          path: '/admin/reports',      icon: FileText },
  { label: 'Schedule',         path: '/admin/schedule',     icon: CalendarClock },
  { label: 'App Images',       path: '/admin/images',       icon: ImageIcon },
];

const staffNav = [
  { label: 'Dashboard',     path: '/staff/dashboard',      icon: LayoutDashboard },
  { label: 'Appointments',  path: '/staff/appointments',   icon: CalendarDays },
  { label: 'Upload Report', path: '/staff/reports/upload', icon: Upload },
  { label: 'Reports',       path: '/staff/reports',        icon: FileText },
];

const AppSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = user?.role === 'admin' ? adminNav : staffNav;

  const roleLabel =
    user?.role === 'admin'        ? 'Super Admin'  :
    user?.role === 'center_admin' ? 'Center Admin' : 'Staff Member';

  const initials = user?.name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    || user?.role?.charAt(0)?.toUpperCase() || 'U';

  const sidebarContent = (
    <div className="sb-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        .sb-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
          background: #ffffff;
        }

        /* ── Logo ── */
        .sb-logo-wrap {
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .sb-logo-wrap img {
          width: 100%;
          max-width: 110px;
          height: auto;
          object-fit: contain;
          display: block;
        }

        /* ── Section label ── */
        .sb-section {
          padding: 18px 16px 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #c1c9d4;
          flex-shrink: 0;
        }

        /* ── Nav list ── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          padding: 2px 10px 10px;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        /* ── Nav item ── */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 9px;
          margin-bottom: 1px;
          font-size: 13.5px;
          font-weight: 500;
          color: #64748b;
          text-decoration: none;
          transition: background 0.14s, color 0.14s;
          position: relative;
          white-space: nowrap;
        }
        .sb-item:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .sb-item-icon {
          flex-shrink: 0;
          transition: color 0.14s;
        }
        .sb-item.active {
          background: #f0f7ff;
          color: #1d4ed8;
          font-weight: 600;
        }
        .sb-item.active .sb-item-icon {
          color: #2563eb;
        }
        .sb-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 18px;
          border-radius: 0 3px 3px 0;
          background: #2563eb;
        }

        /* ── Divider ── */
        .sb-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 4px 14px;
          flex-shrink: 0;
        }

        /* ── User footer ── */
        .sb-user {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .sb-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 1.5px solid #93c5fd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #1d4ed8;
          flex-shrink: 0;
          letter-spacing: 0.4px;
        }
        .sb-user-name {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 112px;
          line-height: 1.2;
        }
        .sb-user-role {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          margin-top: 2px;
        }
        .sb-logout {
          margin-left: auto;
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.14s;
        }
        .sb-logout:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #ef4444;
        }
      `}</style>
      <div className="sb-logo-wrap">
        <img src="/logo.png" alt="Logo" />
      </div>
      <div className="sb-section">
        {user?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
      </div>
      <div className="sb-nav">
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/staff/reports'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={16} className="sb-item-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sb-divider" />
      <div className="sb-user">
        <div className="sb-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sb-user-name">{user?.name || 'User'}</div>
          <div className="sb-user-role">{roleLabel}</div>
        </div>
        <button className="sb-logout" onClick={logout} title="Logout">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media (max-width: 1023px) { .sb-desktop { display: none !important; } }
        @media (min-width: 1024px) { .sb-hamburger { display: none !important; } }
      `}</style>
      {!mobileOpen && (
        <button
          className="sb-hamburger"
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 50,
            padding: 8, background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer',
            color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Menu size={20} />
        </button>
      )}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(15,23,42,0.28)', backdropFilter: 'blur(3px)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              width: 248, height: '100%', background: '#fff',
              borderRight: '1px solid #f1f5f9',
              boxShadow: '8px 0 32px rgba(0,0,0,0.10)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10,
                background: '#f1f5f9', border: 'none', borderRadius: 7,
                width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <X size={14} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
      <aside
        className="sb-desktop"
        style={{
          width: 236,
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid #f1f5f9',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;