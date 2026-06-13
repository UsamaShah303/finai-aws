
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import {
  Users,
  Activity,
  TrendingUp,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Target,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const fmtPKR = (v: number) => {
  if (v >= 10_000_000) return `PKR ${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `PKR ${(v / 100_000).toFixed(1)}L`;
  return `PKR ${Math.round(v).toLocaleString()}`;
};

const KPICard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({
  label, value, icon, color,
}) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.02 }}
    className="bg-white dark:bg-white/5 rounded-[32px] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-white/5 flex flex-col justify-between h-44 group transition-all"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <h3 className="text-3xl font-[900] text-gray-900 dark:text-white tracking-tighter">{value}</h3>
    </div>
  </motion.div>
);

export const AdminDashboard = () => {
  const [stats, setStats]       = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get('/api/admin/stats', authHeader()),
        axios.get('/api/admin/analytics?days=30', authHeader()),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600">
        <p className="font-bold">{error}</p>
        <button onClick={fetchAll} className="mt-3 text-sm underline">Retry</button>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Users',       value: String(stats?.total_users ?? 0),            icon: <Users className="w-7 h-7" />,     color: 'bg-blue-500' },
    { label: 'Total AUM',         value: fmtPKR(stats?.total_aum_pkr ?? 0),          icon: <TrendingUp className="w-7 h-7" />, color: 'bg-indigo-500' },
    { label: 'Avg Portfolio',     value: fmtPKR(stats?.avg_portfolio_pkr ?? 0),      icon: <PieChartIcon className="w-7 h-7"/>, color: 'bg-purple-500' },
    { label: 'Total Goals',       value: String(stats?.total_goals ?? 0),            icon: <Target className="w-7 h-7" />,    color: 'bg-emerald-500' },
    { label: 'Forecast Runs',     value: String(stats?.total_forecasts ?? 0),        icon: <BarChart3 className="w-7 h-7" />, color: 'bg-amber-500' },
    { label: 'Active Sessions',   value: String(stats?.active_sessions ?? 0),        icon: <Activity className="w-7 h-7" />,  color: 'bg-rose-500' },
  ];

  const riskData = stats?.risk_breakdown
    ? Object.entries(stats.risk_breakdown).map(([k, v]) => ({ name: k, count: v as number }))
    : [];

  // Build user growth chart from analytics
  const growthData = (analytics?.new_users || []).map((d: any) => ({
    name: d.date.slice(5), // MM-DD
    users: d.count,
  }));

  return (
    <div className="flex-1 flex flex-col gap-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter leading-none mb-3">System Overview</h1>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Data
            </span>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="xl:col-span-1">
            <KPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* User Growth */}
        <div className="xl:col-span-8 bg-white dark:bg-white/5 rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/20 dark:shadow-none">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">New Registrations</h2>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-8">Last 30 Days</p>
          <div className="h-[300px]">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No user registration data yet</div>
            )}
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="xl:col-span-4 bg-gray-900 rounded-[48px] p-10 text-white shadow-2xl shadow-indigo-900/40">
          <h2 className="text-xl font-black tracking-tight mb-2">Risk Profiles</h2>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-8">User Distribution</p>
          <div className="space-y-5">
            {riskData.length > 0 ? riskData.map((r, i) => {
              const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-rose-500'];
              const total = riskData.reduce((s: number, x: any) => s + x.count, 0);
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-black text-white">{r.name}</span>
                    <span className="text-xs font-black text-indigo-300">{r.count} users ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full ${colors[i % colors.length]}`}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-white/40 text-sm">No risk profiles yet</p>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter">{stats?.total_users ?? 0}</span>
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Total Users
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
