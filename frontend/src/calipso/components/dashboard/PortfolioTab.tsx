import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import {
  TrendingUp, Globe, Flag, ShieldCheck, Leaf,
  Sparkles, AlertTriangle, ArrowUpRight, Info
} from 'lucide-react';

// ── Types & helpers ───────────────────────────────────────────────────────────

interface Asset {
  symbol: string;
  name: string;
  usd?: string;
  pkr: string;
  daily: string;
  gain: string;
  color: string;
  market?: string;
  weight?: number;
  price_source?: string;
}

type HoldingsState = 'loading' | 'empty' | 'has_holdings';

const formatRs = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1_000_000) return `Rs ${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `Rs ${(value / 1_000).toFixed(1)}k`;
  return `Rs ${Math.round(value).toLocaleString()}`;
};

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const mapHoldingToAsset = (holding: any): Asset => {
  const market = holding.market || 'INTL';
  const currentValue = Number(holding.current_value_pkr || 0);
  const currentUsd = Number(holding.current_price_usd || 0) * Number(holding.quantity || 0);
  const gainPct = Number(holding.gain_loss_pct || 0);
  
  // Try to use our mapping, or fallback to DB fields
  let assetName = holding.name || holding.asset_class;
  if (!assetName || assetName === 'INTL' || assetName === 'PSX') {
      assetName = symbolToName[holding.symbol] || holding.market || holding.symbol;
  }

  return {
    symbol: holding.symbol,
    name: assetName,
    usd: currentUsd > 0 ? `$${currentUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined,
    pkr: formatRs(currentValue),
    daily: formatPercent(gainPct),
    gain: formatRs(Number(holding.gain_loss_pkr || 0)),
    color: market === 'INTL' ? 'blue' : market === 'PSX' ? 'emerald' : market === 'PKR_BOND' ? 'lime' : 'amber',
    market,
    weight: Number(holding.weight || 0),
    price_source: holding.price_source,
  };
};

const priceSourceBadge = (source?: string) => ({
    "live":        { label: "Live",    color: "text-green-400" },
    "cached":      { label: "Cached",  color: "text-yellow-400" },
    "fixed_rate":  { label: "Fixed",   color: "text-blue-400" },
    "live_gold":   { label: "Live",    color: "text-yellow-500" },
    "mufap_nav":   { label: "NAV",     color: "text-purple-400" },
    "fallback":    { label: "Est.",    color: "text-gray-500" },
}[source || ""] || { label: "—", color: "text-gray-500" });

const symbolToDomain: Record<string, string> = {
  'SPY': 'spdrs.com',
  'QQQ': 'invesco.com',
  'GLD': 'spdrgoldshares.com',
  'BND': 'vanguard.com',
  'VTI': 'vanguard.com',
  'VWO': 'vanguard.com',
  'VNQ': 'vanguard.com',
  'AGG': 'ishares.com',
  'HBL.KA': 'hbl.com',
  'HBL_STOCK': 'hbl.com',
  'HUBC.KA': 'hubpower.com',
  'LUCK.KA': 'lucky-cement.com',
  'MCB.KA': 'mcb.com.pk',
  'MEBL.KA': 'meezanbank.com',
  'OGDC.KA': 'ogdcl.com',
  'PSO.KA': 'psopk.com',
  'SYS.KA': 'systemsltd.com',
  'TRG.KA': 'trgpakistan.com',
  'GOLD': 'gold.org',
  'TBILL_3M': 'treasurydirect.gov',
  'TBILL_12M': 'treasurydirect.gov',
  'USDPKR=X': 'sbp.org.pk'
};

const symbolToName: Record<string, string> = {
  'SPY': 'S&P 500 ETF',
  'QQQ': 'Invesco QQQ Trust',
  'GLD': 'SPDR Gold Shares',
  'BND': 'Vanguard Total Bond Market',
  'VTI': 'Vanguard Total Stock Market',
  'VWO': 'Vanguard Emerging Markets',
  'VNQ': 'Vanguard Real Estate',
  'AGG': 'iShares Core US Aggregate Bond',
  'HBL.KA': 'Habib Bank Limited',
  'HBL_STOCK': 'Habib Bank Limited',
  'HUBC.KA': 'Hub Power Company',
  'LUCK.KA': 'Lucky Cement',
  'MCB.KA': 'MCB Bank',
  'MEBL.KA': 'Meezan Bank',
  'OGDC.KA': 'Oil & Gas Dev Co.',
  'PSO.KA': 'Pakistan State Oil',
  'SYS.KA': 'Systems Limited',
  'TRG.KA': 'TRG Pakistan',
  'GOLD': 'Physical Gold Commodity',
  'TBILL_3M': '3-Month T-Bill',
  'TBILL_12M': '12-Month T-Bill',
  'USDPKR=X': 'USD/PKR Forex'
};

const AssetIcon = ({ symbol }: { symbol: string }) => {
  const [imgError, setImgError] = useState(false);
  const domain = symbolToDomain[symbol];

  if (!domain || imgError) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-xs text-gray-500 shrink-0 border border-gray-100">
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden p-1 shadow-sm">
      <img
        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`}
        alt={symbol}
        className="w-full h-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const AssetRow: React.FC<{ h: Asset; isInternational?: boolean; hasLossOpportunity?: boolean }> = ({
  h, isInternational, hasLossOpportunity,
}) => (
  <motion.div
    whileHover={{ scale: 1.01, x: 4 }}
    className="flex items-center gap-4 p-4 hover:bg-white/40 transition-all cursor-pointer border-b border-gray-100/30 last:border-0 relative"
  >
    <AssetIcon symbol={h.symbol} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900 shrink-0">{h.symbol}</span>
        {isInternational && <span className="text-xs font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md uppercase tracking-tighter">US</span>}
        {hasLossOpportunity && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"
            title="Tax Loss Opportunity Detected"
          />
        )}
      </div>
      <div className="text-xs text-gray-500 font-medium truncate">{h.name}</div>
    </div>
    <div className="text-right shrink-0">
      <div className="text-sm font-black text-gray-900">{isInternational ? h.usd : h.pkr}</div>
      <div className="flex items-center justify-end gap-2 mt-0.5">
        <div className={`text-xs font-bold ${h.daily.startsWith('+') ? 'text-lime-600' : 'text-rose-500'}`}>{h.daily}</div>
        <span className={`text-[10px] uppercase font-black tracking-widest ${priceSourceBadge(h.price_source).color}`}>
          {priceSourceBadge(h.price_source).label}
        </span>
      </div>
    </div>
  </motion.div>
);

const HoldingSkeleton = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex items-center gap-4 p-4 border-b border-gray-100/30 last:border-0 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-gray-100 rounded-full" />
          <div className="h-3 w-36 bg-gray-100 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-100 rounded-full" />
          <div className="h-3 w-12 bg-gray-100 rounded-full ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

const HoldingsCard = ({
  title, subtitle, icon, holdings, loading, isInternational = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  holdings: Asset[];
  loading: boolean;
  isInternational?: boolean;
}) => (
  <div className="bg-white/60 rounded-[56px] p-10 border border-white shadow-xl shadow-gray-200/20 overflow-hidden flex flex-col min-h-[300px]">
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
    </div>
    {loading ? (
      <HoldingSkeleton />
    ) : holdings.length > 0 ? (
      <div className="space-y-1">
        {holdings.map(h => (
          <AssetRow
            key={`${h.market}-${h.symbol}`}
            h={h}
            isInternational={isInternational}
            hasLossOpportunity={Number(h.daily.replace('%', '')) < -5}
          />
        ))}
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-white/40 p-8 text-center">
        <p className="text-sm font-bold text-gray-400">No holdings in this bucket yet.</p>
      </div>
    )}
  </div>
);

// ── PortfolioTab ──────────────────────────────────────────────────────────────

export const PortfolioTab = ({ onOpenDeposit }: { onOpenDeposit: () => void }) => {
  const [holdingsState, setHoldingsState] = useState<HoldingsState>('loading');
  const [holdingsData, setHoldingsData] = useState<any>(null);
  const [esgData, setEsgData] = useState<any>(null);
  const [simulated, setSimulated] = useState(false);
  const [loadTime, setLoadTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldingsAndEsg = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setHoldingsState('loading');
    const start = Date.now();

    try {
      const resHoldings = await axios.get('/api/portfolio/holdings', { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 
      });
      setHoldingsData(resHoldings.data);
      setHoldingsState((resHoldings.data.holdings || []).length > 0 ? 'has_holdings' : 'empty');
      setLoadTime(((Date.now() - start) / 1000).toFixed(1));
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch portfolio holdings:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Price data temporarily unavailable — showing last known values');
      } else {
        setError('Failed to load portfolio');
      }
      setHoldingsData(null);
      setHoldingsState('empty');
    }

    try {
      const resEsg = await axios.get('/api/portfolio/esg', { headers: { Authorization: `Bearer ${token}` } });
      setEsgData(resEsg.data);
    } catch (err) {
      console.error('Failed to fetch ESG data:', err);
    }
  };

  useEffect(() => {
    fetchHoldingsAndEsg();
    const interval = setInterval(fetchHoldingsAndEsg, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loading = holdingsState === 'loading';
  const assets = (holdingsData?.holdings || []).map(mapHoldingToAsset);
  const globalHoldings = assets.filter((h: Asset) => h.market === 'INTL');
  const psxHoldings = assets.filter((h: Asset) => h.market === 'PSX');
  const fixedIncomeHoldings = assets.filter((h: Asset) => h.market === 'PKR_BOND');
  const alternativeHoldings = assets.filter((h: Asset) => ['COMMODITY', 'MUFAP'].includes(h.market || ''));

  const totalValue = Number(holdingsData?.total_value_pkr || 0);
  const growth = Number(holdingsData?.total_gain_pct || 0);
  const fxEdge = Number(holdingsData?.fx_edge_pkr || 0);
  const lastUpdated = holdingsData?.as_of
    ? new Date(holdingsData.as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';

  const bucketTotal = (items: Asset[]) =>
    items.reduce((sum, h) => {
      const raw = (holdingsData?.holdings || []).find((item: any) => item.symbol === h.symbol && item.market === h.market);
      return sum + Number(raw?.current_value_pkr || 0);
    }, 0);

  const allocationBuckets = [
    { label: 'Global',       value: bucketTotal(globalHoldings),       color: 'bg-blue-500',    text: 'text-blue-400' },
    { label: 'Pakistan',     value: bucketTotal(psxHoldings),          color: 'bg-emerald-400', text: 'text-emerald-400' },
    { label: 'Fixed Income', value: bucketTotal(fixedIncomeHoldings),  color: 'bg-lime-400',    text: 'text-lime-400' },
    { label: 'Alternatives', value: bucketTotal(alternativeHoldings),  color: 'bg-amber-400',   text: 'text-amber-400' },
  ].filter(b => b.value > 0);

  return (
    <div className="flex-1 flex flex-col gap-10 pb-20 overflow-y-auto pr-2 scrollbar-hide">
      {/* Premium Hero Stats */}
      <section className="relative rounded-[56px] overflow-hidden bg-gray-900 p-8 md:p-12 min-h-[440px] flex flex-col justify-between group">
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute -top-1/2 -right-1/4 w-full h-full bg-blue-600 rounded-full blur-[160px]"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }}
            transition={{ duration: 12, repeat: Infinity, delay: 2 }}
            className="absolute top-1/4 -left-1/4 w-full h-full bg-lime-600 rounded-full blur-[140px]"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <TrendingUp className="w-5 h-5 text-lime-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase text-gray-500 tracking-[0.2em]">Live Assets</span>
                <span className="text-xs font-bold text-white/50">Last refresh {lastUpdated}</span>
              </div>
              {loadTime && !loading && (
                <div className="ml-4 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Loaded in {loadTime}s
                  </span>
                </div>
              )}
            </div>
            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-sm font-bold text-rose-200">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="h-24 md:h-28 w-72 bg-white/10 rounded-[32px] animate-pulse mb-10" />
            ) : (
              <h1 className="text-7xl md:text-[100px] font-black text-white font-display tracking-tight leading-[0.85] mb-10">
                {formatRs(totalValue)}
              </h1>
            )}
            <div className="flex flex-wrap gap-4">
              <div className="glass-pill px-6 py-4 rounded-3xl flex items-center gap-4 border-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 bg-lime-400 text-gray-900 rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-black uppercase tracking-widest">Growth</span>
                  <span className="text-white text-lg font-bold leading-tight">{loading ? '--' : formatPercent(growth)}</span>
                </div>
              </div>
              <div className="glass-pill px-6 py-4 rounded-3xl flex items-center gap-4 border-white/5">
                <div className="w-10 h-10 bg-blue-400/20 text-blue-400 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-black uppercase tracking-widest">FX Edge</span>
                  <span className="text-white text-lg font-bold leading-tight">{loading ? '--' : formatRs(fxEdge)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-72 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-black uppercase text-gray-500 tracking-[0.1em]">Allocation Matrix</span>
              <Info className="w-4 h-4 text-white/20" />
            </div>
            <div className="space-y-6">
              {loading ? (
                [0, 1, 2].map(item => (
                  <div key={item} className="space-y-2 animate-pulse">
                    <div className="h-3 w-28 bg-white/10 rounded-full" />
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                  </div>
                ))
              ) : allocationBuckets.length > 0 ? allocationBuckets.map(bucket => {
                const pct = totalValue > 0 ? Math.round((bucket.value / totalValue) * 100) : 0;
                return (
                  <div key={bucket.label} className="space-y-2">
                    <div className="flex justify-between text-xs text-white/80 font-bold mb-1">
                      <span>{bucket.label}</span>
                      <span className={`font-black ${bucket.text}`}>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className={`h-full ${bucket.color} rounded-full`}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm font-bold text-white/40">No allocation data yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 mt-12 overflow-x-auto scrollbar-hide py-2">
          <button onClick={onOpenDeposit} className="px-10 py-5 bg-white text-gray-900 rounded-[28px] font-black uppercase tracking-widest text-xs hover:bg-lime-400 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 shadow-2xl shadow-white/5">Add Funds</button>
          <button className="px-8 py-5 border border-white/10 glass-pill text-white font-bold rounded-[28px] hover:bg-white/5 transition-all shrink-0">Download Reports</button>
        </div>
      </section>

      {holdingsState === 'empty' && (
        <div className="bg-white/70 rounded-[48px] p-10 border border-white shadow-xl shadow-gray-200/20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">No holdings yet.</h3>
            <p className="text-gray-500 font-bold">Add Funds to deploy your first AI-optimized portfolio.</p>
          </div>
          <button onClick={onOpenDeposit} className="px-8 py-5 bg-gray-900 text-white rounded-[28px] font-black uppercase tracking-widest text-xs hover:bg-primary transition-all">
            Add Funds
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Holdings Hub */}
        <div className="xl:col-span-8 flex flex-col gap-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <HoldingsCard title="Global" subtitle="INTL holdings" icon={<div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center"><Globe className="w-6 h-6 text-blue-600" /></div>} holdings={globalHoldings} loading={loading} isInternational />
            <HoldingsCard title="Pakistan PSX" subtitle="Local equities" icon={<div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><Flag className="w-6 h-6 text-emerald-600" /></div>} holdings={psxHoldings} loading={loading} />
            <HoldingsCard title="Fixed Income" subtitle="T-Bills and bonds" icon={<div className="w-12 h-12 bg-lime-50 rounded-2xl flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-lime-600" /></div>} holdings={fixedIncomeHoldings} loading={loading} />
            <HoldingsCard title="Alternative Assets" subtitle="Gold and mutual funds" icon={<div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center"><Leaf className="w-6 h-6 text-amber-600" /></div>} holdings={alternativeHoldings} loading={loading} />
          </div>

          {/* Benchmarking Module */}
          <div className="bg-gray-900 rounded-[56px] p-10 border border-white/10 shadow-2xl flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Portfolio Alpha</h3>
                <p className="text-sm text-gray-500 font-medium italic">Comparison against KSE-100 Benchmark</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-lime-400 rounded-lg" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white/10 rounded-lg" />
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">Market</span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[160px] flex items-end gap-2 md:gap-4 px-2">
              {assets.length > 0 ? assets.slice(0, 11).map((h: Asset, i: number) => {
                const heightPct = Math.max(10, Math.min(100, (h.weight || 0) * 100 * 3)); // scale for visibility
                return (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="relative w-full flex flex-col items-center justify-end h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
                      className={`w-full max-w-[12px] rounded-full transition-all group-hover:scale-x-125 ${i === 0 ? 'bg-lime-400 shadow-[0_-8px_30px_rgba(163,230,71,0.6)]' : 'bg-white/10'}`}
                      title={`${h.symbol}: ${formatPercent((h.weight || 0) * 100)}`}
                    />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 uppercase truncate w-full text-center">{h.symbol.slice(0,4)}</span>
                </div>
              )}) : (
                <div className="w-full flex items-center justify-center text-white/40 text-xs font-bold">No portfolio alpha data</div>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Pillar */}
        <div className="xl:col-span-4 flex flex-col gap-10">
          {/* Smart Loss Module */}
          <div className="bg-amber-100 rounded-[56px] p-10 border border-amber-200 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300 opacity-20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-white text-amber-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-900 leading-[1.1]">Optimization Alert</h3>
                  <p className="text-xs font-black text-amber-700/60 uppercase tracking-widest mt-1">Smart Loss Strategy</p>
                </div>
              </div>

              <div className="space-y-6">
              {(() => {
                const sortedHoldings = [...(holdingsData?.holdings || [])].sort((a: any, b: any) => (a.gain_loss_pct || 0) - (b.gain_loss_pct || 0));
                const worst = sortedHoldings.length > 0 && sortedHoldings[0].gain_loss_pct < -2 ? sortedHoldings[0] : null;

                if (!worst) {
                  return (
                    <div className="bg-emerald-50/80 backdrop-blur-sm rounded-[32px] p-8 border border-emerald-200/50">
                      <p className="text-sm font-bold text-emerald-900/70 mb-8 leading-relaxed">
                        No significant losses detected for tax harvesting. Your portfolio is highly efficient right now!
                      </p>
                    </div>
                  );
                }

                const lossAmount = Math.abs(worst.gain_loss_pkr || 0);

                return (
                  <div className="bg-amber-50/80 backdrop-blur-sm rounded-[32px] p-8 border border-amber-200/50">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs font-black text-amber-900/60 uppercase tracking-widest">Holding: {worst.symbol.replace('.KA', '')}</span>
                      <span className="text-xs font-black bg-rose-500 text-white px-3 py-1 rounded-full">{worst.gain_loss_pct.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm font-bold text-amber-900/70 mb-8 leading-relaxed">
                      Close this position to offset capital gains against <span className="text-amber-900 underline underline-offset-4 decoration-amber-300 font-black">Rs {lossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> in estimated taxes.
                    </p>
                    <button
                      onClick={() => setSimulated(!simulated)}
                      className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${simulated ? 'bg-emerald-500 text-white shadow-emerald-400/20' : 'bg-gray-900 text-white shadow-gray-900/20'}`}
                    >
                      {simulated ? 'Result: Optimal' : 'Simulate Harvesting'}
                    </button>
                  </div>
                );
              })()}
                {simulated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 p-8 rounded-[36px] border border-emerald-100 flex items-center gap-5 mt-6"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Tax Efficiency</div>
                      <div className="text-2xl font-black text-emerald-600">Saved!</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* ESG Score Widget */}
          <div className="bg-white rounded-[56px] p-10 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black text-gray-900">ESG Matrix</h3>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <Leaf className="w-5 h-5 text-lime-500" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="relative w-48 h-48 mb-10 group cursor-help">
                <svg className="w-full h-full -rotate-90 scale-x-[-1]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke="#f8fafc" strokeWidth="12" fill="transparent" />
                  <motion.circle
                    cx="50" cy="50" r="44"
                    stroke="#BEF264" strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="276.46"
                    initial={{ strokeDashoffset: 276.46 }}
                    animate={{ strokeDashoffset: 276.46 - (276.46 * ((esgData?.portfolio_esg?.total_score || 0) / 100)) }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(190,242,100,0.4)] transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black text-gray-900 tracking-tighter">
                    {esgData?.portfolio_esg?.total_score ? Math.round(esgData.portfolio_esg.total_score) : '--'}
                  </span>
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    {esgData?.portfolio_esg?.total_score >= 70 ? 'High' : esgData?.portfolio_esg?.total_score >= 50 ? 'Med' : esgData ? 'Low' : 'N/A'}
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2 font-display">Conscious Investor</h4>
              <p className="text-sm text-gray-500 font-medium font-urdu leading-relaxed text-balance px-4 opacity-80">
                آپ کا پورٹ فولیو ماحولیاتی اور سماجی لحاظ سے {esgData?.portfolio_esg?.total_score ? Math.round(esgData.portfolio_esg.total_score) : 0} فیصد عالمی معیارات پر پورا اترتا ہے۔
              </p>
            </div>
            <div className="mt-12 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Benchmarked</span>
                <span className="text-xs font-bold text-gray-500">May 2026 Index</span>
              </div>
              <button className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <ArrowUpRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
