import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Calendar as CalendarIcon, Clock, ChevronRight, CheckCircle2, Scissors, ChevronLeft, MapPin } from 'lucide-react';
import { format, parseISO, startOfToday } from 'date-fns';

export default function BookAppointment() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const todayStr = format(startOfToday(), 'yyyy-MM-dd');

  useEffect(() => {
    // Fetch active services
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'services'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const svcs = [];
        snapshot.forEach((doc) => svcs.push({ id: doc.id, ...doc.data() }));
        setServices(svcs);
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (step === 2 && selectedService) {
      // Fetch available dates from timeslots (future or today)
      const fetchDates = async () => {
        try {
          setLoading(true);
          const q = query(collection(db, 'timeslots'), where('isActive', '==', true));
          const snapshot = await getDocs(q);
          const uniqueDates = new Set();
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.currentBookings < data.maxBookings) {
              uniqueDates.add(data.date);
            }
          });
          setAvailableDates(Array.from(uniqueDates).sort());
        } catch (error) {
          toast.error('Failed to load availability');
        } finally {
          setLoading(false);
        }
      };
      fetchDates();
    }
  }, [step, selectedService, todayStr]);

  useEffect(() => {
    if (selectedDate) {
      // Fetch slots for selected date
      const fetchSlots = async () => {
        try {
          setLoading(true);
          const q = query(
            collection(db, 'timeslots'), 
            where('isActive', '==', true), 
            where('date', '==', selectedDate)
          );
          const snapshot = await getDocs(q);
          const slots = [];
          snapshot.forEach((doc) => {
             const data = doc.data();
             if (data.currentBookings < data.maxBookings) {
                slots.push({ id: doc.id, ...data });
             }
          });
          slots.sort((a,b) => a.startTime.localeCompare(b.startTime));
          setAvailableSlots(slots);
        } catch (error) {
          toast.error('Failed to load time slots');
        } finally {
          setLoading(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedService || !selectedSlot || !currentUser) return;

    try {
      setBooking(true);
      const slotRef = doc(db, 'timeslots', selectedSlot.id);
      const queueRef = doc(db, 'queues', `queue_${selectedSlot.date}`);
      
      // TRANSACTIONAL BOOKING: Locks slot and increments queue number atomically
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        const queueDoc = await transaction.get(queueRef);

        if (!slotDoc.exists()) throw new Error("Slot documentation has been modified or removed.");
        
        const slotData = slotDoc.data();
        if (slotData.currentBookings >= slotData.maxBookings) {
           throw new Error("Sorry, this slot just reached capacity.");
        }

        // Determine queue number from the centralized queue doc
        let nextTicket = 1;
        if (queueDoc.exists()) {
          nextTicket = (queueDoc.data().lastIssuedNumber || 0) + 1;
        }

        // 1. Create Appointment
        const newApptRef = doc(collection(db, 'appointments'));
        transaction.set(newApptRef, {
          id: newApptRef.id,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          customerName: currentUser.displayName || 'Anonymous Client',
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          date: selectedSlot.date,
          timeSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
          slotId: selectedSlot.id,
          status: 'Booked',
          queueNumber: nextTicket,
          createdAt: new Date().toISOString()
        });

        // 2. Update Slot Capacity
        transaction.update(slotRef, {
          currentBookings: slotData.currentBookings + 1
        });

        // 3. Update Global Queue State (or initialize it)
        if (queueDoc.exists()) {
          transaction.update(queueRef, {
            lastIssuedNumber: nextTicket,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(queueRef, {
            id: queueRef.id,
            date: selectedSlot.date,
            currentServingNumber: 0,
            lastIssuedNumber: nextTicket,
            updatedAt: new Date().toISOString()
          });
        }
      });

      toast.success('Your session is secured! Redirecting...', { duration: 4000 });
      navigate('/customer/history');
      
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(error.message || 'Communication error. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white px-1 tracking-tighter">Reservation Hub</h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
             <MapPin className="w-4 h-4 text-primary-500" />
             Select your preferred service and time window
          </p>
        </div>
        <div className="bg-dark-800/80 border border-dark-700 rounded-2xl px-5 py-3 flex items-center gap-4">
           <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stage</p>
              <p className="text-sm font-bold text-white">{step} of 3</p>
           </div>
           <div className="w-px h-8 bg-dark-700"></div>
           <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</p>
              <p className="text-sm font-bold text-primary-400">{Math.round((step / 3) * 100)}%</p>
           </div>
        </div>
      </div>

      {/* Modern Progress Line */}
      <div className="relative pt-4 px-12 pb-12">
        <div className="absolute top-[34px] left-12 right-12 h-1.5 bg-dark-800 rounded-full overflow-hidden">
           <div 
             className="h-full bg-gradient-to-r from-primary-500 to-fuchsia-500 transition-all duration-700 ease-out"
             style={{ width: `${((step - 1) / 2) * 100}%` }}
           ></div>
        </div>
        <div className="relative flex justify-between">
           {[1, 2, 3].map((s) => (
             <div key={s} className="flex flex-col items-center">
               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all duration-500 z-10 border-4 transform ${
                 step >= s ? 'bg-primary-500 border-dark-950 text-white scale-110 shadow-xl shadow-primary-500/20' : 'bg-dark-800 border-dark-900 text-slate-600'
               }`}>
                 {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
               </div>
               <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-3 absolute -bottom-2 ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                 {s === 1 ? 'Expertise' : s === 2 ? 'Schedule' : 'Validate'}
               </span>
             </div>
           ))}
        </div>
      </div>

      <div className="glass-card min-h-[500px] border-dark-700 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-1000" style={{ transform: `translate(${step * 20}%, -50%)` }}></div>
        
        <div className="flex-1 p-8 md:p-12">
          {/* Step 1: Services Selection */}
          {step === 1 && (
            <div className="animate-fade-in space-y-10">
              <div className="max-w-xl">
                 <h2 className="text-3xl font-black text-white tracking-tight mb-3">Choose a specialized service</h2>
                 <p className="text-slate-400 font-medium">Our certified professionals are ready to assist you. Select a category below to view availability.</p>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Syncing Catalog...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/50 rounded-3xl border border-dashed border-dark-700">
                   <Scissors className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Registry is currently empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {services.map(svc => (
                    <button 
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); setStep(2); }}
                      className="group p-6 bg-dark-800/40 border border-dark-700 hover:border-primary-500/50 rounded-3xl flex items-center gap-6 text-left transition-all hover:scale-[1.01] hover:bg-dark-800 active:scale-[0.98] shadow-lg shadow-black/20"
                    >
                      <div className="w-24 h-24 rounded-2xl bg-dark-900 overflow-hidden flex-shrink-0 border border-dark-700 group-hover:border-primary-500/30 transition-all shadow-inner">
                         {svc.imageUrl ? (
                           <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-dark-700"><Scissors className="w-10 h-10" /></div>
                         )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <h3 className="font-black text-xl text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{svc.name}</h3>
                           <span className="text-lg font-black text-white bg-primary-500/10 px-3 py-1 rounded-xl group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg">${svc.price}</span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-snug">{svc.description}</p>
                        <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-primary-500 transition-colors">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {svc.durationMin} MINS</span>
                          <span className="w-1 h-1 rounded-full bg-dark-600"></span>
                          <span>Certified Service</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Slot Selection */}
          {step === 2 && (
            <div className="animate-fade-in space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-dark-800">
                <div>
                   <h2 className="text-3xl font-black text-white tracking-tight">Access Availability</h2>
                   <p className="text-slate-400 font-medium flex items-center gap-2 mt-1 italic">
                      Booked Segment: <span className="text-primary-400 font-black not-italic">{selectedService?.name}</span>
                   </p>
                </div>
                <button onClick={() => {setStep(1); setSelectedDate(''); setSelectedSlot(null);}} className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                   <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Modify Service
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary-500 animate-spin" /></div>
              ) : availableDates.length === 0 ? (
                <div className="text-center py-24 bg-dark-900/40 rounded-3xl border-2 border-dashed border-dark-800">
                  <CalendarIcon className="w-16 h-16 text-dark-800 mx-auto mb-4" />
                  <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-xs">No slots synchronized</p>
                  <p className="text-slate-500 mt-2">Check back soon for upcoming schedule releases.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Dates List */}
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-1">
                       <div className="w-1 h-1 rounded-full bg-primary-500"></div> SELECT DATE
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                      {availableDates.map(dateStr => (
                        <button
                          key={dateStr}
                          onClick={() => {setSelectedDate(dateStr); setSelectedSlot(null);}}
                          className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center justify-between group transform ${
                            selectedDate === dateStr 
                            ? 'border-primary-500 bg-primary-500/[0.03] text-white shadow-xl shadow-primary-500/5' 
                            : 'border-dark-800 bg-dark-900/50 text-slate-500 hover:border-dark-600'
                          }`}
                        >
                          <div className="flex items-center gap-5">
                             <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center ${selectedDate === dateStr ? 'bg-primary-500 text-white' : 'bg-dark-800 text-slate-600'}`}>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{format(parseISO(dateStr), 'MMM')}</span>
                                <span className="text-lg font-black leading-none">{format(parseISO(dateStr), 'd')}</span>
                             </div>
                             <div>
                                <h4 className={`font-black uppercase tracking-tighter ${selectedDate === dateStr ? 'text-white' : 'group-hover:text-slate-300'}`}>
                                   {format(parseISO(dateStr), 'EEEE')}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Availability Confirmed</p>
                             </div>
                          </div>
                          {selectedDate === dateStr && <ChevronRight className="w-6 h-6 text-primary-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slots Grid */}
                  <div className="lg:col-span-7 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-1">
                       <div className="w-1 h-1 rounded-full bg-fuchsia-500"></div> SELECT TIMEFRAME
                    </h3>
                    
                    {selectedDate ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in-up">
                        {availableSlots.length > 0 ? (
                           availableSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-6 rounded-3xl border-2 text-center transition-all group relative overflow-hidden flex flex-col items-center ${
                                selectedSlot?.id === slot.id 
                                ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white shadow-2xl' 
                                : 'border-dark-800 bg-dark-800/40 text-slate-500 hover:border-dark-700 hover:text-white'
                              }`}
                            >
                              {selectedSlot?.id === slot.id && <div className="absolute top-0 right-0 w-8 h-8 bg-fuchsia-500 flex items-center justify-center translate-x-1/2 -translate-y-1/2 rotate-45 shadow-lg shadow-fuchsia-500/50"></div>}
                              <Clock className={`w-6 h-6 mb-3 ${selectedSlot?.id === slot.id ? 'text-fuchsia-400' : 'text-slate-600'} group-hover:text-fuchsia-400 transition-colors`} />
                              <div className="text-xl font-black tracking-tighter mb-0.5">
                                 {slot.startTime}
                              </div>
                              <div className="flex flex-col gap-1 items-center">
                                 <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Until {slot.endTime}</span>
                                 <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                                   (slot.maxBookings - slot.currentBookings) <= 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                 }`}>
                                    {slot.maxBookings - slot.currentBookings} Spot(s) Left
                                 </span>
                              </div>
                            </button>
                          ))
                        ) : (
                           <div className="col-span-full py-20 text-center">
                              <Loader2 className="w-8 h-8 text-dark-800 animate-spin mx-auto mb-3" />
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Accessing Node Slots...</p>
                           </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-dark-800 bg-dark-900/30">
                         <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-slate-700" />
                         </div>
                         <p className="text-xs font-bold text-slate-700 uppercase tracking-widest leading-loose">Awaiting date selection to <br/> populate available time slots</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSlot && (
                <div className="mt-12 pt-10 border-t border-dark-800 flex justify-end">
                  <button 
                    onClick={() => setStep(3)}
                    className="btn-primary group py-4 px-12 rounded-3xl flex items-center gap-3 font-black text-lg transition-all hover:scale-[1.05] active:scale-[0.98] shadow-2xl shadow-primary-500/30"
                  >
                    Proceed to Validation <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation Summary */}
          {step === 3 && selectedService && selectedSlot && (
            <div className="animate-fade-in space-y-12">
              <div className="text-center max-w-xl mx-auto mb-10">
                 <h2 className="text-3xl font-black text-white tracking-tight mb-3">Final Security Check</h2>
                 <p className="text-slate-500 font-medium">Please review your booking blueprint. Once confirmed, your slot will be hard-locked into the system.</p>
              </div>
              
              <div className="max-w-xl mx-auto bg-slate-900/50 rounded-[40px] p-10 border-2 border-dark-700 shadow-2xl relative">
                 <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary-500 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-[-6deg]">
                    <CheckCircle2 className="w-10 h-10" />
                 </div>
                 
                 <div className="space-y-8 mt-4">
                   <div className="flex items-center gap-6 pb-6 border-b border-dark-700/50">
                      <div className="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center text-primary-400 overflow-hidden border border-dark-700">
                         {selectedService.imageUrl ? <img src={selectedService.imageUrl} className="w-full h-full object-cover" /> : <Scissors className="w-8 h-8" />}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Selected Expertise</p>
                         <h3 className="text-2xl font-black text-white tracking-tight">{selectedService.name}</h3>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                     <div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Day Window</span>
                       <span className="text-lg font-bold text-white block">{format(parseISO(selectedSlot.date), 'EEEE')}</span>
                       <span className="text-xs text-slate-400 mt-1 font-medium">{format(parseISO(selectedSlot.date), 'MMMM d, yyyy')}</span>
                     </div>
                     <div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Time Segment</span>
                       <span className="text-lg font-bold text-primary-400 block">{selectedSlot.startTime}</span>
                       <span className="text-[xs] text-slate-400 mt-1 font-medium uppercase tracking-widest">End: {selectedSlot.endTime}</span>
                     </div>
                   </div>

                   <div className="bg-dark-900/80 p-6 rounded-3xl border border-dark-700 space-y-4">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Processing Fee</span>
                        <span className="text-white">$0.00</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Waitlist Status</span>
                        <span className="text-emerald-400">Live Ticket Included</span>
                      </div>
                      <div className="h-px bg-dark-800"></div>
                      <div className="flex justify-between items-end">
                        <span className="text-slate-300 font-bold uppercase tracking-widest text-xs">Total Commitment</span>
                        <span className="text-4xl font-black text-fuchsia-400 tracking-tighter">${selectedService.price}</span>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-12 bg-dark-800/20 p-8 rounded-3xl">
                 <button 
                   onClick={() => setStep(2)}
                   disabled={booking}
                   className="w-full md:w-auto px-10 py-4 bg-transparent border-2 border-dark-700 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-white hover:border-slate-500 transition-all rounded-2xl"
                 >
                   Return to Schedule
                 </button>
                 <button 
                   onClick={handleBook}
                   disabled={booking}
                   className="w-full md:w-auto px-16 py-5 btn-primary rounded-3xl flex items-center justify-center gap-4 font-black text-xl shadow-2xl shadow-primary-500/30 group"
                 >
                   {booking ? <Loader2 className="w-7 h-7 animate-spin"/> : (
                     <>
                        Initialize Booking
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                     </>
                   )}
                 </button>
              </div>
              
              <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] max-w-sm mx-auto">
                 Secure transactional node - All bookings are final upon system validation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
