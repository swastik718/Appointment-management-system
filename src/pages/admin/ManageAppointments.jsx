import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Loader2, CalendarDays, CheckCircle, XCircle, Search, Filter, Calendar as CalIcon, User, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO, startOfToday } from 'date-fns';

export default function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'Today' or 'All'

  const todayStr = format(startOfToday(), 'yyyy-MM-dd');

  useEffect(() => {
    let q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    
    // Filtering is better done client-side for "All" view to allow search, 
    // but for very large datasets, server-side is better. 
    // Given the SaaS context, we'll keep it simple but robust.

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appts = [];
      snapshot.forEach((doc) => {
        appts.push({ id: doc.id, ...doc.data() });
      });
      setAppointments(appts);
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast.error('Failed to load appointments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredAppointments = appointments.filter(appt => {
    const matchesSearch = 
      appt.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.serviceName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || appt.status === statusFilter;
    const matchesDate = dateFilter === 'All' || appt.date === todayStr;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: appointments.length,
    today: appointments.filter(a => a.date === todayStr).length,
    pending: appointments.filter(a => a.status === 'Booked' || a.status === 'In Progress').length
  };

  return (
    <div className="space-y-6 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <CalendarDays className="w-8 h-8 text-primary-500" />
             Appointments
          </h1>
          <p className="text-slate-400 mt-1">Review and manage all customer bookings.</p>
        </div>

        <div className="flex flex-wrap gap-3">
           <div className="bg-dark-800/50 border border-dark-700 rounded-xl px-4 py-2 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Today</p>
                <p className="text-lg font-black text-white">{stats.today}</p>
              </div>
              <div className="w-px h-8 bg-dark-700"></div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Pending</p>
                <p className="text-lg font-black text-primary-400">{stats.pending}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, or service..." 
              className="input-field pl-11 py-3 bg-dark-800/50 border-dark-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex gap-2">
            <div className="flex-1 relative">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <select 
                 className="input-field pl-10 py-3 bg-dark-800/50 border-dark-700 appearance-none cursor-pointer"
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
               >
                 <option value="All">All Status</option>
                 <option value="Booked">Booked</option>
                 <option value="In Progress">In Progress</option>
                 <option value="Completed">Completed</option>
                 <option value="Cancelled">Cancelled</option>
               </select>
            </div>
         </div>

         <div className="flex gap-2">
            <div className="flex-1 relative">
               <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <select 
                 className="input-field pl-10 py-3 bg-dark-800/50 border-dark-700 appearance-none cursor-pointer"
                 value={dateFilter}
                 onChange={(e) => setDateFilter(e.target.value)}
               >
                 <option value="All">All Dates</option>
                 <option value="Today">Today Only</option>
               </select>
            </div>
         </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-2 border-dark-600 bg-dark-900/50">
          <div className="w-20 h-20 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700">
            <CalendarDays className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Matching Appointments</h3>
          <p className="text-slate-400 mb-0 max-w-sm mx-auto">We couldn't find any bookings matching your current filter criteria.</p>
          <button onClick={() => {setSearchTerm(''); setStatusFilter('All'); setDateFilter('All');}} className="btn-secondary mt-8 px-8">Clear All Filters</button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden shadow-2xl border-dark-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-dark-800/80 border-b border-dark-700 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Customer Profile</th>
                  <th className="px-8 py-5">Service Details</th>
                  <th className="px-8 py-5">Schedule</th>
                  <th className="px-8 py-5">Order</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-primary-500/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center text-slate-400 border border-dark-600 font-bold">
                           {appt.customerName?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="text-slate-100 font-bold tracking-tight">{appt.customerName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{appt.userEmail}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-primary-500/40"></span>
                         <span className="text-slate-200 font-medium">{appt.serviceName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-slate-200 text-sm font-semibold">{appt.date ? format(parseISO(appt.date), 'MMM d, yyyy') : 'N/A'}</p>
                      <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{appt.timeSlot}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                         <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Queue ID</span>
                         <span className="text-lg font-black text-primary-400">#{appt.queueNumber || '--'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        appt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        appt.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        appt.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-primary-500/10 text-primary-400 border-primary-500/20'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => updateStatus(appt.id, 'Completed')}
                            className="p-2.5 text-slate-400 hover:text-emerald-400 bg-dark-800 hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent rounded-xl transition-all"
                            title="Complete Appointment"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => updateStatus(appt.id, 'Cancelled')}
                            className="p-2.5 text-slate-400 hover:text-rose-400 bg-dark-800 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded-xl transition-all"
                            title="Cancel Appointment"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      {(appt.status === 'Completed' || appt.status === 'Cancelled') && (
                        <button className="p-2.5 text-slate-600 cursor-not-allowed">
                           <ExternalLink className="w-5 h-5 opacity-20" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-dark-800/30 border-t border-dark-700 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
             <span>Showing {filteredAppointments.length} of {appointments.length} Records</span>
             <span>Admin Ledger v1.0</span>
          </div>
        </div>
      )}
    </div>
  );
}
