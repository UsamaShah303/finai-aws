import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Activity, Clock, CheckCircle2, AlertCircle, BarChart3, Zap, Info, RefreshCw, Search, Loader2 } from 'lucide-react';
import axios from 'axios';

const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const APICard: React.FC<{ api: any, onRefresh: () => void }> = ({ api, onRefresh }) => {
  const isHealthy = api.status === 'Healthy';
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-white/5 rounded-[40px] p-8 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between group h-fit">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{api.name}</h3>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full animate-pulse ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
               <span className={`text-[10px] font-black uppercase tracking-widest ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>{api.status}</span>
            </div>
          </div>
        </div>
        <button onClick={onRefresh} className="p-2.5 rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-8">
         <div className="p-4 bg-gray-50/50 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Latency</span>
            <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">{api.latency}</span>
         </div>
         <div className="p-4 bg-gray-50/50 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Uptime</span>
            <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">{api.uptime}</span>
         </div>
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
         <div className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4" /><span className="text-xs font-bold tracking-tight">Last Check: {api.lastCheck}</span></div>
      </div>
    </motion.div>
  );
};

export const ExternalAPIs = () => {
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/external-apis', authHeader());
      setApis(res.data.apis || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApis(); }, []);

  return (
    <div className="flex-1 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">External Connectivity</h1>
          <p className="text-gray-500 font-medium tracking-tight">Monitoring third-party data providers from backend</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchApis} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ping APIs
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {loading && apis.length === 0 ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : (
            apis.map((api, i) => <APICard key={i} api={api} onRefresh={fetchApis} />)
          )}
        </div>
      </div>
    </div>
  );
};
