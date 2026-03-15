import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Admin authorized successfully!');
      navigate('/admin');
    } catch (error) {
      toast.error('Invalid credentials or unauthorized access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Admin specific background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.05)_0%,transparent_50%)]"></div>
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.05)_0%,transparent_50%)]"></div>
      
      <div className="w-full max-w-md z-10">
        <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to general login</span>
        </Link>

        <div className="glass-card p-10 border-t-4 border-t-emerald-500 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="w-24 h-24 text-emerald-500" />
           </div>

           <div className="text-center mb-10 relative">
             <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
               <ShieldCheck className="w-10 h-10 text-emerald-400" />
             </div>
             <h2 className="text-3xl font-black text-white tracking-tight">Admin Portal</h2>
             <p className="text-slate-400 mt-2">Authorized Personnel Only</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
             <div>
               <label className="block text-sm font-semibold text-slate-300 mb-2">Admin Email</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Mail className="h-5 w-5 text-slate-500" />
                 </div>
                 <input
                   type="email"
                   required
                   className="input-field pl-11 bg-slate-900/50 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                   placeholder="admin@business.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
               </div>
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-300 mb-2">Security Key</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Lock className="h-5 w-5 text-slate-500" />
                 </div>
                 <input
                   type="password"
                   required
                   className="input-field pl-11 bg-slate-900/50 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                 />
               </div>
             </div>

             <button
               type="submit"
               disabled={loading}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
             >
               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                 <>
                   <ShieldCheck className="w-5 h-5" />
                   Verify Identity
                 </>
               )}
             </button>
           </form>
        </div>

        <p className="text-center text-slate-500 mt-8 text-xs uppercase tracking-widest font-medium"> Secure Administrator access node </p>
      </div>
    </div>
  );
}
