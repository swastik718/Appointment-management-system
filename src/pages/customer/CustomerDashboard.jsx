import React, { useState, useEffect } from 'react';
import { CalendarDays, ListOrdered, Clock, ChevronRight, Activity, Zap, Star, LayoutGrid, Timer, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, parseISO } from 'date-fns';

export default function CustomerDashboard() {
  const { currentUser } = useAuth();
  const [nextAppt, setNextAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for the next upcoming (Booked or In Progress) appointment
    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAppts = [];
      snapshot.forEach(doc => allAppts.push({ id: doc.id, ...doc.data() }));
      
      // Filter and sort in-memory
      const upcoming = allAppts
        .filter(a => ['Booked', 'In Progress'].includes(a.status))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.timeSlot.localeCompare(b.timeSlot);
        });

      if (upcoming.length > 0) {
        setNextAppt(upcoming[0]);
      } else {
        setNextAppt(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in text-wrap">
      {/* Premium Hero Hub */}
      <div className="glass-card p-10 md:p-16 relative overflow-hidden bg-gradient-to-br from-dark-800 via-dark-900 to-indigo-950/20 border-primary-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
           <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full">
                 <Zap className="w-4 h-4 text-primary-400" />
                 <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Priority Access Enabled</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                Elite <br/> 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-fuchsia-400">Scheduling</span>
              </h1>
              <p className="text-lg text-slate-400 font-medium max-w-md leading-relaxed">
                Experience the next generation of appointment management. 
                Instant bookings, real-time queue tracking, and elite service delivery.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/customer/book" className="btn-primary group py-4 px-8 rounded-2xl flex items-center gap-3 font-bold shadow-xl shadow-primary-500/30 transition-all hover:scale-105">
                  Secure Slot <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/customer/queue" className="bg-dark-800/80 backdrop-blur-xl border border-dark-700 text-white font-bold py-4 px-8 rounded-2xl flex items-center gap-3 hover:bg-dark-700 transition-all">
                  Track Live <Activity className="w-5 h-5 text-emerald-500" />
                </Link>
              </div>
           </div>
           
           <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Uptime', val: '99.9%', color: 'text-emerald-400' },
                   { label: 'Security', val: 'AES-256', color: 'text-primary-400' },
                   { label: 'Sync', val: 'Realtime', color: 'text-fuchsia-400' },
                   { label: 'Support', val: '24/7', color: 'text-amber-400' }
                 ].map((metric, i) => (
                   <div key={i} className="bg-dark-900/40 border border-dark-800 p-6 rounded-[2rem] hover:border-dark-700 transition-all">
                      <p className={`text-2xl font-black ${metric.color} tracking-tighter mb-1`}>{metric.val}</p>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{metric.label}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Navigation Grid */}
        <div className="xl:col-span-8 space-y-8">
           <h2 className="text-xl font-black text-white px-2 tracking-tight flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-primary-500" />
              Quick Access
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link to="/customer/book" className="glass-card p-8 flex flex-col items-center text-center group transition-all duration-500 hover:scale-[1.03] hover:border-primary-500/50 bg-gradient-to-b from-dark-800/40 to-transparent">
                <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-3xl flex items-center justify-center mb-6 border border-primary-500/20 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Reservation</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Deploy New Booking</p>
              </Link>

              <Link to="/customer/history" className="glass-card p-8 flex flex-col items-center text-center group transition-all duration-500 hover:scale-[1.03] hover:border-fuchsia-500/50 bg-gradient-to-b from-dark-800/40 to-transparent">
                <div className="w-16 h-16 bg-fuchsia-500/10 text-fuchsia-500 rounded-3xl flex items-center justify-center mb-6 border border-fuchsia-500/20 group-hover:bg-fuchsia-500 group-hover:text-white transition-all shadow-lg">
                   <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Ledger</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">History & Status</p>
              </Link>

              <Link to="/customer/queue" className="glass-card p-8 flex flex-col items-center text-center group transition-all duration-500 hover:scale-[1.03] hover:border-emerald-500/50 bg-gradient-to-b from-dark-800/40 to-transparent">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg">
                   <ListOrdered className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Live Stream</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Active Queue Flow</p>
              </Link>
           </div>
        </div>

        {/* Live Status Sidebar */}
        <div className="xl:col-span-4 space-y-8">
           <h2 className="text-xl font-black text-white px-2 tracking-tight flex items-center gap-3">
              <Timer className="w-6 h-6 text-fuchsia-500" />
              Next Activity
           </h2>
           
           {loading ? (
             <div className="glass-card p-20 flex items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-dark-700" />
             </div>
           ) : nextAppt ? (
             <div className="glass-card p-8 border-l-8 border-l-primary-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl"></div>
                
                <div className="flex justify-between items-start mb-8">
                   <div className="w-16 h-16 bg-dark-900 rounded-2xl flex items-center justify-center border border-dark-700 text-primary-400 font-black text-2xl shadow-inner">
                      #{nextAppt.queueNumber}
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Status</p>
                      <span className="text-[10px] font-black uppercase text-primary-500 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                         {nextAppt.status}
                      </span>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div>
                      <h4 className="text-xl font-black text-white tracking-tight uppercase">{nextAppt.serviceName}</h4>
                      <div className="flex items-center gap-2 text-primary-400 font-bold text-sm mt-1">
                         <CalendarDays className="w-4 h-4" />
                         {format(parseISO(nextAppt.date), 'MMM d, yyyy')}
                      </div>
                   </div>
                   
                   <div className="bg-dark-900/80 p-5 rounded-2xl border border-dark-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Clock className="w-5 h-5 text-slate-600" />
                         <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Time Allotment</p>
                            <p className="text-sm font-bold text-slate-200 uppercase">{nextAppt.timeSlot}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <Link to="/customer/queue" className="mt-8 w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary-500/20">
                   Track Entry <ChevronRight className="w-4 h-4" />
                </Link>
             </div>
           ) : (
             <div className="glass-card p-12 text-center border-dashed border-2 border-dark-800 bg-dark-900/30 rounded-[3rem]">
                <div className="w-16 h-16 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-dark-700">
                   <Star className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-loose">No synchronized <br/> upcoming activities</p>
                <Link to="/customer/book" className="mt-8 inline-block text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] hover:text-white transition-colors">
                   Initialize Node Slot
                </Link>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// Added Loader2 & MapPin & Plus if needed, but they are already imported or available
function Plus(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
