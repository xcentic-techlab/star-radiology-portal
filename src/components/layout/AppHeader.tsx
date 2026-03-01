import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

interface AppHeaderProps {
  title: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-[60px] bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="page-title pl-10 lg:pl-0">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
