import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutGrid, 
  CalendarDays, 
  Users, 
  ListOrdered, 
  Scissors, 
  Activity,
  Cpu,
  Layers,
  Settings,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ role }) {
  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutGrid className="w-5 h-5" /> },
    { name: 'Services', path: '/admin/services', icon: <Scissors className="w-5 h-5" /> },
    { name: 'Schedule', path: '/admin/schedule', icon: <CalendarDays className="w-5 h-5" /> },
    { name: 'Appointments', path: '/admin/appointments', icon: <ListOrdered className="w-5 h-5" /> },
    { name: 'Live Queue', path: '/admin/queue', icon: <Activity className="w-5 h-5" /> },
  ];

  const customerLinks = [
    { name: 'Dashboard', path: '/customer', icon: <LayoutGrid className="w-5 h-5" /> },
    { name: 'Book Service', path: '/customer/book', icon: <CalendarDays className="w-5 h-5" /> },
    { name: 'My History', path: '/customer/history', icon: <Layers className="w-5 h-5" /> },
    { name: 'Live Tracker', path: '/customer/queue', icon: <Cpu className="w-5 h-5" /> },
  ];

  const links = role === 'admin' ? adminLinks : customerLinks;

  return (
    <aside className="w-72 bg-dark-950 border-r border-dark-800/50 flex flex-col h-screen sticky top-0 z-40 overflow-hidden text-wrap">
      {/* Brand Section */}
      <div className="h-20 flex items-center px-8 border-b border-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-primary-500/20 group">
             <CalendarDays className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white tracking-tighter leading-tight uppercase">
              Q<span className="text-primary-500">Master</span>
            </span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] -mt-0.5">Enterprise v1.0</span>
          </div>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 overflow-y-auto py-10 px-6 space-y-2 custom-scrollbar">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 px-2">Navigation</p>
        
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/admin' || link.path === '/customer'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative ${
                isActive
                  ? 'bg-primary-500/10 text-primary-400 font-bold shadow-lg shadow-primary-500/5'
                  : 'text-slate-500 hover:bg-dark-900/50 hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-500' : 'group-hover:text-primary-500'}`}>
                   {link.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{link.name}</span>
                {isActive && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-8 space-y-4">
        <div className="bg-gradient-to-br from-dark-900 to-indigo-950/30 rounded-3xl p-6 border border-dark-800 relative overflow-hidden group hover:border-dark-700 transition-all">
           <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary-500/10 transition-all"></div>
           <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-slate-600" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support Portal</p>
           </div>
           <p className="text-xs text-slate-300 font-bold mb-4">Encountered an issue with your terminal?</p>
           <button className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-400 bg-primary-500/10 hover:bg-primary-500 hover:text-white rounded-xl transition-all border border-primary-500/20">
             Open Ticket
           </button>
        </div>

        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operational</span>
           </div>
           <Settings className="w-4 h-4 text-slate-700 hover:text-slate-400 cursor-pointer transition-colors" />
        </div>
      </div>
    </aside>
  );
}
