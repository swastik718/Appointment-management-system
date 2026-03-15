import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  TrendingUp,
  Activity,
  UserCheck,
  Zap,
  Star,
  Loader2
} from 'lucide-react';
import { format, startOfToday, differenceInMinutes, parseISO } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayBookings: 0,
    activeQueue: 0,
    completedToday: 0,
    totalUsers: 0,
    avgWaitTime: 0,
    completionRate: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayDate = format(startOfToday(), 'yyyy-MM-dd');

  useEffect(() => {
    // 1. Listen for today's stats & calculate dynamics
    const todayQuery = query(collection(db, 'appointments'), where('date', '==', todayDate));
    
    const unsubscribeAppts = onSnapshot(todayQuery, (snapshot) => {
      let todayCount = 0;
      let activeCount = 0;
      let completedCount = 0;
      let totalWaitTime = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        todayCount++;
        if (data.status === 'Booked' || data.status === 'In Progress') activeCount++;
        if (data.status === 'Completed') {
          completedCount++;
          // Calculation of wait time (createdAt vs updatedAt for completion)
          if (data.createdAt && data.updatedAt) {
            const wait = differenceInMinutes(parseISO(data.updatedAt), parseISO(data.createdAt));
            totalWaitTime += wait > 0 ? wait : 0;
          }
        }
      });
      
      setStats(prev => ({
        ...prev,
        todayBookings: todayCount,
        activeQueue: activeCount,
        completedToday: completedCount,
        avgWaitTime: completedCount > 0 ? Math.round(totalWaitTime / completedCount) : 0,
        completionRate: todayCount > 0 ? Math.round((completedCount / todayCount) * 100) : 0
      }));
    });

    // 2. Fetch total users
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });

    // 3. Recent Appointments
    const recentQuery = query(
      collection(db, 'appointments'), 
      orderBy('createdAt', 'desc'), 
      limit(6)
    );
    
    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const appts = [];
      snapshot.forEach(doc => appts.push({ id: doc.id, ...doc.data() }));
      setRecentAppointments(appts);
      setLoading(false);
    });

    return () => {
      unsubscribeAppts();
      unsubscribeUsers();
      unsubscribeRecent();
    };
  }, [todayDate]);

  const statCards = [
    { label: "Today's Volume", value: stats.todayBookings, icon: Calendar, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { label: "On Premises", value: stats.activeQueue, icon: Clock, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
    { label: "Success Ops", value: stats.completedToday, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: "Loyal Clients", value: stats.totalUsers, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             Command Center
             <span className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500 bg-dark-800 px-3 py-1 rounded-full border border-dark-700 ml-2">Admin</span>
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
            <Activity className="w-4 h-4 text-emerald-500" />
            Vitals are stable for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-dark-800/50 p-2 rounded-2xl border border-dark-700">
           <div className="px-4 py-2 text-center border-r border-dark-700">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Health</p>
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-sm font-bold text-white">100%</span>
              </div>
           </div>
           <div className="px-4 py-2 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latency</p>
              <span className="text-sm font-bold text-white">42ms</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="glass-card p-6 border-dark-700 relative group overflow-hidden hover:scale-[1.02] transition-all cursor-default">
            <div className={`absolute -right-4 -bottom-4 w-32 h-32 ${stat.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500/50" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-4xl font-black text-white mt-2 tracking-tighter">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-dark-600" /> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Activity Table */}
        <div className="xl:col-span-2 glass-card overflow-hidden shadow-2xl border-dark-700">
          <div className="p-8 border-b border-dark-700 flex justify-between items-center bg-dark-800/30">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-primary-400" />
                Live Feed
              </h2>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Latest system transactions</p>
            </div>
            <button className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
              Full Archive
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-dark-900/50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-dark-700">
                  <th className="px-8 py-4">Client</th>
                  <th className="px-8 py-4">Service</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {recentAppointments.length > 0 ? recentAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-primary-500/[0.02] transition-colors border-transparent hover:border-primary-500/10">
                    <td className="px-8 py-5">
                      <p className="text-slate-200 font-bold">{appt.customerName}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-0.5">{appt.userEmail}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-dark-800 rounded-lg">{appt.serviceName}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                        appt.status === 'Completed' ? 'text-emerald-500' :
                        appt.status === 'Cancelled' ? 'text-rose-500' : 'text-primary-400'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-[10px] text-slate-500">
                      {appt.date} <br/> {appt.timeSlot}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-slate-600 uppercase tracking-widest font-bold text-xs">
                       Initial records synchronization...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-8 bg-gradient-to-br from-dark-800 to-primary-950/20 border-primary-500/20">
            <h2 className="text-lg font-bold text-white mb-8 flex items-center justify-between">
               Operations Data
               <Zap className="w-5 h-5 text-amber-500" />
            </h2>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency Rate</p>
                   <p className="text-2xl font-black text-primary-400">{stats.completionRate}%</p>
                </div>
                <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-dark-700">
                   <div 
                      className="h-full bg-gradient-to-r from-primary-600 to-fuchsia-500 transition-all duration-1000" 
                      style={{ width: `${stats.completionRate}%` }}
                   ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-dark-900/50 p-5 rounded-3xl border border-dark-700 flex items-center justify-between group hover:border-primary-500/30 transition-all">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Service Time</p>
                       <p className="text-xl font-black text-white">{stats.avgWaitTime} <span className="text-xs font-medium text-slate-500 uppercase">Mins</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all">
                       <Star className="w-5 h-5" />
                    </div>
                 </div>
                 
                 <div className="bg-primary-500 p-6 rounded-3xl shadow-xl shadow-primary-500/20 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.03] transition-all">
                    <p className="text-white font-black uppercase text-xs tracking-widest mb-2">Issue Tickets</p>
                    <div className="flex items-center gap-3">
                       <span className="text-4xl font-black text-white">#{stats.activeQueue + stats.completedToday + 1}</span>
                       <ArrowUpRight className="w-6 h-6 text-white/50" />
                    </div>
                    <p className="text-primary-100 text-[10px] mt-2 font-bold uppercase">Ready for distribution</p>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-6 border-dashed border-dark-700 text-center">
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">System Identity</p>
             <div className="w-14 h-14 bg-dark-800 rounded-2xl mx-auto flex items-center justify-center border border-dark-700 mb-2">
                <img src="/vite.svg" className="w-6 h-6" alt="Engine" />
             </div>
             <p className="text-xs font-bold text-slate-400">Core Revision 4.2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
