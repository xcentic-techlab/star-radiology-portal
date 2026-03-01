import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, Stethoscope, Users, CalendarDays,
  FileText, Upload, Menu, X, LogOut, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminNav = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Centers', path: '/admin/centers', icon: Building2 },
  { label: 'Procedures', path: '/admin/procedures', icon: Stethoscope },
  { label: 'Staff', path: '/admin/staff', icon: Users },
  { label: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
  { label: 'Reports', path: '/admin/reports', icon: FileText },
];

const staffNav = [
  { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', path: '/staff/appointments', icon: CalendarDays },
  { label: 'Upload Report', path: '/staff/reports/upload', icon: Upload },
  { label: 'Reports', path: '/staff/reports', icon: FileText },
];

const AppSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = user?.role === 'admin' ? adminNav : staffNav;
  const roleLabel = user?.role === 'admin' ? 'Super Admin' : user?.role === 'center_admin' ? 'Center Admin' : 'Staff';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Stethoscope size={18} className="text-accent-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">DiagnosticMS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-nav-item ${active ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {user?.name?.charAt(0)?.toUpperCase() || user?.role?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-md shadow-sm"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/20" onClick={() => setMobileOpen(false)}>
          <div className="w-[260px] h-full bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1 text-muted-foreground">
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] min-h-screen bg-card border-r border-border flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
