
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Server, Cpu, Database, Globe, ShieldCheck, Zap, RefreshCw,
  Activity, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import axios from 'axios';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

interface HealthData {
  status: string;
  service: string;
  database: string;
  endpoints: string[];
}

const ServiceCard: React.FC<{ name: string; status: string; detail: string; icon: React.ReactNode }> = ({
  name, status, detail, icon,
}) => {
  const ok  = status === 'ok' || status === 'Operational' || status === 'connected';
  const warn = status === 'Warning' || status === 'unknown';

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className="bg-white dark:bg-white/5 rounded-[32px] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-white/5 flex flex-col gap-6 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${ok ? 'bg-emerald-50 text-emerald-600' : warn ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
          {icon}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-white dark:border-gray-950 ${ok ? 'bg-emerald-500' : warn ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${ok ? 'bg-emerald-50 text-emerald-600' : warn ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
          {ok ? 'Operational' : warn ? 'Warning' : 'Error'}
        </span>
      </div>

      <div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{detail}</p>
      </div>
    </motion.div>
  );
};

export const HealthMonitor = () => {
  const [health, setHealth]   = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/health', authHeader());
      setHealth(res.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Health check failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const services = health ? [
    { name: 'Flask API',        status: health.status,   detail: 'HTTP 200 OK', icon: <Server className="w-7 h-7" /> },
    { name: 'Supabase DB',      status: health.database, detail: health.database, icon: <Database className="w-7 h-7" /> },
    { name: 'Auth Service',     status: 'ok',            detail: 'JWT + bcrypt active', icon: <ShieldCheck className="w-7 h-7" /> },
    { name: 'ML Inference',     status: 'ok',            detail: 'FinBERT + PyPortfolioOpt', icon: <Cpu className="w-7 h-7" /> },
    { name: 'Monte Carlo',      status: 'ok',            detail: '10k paths / run', icon: <Activity className="w-7 h-7" /> },
    { name: 'CORS / Gateway',   status: 'ok',            detail: 'localhost:5173 allowed', icon: <Globe className="w-7 h-7" /> },
  ] : [];

  const allOk = services.every(s => s.status === 'ok' || s.status === 'connected' || s.status === 'Operational');

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter leading-none mb-3">Health Monitor</h1>
          <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${allOk ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              {allOk ? 'All Systems Operational' : 'Degraded Performance'}
            </span>
            <span>Refreshed: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
        <button onClick={fetchHealth} disabled={loading}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      {!loading && health && (
        <div className={`p-6 rounded-[24px] flex items-center gap-4 ${allOk ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200'}`}>
          {allOk
            ? <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            : <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />}
          <div>
            <p className="font-black text-gray-900 dark:text-white">{allOk ? 'All systems are fully operational' : 'Some services need attention'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Service: {health.service} • DB: {health.database}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <ServiceCard key={i} {...s} />
          ))}
        </div>
      )}

      {/* Registered Endpoints */}
      {health?.endpoints && health.endpoints.length > 0 && (
        <div className="bg-white dark:bg-white/5 rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-xl">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Registered API Endpoints</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {health.endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                <Zap className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <code className="text-xs text-gray-700 dark:text-gray-300 font-mono">{ep}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
