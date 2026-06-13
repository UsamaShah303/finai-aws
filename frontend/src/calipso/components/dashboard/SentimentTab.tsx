import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { TrendingUp, CloudLightning, ShieldCheck } from 'lucide-react';

export const SentimentTab = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAdjustmentExpanded, setIsAdjustmentExpanded] = useState(false);

  const fetchMood = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/sentiment/market-mood', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error('Sentiment fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMood(); }, []);

  const getDynamicAdjustmentMessage = () => {
    if (!data?.asset_breakdown) return 'All allocations are currently optimized according to long-term risk parameters.';
    const worstAsset = Object.entries(data.asset_breakdown).find(([_, stats]: any) => stats.negative > 0);
    if (worstAsset) {
      const symbol = (worstAsset[0] as string).split('.')[0];
      return `"${symbol} reduced marginally due to negative news sentiment regarding supply chain or regulatory headwinds."`;
    }
    const bestAsset = Object.entries(data.asset_breakdown).find(([_, stats]: any) => stats.positive > 0);
    if (bestAsset) {
      const symbol = (bestAsset[0] as string).split('.')[0];
      return `"${symbol} has been slightly boosted in the dynamic weights due to strong positive sentiment in recent market news."`;
    }
    return 'All allocations are currently optimized according to long-term risk parameters.';
  };

  const getHeroTheme = () => {
    if (!data?.market_mood) return {
      bg: 'bg-slate-900', text: 'text-white',
      label: 'Loading Mood...', desc: 'Fetching live financial sentiment...',
    };
    const mood = data.market_mood.label;
    if (mood === 'Bullish') return {
      bg: 'bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-500',
      text: 'text-gray-950',
      label: 'Bullish Momentum',
      desc: 'Markets are showing highly optimistic signals. Your portfolio is well-positioned to capitalize on positive-growth cycles.',
    };
    if (mood === 'Bearish') return {
      bg: 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500',
      text: 'text-white',
      label: 'Bearish Headwinds',
      desc: 'Markets are expressing elevated caution. Conservative hedges and cash buffer strategies have been reinforced.',
    };
    return {
      bg: 'bg-gradient-to-r from-slate-700 via-slate-800 to-indigo-950',
      text: 'text-white',
      label: 'Neutral Equilibrium',
      desc: 'Market sentiment remains balanced. No major capital reallocation triggers detected at this moment.',
    };
  };

  const hero = getHeroTheme();

  return (
    <div className="flex-1 flex flex-col gap-10">
      {/* Dynamic Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${hero.bg} ${hero.text} rounded-[48px] p-10 relative overflow-hidden shadow-2xl transition-all duration-500`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${data?.market_mood?.label === 'Bullish' ? 'bg-black/10' : 'bg-white/10'} rounded-xl flex items-center justify-center backdrop-blur-md`}>
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest opacity-70">Overall Market Mood</span>
              {data?.engine === 'finbert' ? (
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 rounded-full animate-pulse backdrop-blur-md">
                  FinBERT AI
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-500/20 text-amber-800 border border-amber-500/30 rounded-full backdrop-blur-md">
                  Keyword fallback
                </span>
              )}
            </div>
            <h1 className="text-5xl font-black mb-4 tracking-tight leading-none">
              {loading ? 'Analyzing News...' : (data?.market_mood?.label || 'Neutral')}
            </h1>
            <p className="text-lg font-medium opacity-90 leading-relaxed max-w-xl">
              {loading ? 'Downloading latest financial articles and running deep NLP models...' : hero.desc}
            </p>
          </div>
          <div className={`w-48 h-48 ${data?.market_mood?.label === 'Bullish' ? 'bg-black/5' : 'bg-white/5'} rounded-full flex flex-col items-center justify-center backdrop-blur-sm border ${data?.market_mood?.label === 'Bullish' ? 'border-black/10' : 'border-white/10'} shadow-inner`}>
            <span className="text-5xl font-black">{loading ? '...' : (data?.market_mood?.score || 50)}</span>
            <span className="text-xs font-black uppercase tracking-widest mt-2">Index Score</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* AI News Analysis */}
        <div className="bg-white/60 rounded-[48px] p-10 border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">AI News Analysis</h3>
              <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                <div className={`w-2 h-2 ${loading ? 'bg-amber-400 animate-bounce' : 'bg-lime-400 animate-pulse'} rounded-full`} />
                {loading ? 'Processing...' : 'Live Feed'}
              </div>
            </div>

            <div className="space-y-8">
              {loading ? (
                <>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded-md w-1/4" />
                      <div className="h-3 bg-gray-200 rounded-full w-full" />
                    </div>
                  ))}
                </>
              ) : data?.asset_breakdown ? (
                Object.entries(data.asset_breakdown).map(([ticker, stats]: any) => {
                  const pos = stats.positive || 0;
                  const neg = stats.negative || 0;
                  const neu = stats.neutral || 0;
                  const total = pos + neg + neu;
                  const score = total > 0 ? ((pos - neg) / total + 1) / 2 : 0.5;
                  const pct = Math.round(score * 100);
                  const cleanTicker = ticker.split('.')[0];
                  let label = 'Neutral';
                  let color = '#94A3B8';
                  let pillBg = 'bg-gray-400/20 text-gray-700';
                  if (pct > 55) { label = 'Positive'; color = '#BEF264'; pillBg = 'bg-lime-400/20 text-lime-700'; }
                  else if (pct < 45) { label = 'Negative'; color = '#F43F5E'; pillBg = 'bg-rose-400/20 text-rose-700'; }
                  return (
                    <div key={ticker}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-black text-gray-900">{cleanTicker}</span>
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${pillBg}`}>{label} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-10 font-bold">No ticker breakdown data available.</div>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Last Analyzed</span>
              <span className="text-sm font-bold text-gray-900">
                {data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Just now'}
              </span>
            </div>
            <button
              onClick={fetchMood}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              <CloudLightning className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analysing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Right: Insights & Adjustments */}
        <div className="flex flex-col gap-10">
          <div className="bg-white/60 rounded-[48px] p-10 border border-white/40 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Latest Insights</h3>
              <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                {loading ? (
                  <>
                    {[0, 1].map(i => (
                      <div key={i} className="animate-pulse space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-4 bg-gray-200 rounded-md w-12" />
                          <div className="h-4 bg-gray-200 rounded-md w-24" />
                        </div>
                        <div className="h-5 bg-gray-200 rounded-md w-full" />
                      </div>
                    ))}
                  </>
                ) : data?.articles && data.articles.length > 0 ? (
                  data.articles.map((item: any, idx: number) => {
                    const cleanTicker = item.ticker.split('.')[0];
                    return (
                      <motion.a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ x: 5 }}
                        className="group cursor-pointer block border-b border-gray-100/50 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                            item.sentiment === 'Positive' ? 'bg-lime-400 text-gray-900' :
                            item.sentiment === 'Negative' ? 'bg-rose-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>{item.sentiment}</span>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                            {item.publisher} • {cleanTicker}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                      </motion.a>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-10 font-bold">No live headlines found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Smart Weight Adjustments */}
          <div className="bg-gray-900 rounded-[48px] p-10 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-lime-400" />
                <h3 className="text-lg font-bold">Smart Weight Adjustments</h3>
              </div>
              <button
                onClick={() => setIsAdjustmentExpanded(!isAdjustmentExpanded)}
                className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                {isAdjustmentExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-white/60 font-medium italic leading-relaxed">
                {loading ? 'Evaluating dynamic portfolio hedges...' : getDynamicAdjustmentMessage()}
              </p>
              {isAdjustmentExpanded && !loading && data?.asset_breakdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 mt-4 border-t border-white/10"
                >
                  {Object.entries(data.asset_breakdown).slice(0, 3).map(([ticker, stats]: any) => {
                    const cleanTicker = ticker.split('.')[0];
                    const pos = stats.positive || 0;
                    const neg = stats.negative || 0;
                    const total = pos + neg + (stats.neutral || 0);
                    const score = total > 0 ? (pos - neg) / total : 0;
                    let deltaText = 'Optimized';
                    let deltaColor = 'text-gray-400';
                    if (score > 0.1) { deltaText = 'Increased target weight'; deltaColor = 'text-lime-400'; }
                    else if (score < -0.1) { deltaText = 'Reduced target weight'; deltaColor = 'text-rose-400'; }
                    return (
                      <div key={ticker} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white/80">{cleanTicker} Contribution</span>
                        <span className={`font-black ${deltaColor}`}>{deltaText}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
