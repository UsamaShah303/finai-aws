import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Brain, DollarSign, TrendingUp, ShieldCheck, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';

const fmtPKR = (v) => `PKR ${Math.round(v).toLocaleString()}`;

const categoryInfo = {
  needs:       { color: '#3b82f6', emoji: '🏠', desc: 'Rent, utilities, groceries, insurance — necessary living expenses.' },
  wants:       { color: '#8b5cf6', emoji: '🎮', desc: 'Entertainment, dining out, subscriptions — enjoyable discretionary spending.' },
  savings:     { color: '#22c55e', emoji: '🏦', desc: 'Emergency fund, short-term goals — your financial safety net.' },
  investments: { color: '#f59e0b', emoji: '📈', desc: 'Stocks, bonds, ETFs — money compounding for your future.' },
};

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export default function PaycheckPage() {
  const [income, setIncome] = useState(150000);
  const [inputIncome, setInputIncome] = useState('150000');
  const [splits, setSplits] = useState({ needs: 50, wants: 15, savings: 20, investments: 15 });
  const [aiReason, setAiReason] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* Fetch AI recommendation on mount */
  useEffect(() => {
    fetchRecommendation(income);
  }, []);

  const fetchRecommendation = async (incomeValue) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        '/api/paycheck/recommend',
        { monthly_income_pkr: incomeValue },
        authHeader()
      );
      const pct = res.data.allocations_pct;
      setSplits({
        needs:       pct.needs,
        wants:       pct.wants,
        savings:     pct.savings,
        investments: pct.investments,
      });
      setAiReason(res.data.reason);
      setRiskLevel(res.data.risk_level);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not fetch AI recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = () => {
    const val = Number(inputIncome);
    if (val > 0) {
      setIncome(val);
      fetchRecommendation(val);
    }
  };

  const updateSplit = (key, val) => {
    const remaining = 100 - val;
    const others = Object.keys(splits).filter(k => k !== key);
    const currentOthersTotal = others.reduce((s, k) => s + splits[k], 0);
    const newSplits = { ...splits, [key]: val };
    others.forEach(k => {
      newSplits[k] = currentOthersTotal > 0
        ? Math.round((splits[k] / currentOthersTotal) * remaining)
        : Math.round(remaining / others.length);
    });
    setSplits(newSplits);
  };

  const resetToAI = () => fetchRecommendation(income);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-surface-900 dark:text-white">Paycheck Splitter</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">AI-powered income allocation tailored to your risk profile.</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* AI Recommendation Banner */}
      <div className="neo-card p-6 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
            {loading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Brain className="w-6 h-6 text-white" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">AI Recommendation</h3>
              {riskLevel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  {riskLevel} Profile
                </span>
              )}
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              {loading ? 'Fetching personalised recommendation…' : aiReason || 'Enter your income and click Apply to get your AI split.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Income input + Sliders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income input */}
          <div className="neo-card p-6">
            <label className="block text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
              Monthly Income (PKR)
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="number"
                  value={inputIncome}
                  onChange={(e) => setInputIncome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIncomeSubmit()}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-2xl font-bold text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="150000"
                />
              </div>
              <button
                onClick={handleIncomeSubmit}
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-[#ccff00] text-slate-900 font-extrabold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Apply
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="neo-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Allocation Sliders</h3>
              <button onClick={resetToAI} disabled={loading} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-40">
                Reset to AI
              </button>
            </div>

            {Object.entries(splits).map(([key, value]) => {
              const info = categoryInfo[key];
              const amount = Math.round(income * value / 100);
              return (
                <div key={key} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700/50 hover:border-surface-300 dark:hover:border-surface-600 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{info.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-surface-900 dark:text-white capitalize">{key}</h4>
                        <div className="text-right">
                          <span className="text-lg font-black" style={{ color: info.color }}>{value}%</span>
                          <span className="text-sm text-surface-400 ml-2">{fmtPKR(amount)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">{info.desc}</p>
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="100" value={value}
                    onChange={(e) => updateSplit(key, parseInt(e.target.value))}
                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: info.color, background: `linear-gradient(to right, ${info.color} ${value}%, #f3f4f6 ${value}%)` }}
                  />
                  <div className="flex justify-between text-xs text-surface-400 mt-1">
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="neo-card p-6">
            <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">Monthly Summary</h3>
            <div className="space-y-3">
              {Object.entries(splits).map(([key, value]) => {
                const info = categoryInfo[key];
                const amount = Math.round(income * value / 100);
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300 capitalize">{key}</span>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{fmtPKR(amount)}</span>
                  </div>
                );
              })}
              <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Total</span>
                <span className="text-lg font-black text-surface-900 dark:text-white">{fmtPKR(income)}</span>
              </div>
            </div>
          </div>

          {/* Visual stacked bar */}
          <div className="neo-card p-6">
            <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">Visual Split</h3>
            <div className="flex h-8 rounded-xl overflow-hidden">
              {Object.entries(splits).map(([key, value]) => (
                <div
                  key={key}
                  className="transition-all duration-500 flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${value}%`, backgroundColor: categoryInfo[key].color, minWidth: value > 5 ? 'auto' : 0 }}
                >
                  {value > 8 && `${value}%`}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {Object.entries(splits).map(([key]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryInfo[key].color }} />
                  <span className="text-xs text-surface-500 capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
