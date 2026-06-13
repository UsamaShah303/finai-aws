/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Bell,
  Home,
  LayoutGrid,
  CreditCard,
  Target,
  User,
  Settings,
  Wallet,
  PieChart as PieChartIcon,
  CloudLightning,
  TrendingUp,
  BrainCircuit,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Lightbulb,
  ShieldCheck,
  Leaf,
  Palette,
  ChevronDown,
} from 'lucide-react';

// Tab components
import { DashboardHome }   from './components/dashboard/DashboardHome';
import { GoalsTab }        from './components/dashboard/GoalsTab';
import { PortfolioTab }    from './components/dashboard/PortfolioTab';
import { SentimentTab }    from './components/dashboard/SentimentTab';
import { SmartLossTab }    from './components/dashboard/SmartLossTab';
import { SHAPExplainer }   from './components/dashboard/SHAPExplainer';
import { ForecastPage }    from './components/dashboard/ForecastPage';
import { PaycheckSplitterPage } from './components/dashboard/PaycheckSplitterPage';
import { ESGPage }         from './components/dashboard/ESGPage';
import { SettingsPage }    from './components/dashboard/SettingsPage';
import { DepositModal }    from './components/dashboard/DepositModal';
import { RiskQuiz, RiskProfile } from './components/onboarding/RiskQuiz';
import { PortfolioPreview } from './components/onboarding/PortfolioPreview';
import { useAuth }         from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

// ── Theme system ──────────────────────────────────────────────────────────────

interface Theme {
  id: string;
  label: string;
  primary: string;
  primaryLight: string;
  mesh: { c1: string; c2: string; c3: string; bg: string };
}

const THEMES: Theme[] = [
  {
    id: 'blue', label: 'Calipso Blue',
    primary: '#2563eb', primaryLight: '#3b82f6',
    mesh: { c1: '#d9f99d', c2: '#60a5fa', c3: '#3b82f6', bg: '#2563eb' },
  },
  {
    id: 'emerald', label: 'Emerald Forest',
    primary: '#059669', primaryLight: '#10b981',
    mesh: { c1: '#34d399', c2: '#065f46', c3: '#10b981', bg: '#064e4b' },
  },
  {
    id: 'purple', label: 'Royal Purple',
    primary: '#7c3aed', primaryLight: '#8b5cf6',
    mesh: { c1: '#c4b5fd', c2: '#4c1d95', c3: '#8b5cf6', bg: '#5b21b6' },
  },
  {
    id: 'rose', label: 'Velvet Rose',
    primary: '#e11d48', primaryLight: '#fb7185',
    mesh: { c1: '#fecdd3', c2: '#9f1239', c3: '#fb7185', bg: '#881337' },
  },
  {
    id: 'azure-emerald', label: 'Azure Emerald',
    primary: '#00c853', primaryLight: '#69f0ae',
    mesh: { c1: '#82baff', c2: '#00c853', c3: '#69f0ae', bg: '#1e88e5' },
  },
];

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutGrid,   label: 'Dashboard' },
  { icon: PieChartIcon, label: 'Portfolio' },
  { icon: Wallet,       label: 'Paycheck Splitter' },
  { icon: Target,       label: 'Goals' },
  { icon: Lightbulb,   label: 'Smart Loss Strategy' },
  { icon: BrainCircuit, label: 'Why AI chose this' },
  { icon: ShieldCheck,  label: 'Risk Assessment' },
  { icon: TrendingUp,   label: 'Forecast' },
  { icon: Leaf,         label: 'ESG & Sustainability' },
  { icon: Newspaper,    label: 'News Sentiment' },
  { icon: Settings,     label: 'Settings' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function CalipsoDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'Dashboard';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [alertCount, setAlertCount]     = useState(2);
  const [isThemeOpen, setIsThemeOpen]   = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [riskProfile, setRiskProfile]   = useState<RiskProfile | null>(null);
  const [showPreview, setShowPreview]   = useState(false);
  const { user, updateUser }            = useAuth();

  const handleQuizComplete = (profile: RiskProfile) => {
    setRiskProfile(profile);
    setShowPreview(true);
  };
  const handlePreviewConfirm = () => {
    updateUser({ onboardingComplete: true });
    setShowPreview(false);
    setIsDepositOpen(true);
  };
  const handleRetakeQuiz = () => {
    setShowPreview(false);
    setRiskProfile(null);
  };

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', currentTheme.primary);
    root.style.setProperty('--primary-light', currentTheme.primaryLight);
    root.style.setProperty('--mesh-color-1', currentTheme.mesh.c1);
    root.style.setProperty('--mesh-color-2', currentTheme.mesh.c2);
    root.style.setProperty('--mesh-color-3', currentTheme.mesh.c3);
    root.style.setProperty('--mesh-bg', currentTheme.mesh.bg);
  }, [currentTheme]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardHome onOpenDeposit={() => setIsDepositOpen(true)} onNavigateToGoals={() => setActiveTab('Goals')} onNavigateToForecast={() => setActiveTab('Forecast')} />;
      case 'Goals':
        return <GoalsTab />;
      case 'Portfolio':
        return <PortfolioTab onOpenDeposit={() => setIsDepositOpen(true)} />;
      case 'News Sentiment':
        return <SentimentTab />;
      case 'Smart Loss Strategy':
        return <SmartLossTab />;
      case 'Why AI chose this':
        return <SHAPExplainer />;
      case 'Forecast':
        return <ForecastPage />;
      case 'Paycheck Splitter':
        return <PaycheckSplitterPage />;
      case 'ESG & Sustainability':
        return <ESGPage />;
      case 'Settings':
        return <SettingsPage />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="text-center p-20 bg-white/40 backdrop-blur-xl rounded-[60px] border border-white">
              <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">{activeTab}</h2>
              <p className="text-gray-500 font-medium text-lg">This section is being synchronized with our prediction engine.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="calipso-scope min-h-screen w-full bg-mesh flex items-center justify-center p-6 lg:p-12 font-sans overflow-hidden relative">
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => setActiveTab('Dashboard')}
        riskScore={riskProfile?.score || 50}
      />

      {/* Background SVG Layers */}
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none opacity-60">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute top-0 transform scale-150 rotate-12 opacity-40">
          <path d="M0,1000 C300,800 400,900 600,600 C800,300 900,400 1000,0 L1000,1000 Z" fill="#65A30D" fillOpacity="0.2" />
        </svg>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute top-0 transform scale-125 -translate-x-1/2 opacity-30">
          <path d="M0,500 C200,600 400,400 600,800 C800,950 1000,600 1000,200 L1000,1000 L0,1000 Z" fill="#3B82F6" fillOpacity="0.1" />
        </svg>
      </div>

      <AnimatePresence mode="wait">
        {showPreview && riskProfile ? (
          <PortfolioPreview
            key="preview"
            riskProfile={riskProfile}
            onConfirm={handlePreviewConfirm}
            onRetake={handleRetakeQuiz}
          />
        ) : activeTab === 'Risk Assessment' ? (
          <RiskQuiz
            key="quiz"
            onComplete={handleQuizComplete}
            onCancel={() => setActiveTab('Dashboard')}
          />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-[1500px] h-full lg:h-[90vh] glass-container rounded-[50px] flex overflow-hidden relative z-10"
          >
            {/* Sidebar */}
            <motion.aside
              animate={{ width: isCollapsed ? 100 : 288 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="hidden lg:flex flex-col py-10 border-r border-white/20 bg-white/10 backdrop-blur-md relative"
            >
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-4 top-12 w-8 h-8 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-primary transition-colors z-50 hover:scale-110"
              >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>

              <div className={`px-8 mb-12 flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : ''}`}>
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 shrink-0">
                  <CloudLightning className="w-6 h-6" />
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-2xl font-black text-primary tracking-tight font-display"
                  >
                    FinAI Nexus
                  </motion.span>
                )}
              </div>

              <div className="flex-1 flex flex-col px-4 gap-2 overflow-y-auto scrollbar-hide py-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.label)}
                    aria-label={item.label}
                    className={`w-full h-12 rounded-2xl flex items-center gap-4 transition-all relative group shadow-sm ${isCollapsed ? 'justify-center px-0' : 'px-5'} ${activeTab === item.label ? 'text-white' : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'}`}
                  >
                    <item.icon
                      className={`w-5 h-5 relative z-10 transition-all duration-300 ${activeTab === item.label ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    {!isCollapsed ? (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm font-bold relative z-10 whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {item.label}
                      </motion.span>
                    ) : (
                      <span className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none shadow-xl z-[100]">
                        {item.label}
                      </span>
                    )}
                    {activeTab === item.label && (
                      <motion.div
                        layoutId="sidebar-nav"
                        className="absolute inset-0 bg-primary rounded-2xl shadow-lg shadow-primary/40"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className={`mt-8 pt-6 border-t border-white/10 ${isCollapsed ? 'px-0 flex justify-center' : 'px-8'}`}>
                <button className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-primary text-white shadow-md transition-transform group-hover:scale-110 shrink-0 flex items-center justify-center font-black">
                    {(user?.name || 'C').charAt(0)}
                  </div>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col items-start leading-tight"
                    >
                      <span className="text-sm font-black text-gray-900">{user?.name || 'Calipso User'}</span>
                      <span className="text-xs font-bold text-gray-500">{user?.email || 'Pro Plan'}</span>
                    </motion.div>
                  )}
                </button>
              </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 p-8 md:p-12 flex flex-col gap-10 overflow-y-auto scrollbar-hide">
              {/* Header */}
              <header className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex lg:hidden items-center gap-3">
                  <div className="flex items-center text-primary font-black text-2xl drop-shadow-sm font-display">
                    FinAI Nexus
                  </div>
                </div>

                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    {activeTab === 'Dashboard' ? 'Dashboard Overview' : activeTab}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#A3E635]">Online</span>
                    <div className="w-1.5 h-1.5 bg-[#A3E635] rounded-full animate-pulse" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Theme picker */}
                  <div className="relative">
                    <button
                      onClick={() => setIsThemeOpen(!isThemeOpen)}
                      className="glass-pill px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/40 shadow-sm hover:bg-white/40 transition-all group"
                    >
                      <Palette className="w-4 h-4 text-primary" />
                      <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{currentTheme.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isThemeOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isThemeOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsThemeOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-2xl rounded-[32px] p-3 border border-white shadow-2xl z-50 flex flex-col gap-1"
                          >
                            {THEMES.map(theme => (
                              <button
                                key={theme.id}
                                onClick={() => { setCurrentTheme(theme); setIsThemeOpen(false); }}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-gray-50 group ${currentTheme.id === theme.id ? 'bg-gray-50' : ''}`}
                              >
                                <div
                                  className="w-10 h-10 rounded-xl relative overflow-hidden flex items-center justify-center text-white font-black text-xs shadow-lg transition-transform group-hover:scale-110"
                                  style={{ backgroundColor: theme.primary }}
                                >
                                  {theme.label.charAt(0)}
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                  <span className={`text-sm font-black ${currentTheme.id === theme.id ? 'text-primary' : 'text-gray-900 group-hover:text-primary transition-colors'}`}>
                                    {theme.label}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interface Theme</span>
                                </div>
                                {currentTheme.id === theme.id && (
                                  <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="glass-pill px-4 py-1.5 rounded-full flex items-center gap-3 border border-white/40 shadow-sm">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-xs font-bold text-gray-600 w-32" />
                  </div>

                  <button
                    onClick={() => setActiveTab('Smart Loss Strategy')}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white/60 text-gray-700 shadow-sm hover:bg-white transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {alertCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                        {alertCount}
                      </span>
                    )}
                    {alertCount === 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-lime-400 rounded-full border-2 border-white" />}
                  </button>
                </div>
              </header>

              {renderContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
