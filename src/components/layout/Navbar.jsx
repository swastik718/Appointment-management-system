import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Bell, Search, Hexagon, Grid, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Navbar({ toggleSidebar }) {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('System cleared. Logged out.');
    } catch (error) {
      toast.error('Exit protocol failed.');
    }
  };

  return (
    <header className="h-20 bg-dark-950/40 backdrop-blur-2xl border-b border-dark-800/50 flex items-center justify-between px-8 sticky top-0 z-50 text-wrap">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Hexagon className="w-6 h-6 text-white fill-white/20" />
           </div>
           <div className="hidden md:block">
              <h2 className="text-lg font-black text-white tracking-tighter uppercase">
                {userRole === 'admin' ? 'Terminal' : 'Client'} <span className="text-primary-500">Node</span>
              </h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] -mt-1">Secure Interface v4.0</p>
           </div>
        </div>

        <div className="hidden lg:flex items-center bg-dark-900/50 border border-dark-800 px-4 py-2 rounded-xl gap-3 min-w-[300px] group focus-within:border-primary-500/50 transition-all">
           <Search className="w-4 h-4 text-slate-600 group-focus-within:text-primary-500" />
           <input 
             type="text" 
             placeholder="Search commands or records..." 
             className="bg-transparent border-none outline-none text-xs text-slate-300 w-full font-medium" 
           />
           <span className="text-[10px] font-black text-dark-700 uppercase tracking-widest bg-dark-800 px-1.5 py-0.5 rounded">Ctrl + K</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Server: Online</span>
        </div>

        <button className="p-2.5 text-slate-500 hover:text-white transition-all relative bg-dark-900/50 border border-dark-800 rounded-xl hover:bg-dark-800">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-dark-950"></span>
        </button>
        
        <div className="w-px h-8 bg-dark-800 hidden sm:block"></div>

        <div className="flex items-center gap-4 relative">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-black text-white tracking-tight">{currentUser?.displayName || 'Authorized User'}</p>
            <p className="text-[9px] font-black text-primary-500 uppercase tracking-[0.2em]">{userRole} context</p>
          </div>
          
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-600 to-fuchsia-600 p-0.5 shadow-xl shadow-primary-500/10 hover:scale-105 transition-all"
          >
             <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center overflow-hidden border border-white/10">
                {currentUser?.displayName ? (
                   <span className="font-black text-white text-lg">{currentUser.displayName.charAt(0).toUpperCase()}</span>
                ) : (
                   <User className="w-5 h-5 text-white" />
                )}
             </div>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
              <div className="absolute top-full right-0 mt-4 w-64 glass-card p-4 animate-scale-in z-50 shadow-2xl border-dark-700 bg-dark-900/95 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-fuchsia-500"></div>
                <div className="p-4 border-b border-dark-800 mb-2">
                   <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Identity Node</p>
                   <p className="text-sm font-bold text-white truncate">{currentUser?.email}</p>
                </div>
                
                <div className="space-y-1">
                   <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold font-black uppercase tracking-widest">
                      <Grid className="w-4 h-4" /> Switch Partition
                   </button>
                   <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold font-black uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4" /> Privacy Protocol
                   </button>
                   <div className="h-px bg-dark-800 my-2"></div>
                   <button 
                     onClick={handleLogout}
                     className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all text-xs font-bold font-black uppercase tracking-widest"
                   >
                      <LogOut className="w-4 h-4" /> Terminate Session
                   </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
