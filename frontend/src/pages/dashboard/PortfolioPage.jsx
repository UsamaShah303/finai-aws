import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import MarketToggle from '../../components/shared/MarketToggle';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Zap, TrendingUp, Wallet } from 'lucide-react';

const fmtPKR = (v) => {
  const n = Number(v) || 0;
  if (n >= 10_000_000) return `PKR ${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `PKR ${(n / 100_000).toFixed(1)}L`;
  return `PKR ${Math.round(n).toLocaleString()}`;
};

const fmtUSD = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#6366f1','#ec4899','#14b8a6'];

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-800 p-3 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 text-sm">
      <p className="font-semibold text-surface-900 dark:text-white">{payload[0].name}</p>
      <p className="text-primary-500 font-bold">{payload[0].value}%</p>
    </div>
  );
};

export default function PortfolioPage() {
  const { marketPreference } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/portfolio/holdings', authHeader());
      setHoldings(res.data.holdings || []);
      setSummary({
        total_value_pkr: res.data.total_value_pkr || 0,
        total_gain_pkr: res.data.total_gain_pkr || 0,
        total_gain_pct: res.data.total_gain_pct || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRebalance = async () => {
    setRebalancing(true);
    try {
      await axios.post('/api/invest/auto', {
        total_pkr: summary?.total_value_pkr || 1000000,
        monthly_deposit: 0,
        years: 10,
      }, authHeader());
      await fetchHoldings();
    } catch (err) {
      setError(err.response?.data?.error || 'Rebalancing failed');
    } finally {
      setRebalancing(false);
    }
  };

  /* Build pie data from holdings */
  const filteredHoldings = holdings.filter(h => {
    if (marketPreference === 'pakistan') return h.market !== 'INTL';
    if (marketPreference === 'international') return h.market === 'INTL';
    return true;
  });

  const totalValue = filteredHoldings.reduce((s, h) => s + (h.current_value_pkr || 0), 0);
  const pieData = filteredHoldings.map((h, i) => ({
    name: h.symbol,
    value: totalValue > 0 ? Math.round((h.current_value_pkr / totalValue) * 100) : 0,
    color: COLORS[i % COLORS.length],
  }));

  const driftAlerts = filteredHoldings.filter(h => Math.abs(h.drift_pct || 0) > 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  /* Empty state — no holdings yet */
  if (!loading && holdings.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-surface-900 dark:text-white">Portfolio</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Your AI-optimised asset allocation.</p>
        </div>
        <div className="neo-card p-12 text-center">
          <Wallet className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No holdings yet</h3>
          <p className="text-surface-500 text-sm mt-1 mb-6">
            Complete your risk quiz and run the AI investment engine to build your portfolio.
          </p>
          <button onClick={handleAutoRebalance} disabled={rebalancing}
            className="px-6 py-2.5 bg-[#ccff00] text-slate-900 font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 mx-auto disabled:opacity-60">
            {rebalancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Build My Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-surface-900 dark:text-white">Portfolio</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Detailed asset breakdown and rebalancing alerts.</p>
        </div>
        <MarketToggle />
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="neo-card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{fmtPKR(summary.total_value_pkr)}</p>
          </div>
          <div className="neo-card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Gain</p>
            <p className={`text-2xl font-black ${summary.total_gain_pkr >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {summary.total_gain_pkr >= 0 ? '+' : ''}{fmtPKR(summary.total_gain_pkr)}
            </p>
          </div>
          <div className="neo-card p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Return %</p>
            <p className={`text-2xl font-black flex items-center gap-1 ${summary.total_gain_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {summary.total_gain_pct >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
              {summary.total_gain_pct >= 0 ? '+' : ''}{Number(summary.total_gain_pct).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Rebalancing Alert */}
      {driftAlerts.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 border border-amber-400/50 shadow-xl shadow-amber-500/20 relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="text-base font-extrabold text-white tracking-tight">Rebalancing Alert</h3>
              </div>
              <p className="text-sm font-medium text-amber-50 leading-relaxed max-w-xl">
                {driftAlerts.length} asset(s) have drifted more than 5% from target. Realign your portfolio.
              </p>
            </div>
            <button onClick={handleAutoRebalance} disabled={rebalancing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-amber-600 text-sm font-extrabold hover:bg-amber-50 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-60">
              {rebalancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Auto-Rebalance
            </button>
          </div>
        </div>
      )}

      {/* Pie + Table */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="neo-card p-6 relative overflow-hidden group">
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-6">Allocation</h3>
          {pieData.length > 0 ? (
            <>
              <div className="w-56 h-56 mx-auto filter drop-shadow-xl">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={64} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pieData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-surface-600 dark:text-surface-400">{name}</span>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-surface-400 text-sm mt-8">No data for selected market</p>
          )}
        </div>

        {/* Holdings Table */}
        <div className="neo-card p-6 lg:col-span-2 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Holdings</h3>
            <button onClick={fetchHoldings} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <RefreshCw className="w-4 h-4 text-surface-400" />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/50 dark:border-slate-700/50">
                <th className="text-left py-3 px-2 text-xs font-semibold text-surface-400 uppercase">Asset</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-surface-400 uppercase">Market</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-surface-400 uppercase">Weight</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-surface-400 uppercase">Value (PKR)</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-surface-400 uppercase">P&L</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-surface-400 text-sm">No holdings for selected market</td>
                </tr>
              ) : (
                filteredHoldings.map((h) => {
                  const gainPct = h.gain_pct || 0;
                  return (
                    <tr key={h.symbol} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-white">{h.symbol}</td>
                      <td className="py-3.5 px-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${h.market === 'PSX' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'}`}>
                          {h.market}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right font-extrabold text-sky-600 dark:text-sky-400">{Math.round((h.weight || 0) * 100)}%</td>
                      <td className="py-3.5 px-2 text-right font-medium text-slate-600 dark:text-slate-300">{fmtPKR(h.current_value_pkr)}</td>
                      <td className="py-3.5 px-2 text-right">
                        <span className={`flex items-center justify-end gap-0.5 font-bold ${gainPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {gainPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {gainPct > 0 ? '+' : ''}{Number(gainPct).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
