import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ListOrdered, BellRing, Clock, Users, ChevronRight, Hash, Activity } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { Link } from 'react-router-dom';

export default function CustomerQueue() {
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { currentUser } = useAuth();
  const todayDate = format(startOfToday(), 'yyyy-MM-dd');
  const queueId = `queue_${todayDate}`;

  useEffect(() => {
    // 1. Listen to today's active appointments (all Booked/In Progress)
    const q = query(
      collection(db, 'appointments'),
      where('date', '==', todayDate),
      where('status', 'in', ['Booked', 'In Progress'])
    );

    const unsubscribeAppts = onSnapshot(q, (snapshot) => {
      const appts = [];
      snapshot.forEach((doc) => {
        appts.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort in-memory to avoid composite index
      appts.sort((a,b) => (a.queueNumber || 0) - (b.queueNumber || 0));

      setActiveAppointments(appts);
      setLoading(false);
    });

    // 2. Listen to or create today's queue global state
    const unsubscribeQueue = onSnapshot(doc(db, 'queues', queueId), (docSnap) => {
      if (docSnap.exists()) {
        setQueueState(docSnap.data());
      }
    });

    return () => {
      unsubscribeAppts();
      unsubscribeQueue();
    };
  }, [queueId, todayDate]);

  // Find user's own appointments today
  const myAppts = activeAppointments.filter(a => a.userId === currentUser.uid);
  const myActiveAppt = myAppts[0]; 

  const currentServingNumber = queueState?.currentServingNumber || 0;
  
  // Calculate people ahead
  let peopleAhead = 0;
  if (myActiveAppt && myActiveAppt.status === 'Booked') {
     peopleAhead = activeAppointments.filter(a => 
       a.status === 'Booked' && 
       a.queueNumber < myActiveAppt.queueNumber
     ).length;
     // Add 1 if someone is currently 'In Progress'
     if (activeAppointments.some(a => a.status === 'In Progress')) {
        peopleAhead += 1;
     }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             Live Tracking
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
             </span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
             <Activity className="w-4 h-4 text-emerald-500" />
             Synchronizing with terminal database for {todayDate}
          </p>
        </div>
        {!loading && !myActiveAppt && (
           <Link to="/customer/book" className="btn-primary py-3 px-8 rounded-2xl flex items-center gap-2 group">
              Join Queue <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Link>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Calibrating Stream...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          
          {/* Global Terminal Status */}
          <div className="glass-card p-10 text-center border-t-8 border-t-fuchsia-500 relative overflow-hidden group shadow-2xl flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-fuchsia-500/10 transition-all duration-1000"></div>
            
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Now Serving</p>
            <div className="text-9xl font-black text-white mb-6 drop-shadow-2xl tracking-tighter">
              {currentServingNumber > 0 ? `#${currentServingNumber}` : '--'}
            </div>
            
            <div className="bg-dark-900/50 py-3 px-6 rounded-2xl border border-dark-700 inline-block mx-auto">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-fuchsia-500" /> 
                  Terminal 01 Active
               </span>
            </div>
          </div>

          {/* User's Personal Passport */}
          <div className={`glass-card p-10 border-t-8 relative overflow-hidden group flex flex-col transition-all duration-700 ${
            myActiveAppt ? 'border-t-primary-500 shadow-2xl shadow-primary-500/10' : 'border-t-dark-700 grayscale opacity-80'
          }`}>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl group-hover:bg-primary-500/10 transition-all duration-1000"></div>
            
            <div className="flex justify-between items-start mb-10">
               <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Your Passport</p>
                  <p className="text-sm font-bold text-slate-300">{currentUser?.displayName || 'Client Node'}</p>
               </div>
               <Hash className={`w-6 h-6 ${myActiveAppt ? 'text-primary-500' : 'text-slate-700'}`} />
            </div>
            
            {myActiveAppt ? (
              <div className="flex flex-col flex-1">
                <div className="text-center mb-8 relative">
                   <div className="text-8xl font-black text-white tracking-tighter mb-2">
                      #{myActiveAppt.queueNumber}
                   </div>
                   
                   {myActiveAppt.status === 'In Progress' ? (
                      <div className="bg-emerald-500 p-4 rounded-3xl text-white font-black text-lg flex items-center justify-center gap-3 animate-pulse shadow-xl shadow-emerald-500/20">
                         <BellRing className="w-6 h-6" /> ENTRY GRANTED
                      </div>
                   ) : (
                      <div className="flex flex-col gap-2">
                         <div className="bg-primary-500/10 border border-primary-500/30 py-3 rounded-2xl text-primary-400 font-black text-xs uppercase tracking-widest">
                            Estimated Wait: {peopleAhead * 15} MINS
                         </div>
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">{peopleAhead} Node(s) Ahead of you</p>
                      </div>
                   )}
                </div>

                <div className="mt-auto space-y-3 bg-dark-900/50 p-6 rounded-3xl border border-dark-700">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Segment</span>
                    <span className="text-xs font-bold text-white uppercase">{myActiveAppt.serviceName}</span>
                  </div>
                  <div className="w-full h-px bg-dark-800"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Time Allotment</span>
                    <span className="text-xs font-bold text-primary-400 tracking-wider">{myActiveAppt.timeSlot}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-dark-800 rounded-[2rem] flex items-center justify-center border border-dark-700 shadow-inner">
                  <ListOrdered className="w-10 h-10 text-dark-700" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-500 uppercase tracking-tight">No Active Signal</h3>
                   <p className="text-xs text-slate-600 font-medium mt-1">Initialize a booking to see your real-time position</p>
                </div>
                <Link to="/customer/book" className="btn-secondary w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest group">
                   Launch Reservation <ChevronRight className="w-4 h-4 inline-block group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-8 glass-card border-dark-800 bg-gradient-to-r from-dark-900 to-dark-800/20 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 flex-shrink-0">
               <Clock className="w-7 h-7" />
            </div>
            <div>
               <h4 className="text-white font-bold text-lg">Real-Time Synchronization</h4>
               <p className="text-sm text-slate-500">This view refreshes automatically. No manual reload required.</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{activeAppointments.length} Clients in Network</span>
         </div>
      </div>
    </div>
  );
}

// Added Monitor icon missing from imports
function Monitor(props) {
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
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}
