import { useState, useEffect } from 'react';
import axios from 'axios';
import { Leaf, Globe, Users, Landmark, ArrowUpRight } from 'lucide-react';

const getScoreColor = (s) => s >= 75 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';
const getScoreBg = (s) => s >= 75 ? 'bg-emerald-100 dark:bg-emerald-500/10' : s >= 50 ? 'bg-amber-100 dark:bg-amber-500/10' : 'bg-red-100 dark:bg-red-500/10';
const getLabel = (s) => s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 50 ? 'Average' : 'Poor';

export default function ESGPage() {
  const [esgData, setEsgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchESG = async () => {
      try {
        const res = await axios.get('/api/portfolio/esg');
        setEsgData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('no_holdings');
        } else {
          setError('fetch_failed');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchESG();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-surface-200 dark:bg-surface-800 rounded-[2rem]" />
        <div className="grid lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-surface-200 dark:bg-surface-800 rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  if (error === 'no_holdings') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 neo-card">
        <p className="text-surface-500 dark:text-surface-400 text-lg">No portfolio found.</p>
        <p className="text-surface-400 text-sm">Generate your AI portfolio first to see ESG scores.</p>
      </div>
    );
  }

  if (error === 'fetch_failed') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 neo-card">
        <p className="text-red-500">Failed to load ESG data.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Retry</button>
      </div>
    );
  }

  const { portfolio_esg, pillars, holdings_breakdown, data_source } = esgData;
  const overall = portfolio_esg.total_score;

  const breakdown = [
    { category: 'Carbon Footprint', score: Math.round(pillars.environment.factors['Carbon Emissions'] || 0), icon: '🌍' },
    { category: 'Clean Energy', score: Math.round(pillars.environment.factors['Renewable Energy'] || 0), icon: '⚡' },
    { category: 'Diversity & Inclusion', score: Math.round(pillars.social.factors['Gender Diversity'] || 0), icon: '🤝' },
    { category: 'Board Independence', score: Math.round(pillars.governance.factors['Board Independence'] || 0), icon: '🏛️' },
    { category: 'Community Impact', score: Math.round(pillars.social.factors['Community Impact'] || 0), icon: '🔗' },
    { category: 'Audit Quality', score: Math.round(pillars.governance.factors['Audit Quality'] || 0), icon: '🔒' },
  ];

  const pillarData = [
    {
      key: 'environmental',
      label: 'Environmental',
      score: portfolio_esg.environment_score,
      icon: Globe,
      color: '#22c55e',
      desc: 'Measures the carbon footprint, clean energy adoption, and environmental impact of portfolio holdings.',
      factors: Object.entries(pillars.environment.factors).map(([name, score]) => ({ name, score })),
    },
    {
      key: 'social',
      label: 'Social',
      score: portfolio_esg.social_score,
      icon: Users,
      color: '#3b82f6',
      desc: 'Evaluates diversity & inclusion, labor practices, and community engagement of invested companies.',
      factors: Object.entries(pillars.social.factors).map(([name, score]) => ({ name, score })),
    },
    {
      key: 'governance',
      label: 'Governance',
      score: portfolio_esg.governance_score,
      icon: Landmark,
      color: '#8b5cf6',
      desc: 'Assesses board independence, executive compensation, anti-corruption policies, and shareholder rights.',
      factors: Object.entries(pillars.governance.factors).map(([name, score]) => ({ name, score })),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-surface-900 dark:text-white">ESG & Sustainability</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Environmental, Social, and Governance ratings for your portfolio.</p>
        </div>
        <p className="text-xs text-surface-400 font-bold uppercase tracking-widest bg-surface-100 dark:bg-surface-800 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 w-fit">
          Source: {data_source}
        </p>
      </div>

      {/* Overall ESG */}
      <div className="neo-card p-8 relative overflow-hidden group">
        {/* Background Graphic */}
        <svg className="absolute -bottom-16 -right-16 w-64 h-64 opacity-5 text-emerald-600 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
          <path d="M43.7,-70.7C55.4,-64.1,62.8,-48.9,71.2,-34.5C79.6,-20.1,89,-6.4,87.6,6.3C86.1,18.9,73.8,30.5,62.9,41.9C52.1,53.2,42.7,64.3,30.2,71.1C17.7,77.9,2,80.3,-12.3,77.8C-26.6,75.3,-39.5,67.8,-51.8,58.8C-64.1,49.8,-75.8,39.3,-80.7,26.1C-85.6,12.9,-83.8,-3.1,-78.3,-17.8C-72.8,-32.5,-63.6,-45.9,-51.1,-52.1C-38.6,-58.3,-22.8,-57.4,-7.8,-45.2C7.2,-33,22.4,-15,32.1,-77.4L43.7,-70.7Z" transform="translate(50 50) scale(1.1)" />
        </svg>

        <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
          <div className="relative w-40 h-40 flex-shrink-0 filter drop-shadow-xl transition-transform duration-500 group-hover:scale-105">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" />
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" strokeDasharray={`${overall * 3.39} 339.3`} strokeLinecap="round"
                className={overall >= 70 ? 'text-[#84cc16] drop-shadow-md' : overall >= 50 ? 'text-amber-500 drop-shadow-md' : 'text-red-500 drop-shadow-md'} stroke="currentColor" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-black/20 rounded-full m-3 backdrop-blur-sm border border-white/40 shadow-inner">
              <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{overall}</span>
              <span className="text-[11px] font-bold text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-500/30 shadow-sm">
                <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Overall ESG Score</h2>
            </div>
            <p className={`text-lg font-extrabold mb-3 ${getScoreColor(overall)} tracking-tight`}>{getLabel(overall)} Rating</p>
            <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-medium mb-4">
              Your portfolio scores {getLabel(overall).toLowerCase()} on sustainability metrics. Holdings emphasize clean energy, diverse boards, and ethical business practices.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <span>🌱</span> {portfolio_esg.carbon_offset_tonnes}T Carbon Offset
              </span>
              <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <span>⚡</span> {portfolio_esg.clean_energy_pct}% Clean Energy
              </span>
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <span>📈</span> YoY {portfolio_esg.yoy_change > 0 ? '+' : ''}{portfolio_esg.yoy_change}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed breakdown cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {breakdown.map(({ category, score, icon }) => (
          <div key={category} className="neo-card p-6 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl filter drop-shadow-sm transition-transform duration-300 group-hover:scale-110">{icon}</span>
              <span className={`text-3xl font-black ${getScoreColor(score)}`}>{score}</span>
            </div>
            <h3 className="text-[13px] font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">{category}</h3>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/50 overflow-hidden mt-3 shadow-inner border border-black/5">
              <div className="h-full rounded-full transition-all duration-700 shadow-sm relative"
                style={{ width: `${score}%`, backgroundColor: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pillar deep dive */}
      <div className="space-y-6">
        {pillarData.map(({ key, label, score, icon: Icon, color, desc, factors }) => (
          <div key={key} className="neo-card p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex items-start gap-4 md:w-1/3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white">{label}</h3>
                  <p className="text-3xl font-black mt-1" style={{ color }}>{score}</p>
                  <p className={`text-sm font-medium ${getScoreColor(score)}`}>{getLabel(score)}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 leading-relaxed">{desc}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {factors.map(({ name, score: fScore }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-surface-600 dark:text-surface-400">{name}</span>
                      <span className={`font-bold ${getScoreColor(fScore)}`}>{fScore}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${fScore}%`, backgroundColor: fScore >= 75 ? '#22c55e' : fScore >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Holdings Table */}
      <div className="neo-card p-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Holdings ESG Breakdown</h3>
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500">Asset</th>
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500 text-right">Weight</th>
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500 text-right">Env</th>
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500 text-right">Soc</th>
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500 text-right">Gov</th>
              <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-surface-500 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {holdings_breakdown.map(h => (
              <tr key={h.symbol} className="border-b border-surface-100 dark:border-surface-800/50 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-surface-900 dark:text-white">{h.symbol}</div>
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider">{h.name}</div>
                </td>
                <td className="py-3 px-4 text-right font-medium text-surface-600 dark:text-surface-300">{h.weight_pct}%</td>
                <td className={`py-3 px-4 text-right font-bold ${getScoreColor(h.environment_score)}`}>{h.environment_score}</td>
                <td className={`py-3 px-4 text-right font-bold ${getScoreColor(h.social_score)}`}>{h.social_score}</td>
                <td className={`py-3 px-4 text-right font-bold ${getScoreColor(h.governance_score)}`}>{h.governance_score}</td>
                <td className={`py-3 px-4 text-right font-black ${getScoreColor(h.esg_total)}`}>{h.esg_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
