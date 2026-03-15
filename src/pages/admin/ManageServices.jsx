import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon, DollarSign, Clock, Check, X, Scissors } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const initialFormState = {
    name: '',
    description: '',
    durationMin: 30,
    price: 0,
    imageUrl: '',
    isActive: true
  };
  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = [];
      snapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() });
      });
      setServices(servicesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching services:", error);
      toast.error('Failed to load services');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (service = null) => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        durationMin: service.durationMin,
        price: service.price,
        imageUrl: service.imageUrl || '',
        isActive: service.isActive
      });
      setEditId(service.id);
    } else {
      setFormData(initialFormState);
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const serviceData = {
        ...formData,
        price: Number(formData.price),
        durationMin: Number(formData.durationMin),
        updatedAt: new Date().toISOString()
      };

      if (editId) {
        await updateDoc(doc(db, 'services', editId), serviceData);
        toast.success('Service updated successfully');
      } else {
        serviceData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'services'), serviceData);
        toast.success('Service created successfully');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteDoc(doc(db, 'services', id));
        toast.success('Service deleted');
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };

  const toggleServiceStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'services', id), { isActive: !currentStatus });
      toast.success(currentStatus ? 'Service deactivated' : 'Service activated');
    } catch (error) {
       toast.error('Failed to update status');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
             <Scissors className="w-8 h-8 text-primary-500" />
             Service Management
          </h1>
          <p className="text-slate-400 mt-1">Define availability and pricing for your business.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-lg shadow-primary-500/20">
          <Plus className="w-5 h-5" /> Add New Service
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-2 border-dark-600 bg-dark-900/50">
          <div className="w-20 h-20 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700">
            <ImageIcon className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Services Configured</h3>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">Upload and define the services you offer to make them available for customer booking.</p>
          <button onClick={() => handleOpenModal()} className="btn-primary px-8">Define First Service</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className={`glass-card overflow-hidden group hover:border-primary-500/50 transition-all duration-300 flex flex-col ${!service.isActive ? 'opacity-70' : ''}`}>
              <div className="h-48 bg-dark-800 relative overflow-hidden">
                {service.imageUrl ? (
                 <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900 border-b border-dark-700">
                   <ImageIcon className="w-12 h-12 text-slate-600" />
                 </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                   {!service.isActive && (
                     <div className="bg-rose-500/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">Inactive</div>
                   )}
                   <div className="bg-dark-900/80 backdrop-blur-sm text-primary-400 text-sm font-bold px-3 py-1 rounded-full shadow-lg border border-dark-700">
                     ${service.price}
                   </div>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-white tracking-tight">{service.name}</h3>
                </div>
                
                <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed flex-1">
                  {service.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Duration</p>
                      <div className="flex items-center gap-2 text-slate-200">
                         <Clock className="w-4 h-4 text-primary-500" />
                         <span className="font-medium text-sm">{service.durationMin} mins</span>
                      </div>
                   </div>
                   <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Revenue</p>
                      <div className="flex items-center gap-2 text-slate-200">
                         <DollarSign className="w-4 h-4 text-emerald-500" />
                         <span className="font-medium text-sm">${service.price}</span>
                      </div>
                   </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-dark-700/50">
                   <button 
                      onClick={() => toggleServiceStatus(service.id, service.isActive)}
                      className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                        service.isActive ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'
                      }`}
                   >
                     {service.isActive ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                     {service.isActive ? 'Deactivate' : 'Activate'}
                   </button>

                   <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(service)} 
                      className="p-2.5 text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-xl transition-all"
                      title="Edit Service"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)} 
                      className="p-2.5 text-slate-400 hover:text-rose-400 bg-dark-800 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden animate-slide-up border-dark-700 shadow-2xl relative">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${editId ? 'from-amber-500 to-primary-500' : 'from-primary-500 to-fuchsia-500'}`}></div>
            
            <div className="p-8 border-b border-dark-700 flex justify-between items-center bg-dark-800/30">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{editId ? 'Edit Service' : 'Add New Service'}</h2>
                <p className="text-sm text-slate-400 mt-1">Configure your professional offering</p>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-dark-700 transition-all font-bold text-xl"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Service Name</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500" 
                    placeholder="e.g. Executive Haircut"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Description</label>
                  <textarea 
                    required 
                    rows="3" 
                    className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500 resize-none" 
                    placeholder="Describe what's included in this service..."
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Duration (mins)</label>
                    <div className="relative">
                      <input 
                        required 
                        type="number" 
                        min="5" 
                        step="5" 
                        className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500 pl-4" 
                        value={formData.durationMin} 
                        onChange={e => setFormData({...formData, durationMin: e.target.value})} 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">Min</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Price ($)</label>
                    <div className="relative">
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500 pl-8" 
                        value={formData.price} 
                        onChange={e => setFormData({...formData, price: e.target.value})} 
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Image URL</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      className="input-field bg-dark-800/50 border-dark-600 focus:border-primary-500 pl-10" 
                      placeholder="https://images.unsplash.com/..." 
                      value={formData.imageUrl} 
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                    />
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 px-1">Unsplash URLs are recommended for high quality visuals.</p>
                </div>

                <div className="flex items-center gap-3 pt-2 bg-dark-800/30 p-4 rounded-xl border border-dark-700">
                  <div className="relative flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="isActiveSvc" 
                      className="peer sr-only"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </div>
                  <label htmlFor="isActiveSvc" className="text-sm font-medium text-slate-300 cursor-pointer">Active & Visible to customers</label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 btn-secondary py-3 font-bold">
                  Delete Draft
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary-500/10"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {editId ? 'Store Service Changes' : 'Publish Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
