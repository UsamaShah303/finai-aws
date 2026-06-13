# FinAI Nexus - Code Feature Extracts

*Note: You can copy these code blocks directly or take screenshots of this document for your report.* 

## 1. Flask app with blueprint registrations (`app.py`)
```python
# ── Register blueprints ──────────────────────────────────────────────────────
from routes.auth import auth_bp
from routes.shap_explainer import shap_bp
from routes.tax_loss import tax_bp
from routes.risk import risk_bp
from routes.portfolio import portfolio_bp
from routes.forecast import forecast_bp
from routes.sentiment import sentiment_bp
from routes.invest import invest_bp
from routes.goals import goals_bp
from routes.paycheck import paycheck_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(shap_bp, url_prefix="/api")
app.register_blueprint(tax_bp, url_prefix="/api")
app.register_blueprint(risk_bp, url_prefix="/api")
app.register_blueprint(portfolio_bp, url_prefix="/api")
app.register_blueprint(forecast_bp, url_prefix="/api")
app.register_blueprint(sentiment_bp, url_prefix="/api")
app.register_blueprint(invest_bp, url_prefix="/api")
app.register_blueprint(goals_bp, url_prefix="/api")
app.register_blueprint(paycheck_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")


# ── Health check (no auth required) ──────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple health-check endpoint."""
    # Quick Supabase connectivity test
    db_status = "unknown"
    try:
        from db import supabase
        result = supabase.table("users").select("id").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)[:100]}"

    return {
        "status": "ok",
        "service": "finai-backend",
        "database": db_status,
        "endpoints": [
            "POST /api/auth/register",
            "POST /api/auth/login",
            "GET  /api/auth/me",
            "POST /api/risk/submit",
            "GET  /api/risk/profile",
            "POST /api/portfolio/optimise",
            "GET  /api/portfolio/holdings",
            "POST /api/forecast/run",
            "GET  /api/forecast/latest",
            "GET  /api/shap/assets",
            "GET  /api/shap/<symbol>",
            "GET  /api/tax-loss/opportunities",
            "POST /api/tax-loss/harvest",
            "GET  /api/tax-loss/history",
            "POST /api/sentiment/analyse",
            "POST /api/invest/auto",
```

## 2. /api/invest/auto endpoint (`invest.py`)
```python
Master investment endpoint — /api/invest/auto

Orchestrates the full investment pipeline:
1. Read risk profile
2. Run multi-asset portfolio optimisation (PSX + ETFs + Gold + Bonds)
3. Run Monte Carlo forecast
4. Generate SHAP explanations
5. Store holdings in Supabase
6. Return everything in one response
"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase
from services.portfolio import optimise_pakistan_portfolio, get_historical_prices
from services.monte_carlo import monte_carlo
from services.market import get_esg_score
from services.shap_explainer import generate_real_shap
import logging

logger = logging.getLogger(__name__)

PSX_DEFAULT_ESG = {
    "OGDC.KA":  62,   # Oil & Gas — moderate ESG
    "HBL.KA":   58,   # Banking
    "LUCK.KA":  71,   # Cement — decent ESG
    "ENGRO.KA": 65,
    "PSO.KA":   55,
    "HUBC.KA":  68,   # Power — above average
    "MCB.KA":   60,
    "SYS.KA":   74,   # Tech — typically high ESG
    "TRG.KA":   72,
    "MEBL.KA":  63,
}

invest_bp = Blueprint("invest", __name__)

@invest_bp.route("/invest/auto", methods=["POST"])
@jwt_required()
def auto_invest():
    """
    Master endpoint — runs the full investment pipeline.
    Now correctly implements Dollar-Cost Averaging (DCA) for incremental deposits.
    """
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    new_deposit_pkr = float(data.get("total_pkr", data.get("total_amount", 1000000)))
    monthly_deposit = float(data.get("monthly_deposit", 50000))
    years = int(data.get("years", 10))

    if new_deposit_pkr <= 0:
        return jsonify({"error": "Deposit amount must be greater than zero"}), 400

    # ── STEP 1: Verify wallet has sufficient balance ──────────
    wallet = supabase.table('virtual_wallets').select('*').eq('user_id', user_id).execute()
    if not wallet.data:
```

## 3. optimise_pakistan_portfolio() function (`portfolio.py`)
```python
def optimise_stocks(symbols: list, risk_level: str, max_weight: float = 0.30, min_weight: float = 0.02) -> tuple:
    """Returns (weights_dict, sharpe_ratio)."""
    if not symbols:
        return {}, 0.0
    if len(symbols) < 2:
        return {symbols[0]: 1.0}, 0.0

    prices = get_historical_prices(symbols, period="1y")
    if prices.empty or len(prices.columns) < 2:
        logger.warning("Not enough price data — using equal weights")
        eq = 1.0 / len(symbols)
        return {s: round(eq, 6) for s in symbols}, 0.0

    try:
        mu = expected_returns.mean_historical_return(prices)
        S  = risk_models.sample_cov(prices)
        ef = EfficientFrontier(mu, S, weight_bounds=(min_weight, max_weight))

        if risk_level == "Conservative":
            ef.min_volatility()
        elif risk_level == "Moderate":
            ef.max_sharpe(risk_free_rate=0.05)
        else:
            try:
                ef.efficient_return(target_return=0.25)
            except OptimizationError:
                ef.max_sharpe(risk_free_rate=0.05)

        weights = ef.clean_weights()
        perf = ef.portfolio_performance(verbose=False)
        sharpe = round(float(perf[2]), 4)
        logger.info(f"MPT [{risk_level}] Return={perf[0]:.2%} Vol={perf[1]:.2%} Sharpe={perf[2]:.2f}")
        return {sym: round(w, 6) for sym, w in weights.items() if w > 0.001}, sharpe

    except Exception as e:
        logger.error(f"MPT failed: {e} — using equal weights")
        eq = 1.0 / len(prices.columns)
        return {s: round(eq, 6) for s in prices.columns}, 0.0


# ════════════════════════════════════════════════════════════
# 5. MASTER PORTFOLIO OPTIMISATION
# ════════════════════════════════════════════════════════════

def optimise_pakistan_portfolio(
    risk_level: str, total_pkr: float,
    include_gold: bool = True, include_bonds: bool = True,
    include_mutual: bool = False, include_psx: bool = True, include_intl: bool = True,
) -> dict:
    alloc = RISK_ALLOCATION[risk_level]
    pkr_rate = get_pkr_usd_rate()
    allocations = {}

    # STEP 1: Build stock/ETF symbol list
    stock_symbols = []
    if include_psx:
        stock_symbols += list(ASSET_UNIVERSE["PSX_STOCKS"].keys())
    if include_intl:
        stock_symbols += list(ASSET_UNIVERSE["INTL_ETFs"].keys())
```

## 4. monte carlo simulation function (`monte_carlo.py`)
```python
"""
Monte Carlo portfolio simulation.

Runs N stochastic paths to forecast future portfolio value,
returning percentile bands for risk visualisation.
"""

import numpy as np


def monte_carlo(
    initial_amount: float,
    monthly_deposit: float = 0.0,
    annual_return: float = 0.10,
    volatility: float = 0.15,
    years: int = 10,
    n_paths: int = 10000,
) -> dict:
    """
    Run Monte Carlo simulation on a portfolio.

    Args:
        initial_amount: starting investment value.
        monthly_deposit: amount added each month.
        annual_return: expected annual return (e.g., 0.10 = 10%).
        volatility: annual volatility / standard deviation (e.g., 0.15 = 15%).
        years: simulation horizon in years.
        n_paths: number of simulation paths.

    Returns:
        dict with p10, p50, p90 final values and 100 sample paths.
    """
    months = years * 12
    monthly_return = annual_return / 12
    monthly_vol = volatility / (12 ** 0.5)

    # Generate all random shocks at once (vectorised for speed)
    shocks = np.random.normal(monthly_return, monthly_vol, size=(n_paths, months))

    # Simulate paths
    paths = np.zeros((n_paths, months + 1))
    paths[:, 0] = initial_amount

    for m in range(months):
        paths[:, m + 1] = paths[:, m] * (1 + shocks[:, m]) + monthly_deposit

    # Final values
    final_values = paths[:, -1]

    # Percentiles
    p10 = float(np.percentile(final_values, 10))
    p50 = float(np.percentile(final_values, 50))
    p90 = float(np.percentile(final_values, 90))

    # Send only 100 sample paths to frontend (bandwidth)
    sample_indices = np.random.choice(n_paths, size=min(100, n_paths), replace=False)
    sample_paths = paths[sample_indices].tolist()

    # Round for JSON
    sample_paths = [
```

## 5. FinBERT HuggingFace API call (`sentiment.py`)
```python
def query_finbert_batch(headlines: list) -> list | None:
    """
    Send all headlines to HuggingFace FinBERT in one batch request.
    Returns list of results or None if failed.
    """
    try:
        truncated = [truncate(h) for h in headlines]
        response  = requests.post(
            HF_API_URL,
            headers=HEADERS,
            json={"inputs": truncated},
            timeout=30
        )

        # Cold start
        if response.status_code == 503:
            wait = response.json().get("estimated_time", 20)
            logger.info(f"FinBERT loading (ETA {wait}s) — using fallback")
            return None

        # Rate limited
        if response.status_code == 429:
            logger.warning("HuggingFace rate limited — using fallback")
            return None

        if response.status_code != 200:
            logger.warning(f"HuggingFace error {response.status_code}")
            return None

        raw = response.json()

        # HuggingFace returns list of lists for batch
        results = []
        for item in raw:
            if isinstance(item, list):
                results.append(parse_hf_result(item))
            else:
                results.append(parse_hf_result(raw))
                break

        return results

    except requests.Timeout:
        logger.warning("HuggingFace timeout — using fallback")
        return None
    except Exception as e:
        logger.warning(f"HuggingFace failed: {e} — using fallback")
        return None


def analyse_sentiment(headlines: list) -> list:
    """
    Main sentiment function.
    Tries FinBERT batch first, falls back to keyword engine.
    """
    if not headlines:
        return []

    # Try FinBERT batch
    finbert_results = query_finbert_batch(headlines)
```

## 6. generate_real_shap() function (`shap_explainer.py`)
```python
def generate_real_shap(
    symbol:     str,
    weights:    dict,      # MPT output weights
    prices_df,             # historical prices DataFrame
    risk_level: str
) -> dict:
    """
    Generate real SHAP values from MPT portfolio weights.
    No separate ML model needed — uses the weights directly.
    """

    # ── Feature vector for this asset ──────────────────────
    returns     = prices_df[symbol].pct_change().dropna()
    all_returns = prices_df.pct_change().dropna()

    # Calculate real financial metrics
    annual_return = float(returns.mean() * 252)
    volatility    = float(returns.std() * np.sqrt(252))
    sharpe        = annual_return / volatility if volatility > 0 else 0
    weight        = weights.get(symbol, 0)

    # Correlation with other assets (diversification value)
    if len(all_returns.columns) > 1:
        correlations  = all_returns.corr()[symbol].drop(symbol)
        avg_corr      = float(correlations.mean())
    else:
        avg_corr      = 1.0  # No diversification if only 1 asset

    if np.isnan(avg_corr):
        avg_corr = 1.0

    # Max drawdown
    cumulative    = (1 + returns).cumprod()
    rolling_max   = cumulative.expanding().max()
    drawdown      = ((cumulative - rolling_max) / rolling_max)
    max_drawdown  = float(drawdown.min()) if not drawdown.empty else 0.0

    # Clean up any potential NaNs from returns
    annual_return = 0.0 if np.isnan(annual_return) else annual_return
    volatility = 0.0 if np.isnan(volatility) else volatility
    sharpe = 0.0 if np.isnan(sharpe) else sharpe
    max_drawdown = 0.0 if np.isnan(max_drawdown) else max_drawdown

    # ── SHAP-style feature contributions ───────────────────
    # Each factor's contribution to the final weight decision
    features = {
        "Expected Annual Return":  round(annual_return * 100, 2),
        "Volatility (Risk)":       round(volatility * 100, 2),
        "Sharpe Ratio":            round(sharpe, 3),
        "Portfolio Weight":        round(weight * 100, 2),
        "Avg Correlation":         round(avg_corr, 3),
        "Max Drawdown":            round(max_drawdown * 100, 2),
    }

    # Positive factors (reasons AI chose this asset)
    positive_factors = []
    negative_factors = []

    if annual_return > 0.10:
        positive_factors.append({
```

## 7. frontend auth context (`AuthContext.jsx`)
```tsx
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('finai_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('finai_darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  const [marketPreference, setMarketPreference] = useState(() => {
    const saved = localStorage.getItem('finai_market');
    return saved || 'both';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('finai_darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('finai_market', marketPreference);
  }, [marketPreference]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user: userData } = res.data;
      
      const enrichedUser = {
        ...userData,
        role: email === 'admin@finai.com' ? 'admin' : 'user',
        onboardingComplete: true
      };
      
      setUser(enrichedUser);
      localStorage.setItem('finai_user', JSON.stringify(enrichedUser));
      localStorage.setItem('token', token);
      return enrichedUser;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Invalid credentials. Please try again.";
      throw new Error(errMsg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      const { token, user: userData } = res.data;
```

## 8. main dashboard component (top section) (`CalipsoDashboard.tsx`)
```tsx
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
```

## 10. the invest/auto call (`DepositModal.tsx`)
```tsx
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
```

## 9. Supabase dashboard - screenshot of your tables
*Note: Since I cannot access your personal Supabase account or computer screen, you will need to manually open your Supabase Table Editor and take a screenshot of your tables for this one!* 
