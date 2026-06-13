
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, Activity, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import axios from 'axios';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const AnalyticsCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode; className?: string }> = ({
  title, subtitle, children, className = '',
}) => (
  <div className={`bg-white dark:bg-white/5 rounded-[48px] p-10 border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/20 dark:shadow-none flex flex-col gap-8 ${className}`}>
    <div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">{title}</h2>
      <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{subtitle}</p>
    </div>
    <div className="flex-1 w-full min-h-[260px]">{children}</div>
  </div>
);

const METRIC_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const UsageAnalytics = () => {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(30);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/analytics?days=${days}`, authHeader());
      setData(res.data);
    } catch (err) {
      console.error('Analytics fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Build combined daily chart
  const newUsers     = data?.new_users     || [];
  const forecastRuns = data?.forecast_runs || [];
  const newGoals     = data?.new_goals     || [];

  // Merge by date
  const dateSet = new Set([
    ...newUsers.map((d: any) => d.date),
    ...forecastRuns.map((d: any) => d.date),
    ...newGoals.map((d: any) => d.date),
  ]);
  const combined = Array.from(dateSet).sort().map(date => ({
    date: (date as string).slice(5),
    users:     newUsers.find((d: any) => d.date === date)?.count ?? 0,
    forecasts: forecastRuns.find((d: any) => d.date === date)?.count ?? 0,
    goals:     newGoals.find((d: any) => d.date === date)?.count ?? 0,
  }));

  const totals = data?.totals || {};

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter leading-none mb-3">Usage Analytics</h1>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Platform activity from Supabase</p>
        </div>
        <div className="flex items-center gap-3">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${days === d ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
              {d}d
            </button>
          ))}
          <button onClick={fetchAnalytics}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'New Users',     value: totals.users ?? 0,     icon: <Users className="w-5 h-5" />,    color: 'bg-indigo-500' },
          { label: 'Forecast Runs', value: totals.forecasts ?? 0, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-emerald-500' },
          { label: 'New Goals',     value: totals.goals ?? 0,     icon: <Activity className="w-5 h-5" />,  color: 'bg-amber-500' },
        ].map(({ label, value, icon, color }) => (
          <motion.div key={label} whileHover={{ y: -3 }}
            className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/5 shadow-xl flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white`}>{icon}</div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
              <p className="text-3xl font-[900] text-gray-900 dark:text-white tracking-tighter">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Combined daily chart */}
      <AnalyticsCard title="Daily Activity" subtitle={`Last ${days} days`} className="xl:col-span-8">
        {combined.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combined}>
              <defs>
                {['users', 'forecasts', 'goals'].map((key, i) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={METRIC_COLORS[i]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={METRIC_COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 700 }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
              />
              {(['users', 'forecasts', 'goals'] as const).map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={METRIC_COLORS[i]} strokeWidth={3}
                  fillOpacity={1} fill={`url(#grad-${key})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No activity data for this period</div>
        )}
      </AnalyticsCard>
    </div>
  );
};
