import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Loader2, History, XCircle, ExternalLink, CalendarDays, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function CustomerHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appts = [];
      snapshot.forEach(doc => appts.push({ id: doc.id, ...doc.data() }));
      setAppointments(appts);
      setLoading(false);
    }, (error) => {
      console.error("History sync error:", error);
      toast.error('Failed to sync history');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCancel = async (appt) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await updateDoc(doc(db, 'appointments', appt.id), {
          status: 'Cancelled',
          updatedAt: new Date().toISOString()
        });
        toast.success('Appointment cancelled successfully');
      } catch (error) {
        toast.error('Failed to cancel');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">My Ledger</h1>
          <p className="text-slate-400 mt-2 font-medium">Tracking your service timeline and status history</p>
        </div>
        <Link to="/customer/book" className="btn-primary py-3 px-8 rounded-2xl flex items-center gap-2 group">
           New Reservation <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-2 border-dark-700 bg-dark-900/50 rounded-[40px]">
          <div className="w-20 h-20 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700">
            <History className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">No Transactions Found</h3>
          <p className="text-slate-500 mb-10 max-w-sm mx-auto">Your booking history is currently empty. Start your journey with our premium services.</p>
          <Link to="/customer/book" className="btn-primary px-10">Secure Your First Slot</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {appointments.map(appt => (
            <div key={appt.id} className={`glass-card p-6 md:p-8 flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center group hover:border-primary-500/30 transition-all duration-500 overflow-hidden relative ${appt.status === 'Cancelled' ? 'opacity-60 grayscale' : ''}`}>
               {appt.status === 'In Progress' && (
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-fuchsia-500 animate-pulse"></div>
               )}
               
               <div className="flex-1 flex flex-col md:flex-row gap-8 items-start md:items-center">
                 <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-black transition-all duration-500 border-2 flex-shrink-0 ${
                   appt.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                   appt.status === 'Cancelled' ? 'bg-dark-800 border-dark-700 text-slate-600' :
                   'bg-primary-500/10 border-primary-500/20 text-primary-400'
                 }`}>
                   <span className="text-[10px] uppercase tracking-tighter opacity-60 mb-0.5">Ticket</span>
                   <span className="text-2xl leading-none">#{appt.queueNumber || '--'}</span>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-primary-400 transition-colors">{appt.serviceName}</h3>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        appt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        appt.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        appt.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-primary-500/10 text-primary-500 border-primary-500/20'
                      }`}>
                        {appt.status === 'Booked' ? 'Upcoming' : appt.status}
                      </span>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                     <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-600" />
                        {format(parseISO(appt.date), 'EEEE, MMM d, yyyy')}
                     </div>
                     <span className="w-1.5 h-1.5 rounded-full bg-dark-700 hidden md:block"></span>
                     <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-600" />
                        {appt.timeSlot}
                     </div>
                   </div>
                 </div>
               </div>

               <div className="flex items-center gap-4 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-dark-700">
                 {/* Action Buttons */}
                 {(appt.status === 'Booked' || appt.status === 'In Progress') && (
                   <Link 
                     to="/customer/queue" 
                     className="flex-1 lg:flex-initial btn-primary py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-primary-500/10"
                   >
                     Live Track <ArrowRight className="w-4 h-4" />
                   </Link>
                 )}
                 
                 {appt.status === 'Completed' && (
                    <div className="flex-1 lg:flex-initial flex items-center gap-2 px-6 py-3 bg-emerald-500/5 text-emerald-500 rounded-2xl border border-emerald-500/10 text-sm font-bold">
                       <CheckCircle className="w-4 h-4" /> Satisfied
                    </div>
                 )}

                 {appt.status === 'Booked' && (
                   <button 
                     onClick={() => handleCancel(appt)}
                     className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all border border-transparent hover:border-rose-500/20"
                     title="Cancel Reservation"
                   >
                     <XCircle className="w-6 h-6" />
                   </button>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Added missing Plus icon import to Lucide
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
