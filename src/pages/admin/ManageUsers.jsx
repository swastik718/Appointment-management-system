import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Users, Shield, User, Loader2, Search, Mail, Calendar, Key, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("User sync error:", error);
      toast.error('Failed to sync user database');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleRole = async (userId, currentRole) => {
    if (userId === currentUser.uid) {
      toast.error("Security Override Blocked: Cannot modify primary admin role.");
      return;
    }

    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    const confirmMsg = `Are you sure you want to reassign this node to the [${newRole.toUpperCase()}] protocol?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          role: newRole,
          updatedAt: new Date().toISOString()
        });
        toast.success(`Role reassigned: ${newRole}`);
      } catch (error) {
        toast.error('Role update failed.');
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in text-wrap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
             <Key className="w-9 h-9 text-primary-500" />
             User Directory
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Manage platform access and security protocols.</p>
        </div>

        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary-500 transition-colors" />
           <input
             type="text"
             className="input-field pl-12 bg-dark-800/50 border-dark-700 py-3.5 focus:border-primary-500/50 focus:bg-dark-800 transition-all"
             placeholder="Search by identity or mail..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="glass-card shadow-2xl border-dark-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-dark-900/80 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-dark-700">
                  <th className="px-8 py-5">Identity Node</th>
                  <th className="px-8 py-5">Sync Date</th>
                  <th className="px-8 py-5">Authorization</th>
                  <th className="px-8 py-5 text-right">Directives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                      No records found in active partition.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-primary-500/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                             user.role === 'admin' 
                             ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                             : 'bg-dark-800 border-dark-700 text-slate-500'
                           }`}>
                             {user.role === 'admin' ? <ShieldAlert className="w-7 h-7" /> : <User className="w-7 h-7" />}
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                                <p className="text-slate-100 font-black tracking-tight">{user.displayName || 'Anonymous'}</p>
                                {user.id === currentUser.uid && (
                                   <span className="bg-primary-500/10 text-primary-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-primary-500/20">Self</span>
                                )}
                             </div>
                             <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                               <Mail className="w-3.5 h-3.5 opacity-40" />
                               {user.email}
                             </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm text-slate-400 font-semibold uppercase tracking-tighter">
                           <Calendar className="w-4 h-4 opacity-30" />
                           {user.createdAt ? format(parseISO(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          user.role === 'admin' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                          : 'bg-dark-900 text-slate-600 border-dark-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => toggleRole(user.id, user.role)}
                          className={`btn-secondary py-2.5 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            user.id === currentUser.uid 
                            ? 'opacity-20 grayscale pointer-events-none' 
                            : 'hover:bg-primary-500 hover:text-white hover:border-primary-500 active:scale-95 shadow-xl hover:shadow-primary-500/20 border-dark-700'
                          }`}
                          disabled={user.id === currentUser.uid}
                        >
                          {user.role === 'admin' ? 'Revoke Shield' : 'Elevate Access'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-dark-900/50 border-t border-dark-700 flex items-center justify-between text-[10px] text-slate-600 font-black uppercase tracking-widest">
             <span>Identity Subsystem Status: Live</span>
             <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Encryption Active
             </span>
          </div>
        </div>
      )}
    </div>
  );
}
