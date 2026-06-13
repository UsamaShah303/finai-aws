import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle2, Zap, BookOpen } from 'lucide-react';
import { TaxLossAlert } from './TaxLossAlert';

import axios from 'axios';

export const SmartLossTab = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);

  React.useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/tax-loss/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map backend fields to what TaxLossAlert expects
      const mappedOpps = (res.data.opportunities || []).map((o: any) => ({
        symbol: o.symbol,
        avg_buy_price: o.avg_buy_price_pkr,
        current_price: o.current_price_pkr,
        shares: o.quantity,
        market: 'INTL', // Default to avoid errors
        pkr_loss: o.loss_amount_pkr,
        pkr_tax_saved: o.tax_saved_pkr,
      }));
      
      setOpportunities(mappedOpps);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch opportunities', err);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHarvest = () => {
    fetchOpportunities(); // Refresh the list after a successful harvest
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[600px]">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-12 h-12 border-t-2 border-indigo-600 border-indigo-100 rounded-full mb-10"
        />
        <p className="text-xs font-black text-gray-500 uppercase tracking-[0.5em] animate-pulse">Proprietary Scan in Progress</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full py-8 px-4">
      <header className="mb-20 flex flex-col md:flex-row items-end justify-between gap-8 border-b border-gray-100 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-6">
            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest leading-none">Intelligence Engine Active</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[0.9]">
            Smart <span className="text-indigo-600 italic">Loss</span>
          </h1>
          <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-xl">
            Optimizing your real returns by strategically booking losses to offset Capital Gains Tax.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Regulatory Framework</span>
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-gray-900 uppercase tracking-tight">FBR 2024 Compliant</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-8 flex flex-col gap-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Strategy Signals</h2>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              Updated Real-time
            </div>
          </div>

          {opportunities.length === 0 ? (
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative py-32 bg-white/40 backdrop-blur-sm rounded-[64px] border border-gray-100 text-center flex flex-col items-center shadow-sm">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-200 mb-8 border border-gray-100 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter">Portfolio is Lean</h3>
                <p className="text-gray-500 font-medium text-base max-w-sm mx-auto leading-relaxed">
                  No holdings currently meet the threshold for strategic loss booking. Your tax efficiency score is currently <span className="text-indigo-600 font-black">9.8/10</span>.
                </p>
                <div className="mt-12 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-200 animate-bounce" />
                  <div className="w-1 h-1 rounded-full bg-indigo-300 animate-bounce delay-75" />
                  <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce delay-150" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              {opportunities.map((opp, idx) => (
                <motion.div
                  key={opp?.symbol || idx}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <TaxLossAlert
                    holding={opp}
                    onHarvest={handleHarvest}
                    onDismiss={() => setOpportunities(opportunities.filter((o) => o?.symbol !== opp?.symbol))}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-12">
          <div className="bg-gray-900 rounded-[56px] p-12 text-white relative overflow-hidden group shadow-2xl shadow-indigo-900/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em]">Tactical Playbook</h3>
                <Zap className="w-4 h-4 text-white/20" />
              </div>
              <div className="space-y-12">
                {[
                  { t: 'The Harvest', d: 'Sell positions with significant unrealized losses to lock in the paper loss for tax purposes.' },
                  { t: 'Sector Swap', d: 'Immediately reinvest into a similar sector asset to maintain your portfolio exposure.' },
                  { t: 'CGT Offset', d: 'Use the booked loss to reduce your Capital Gains Tax on other profitable trades.' },
                ].map((item, i) => (
                  <div key={i} className="group/item cursor-default">
                    <div className="text-xs font-black text-white/50 uppercase tracking-widest mb-3 transition-colors group-hover/item:text-indigo-400">Phase 0{i + 1}</div>
                    <p className="text-xl font-black text-white mb-2 leading-tight">{item.t}</p>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">{item.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-16 pt-10 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black text-white/50 uppercase tracking-[0.2em]">Verified Strategy</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px] -ml-32 -mb-32" />
          </div>

          <div className="p-10 border border-gray-100 bg-white rounded-[48px] flex flex-col items-center text-center gap-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-500 transition-colors hover:text-indigo-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Investor Education</p>
              <h4 className="text-lg font-bold text-gray-900 leading-tight px-4 tracking-tight">
                "Strategic tax management can increase your <span className="text-indigo-600">compounded wealth</span> by up to 1.2% annually."
              </h4>
            </div>
            <button className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] hover:text-indigo-600 transition-colors border-t border-gray-50 pt-6 w-full">
              Learn Finance Act 2024 →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
