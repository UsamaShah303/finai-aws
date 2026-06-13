import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ArrowUpRight, ArrowDownRight, CloudLightning, TrendingUp,
  BrainCircuit, X, Sparkles, ShieldCheck, Wallet, Target,
  PieChart as PieChartIcon, Leaf, Info, MoreHorizontal, RefreshCw,
  Car, Building2, Plane, GraduationCap, HeartPulse
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { PortfolioComparison } from './PortfolioComparison';
import { useAuth } from '../../../context/AuthContext';

// ── Mock / static data ────────────────────────────────────────────────────────

const AI_TIPS = [
  {
    id: 1,
    title: 'Increase Mutual Fund allocation by 5% to reduce portfolio risk.',
    explanation: 'Our analysis shows that your current equity concentration is slightly higher than your stated "Moderate" risk profile. By shifting 5% from individual high-volatility stocks into a broad-market mutual fund, you can achieve a more efficient frontier. This adjustment reduces expected maximum drawdown by 12% while keeping your target returns within 0.5% of current projections.',
    impact: '+$450/y',
    icon: <PieChartIcon className="w-4 h-4 text-lime-400" />,
  },
  {
    id: 2,
    title: 'Potential for Tax-Loss Harvesting in your "ENGRO" holding.',
    explanation: 'The "ENGRO" position has declined by 8.5%. By selling now, you can lock in a capital loss to offset gains elsewhere in your portfolio, potentially saving you significantly on taxes. Our algorithm suggests reinvesting the proceeds into the "M-Fund" to maintain exposure to the sector while capturing the tax benefit.',
    impact: '+$1,200 Tax Save',
    icon: <Leaf className="w-4 h-4 text-lime-400" />,
  },
  {
    id: 3,
    title: 'Optimize Car Goal: Increase monthly contribution by $50.',
    explanation: 'You are currently 68% of the way to your car goal. Increasing your monthly contribution by just $50 will move your expected completion date up by 3 months. This coincides with historically favorable end-of-year dealership promotions, potentially saving you an additional 5-10% on the vehicle purchase price.',
    impact: '3 Months Early',
    icon: <Target className="w-4 h-4 text-lime-400" />,
  },
];

const ASSET_ALLOCATION_FALLBACK = [
  { name: 'US Stocks',            value: 40, color: '#4285F4' },
  { name: 'International Stocks', value: 25, color: '#4DB6AC' },
  { name: 'Bonds',                value: 20, color: '#66BB6A' },
  { name: 'Real Estate',          value: 10, color: '#81C784' },
  { name: 'Cash',                 value: 5,  color: '#D4E157' },
];

const ASSET_CLASS_LABELS: Record<string, string> = {
  STOCK: 'Stocks (PSX)',
  ETF: 'Int\'l ETFs',
  BOND: 'Bonds / T-Bills',
  MUTUAL_FUND: 'Mutual Funds',
  COMMODITY: 'Gold',
  GOLD: 'Gold',
};

const ASSET_CLASS_COLORS: Record<string, string> = {
  STOCK: '#4285F4',
  ETF: '#4DB6AC',
  BOND: '#66BB6A',
  MUTUAL_FUND: '#81C784',
  COMMODITY: '#FFB74D',
  GOLD: '#FFB74D',
};

const PERFORMANCE_DATA = [
  { name: 'Jan', value: 55000 },
  { name: 'Feb', value: 72000 },
  { name: 'Mar', value: 90000 },
  { name: 'Apr', value: 85000 },
  { name: 'May', value: 102000 },
  { name: 'Jun', value: 112650 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoalData {
  id: string;
  label: string;
  progress: number;
  amount: string;
  icon: React.ReactNode;
  iconBg: string;
  color: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatRs = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1_000_000) return `Rs ${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `Rs ${(value / 1_000).toFixed(1)}k`;
  return `Rs ${Math.round(value).toLocaleString()}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const GoalItem = ({ goal }: { goal: GoalData }) => (
  <div className="flex items-center gap-4 py-2.5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary shrink-0 ${goal.iconBg}`}>
      {goal.icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-gray-800">{goal.label}</span>
        <div className="flex flex-col items-end leading-none">
          <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
          <span className="text-xs text-gray-500 font-bold mt-0.5">{goal.amount}</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${goal.progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ backgroundColor: goal.color }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  </div>
);

const MarketSentimentCard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/sentiment/market-mood', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch sentiment on dashboard card:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSentiment();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white flex flex-col justify-center items-center h-[420px] shadow-sm animate-pulse">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Analyzing Live Feed...</span>
      </div>
    );
  }

  const score = data?.market_mood?.score || 50;
  const label = data?.market_mood?.label || 'Neutral';

  let indicatorColor = 'bg-gray-400';
  let textColor = 'text-gray-500';
  let pillBg = 'bg-gray-400/20';
  let strokeColor = '#94a3b8';
  let shadowClass = 'rgba(148, 163, 184, 0.5)';
  let bgBlob = 'bg-slate-400';

  if (label === 'Bullish') {
    indicatorColor = 'bg-lime-400'; textColor = 'text-lime-600'; pillBg = 'bg-lime-400/20';
    strokeColor = '#84cc16'; shadowClass = 'rgba(132, 204, 22, 0.5)'; bgBlob = 'bg-lime-400';
  } else if (label === 'Bearish') {
    indicatorColor = 'bg-rose-500'; textColor = 'text-rose-600'; pillBg = 'bg-rose-500/20';
    strokeColor = '#f43f5e'; shadowClass = 'rgba(244, 63, 94, 0.5)'; bgBlob = 'bg-rose-400';
  }

  const getSummary = () => {
    if (!data?.asset_breakdown) return 'Investors remain balanced as traditional and local indices trade within tight sideways ranges.';
    const posTickers = Object.entries(data.asset_breakdown)
      .filter(([_, stats]: any) => stats.positive > stats.negative)
      .map(([t]) => (t as string).split('.')[0]);
    if (posTickers.length > 0)
      return `Positive sentiment is currently driven by active momentum in ${posTickers.slice(0, 2).join(' and ')}.`;
    return 'Market headlines indicate elevated macroeconomic and local liquidity checks across top index constituents.';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white flex flex-col justify-between h-[420px] shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-pointer"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className={`absolute -top-20 -right-20 w-64 h-64 ${bgBlob} rounded-full blur-[80px] pointer-events-none`}
      />

      <div className="flex justify-between items-center z-10">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Sentiment</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 ${indicatorColor} rounded-full animate-pulse`} />
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${pillBg} ${textColor}`}>
            {label}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 z-10 gap-6">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-180">
            <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="7" fill="transparent" strokeDasharray="238.76" strokeDashoffset="0" strokeLinecap="round" />
            <motion.circle
              cx="50" cy="50" r="38"
              stroke={strokeColor}
              strokeWidth={7}
              fill="transparent"
              strokeDasharray="238.76"
              initial={{ strokeDashoffset: 238.76 }}
              animate={{ strokeDashoffset: 238.76 * (1 - score / 100) }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 14px ${shadowClass})` }}
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-5xl font-black text-gray-900 leading-none">{score}</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">/ 100</span>
          </div>
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{label} Trend</p>
      </div>

      <p className="text-[11px] text-gray-400 font-semibold leading-relaxed z-10 text-center">
        {getSummary()}
      </p>
    </motion.div>
  );
};

const AIRecommendationCard = ({ holdings }: { holdings?: any }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const dynamicTips = React.useMemo(() => {
    if (!holdings?.holdings?.length) return AI_TIPS;
    const h = holdings.holdings;
    const tips: typeof AI_TIPS = [];

    // Tip 1: Find the biggest winner
    const sorted = [...h].sort((a: any, b: any) => (b.gain_loss_pct || 0) - (a.gain_loss_pct || 0));
    const best = sorted[0];
    if (best && best.gain_loss_pct > 0) {
      tips.push({
        id: 1,
        title: `${best.symbol.replace('.KA', '')} is up ${best.gain_loss_pct?.toFixed(1)}% — consider taking partial profits to lock gains.`,
        explanation: `Your ${best.symbol.replace('.KA', '')} position has appreciated significantly. Taking partial profits (25-30%) lets you secure gains while maintaining upside exposure. The freed capital can diversify into uncorrelated assets.`,
        impact: `+Rs ${Math.abs(best.gain_loss_pkr || 0).toLocaleString()} gain`,
        icon: <TrendingUp className="w-4 h-4 text-lime-400" />,
      });
    }

    // Tip 2: Find the biggest loser for tax-loss harvesting
    const worst = sorted[sorted.length - 1];
    if (worst && worst.gain_loss_pct < -3) {
      tips.push({
        id: 2,
        title: `Tax-Loss Harvesting: ${worst.symbol.replace('.KA', '')} is down ${Math.abs(worst.gain_loss_pct)?.toFixed(1)}% — harvest the loss to offset gains.`,
        explanation: `Selling ${worst.symbol.replace('.KA', '')} now locks in a capital loss of Rs ${Math.abs(worst.gain_loss_pkr || 0).toLocaleString()} that can offset your winners. Reinvest into a correlated replacement asset to maintain your portfolio beta.`,
        impact: `Rs ${Math.abs(worst.gain_loss_pkr || 0).toLocaleString()} tax save`,
        icon: <Leaf className="w-4 h-4 text-lime-400" />,
      });
    }

    // Tip 3: Concentration check
    const totalVal = holdings.total_value_pkr || 1;
    const concentrated = h.filter((a: any) => ((a.current_value_pkr || 0) / totalVal) > 0.25);
    if (concentrated.length > 0) {
      tips.push({
        id: 3,
        title: `${concentrated[0].symbol.replace('.KA', '')} is ${((concentrated[0].current_value_pkr / totalVal) * 100).toFixed(0)}% of your portfolio — consider diversifying.`,
        explanation: `A single-asset concentration above 25% increases portfolio risk. Spreading across 2-3 more holdings in different sectors can reduce maximum drawdown by up to 15% without significantly impacting returns.`,
        impact: '-15% Risk',
        icon: <PieChartIcon className="w-4 h-4 text-lime-400" />,
      });
    }

    return tips.length > 0 ? tips : AI_TIPS;
  }, [holdings]);

  const tip = dynamicTips[currentTipIndex % dynamicTips.length];

  return (
    <>
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="bg-primary rounded-[32px] p-6 shadow-lg shadow-primary/20 flex flex-col justify-between h-52 text-white relative overflow-hidden group"
      >
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
          <button
            onClick={() => setCurrentTipIndex((prev) => (prev + 1) % dynamicTips.length)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            <TrendingUp className="w-4 h-4 rotate-90" />
          </button>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <CloudLightning className="w-4 h-4 text-lime-400 fill-lime-400/20" />
            <p className="text-white/60 text-xs font-black uppercase tracking-widest leading-none">AI Smart Tip • {(currentTipIndex % dynamicTips.length) + 1}/{dynamicTips.length}</p>
          </div>
          <h3 className="text-sm font-bold leading-tight line-clamp-2 min-h-[40px]">{tip.title}</h3>
        </div>
        <div className="flex items-center justify-between mt-4 relative z-10">
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-colors group/btn"
          >
            <span className="text-xs font-black uppercase tracking-wider">Learn More</span>
            <Sparkles className="w-3.5 h-3.5 text-lime-400 group-hover/btn:scale-110 transition-transform" />
          </button>
          <div className="text-xs font-black text-white/50 leading-none">
            Impact: <span className="text-lime-400">{tip.impact}</span>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-10 -left-10 w-24 h-24 bg-lime-400/10 rounded-full blur-2xl pointer-events-none" />
      </motion.div>

      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <CloudLightning className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">AI Expert Insight</h4>
                    <p className="text-xl font-black text-gray-900 tracking-tight">Smart Strategy Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <h5 className="text-xs font-black text-primary uppercase tracking-widest mb-3">Recommendation</h5>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{tip.title}</p>
                </div>
                <div className="space-y-4">
                  <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest">In-Depth Explanation</h5>
                  <p className="text-gray-500 font-medium leading-relaxed">{tip.explanation}</p>
                </div>
                <div className="flex items-center justify-between p-6 bg-lime-50 rounded-3xl border border-lime-100">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-lime-600" />
                    <span className="text-xs font-black text-lime-700 uppercase tracking-widest">Estimated Impact</span>
                  </div>
                  <span className="text-xl font-black text-lime-700">{tip.impact}</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-black transition-colors"
              >
                Apply Strategy
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const AssetAllocationCard = ({ holdingsData }: { holdingsData?: any }) => {
  const allocationData = React.useMemo(() => {
    if (!holdingsData?.holdings?.length) return ASSET_ALLOCATION_FALLBACK;
    const groups: Record<string, number> = {};
    const totalValue = holdingsData.total_value_pkr || 0;
    if (totalValue <= 0) return ASSET_ALLOCATION_FALLBACK;

    for (const h of holdingsData.holdings) {
      let cls = h.asset_class || 'STOCK';
      if (h.symbol === 'GOLD') cls = 'GOLD';
      const label = ASSET_CLASS_LABELS[cls] || cls;
      const val = h.current_value_pkr || 0;
      groups[label] = (groups[label] || 0) + val;
    }

    const entries = Object.entries(groups)
      .map(([name, val]) => ({
        name,
        value: Math.round((val / totalValue) * 100),
        color: ASSET_CLASS_COLORS[
          Object.keys(ASSET_CLASS_LABELS).find(k => ASSET_CLASS_LABELS[k] === name) || 'STOCK'
        ] || '#94a3b8',
      }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value);

    return entries.length > 0 ? entries : ASSET_ALLOCATION_FALLBACK;
  }, [holdingsData]);

  const displayTotal = holdingsData?.total_value_pkr
    ? formatRs(holdingsData.total_value_pkr)
    : '--';

  return (
  <div className="bg-white/80 backdrop-blur-2xl rounded-[48px] p-10 border border-white shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Asset Allocation</h3>
        <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center cursor-help group/info hover:bg-gray-50 transition-colors">
          <Info className="w-4 h-4 text-gray-300 group-hover/info:text-gray-500" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-xs font-black text-primary uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">More</button>
        <button className="text-gray-200 hover:text-gray-500 transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>
    </div>
    <div className="flex flex-col lg:flex-row items-center gap-12">
      <div className="relative w-72 h-72 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocationData}
              innerRadius={80} outerRadius={110}
              cx="50%" cy="50%"
              paddingAngle={2} dataKey="value"
              stroke="#fff" strokeWidth={2}
              startAngle={90} endAngle={450}
            >
              {allocationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{displayTotal}</span>
          <span className="text-xs text-gray-500 font-black tracking-[0.2em] uppercase mt-2">Total</span>
        </div>
      </div>
      <div className="flex-1 w-full flex flex-col gap-4 max-w-md">
        {allocationData.map((item) => (
          <div key={item.name} className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="text-lg font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{item.name}</span>
            </div>
            <span className="text-lg font-black text-gray-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
};

const PortfolioPerformanceCard = ({ 
  data, 
  currentValue,
  activePeriod,
  setActivePeriod 
}: { 
  data?: any, 
  currentValue?: number,
  activePeriod: string,
  setActivePeriod: (p: string) => void
}) => {
  const chartData = data?.performance_data || [];
  const displayValue = currentValue ? formatRs(currentValue) : '$112,650';
  const totalReturn = data?.summary?.total_return_pct || 0;
  const isPositive = totalReturn >= 0;

  return (
  <div className="bg-white/80 backdrop-blur-2xl rounded-[48px] p-10 border border-white shadow-sm">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Portfolio Performance</h3>
        <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center cursor-help group/info hover:bg-gray-50 transition-colors">
          <Info className="w-4 h-4 text-gray-300 group-hover/info:text-gray-500" />
        </div>
      </div>
      <div className="flex items-center bg-gray-50/50 p-1.5 rounded-2xl gap-1">
        {[
          { label: '1M', value: '1mo' }, 
          { label: '3M', value: '3mo' }, 
          { label: '6M', value: '6mo' }, 
          { label: '1Y', value: '1y' }
        ].map((period) => (
          <button
            key={period.value}
            onClick={() => setActivePeriod(period.value)}
            className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${
              activePeriod === period.value 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-4 mb-8">
      <span className="text-4xl font-black text-gray-900 tracking-tighter">{displayValue}</span>
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isPositive ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <TrendingUp className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500 rotate-180'}`} />
        <span className={`text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {totalReturn}% 
        </span>
      </div>
    </div>
    <div className="h-[320px] w-full -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4285F4" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#4b5563' }} dy={15} minTickGap={30} />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-2xl">
                    {formatRs(payload[0].value as number)}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area type="monotone" dataKey="portfolio" stroke="#4285F4" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);
}

const HeroSection = ({ onOpenDeposit }: { onOpenDeposit: () => void }) => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Investor';
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-8">
      <div className="flex-1">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">FinAI Nexus</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tighter mb-4">
            Welcome back,<br />
            <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-lg text-gray-500 font-medium max-w-sm leading-relaxed">
            Your AI-powered portfolio is currently <span className="text-emerald-500 font-bold select-none cursor-default">outperforming</span> the benchmark.
          </p>
        </motion.div>
      </div>
      <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[40px] border border-white/60 shadow-sm backdrop-blur-xl">
        <button
          onClick={onOpenDeposit}
          className="flex items-center gap-3 bg-primary text-white pl-4 pr-8 py-3 rounded-[28px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          Deposit Funds
        </button>
        <button className="flex items-center gap-3 bg-gray-900 text-white pl-4 pr-8 py-3 rounded-[28px] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-gray-900/10 hover:shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <CloudLightning className="w-4 h-4 text-lime-400" />
          </div>
          Smart Harvest
        </button>
      </div>
    </div>
  );
};

// ── DashboardHome ─────────────────────────────────────────────────────────────

export const DashboardHome = ({
  onOpenDeposit,
  onNavigateToGoals,
  onNavigateToForecast,
}: {
  onOpenDeposit: () => void;
  onNavigateToGoals?: () => void;
  onNavigateToForecast?: () => void;
}) => {
  const [dashboardGoals, setDashboardGoals] = useState<GoalData[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [kpiError, setKpiError] = useState(false);
  const [rebalanceData, setRebalanceData] = useState<any>(null);
  const [activePeriod, setActivePeriod] = useState('6mo');

  useEffect(() => {
    const checkRebalance = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/portfolio/rebalance-check', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRebalanceData(res.data);
      } catch (err) {
        console.error('Failed to check rebalancing:', err);
      }
    };
    checkRebalance();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [holdRes, forecastRes, esgRes, perfRes] = await Promise.allSettled([
          axios.get('/api/portfolio/holdings', { headers }),
          axios.get('/api/forecast/latest', { headers }),
          axios.get('/api/portfolio/esg', { headers }),
          axios.get(`/api/portfolio/performance?period=${activePeriod}`, { headers }),
        ]);
        setKpis((prev: any) => ({
          holdings: holdRes.status === 'fulfilled' ? holdRes.value.data : prev?.holdings,
          forecast: forecastRes.status === 'fulfilled' ? forecastRes.value.data : prev?.forecast,
          esg: esgRes.status === 'fulfilled' ? esgRes.value.data : prev?.esg,
          performance: perfRes.status === 'fulfilled' ? perfRes.value.data : prev?.performance,
        }));
        setKpiError(holdRes.status === 'rejected' && forecastRes.status === 'rejected');
      } catch {
        setKpiError(true);
      }
    };
    load();
  }, [activePeriod]);

  useEffect(() => {
    const fetchDashboardGoals = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/goals', { headers: { Authorization: `Bearer ${token}` } });
        const iconMapping: Record<string, any> = { Target, Car, Building2, Plane, GraduationCap, HeartPulse };
        const colors = ['#3B82F6', '#A3E635', '#10B981', '#F97316', '#F43F5E', '#8B5CF6'];
        const bgColors = ['bg-blue-50', 'bg-lime-50', 'bg-emerald-50', 'bg-orange-50', 'bg-rose-50', 'bg-purple-50'];
        const mappedGoals: GoalData[] = (res.data.goals || []).map((g: any, i: number) => {
          const prog = Math.min(100, Math.round((Number(g.current_pkr) / Number(g.target_pkr)) * 100)) || 0;
          const IconCmp = iconMapping[g.icon] || Target;
          return {
            id: g.id,
            label: g.name,
            progress: prog,
            amount: `Rs ${Number(g.target_pkr).toLocaleString()}`,
            icon: <IconCmp className="w-4 h-4" />,
            iconBg: bgColors[i % bgColors.length],
            color: colors[i % colors.length],
          };
        });
        setDashboardGoals(mappedGoals);
      } catch (err) {
        console.error('Failed to fetch goals', err);
      } finally {
        setLoadingGoals(false);
      }
    };
    fetchDashboardGoals();
  }, []);

  const portfolioKpi = !kpiError && kpis?.holdings?.total_value_pkr !== undefined
    ? formatRs(Number(kpis.holdings.total_value_pkr)) : '--';
  const forecastKpi = !kpiError && kpis?.forecast?.p50 !== undefined
    ? formatRs(Number(kpis.forecast.p50)) : '--';
  
  const esgScore = kpis?.esg?.portfolio_esg?.total_score;
  const esgKpi = !kpiError && esgScore !== undefined
    ? `${Math.round(esgScore)}/100` : '--';

  return (
    <div className="flex flex-col gap-10">
      {rebalanceData?.needs_rebalancing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-100 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-200/50 rounded-full flex shrink-0 items-center justify-center text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-amber-900 font-bold text-sm tracking-tight">Portfolio Drift Alert</h4>
              <p className="text-amber-700/80 text-xs font-medium mt-0.5">
                {rebalanceData.alerts[0].message}
                {rebalanceData.alerts.length > 1 && ` (+${rebalanceData.alerts.length - 1} more)`}
              </p>
            </div>
          </div>
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const totalPkr = kpis?.holdings?.total_value_pkr || 0;
                if (totalPkr <= 0) return;
                await axios.post('/api/invest/auto', { total_pkr: totalPkr }, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setRebalanceData(null);
                // Refresh dashboard data
                window.location.reload();
              } catch (err) {
                console.error('Rebalance failed:', err);
              }
            }}
            className="shrink-0 px-4 py-2 bg-amber-500 text-white text-[10px] uppercase tracking-widest font-black rounded-xl hover:bg-amber-600 transition-colors"
          >
            Rebalance Now
          </button>
        </motion.div>
      )}

      <HeroSection onOpenDeposit={onOpenDeposit} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* KPI Cards */}
        <div className="xl:col-span-4 bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Portfolio Value</span>
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{portfolioKpi}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Growth</span>
          </div>
        </div>

        <div className="xl:col-span-4 bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Portfolio ESG Score</span>
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{esgKpi}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center text-lime-600 group-hover:scale-110 transition-transform">
              <Leaf className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest bg-primary/5 w-fit px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Optimized</span>
          </div>
        </div>

        <div 
          onClick={onNavigateToForecast}
          className="xl:col-span-4 bg-gray-900 rounded-[40px] p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 block">Forecast 2030</span>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-4">{forecastKpi}</h3>
            <p className="text-xs text-white/40 font-bold max-w-[180px]">Estimated portfolio value by the year 2030 based on current trends.</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-center gap-2 mt-6">
            <button className="text-[10px] font-black text-lime-400 uppercase tracking-widest hover:underline underline-offset-4 decoration-lime-400/30 transition-all">View Forecast</button>
            <ArrowUpRight className="w-3 h-3 text-lime-400" />
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="xl:col-span-8 space-y-8">
          <PortfolioPerformanceCard 
             data={kpis?.performance} 
             currentValue={kpis?.holdings?.total_value_pkr} 
             activePeriod={activePeriod}
             setActivePeriod={setActivePeriod}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white flex flex-col h-[420px] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">Active Goals</h3>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1 block tracking-[0.1em]">Savings Progress</span>
                </div>
                <button onClick={onNavigateToGoals} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 overflow-y-auto scrollbar-hide flex-1">
                {loadingGoals ? (
                  <div className="flex justify-center items-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : dashboardGoals.length > 0 ? (
                  dashboardGoals.map((goal) => <GoalItem key={goal.id} goal={goal} />)
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Target className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs font-bold">No Active Goals</p>
                  </div>
                )}
              </div>
              <button
                onClick={onNavigateToGoals}
                className="mt-8 w-full py-4 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                Manage Goals
              </button>
            </div>
            <MarketSentimentCard />
          </div>
        </div>

        {/* Intelligence Rail */}
        <div className="xl:col-span-4 flex flex-col gap-8">
          <div className="bg-primary rounded-[40px] p-1 shadow-lg shadow-primary/20 overflow-hidden group">
            <div className="bg-white/5 backdrop-blur-md rounded-[36px] p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-lime-400" />
                </div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">AI Assistant</span>
              </div>
              <p className="text-lg font-bold text-white mb-8 leading-tight">
                {(() => {
                  const h = kpis?.holdings;
                  if (!h?.holdings?.length) return '"Deposit funds to start building your AI-optimized portfolio."';
                  const gainPct = h.total_gain_pct || 0;
                  const count = h.holdings.length;
                  const esg = kpis?.esg?.portfolio_esg?.total_score;
                  if (gainPct > 5) return `"Your portfolio is up ${gainPct.toFixed(1)}% across ${count} assets — excellent performance. ${esg && esg > 60 ? 'ESG score is strong.' : 'Consider ESG improvements.'}"`;
                  if (gainPct > 0) return `"Steady gains of ${gainPct.toFixed(1)}% across ${count} holdings. Your risk-reward balance is on track."`;
                  if (gainPct > -3) return `"Your ${count}-asset portfolio is holding stable. Market conditions suggest patience."`;
                  return `"Your portfolio is down ${Math.abs(gainPct).toFixed(1)}%. Consider rebalancing to reduce concentrated losses."`;
                })()}
              </p>
              <div className="mt-auto flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=200&h=200&fit=crop" className="w-full h-full object-cover" alt="AI" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block">Calipso Voice</span>
                  <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">Live Analysis</span>
                </div>
              </div>
            </div>
          </div>

          <AIRecommendationCard holdings={kpis?.holdings} />
          <AssetAllocationCard holdingsData={kpis?.holdings} />
        </div>

        {/* Full Width Comparison */}
        <div className="xl:col-span-12">
          <PortfolioComparison />
        </div>
      </div>
    </div>
  );
};
