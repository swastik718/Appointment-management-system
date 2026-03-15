import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      <Sidebar role="admin" />
      
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Background glow for content area */}
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-900/10 via-dark-900 to-dark-900 pointer-events-none -z-10"></div>
        
        <Navbar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-8">
          <div className="animate-fade-in max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
