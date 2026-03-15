import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Trash2, Loader2, Calendar as CalendarIcon, Clock, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO, isBefore, isEqual } from 'date-fns';

export default function ManageSchedule() {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const initialFormState = {
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    maxBookings: 1,
    isActive: true
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const q = query(collection(db, 'timeslots'));
    
    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slotsData = [];
      snapshot.forEach((doc) => {
        slotsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort in-memory to avoid mandatory composite index requirements
      slotsData.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      setTimeSlots(slotsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching slots:", error);
      toast.error('Failed to load schedule');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (slot = null) => {
    if (slot) {
      setEditingId(slot.id);
      setFormData({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxBookings: slot.maxBookings,
        isActive: slot.isActive
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const checkOverlap = (newSlot) => {
    const daySlots = timeSlots.filter(s => s.date === newSlot.date && s.id !== editingId);
    
    for (const slot of daySlots) {
      // Logic: (StartTime1 < EndTime2) AND (StartTime2 < EndTime1)
      if (newSlot.startTime < slot.endTime && slot.startTime < newSlot.endTime) {
        return true;
      }
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Basic validation
      if (formData.startTime >= formData.endTime) {
         toast.error("End time must be after start time");
         setSaving(false);
         return;
      }

      // Overlap check
      if (checkOverlap(formData)) {
        toast.error("This slot overlaps with an existing one on the same day");
        setSaving(false);
        return;
      }
      
      const payload = {
        ...formData,
        maxBookings: Number(formData.maxBookings),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'timeslots', editingId), payload);
        toast.success('Time slot updated');
      } else {
        await addDoc(collection(db, 'timeslots'), {
          ...payload,
          currentBookings: 0,
          createdAt: new Date().toISOString()
        });
        toast.success('Time slot added successfully');
      }
      
      handleCloseModal();
    } catch (error) {
      console.error("Save error:", error);
      toast.error('Failed to save time slot');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this time slot? Existing bookings will not be automatically canceled.')) {
      try {
        await deleteDoc(doc(db, 'timeslots', id));
        toast.success('Time slot deleted');
      } catch (error) {
        toast.error('Failed to delete time slot');
      }
    }
  };

  const toggleSlotStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'timeslots', id), { isActive: !currentStatus });
      toast.success(currentStatus ? 'Slot disabled' : 'Slot enabled');
    } catch (error) {
       toast.error('Failed to update status');
    }
  }

  // Group by date
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
             <CalendarIcon className="w-8 h-8 text-primary-500" />
             Schedule Management
          </h1>
          <p className="text-slate-400 mt-1">Configure your availability and time slots.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-lg shadow-primary-500/20">
          <Plus className="w-5 h-5" /> Create New Slot
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <div className="absolute inset-0 bg-primary-500/10 blur-xl rounded-full"></div>
          </div>
        </div>
      ) : Object.keys(groupedSlots).length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-2 border-dark-600 bg-dark-900/50">
          <div className="w-20 h-20 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700">
            <CalendarIcon className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Schedule Configured</h3>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">Your customers need slots to book appointments. Start by adding your first availability.</p>
          <button onClick={() => handleOpenModal()} className="btn-primary px-8">Add Initial Slot</button>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.keys(groupedSlots).sort().map(date => (
            <div key={date} className="animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary-500/10 px-4 py-2 rounded-xl border border-primary-500/20">
                  <h2 className="text-lg font-bold text-primary-400">
                    {format(parseISO(date), 'EEEE, MMMM d')}
                  </h2>
                </div>
                <div className="flex-1 h-px bg-dark-700"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedSlots[date].map(slot => (
                  <div key={slot.id} className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
                    slot.isActive 
                    ? 'bg-dark-800 border-dark-700 hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/5' 
                    : 'bg-dark-900/50 border-dark-800 opacity-60'
                  }`}>
                     <div className="flex justify-between items-start mb-4">
                       <div className={`p-2 rounded-lg ${slot.isActive ? 'bg-primary-500/10 text-primary-400' : 'bg-dark-700 text-slate-500'}`}>
                         <Clock className="w-5 h-5" />
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => handleOpenModal(slot)}
                           className="p-2 text-slate-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                           title="Edit Slot"
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(slot.id)}
                           className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                           title="Delete Slot"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                     
                     <div className="space-y-1">
                        <p className="text-lg font-bold text-white tracking-tight">
                          {slot.startTime} - {slot.endTime}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className={`w-2 h-2 rounded-full ${slot.currentBookings >= slot.maxBookings ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                          {slot.currentBookings} / {slot.maxBookings} Booked
                        </div>
                     </div>

                     <div className="mt-5 flex items-center justify-between pt-4 border-t border-dark-700/50">
                        <button 
                           onClick={() => toggleSlotStatus(slot.id, slot.isActive)}
                           className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                             slot.isActive ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'
                           }`}
                        >
                          {slot.isActive ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          {slot.isActive ? 'Disable' : 'Enable'}
                        </button>
                        
                        {!slot.isActive && <span className="text-[10px] font-black bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded uppercase">Inactive</span>}
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md overflow-hidden animate-slide-up border-dark-700 shadow-2xl relative">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${editingId ? 'from-amber-500 to-primary-500' : 'from-primary-500 to-fuchsia-500'}`}></div>
            
            <div className="p-8 border-b border-dark-700 flex justify-between items-center bg-dark-800/30">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{editingId ? 'Edit Time Slot' : 'Create New Slot'}</h2>
                <p className="text-sm text-slate-400 mt-1">{editingId ? 'Modify existing availability' : 'Define a new booking window'}</p>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-dark-700 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary-400" /> Date
                  </label>
                  <input 
                    required 
                    type="date" 
                    className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Start Time</label>
                    <input 
                      required 
                      type="time" 
                      className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500" 
                      value={formData.startTime} 
                      onChange={e => setFormData({...formData, startTime: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">End Time</label>
                    <input 
                      required 
                      type="time" 
                      className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500" 
                      value={formData.endTime} 
                      onChange={e => setFormData({...formData, endTime: e.target.value})} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Maximum Capacity</label>
                  <div className="relative">
                     <input 
                        required 
                        type="number" 
                        min="1" 
                        className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500 pl-4" 
                        value={formData.maxBookings} 
                        onChange={e => setFormData({...formData, maxBookings: e.target.value})} 
                     />
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">People</div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 px-1">How many parallel appointments are allowed in this specific window?</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 btn-secondary py-3 font-bold">
                  No, Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className={`flex-[2] btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg ${editingId ? 'bg-amber-600 border-amber-500 hover:bg-amber-500 shadow-amber-500/10' : 'shadow-primary-500/10'}`}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {editingId ? 'Update Slot Data' : 'Initialize Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
