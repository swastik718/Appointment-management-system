import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Loader2, Users, ArrowRight, CheckCircle2, Flame, FastForward, RotateCcw, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, startOfToday } from 'date-fns';

export default function ManageQueue() {
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const todayDate = format(startOfToday(), 'yyyy-MM-dd');
  const queueId = `queue_${todayDate}`;

  useEffect(() => {
    // 1. Listen to today's pending/in-progress appointments
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
      
      // Sort in-memory to avoid mandatory composite index
      appts.sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));

      setActiveAppointments(appts);
      setLoading(false);
    }, (error) => {
      console.error("Queue appts error:", error);
      toast.error("Failed to load today's queue");
      setLoading(false);
    });

    // 2. Listen to or create today's queue state
    const unsubscribeQueue = onSnapshot(doc(db, 'queues', queueId), async (docSnap) => {
      if (docSnap.exists()) {
        setQueueState(docSnap.data());
      } else {
        try {
          // Initialize today's queue document if it doesn't exist
          await setDoc(doc(db, 'queues', queueId), {
            id: queueId,
            date: todayDate,
            currentServingNumber: 0,
            lastIssuedNumber: 0,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error("Error creating queue doc", e);
        }
      }
    });

    return () => {
      unsubscribeAppts();
      unsubscribeQueue();
    };
  }, [queueId, todayDate]);

  const updateQueueStatus = async (targetAppt, currentApptId, newStatus) => {
    try {
      // 1. Mark current as Completed/Cancelled if provided
      if (currentApptId) {
        await updateDoc(doc(db, 'appointments', currentApptId), {
          status: newStatus === 'In Progress' ? 'Completed' : 'Cancelled',
          updatedAt: new Date().toISOString()
        });
      }

      if (targetAppt) {
        // 2. Mark target as In Progress
        await updateDoc(doc(db, 'appointments', targetAppt.id), {
          status: 'In Progress',
          updatedAt: new Date().toISOString()
        });

        // 3. Update Global Queue State
        await updateDoc(doc(db, 'queues', queueId), {
          currentServingNumber: targetAppt.queueNumber,
          updatedAt: new Date().toISOString()
        });

        toast.success(`Now serving ticket #${targetAppt.queueNumber}`);
      } else {
        // Just clearing current
        await updateDoc(doc(db, 'queues', queueId), {
          currentServingNumber: 0,
          updatedAt: new Date().toISOString()
        });
        toast('Queue is empty', { icon: '🙌' });
      }
    } catch (error) {
      toast.error('Failed to update queue flow');
      console.error(error);
    }
  };

  const handleResetQueue = async () => {
    if (window.confirm("Are you sure you want to reset today's queue? This will return the serving number to 0.")) {
      try {
        await updateDoc(doc(db, 'queues', queueId), {
          currentServingNumber: 0,
          updatedAt: new Date().toISOString()
        });
        toast.success('Queue reset successfully');
      } catch (e) {
        toast.error('Reset failed');
      }
    }
  };

  const currentServing = activeAppointments.find(a => a.status === 'In Progress');
  const waitingList = activeAppointments.filter(a => a.status === 'Booked');

  return (
    <div className="space-y-6 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <Monitor className="w-8 h-8 text-primary-500" />
             Live Queue Control
          </h1>
          <p className="text-slate-400 mt-1">Real-time management for today's {todayDate}</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleResetQueue}
             className="p-3 bg-dark-800 text-slate-400 hover:text-rose-400 border border-dark-700 rounded-xl transition-all"
             title="Reset Counter"
           >
             <RotateCcw className="w-5 h-5" />
           </button>
           <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Control Card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass-card p-10 relative overflow-hidden flex flex-col items-center text-center border-t-8 border-t-primary-500 shadow-2xl shadow-primary-500/10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="space-y-1 mb-8">
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Now Serving</p>
                <div className="flex items-baseline justify-center gap-2">
                   <span className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                     {currentServing ? `#${currentServing.queueNumber}` : '--'}
                   </span>
                </div>
              </div>

              {currentServing ? (
                <div className="w-full space-y-6">
                  <div className="bg-dark-800/80 border border-dark-700 rounded-2xl p-5 mb-8">
                    <h3 className="text-xl font-bold text-white truncate">{currentServing.customerName}</h3>
                    <p className="text-primary-400 font-bold text-sm mt-1">{currentServing.serviceName}</p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <Clock className="w-3 h-3" /> {currentServing.timeSlot}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateQueueStatus(waitingList[0] || null, currentServing.id, 'Completed')}
                      className="btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateQueueStatus(waitingList[0] || null, currentServing.id, 'Cancelled')}
                      className="bg-dark-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-dark-700 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all"
                    >
                      Skip <FastForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <p className="text-slate-500 font-medium mb-8">Waiting for first client...</p>
                  <button 
                    onClick={() => updateQueueStatus(waitingList[0] || null, null, 'In Progress')}
                    disabled={waitingList.length === 0}
                    className="btn-primary w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-xl shadow-primary-500/20 disabled:opacity-30 disabled:grayscale transition-all"
                  >
                    Start Servicing <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            <div className="glass-card p-8 bg-gradient-to-br from-dark-800 to-dark-900 border-dark-700">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" /> Pulse Report
              </h3>
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <p className="text-3xl font-black text-white">{waitingList.length}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Waiting Now</p>
                 </div>
                 <div className="text-right">
                    <p className="text-3xl font-black text-primary-400">#{queueState?.lastIssuedNumber || 0}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Last Issued</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Waiting List Sidebar */}
          <div className="lg:col-span-2 glass-card p-0 flex flex-col border-dark-700 shadow-2xl overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-dark-700 bg-dark-800/40 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-fuchsia-500" /> 
                Waiting Stream
              </h3>
              <span className="bg-dark-900 text-slate-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-dark-700 uppercase">
                {waitingList.length} Clients
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-dark-900/20">
              {waitingList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mb-4 opacity-50">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <p className="font-bold uppercase tracking-widest text-[10px]">Queue Clearance High</p>
                  <p className="text-sm mt-2">All customers have been served.</p>
                </div>
              ) : (
                waitingList.map((appt, idx) => (
                  <div key={appt.id} className="p-5 rounded-2xl border border-dark-700 bg-dark-800 group hover:border-primary-500/30 hover:bg-dark-700/50 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center font-black text-2xl text-primary-400 shadow-inner group-hover:bg-primary-500/10 group-hover:border-primary-500/20 transition-all">
                        {appt.queueNumber}
                      </div>
                      <div>
                        <h4 className="text-white font-bold group-hover:text-primary-400 transition-colors">{appt.customerName}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium italic">
                          <span>{appt.serviceName}</span>
                          <span className="w-1 h-1 rounded-full bg-dark-600"></span>
                          <span className="text-slate-400">{appt.timeSlot}</span>
                        </div>
                      </div>
                    </div>
                    
                    {idx === 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">Next Up</span>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Immediate</p>
                      </div>
                    ) : (
                      <div className="text-right">
                         <p className="text-xs font-bold text-slate-500">Wait: ~{idx * 15}m</p>
                         <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Estimated</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
