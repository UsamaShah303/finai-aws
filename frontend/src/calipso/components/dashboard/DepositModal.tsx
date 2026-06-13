import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Wallet, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  DollarSign, 
  TrendingUp,
  BrainCircuit,
  Sparkles,
  PieChart
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  riskScore: number;
}

type Step = 'AMOUNT' | 'CONFIRM' | 'INVESTING' | 'SUCCESS' | 'ERROR';

const STEPS = [
  'Analysing your risk profile...',
  'Fetching live market data...',
  'Running MPT optimisation...',
  'Generating AI explanations...',
  'Building your portfolio...',
];

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess, riskScore }) => {
  const [step, setStep] = useState<Step>('AMOUNT');
  const [amount, setAmount] = useState<string>('');
  const [monthlyDeposit, setMonthlyDeposit] = useState<string>('0');
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorRedirect, setErrorRedirect] = useState('');
  const navigate = useNavigate();
  
  const presets = currency === 'USD' ? [100, 500, 1000, 5000] : [25000, 50000, 100000, 500000];
  const exchangeRate = 280; // 1 USD = 280 PKR for simulation

  useEffect(() => {
    if (step !== 'INVESTING') return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [step]);

  const handleDeposit = async () => {
    setLoading(true);
    setErrorMessage('');
    setCurrentStep(0);
    setStep('INVESTING');

    try {
      const numericAmount = parseFloat(amount);
      const totalPkr = currency === 'PKR'
        ? numericAmount
        : numericAmount * exchangeRate;
      const token = localStorage.getItem('token');

      await axios.post('/api/invest/auto', {
        total_pkr: totalPkr,
        monthly_deposit: parseFloat(monthlyDeposit) || 0,
        years: 10,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem('last_invest_at', new Date().toISOString());
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Investment deployment failed:', err);
      setErrorMessage(err?.response?.data?.error || 'We could not deploy the portfolio. Please try again.');
      setErrorRedirect(err?.response?.data?.redirect || '');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    switch(step) {
      case 'AMOUNT': return 25;
      case 'CONFIRM': return 50;
      case 'INVESTING': return 75;
      case 'SUCCESS': return 100;
      case 'ERROR': return 100;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden min-h-[600px] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Wallet className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Virtual Wallet</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Secure AI Bridge</p>
               </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-8 mb-8">
             <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={false}
                  animate={{ width: `${getStepProgress()}%` }}
                  className="h-full bg-primary" 
                />
             </div>
          </div>

          {/* Body */}
          <div className="flex-1 px-8 pb-10 flex flex-col">
            <AnimatePresence mode="wait">
              {step === 'AMOUNT' && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Set Deposit Amount</h2>
                    <p className="text-gray-500 font-medium">How much would you like to invest through AI?</p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex justify-center">
                      <div className="inline-flex bg-gray-100 p-1 rounded-2xl">
                        <button 
                          onClick={() => setCurrency('USD')}
                          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${currency === 'USD' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                        >USD</button>
                        <button 
                          onClick={() => setCurrency('PKR')}
                          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${currency === 'PKR' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                        >PKR</button>
                      </div>
                    </div>

                    <div className="relative group">
                       <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-500 group-focus-within:text-primary transition-colors">
                          {currency === 'USD' ? '$' : '₨'}
                       </span>
                       <input 
                         type="number"
                         autoFocus
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         placeholder="0.00"
                         className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[32px] py-10 pl-16 pr-8 text-5xl font-black text-gray-900 outline-none transition-all placeholder:text-gray-200"
                       />
                     </div>

                     <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">
                          Monthly deposit (optional)
                        </label>
                        <div className="relative group">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400 group-focus-within:text-primary transition-colors">
                              ₨
                           </span>
                           <input
                             type="number"
                             value={monthlyDeposit}
                             onChange={(e) => setMonthlyDeposit(e.target.value)}
                             placeholder="0"
                             className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[24px] py-5 pl-12 pr-6 text-2xl font-black text-gray-900 outline-none transition-all placeholder:text-gray-200"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-4 gap-3">
                       {presets.map(p => (
                         <button 
                           key={p}
                           onClick={() => setAmount(p.toString())}
                           className="py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:border-primary/30 hover:text-primary transition-all shadow-sm"
                         >
                            +{p}
                         </button>
                       ))}
                    </div>

                    {currency === 'PKR' && amount && (
                      <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-widest">
                         ≈ ${(parseFloat(amount) / exchangeRate).toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!amount || parseFloat(amount) <= 0}
                    onClick={() => setStep('CONFIRM')}
                    className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-800 transition-all disabled:opacity-50 mt-4 group"
                  >
                    Review Transaction
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              )}

              {step === 'CONFIRM' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Confirm Deposit</h2>
                    <p className="text-gray-500 font-medium">Verify your investment details</p>
                  </div>

                  <div className="bg-gray-50 rounded-[40px] p-8 space-y-6">
                     <div className="flex justify-between items-center pb-6 border-b border-gray-200/60">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Amount</span>
                        <span className="text-3xl font-black text-gray-900">
                          {currency === 'USD' ? '$' : '₨'}{parseFloat(amount).toLocaleString()}
                        </span>
                     </div>
                      <div className="flex justify-between items-center pb-6 border-b border-gray-200/60">
                         <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Strategy</span>
                         <span className="flex items-center gap-2 text-gray-900 font-black">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Optimized Growth ({riskScore}/100)
                         </span>
                      </div>
                      <div className="flex justify-between items-center pb-6 border-b border-gray-200/60">
                         <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Monthly Deposit</span>
                         <span className="text-gray-900 font-black">₨{(parseFloat(monthlyDeposit) || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Target</span>
                        <span className="text-gray-900 font-black">AI Managed Portfolio</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleDeposit}
                      className="w-full bg-primary text-white py-6 rounded-[28px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-primary/20"
                    >
                      Authorize & Invest
                      <Zap className="w-4 h-4 fill-white" />
                    </button>
                    <button
                      onClick={() => setStep('AMOUNT')}
                      className="w-full text-gray-500 py-4 font-black uppercase tracking-widest text-[10px] hover:text-gray-900 transition-all"
                    >
                      Back to edit
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'INVESTING' && (
                <motion.div
                  key="investing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="relative mb-12">
                    <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                       className="w-48 h-48 rounded-full border-2 border-dashed border-primary/30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <motion.div
                         animate={{ scale: [1, 1.1, 1] }}
                         transition={{ duration: 2, repeat: Infinity }}
                         className="w-32 h-32 bg-primary flex items-center justify-center rounded-[40px] shadow-2xl shadow-primary/40"
                       >
                          <BrainCircuit className="w-16 h-16 text-white" />
                       </motion.div>
                    </div>
                    {/* Animated Particles */}
                    <div className="absolute inset-0">
                       {[...Array(6)].map((_, i) => (
                         <motion.div
                           key={i}
                           animate={{ 
                             x: Math.cos(i * 60 * Math.PI / 180) * 80,
                             y: Math.sin(i * 60 * Math.PI / 180) * 80,
                             opacity: [0, 1, 0]
                           }}
                           transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                           className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full"
                         />
                       ))}
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                     <h2 className="text-3xl font-black text-gray-900">AI At Work</h2>
                      <div className="flex flex-col gap-2">
                         <motion.p 
                           key={currentStep}
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           transition={{ duration: 0.35 }}
                           className="text-gray-500 font-bold"
                         >{STEPS[currentStep]}</motion.p>
                         <div className="flex items-center justify-center gap-6 mt-4">
                            {STEPS.slice(0, 3).map((label, index) => (
                              <React.Fragment key={label}>
                                <div className="flex flex-col items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${index <= currentStep ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                                    {index === 0 ? (
                                  <Sparkles className="w-4 h-4" />
                                    ) : index === 1 ? (
                                  <PieChart className="w-4 h-4" />
                                    ) : (
                                      <TrendingUp className="w-4 h-4" />
                                    )}
                               </div>
                                  <span className={`text-[10px] font-black uppercase ${index <= currentStep ? 'text-primary' : 'text-gray-300'}`}>
                                    {index === 0 ? 'Analysing' : index === 1 ? 'Optimising' : 'Building'}
                                  </span>
                            </div>
                                {index < 2 && <ChevronRight className="w-4 h-4 text-gray-200" />}
                              </React.Fragment>
                            ))}
                         </div>
                      </div>
                  </div>
                </motion.div>
              )}

              {step === 'SUCCESS' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center space-y-8 py-10"
                >
                  <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 mb-4">
                     <CheckCircle2 className="w-12 h-12" />
                  </div>
                  
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 mb-2">Investment Active!</h2>
                    <p className="text-gray-500 font-medium max-w-[280px] mx-auto">
                      Your {currency === 'USD' ? '$' : '₨'}{amount} has been successfully deployed.
                    </p>
                  </div>

                  <div className="bg-emerald-50 rounded-[32px] p-8 w-full border border-emerald-100/50">
                     <div className="flex items-center justify-between font-black text-emerald-900">
                        <span className="text-xs uppercase tracking-widest">Portfolio Deployed</span>
                        <span className="text-2xl">Live</span>
                      </div>
                   </div>

                  <button
                    onClick={() => {
                      onSuccess();
                      onClose();
                    }}
                    className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black uppercase tracking-widest text-xs"
                  >
                    Done
                  </button>
                </motion.div>
              )}

              {step === 'ERROR' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center space-y-8 py-10"
                >
                  <div className="w-24 h-24 bg-rose-500 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-rose-500/30 mb-4">
                     <X className="w-12 h-12" />
                  </div>

                  <div>
                    <h2 className="text-4xl font-black text-gray-900 mb-2">Deployment Paused</h2>
                    <p className="text-gray-500 font-medium max-w-[320px] mx-auto">
                      {errorMessage}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    {errorRedirect ? (
                      <button
                        onClick={() => {
                          onClose();
                          navigate(errorRedirect);
                        }}
                        className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black uppercase tracking-widest text-xs"
                      >
                        Take Risk Quiz
                      </button>
                    ) : (
                      <button
                        onClick={handleDeposit}
                        disabled={loading}
                        className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black uppercase tracking-widest text-xs disabled:opacity-60"
                      >
                        {loading ? 'Retrying...' : 'Retry Deployment'}
                      </button>
                    )}
                    <button
                      onClick={() => setStep('AMOUNT')}
                      className="w-full text-gray-500 py-4 font-black uppercase tracking-widest text-[10px] hover:text-gray-900 transition-all"
                    >
                      Back to amount
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
