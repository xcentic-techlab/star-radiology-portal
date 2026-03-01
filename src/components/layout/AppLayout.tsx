import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
