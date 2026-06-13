
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle, Search, Terminal, XCircle, AlertTriangle, Info, RefreshCw, Loader2, X
} from 'lucide-react';
import axios from 'axios';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

interface LogEntry {
  id: string;
  severity: string;
  module: string;
  message: string;
  stack_trace?: string;
  created_at: string;
}

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = (log.severity || 'info').toUpperCase();
  const isError = sev === 'ERROR';
  const isWarn  = sev === 'WARN' || sev === 'WARNING';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="py-5 px-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-b border-gray-100 dark:border-white/5 last:border-0 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="grid grid-cols-12 items-center gap-4">
        {/* Severity */}
        <div className="col-span-2 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isError ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${isError ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-emerald-600'}`}>
            {sev}
          </span>
        </div>

        {/* Timestamp */}
        <div className="col-span-2">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">
            {new Date(log.created_at).toLocaleString()}
          </span>
        </div>

        {/* Module */}
        <div className="col-span-2">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md uppercase tracking-widest">
            {log.module || 'system'}
          </span>
        </div>

        {/* Message */}
        <div className="col-span-6">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{log.message}</p>
        </div>
      </div>

      {/* Expanded stack trace */}
      {expanded && log.stack_trace && (
        <div className="mt-4 ml-5 p-4 bg-gray-900 rounded-xl text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
          {log.stack_trace}
        </div>
      )}
    </motion.div>
  );
};

export const ErrorLogs = () => {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [severity, setSeverity] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = severity !== 'all' ? `?severity=${severity}` : '';
      const res = await axios.get(`/api/admin/error-logs${params}`, authHeader());
      setLogs(res.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [severity]);

  const filtered = logs.filter(l =>
    search === '' ||
    l.message?.toLowerCase().includes(search.toLowerCase()) ||
    l.module?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    error: logs.filter(l => l.severity?.toUpperCase() === 'ERROR').length,
    warn:  logs.filter(l => ['WARN','WARNING'].includes(l.severity?.toUpperCase() || '')).length,
    info:  logs.filter(l => l.severity?.toUpperCase() === 'INFO').length,
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter leading-none mb-3">Error Logs</h1>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Live system diagnostics from Supabase</p>
        </div>
        <button onClick={fetchLogs} disabled={loading}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Errors', count: counts.error, color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', icon: <XCircle className="w-4 h-4" /> },
          { label: 'Warnings', count: counts.warn, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Info', count: counts.info, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', icon: <Info className="w-4 h-4" /> },
        ].map(({ label, count, color, icon }) => (
          <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${color}`}>
            {icon} {count} {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
        <div className="flex items-center gap-4 p-6 border-b border-gray-100 dark:border-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'error', 'warning', 'info'].map(s => (
              <button key={s} onClick={() => setSeverity(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${severity === s ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Terminal className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-bold text-gray-400">No logs found</p>
          </div>
        ) : (
          filtered.map(log => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
};
