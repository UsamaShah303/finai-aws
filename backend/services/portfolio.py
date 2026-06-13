# services/portfolio.py
# FinAI Nexus — Multi-Asset Portfolio Optimization
# Covers: PSX Stocks, International ETFs, Gold, MUFAP Mutual Funds, T-Bills/PIBs

import os
import time
import logging
import requests
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime
from pypfopt import EfficientFrontier, risk_models, expected_returns
from pypfopt.exceptions import OptimizationError
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

_price_cache = {}

# ════════════════════════════════════════════════════════════
# 1. ASSET UNIVERSE
# ════════════════════════════════════════════════════════════

ASSET_UNIVERSE = {
    "PSX_STOCKS": {
        "OGDC.KA":  {"name": "Oil & Gas Dev Corp",   "sector": "Energy"},
        "HBL.KA":   {"name": "Habib Bank Ltd",        "sector": "Banking"},
        "LUCK.KA":  {"name": "Lucky Cement",          "sector": "Materials"},
        "ENGRO.KA": {"name": "Engro Corporation",     "sector": "Conglomerate"},
        "PSO.KA":   {"name": "Pakistan State Oil",    "sector": "Energy"},
        "HUBC.KA":  {"name": "Hub Power Company",     "sector": "Utilities"},
        "MCB.KA":   {"name": "MCB Bank",              "sector": "Banking"},
        "SYS.KA":   {"name": "Systems Ltd",           "sector": "Technology"},
        "TRG.KA":   {"name": "TRG Pakistan",          "sector": "Technology"},
        "MEBL.KA":  {"name": "Meezan Bank",           "sector": "Banking"},
    },
    "INTL_ETFs": {
        "VTI":  {"name": "Vanguard Total Market ETF"},
        "QQQ":  {"name": "Invesco Nasdaq 100 ETF"},
        "VWO":  {"name": "Vanguard Emerging Markets ETF"},
        "VNQ":  {"name": "Vanguard Real Estate ETF"},
        "GLD":  {"name": "SPDR Gold Shares ETF"},
        "AGG":  {"name": "iShares Core US Bond ETF"},
    },
    "COMMODITIES": {
        "GC=F": {"name": "Gold (Troy Oz)", "unit": "tola"},
    },
    "MUTUAL_FUNDS": {
        "ABL_INCOME":   {"name": "ABL Income Fund",         "amc": "ABL AMC",       "category": "Income",        "risk": "Moderate"},
        "HBL_STOCK":    {"name": "HBL Stock Fund",          "amc": "HBL AMC",       "category": "Equity",        "risk": "Aggressive"},
        "UBL_LIQUID":   {"name": "UBL Liquidity Plus Fund", "amc": "UBL Fund Mgrs", "category": "Money Market",  "risk": "Conservative"},
        "NAFA_STOCK":   {"name": "NAFA Stock Fund",         "amc": "NAFA",          "category": "Equity",        "risk": "Aggressive"},
        "JS_INCOME":    {"name": "JS Income Fund",          "amc": "JS Investments","category": "Income",        "risk": "Moderate"},
    },
    "BONDS": {
        "TBILL_3M":  {"name": "T-Bill 3 Month",  "tenure_months": 3,  "return_pa": 21.5, "min_invest_pkr": 10000},
        "TBILL_6M":  {"name": "T-Bill 6 Month",  "tenure_months": 6,  "return_pa": 21.8, "min_invest_pkr": 10000},
        "TBILL_12M": {"name": "T-Bill 12 Month", "tenure_months": 12, "return_pa": 22.1, "min_invest_pkr": 10000},
        "PIB_3Y":    {"name": "PIB 3 Year",      "tenure_months": 36, "return_pa": 17.5, "min_invest_pkr": 100000},
        "PIB_5Y":    {"name": "PIB 5 Year",      "tenure_months": 60, "return_pa": 16.8, "min_invest_pkr": 100000},
    },
}

# ════════════════════════════════════════════════════════════
# 2. RISK ALLOCATION RULES
# ════════════════════════════════════════════════════════════

RISK_ALLOCATION = {
    "Conservative": {"bonds": 0.45, "gold": 0.15, "mutual": 0.10, "stocks": 0.30},
    "Moderate":     {"bonds": 0.20, "gold": 0.10, "mutual": 0.10, "stocks": 0.60},
    "Aggressive":   {"bonds": 0.05, "gold": 0.05, "mutual": 0.05, "stocks": 0.85},
}

# ════════════════════════════════════════════════════════════
# 3. MARKET DATA FETCHING
# ════════════════════════════════════════════════════════════

_price_cache = {}
CACHE_TTL    = 300          # 5 min for in-memory
DISK_CACHE_TTL = 86400      # 24 hours — disk prices are always usable
_RATE_LIMIT_UNTIL = 0
_bg_refresh_running = False

# ── Persistent JSON price cache ──────────────────────────────
import json, threading

_PRICE_CACHE_FILE = os.path.join(os.path.dirname(__file__), "..", "price_cache.json")

def _load_disk_cache() -> dict:
    """Load persisted prices from disk. Survives server restarts."""
    try:
        if os.path.exists(_PRICE_CACHE_FILE):
            with open(_PRICE_CACHE_FILE, "r") as f:
                data = json.load(f)
            # Populate in-memory cache from disk
            for sym, entry in data.items():
                if sym not in _price_cache:
                    _price_cache[sym] = (entry["price"], entry["ts"])
            return data
    except Exception as e:
        logger.warning(f"Could not load price cache from disk: {e}")
    return {}

def _save_disk_cache():
    """Persist current in-memory prices to disk."""
    try:
        data = {sym: {"price": p, "ts": ts} for sym, (p, ts) in _price_cache.items()}
        with open(_PRICE_CACHE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save price cache to disk: {e}")

def _bg_refresh_prices(symbols: list):
    """Background thread: tries to fetch live prices without blocking the API response."""
    global _bg_refresh_running, _RATE_LIMIT_UNTIL
    if _bg_refresh_running:
        return
    _bg_refresh_running = True
    try:
        if time.time() < _RATE_LIMIT_UNTIL:
            logger.info("Skipping bg refresh — rate limited")
            return
        logger.info(f"BG price refresh for {symbols}")
        raw = yf.download(symbols, period="2d", auto_adjust=True, progress=False, timeout=8)
        if raw.empty:
            logger.warning("BG refresh returned empty data")
            return
        if len(symbols) == 1:
            close = raw[['Close']]
            close.columns = symbols
        elif isinstance(raw.columns, pd.MultiIndex):
            close = raw['Close']
        else:
            close = raw
        latest = close.ffill().iloc[-1]
        updated = 0
        for symbol in symbols:
            if symbol in latest.index:
                price = float(latest[symbol])
                if price > 0 and not pd.isna(price):
                    _price_cache[symbol] = (price, time.time())
                    updated += 1
        if updated > 0:
            _save_disk_cache()
            logger.info(f"BG refresh: updated {updated}/{len(symbols)} prices")
    except Exception as e:
        logger.warning(f"BG price refresh failed: {e}")
        if "Too Many Requests" in str(e) or "Rate limited" in str(e):
            _RATE_LIMIT_UNTIL = time.time() + 600
    finally:
        _bg_refresh_running = False

# Load disk cache on module import
_load_disk_cache()

def get_price(symbol: str, market: str = "INTL") -> float | None:
    global _RATE_LIMIT_UNTIL
    if time.time() >= _RATE_LIMIT_UNTIL:
        if symbol in _price_cache:
            price, ts = _price_cache[symbol]
            if time.time() - ts < CACHE_TTL:
                return price

        ticker_sym = f"{symbol}.KA" if market == "PSX" and ".KA" not in symbol else symbol
        try:
            raw = yf.download(ticker_sym, period="5d", progress=False, timeout=5)
            if not raw.empty:
                close = raw["Close"]
                price = float(close.iloc[-1].iloc[0]) if isinstance(close, pd.DataFrame) else float(close.iloc[-1])
                if price > 0:
                    _price_cache[symbol] = (price, time.time())
                    return price
        except Exception as e:
            logger.warning(f"yFinance failed for {ticker_sym}: {e}")
            if "Too Many Requests" in str(e) or "Rate limited" in str(e):
                _RATE_LIMIT_UNTIL = time.time() + 300

    FALLBACK_PRICES = {
        "VTI": 250.0, "QQQ": 430.0, "AGG": 97.0, "GLD": 220.0, "VEA": 50.0, "VWO": 40.0, "VNQ": 85.0,
        "ENGRO": 300.0, "LUCK": 800.0, "OGDC": 120.0, "MCB": 210.0, "HBL": 115.0,
        "TRG": 70.0, "SYS": 450.0, "PSO": 160.0, "HUBC": 120.0, "MEBL": 210.0, "FATIMA": 40.0, "PPL": 130.0, "DGKC": 75.0,
        "GC=F": 2350.0, "SCHB": 60.0, "IVV": 520.0, "IEFA": 75.0, "IAU": 45.0,
    }
    clean_sym = symbol.replace('.KA', '').replace('^', '')
    if clean_sym in FALLBACK_PRICES:
        return FALLBACK_PRICES[clean_sym]
    return 100.0

def get_pkr_usd_rate() -> float:
    """Return PKR/USD rate instantly from cache. Never blocks on network."""
    # Check in-memory cache first
    if "USDPKR=X" in _price_cache:
        rate, ts = _price_cache["USDPKR=X"]
        if rate > 0:
            return rate
    # Hardcoded fallback — close enough for demo purposes
    return 278.0


def get_historical_prices(symbols: list, period: str = "1y") -> pd.DataFrame:
    global _RATE_LIMIT_UNTIL
    if not symbols or time.time() < _RATE_LIMIT_UNTIL:
        return pd.DataFrame()
    try:
        raw = yf.download(symbols, period=period, auto_adjust=True, progress=False)
        prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
        threshold = int(len(prices) * 0.8)
        prices = prices.dropna(thresh=threshold, axis=1)
        prices = prices.ffill().bfill()
        return prices
    except Exception as e:
        logger.error(f"Historical data download failed: {e}")
        if "Too Many Requests" in str(e) or "Rate limited" in str(e):
            _RATE_LIMIT_UNTIL = time.time() + 300
        return pd.DataFrame()


def get_gold_pkr() -> dict:
    gold_usd = get_price("GC=F")
    pkr_rate = get_pkr_usd_rate()
    if not gold_usd:
        return {}
    gold_pkr_oz   = gold_usd * pkr_rate
    gold_pkr_gram = gold_pkr_oz / 31.1035
    gold_pkr_tola = gold_pkr_gram * 11.6638
    return {
        "price_usd_per_oz":   round(gold_usd, 2),
        "price_pkr_per_oz":   round(gold_pkr_oz, 2),
        "price_pkr_per_gram": round(gold_pkr_gram, 2),
        "price_pkr_per_tola": round(gold_pkr_tola, 2),
        "pkr_usd_rate":       round(pkr_rate, 2),
    }


def get_mufap_nav() -> dict:
    FALLBACK_NAVs = {
        "ABL_INCOME": 115.30, "HBL_STOCK": 89.75, "UBL_LIQUID": 108.90,
        "NAFA_STOCK": 94.20, "JS_INCOME": 112.60,
    }
    try:
        resp = requests.get("https://www.mufap.com.pk/nav_returns_fund.php",
                            timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            pass  # TODO: parse MUFAP HTML table
    except Exception as e:
        logger.warning(f"MUFAP fetch failed: {e}")
    return FALLBACK_NAVs


def get_sbp_bond_rates() -> dict:
    return {"TBILL_3M": 21.50, "TBILL_6M": 21.80, "TBILL_12M": 22.10, "PIB_3Y": 17.50, "PIB_5Y": 16.80}


# ════════════════════════════════════════════════════════════
# 4. MPT OPTIMISATION (Stocks + ETFs only)
# ════════════════════════════════════════════════════════════

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

    # STEP 2: Run MPT on stocks/ETFs
    sharpe_ratio = 0.0
    stock_alloc_pkr = total_pkr * alloc["stocks"]
    if stock_symbols:
        raw_weights, sharpe_ratio = optimise_stocks(stock_symbols, risk_level)
        for sym, w in raw_weights.items():
            amount_pkr = stock_alloc_pkr * w
            is_psx = sym.endswith(".KA")
            mkt = "PSX" if is_psx else "INTL"
            price_raw = get_price(sym, market=mkt)
            if price_raw is None:
                continue
            price_pkr = price_raw if is_psx else price_raw * pkr_rate
            quantity = amount_pkr / price_pkr if price_pkr > 0 else 0
            info = ASSET_UNIVERSE["PSX_STOCKS"].get(sym) or ASSET_UNIVERSE["INTL_ETFs"].get(sym) or {}
            allocations[sym] = {
                "weight": round(w * alloc["stocks"], 6), "amount_pkr": round(amount_pkr, 2),
                "asset_class": "PSX_STOCK" if is_psx else "INTL_ETF",
                "name": info.get("name", sym), "sector": info.get("sector", ""),
                "current_price_pkr": round(price_pkr, 2),
                "current_price_usd": round(price_raw, 4) if not is_psx else None,
                "quantity": round(quantity, 4), "market": mkt,
            }

    # STEP 3: Gold allocation
    if include_gold and alloc["gold"] > 0:
        gold_alloc_pkr = total_pkr * alloc["gold"]
        gold_data = get_gold_pkr()
        if gold_data:
            tola_price = gold_data["price_pkr_per_tola"]
            allocations["GOLD"] = {
                "weight": round(alloc["gold"], 6), "amount_pkr": round(gold_alloc_pkr, 2),
                "asset_class": "COMMODITY", "name": "Gold (24K)", "sector": "Commodity",
                "current_price_pkr": round(tola_price, 2),
                "current_price_usd": gold_data.get("price_usd_per_oz"),
                "quantity": round(gold_alloc_pkr / tola_price, 4), "unit": "tola", "market": "COMMODITY",
            }

    # STEP 4: Bond / T-Bill allocation
    if include_bonds and alloc["bonds"] > 0:
        bond_alloc_pkr = total_pkr * alloc["bonds"]
        bond_rates = get_sbp_bond_rates()
        bond_key = {"Conservative": "TBILL_12M", "Moderate": "TBILL_12M", "Aggressive": "TBILL_3M"}[risk_level]
        bond_info = ASSET_UNIVERSE["BONDS"][bond_key]
        annual_yield = bond_rates.get(bond_key, bond_info["return_pa"]) / 100
        allocations[bond_key] = {
            "weight": round(alloc["bonds"], 6), "amount_pkr": round(bond_alloc_pkr, 2),
            "asset_class": "BOND", "name": bond_info["name"], "sector": "Fixed Income",
            "annual_yield_pct": round(annual_yield * 100, 2),
            "expected_return_pkr": round(bond_alloc_pkr * annual_yield, 2),
            "tenure_months": bond_info["tenure_months"],
            "current_price_pkr": 100.0, "quantity": round(bond_alloc_pkr / 100, 2), "market": "PKR_BOND",
        }

    # STEP 5: Mutual Fund allocation
    if include_mutual and alloc["mutual"] > 0:
        mutual_alloc_pkr = total_pkr * alloc["mutual"]
        nav_data = get_mufap_nav()
        fund_key = {"Conservative": "UBL_LIQUID", "Moderate": "ABL_INCOME", "Aggressive": "HBL_STOCK"}[risk_level]
        fund_info = ASSET_UNIVERSE["MUTUAL_FUNDS"][fund_key]
        nav = nav_data.get(fund_key, 100.0)
        allocations[fund_key] = {
            "weight": round(alloc["mutual"], 6), "amount_pkr": round(mutual_alloc_pkr, 2),
            "asset_class": "MUTUAL_FUND", "name": fund_info["name"], "sector": "Mutual Fund",
            "amc": fund_info["amc"], "category": fund_info["category"],
            "current_price_pkr": round(nav, 4), "quantity": round(mutual_alloc_pkr / nav, 4), "market": "MUFAP",
        }

    # STEP 6: Normalise weights
    total_weight = sum(a["weight"] for a in allocations.values())
    if total_weight > 0:
        for sym in allocations:
            allocations[sym]["weight"] = round(allocations[sym]["weight"] / total_weight, 6)

    # STEP 7: Breakdown
    breakdown = {}
    for data in allocations.values():
        ac = data["asset_class"]
        breakdown[ac] = round(breakdown.get(ac, 0) + data["amount_pkr"], 2)

    # STEP 8: Blended return
    blended_return = _estimate_blended_return(alloc, risk_level)

    return {
        "allocations": allocations,
        "summary": {
            "total_pkr": round(total_pkr, 2), "risk_level": risk_level,
            "num_assets": len(allocations), "pkr_usd_rate": round(pkr_rate, 2),
            "asset_class_breakdown": breakdown,
            "expected_annual_return_pct": round(blended_return * 100, 2),
            "sharpe_ratio": sharpe_ratio,
        },
        "generated_at": datetime.now().isoformat(),
    }


def _estimate_blended_return(alloc: dict, risk_level: str) -> float:
    bond_rates = get_sbp_bond_rates()
    STOCK_RETURNS = {"Conservative": 0.12, "Moderate": 0.18, "Aggressive": 0.25}
    returns = {
        "stocks": STOCK_RETURNS[risk_level], "bonds": bond_rates.get("TBILL_12M", 22.1) / 100,
        "gold": 0.08, "mutual": 0.12,
    }
    return sum(alloc[k] * returns[k] for k in alloc)


# ════════════════════════════════════════════════════════════
# 7. PORTFOLIO PERFORMANCE (for existing holdings)
# ════════════════════════════════════════════════════════════

def fetch_prices_parallel(symbols: list, timeout: int = 5) -> dict:
    """
    Fetch prices concurrently using threads.
    All 17 requests run simultaneously — max wait = 1 timeout
    instead of 17 × timeout.
    """
    prices = {}

    def fetch_one(symbol):
        try:
            ticker = yf.Ticker(symbol)
            price  = ticker.fast_info.get('last_price')
            if price and price > 0:
                return symbol, float(price)
        except Exception as e:
            logger.warning(f"Thread fetch failed for {symbol}: {e}")
        return symbol, None

    # Run all fetches simultaneously without blocking on exit
    executor = ThreadPoolExecutor(max_workers=min(len(symbols) if symbols else 1, 10))
    futures = {
        executor.submit(fetch_one, sym): sym
        for sym in symbols
    }
    try:
        for future in as_completed(futures, timeout=timeout):
            try:
                symbol, price = future.result()
                if price:
                    prices[symbol] = price
            except Exception:
                pass
    except Exception:
        pass
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    return prices


def _days_since_purchase(created_at_str: str) -> int:
    """Calculate days since holding was created."""
    if not created_at_str:
        return 30   # assume 30 days if unknown
    try:
        created = datetime.fromisoformat(created_at_str.replace('Z', ''))
        return max(1, (datetime.now() - created).days)
    except:
        return 30


def _calculate_other_asset(h: dict, pkr_rate: float) -> dict:
    """Handle bonds, gold, mutual funds — no yFinance needed."""
    sym         = h['symbol']
    qty         = float(h['quantity'])
    avg_buy     = float(h['avg_buy_price'])
    asset_class = h.get('asset_class', '')

    if asset_class == 'BOND':
        bond_info    = ASSET_UNIVERSE['BONDS'].get(sym, {})
        annual_yield = bond_info.get('return_pa', 22.1) / 100
        cost_pkr     = avg_buy * qty
        # Accrued return since purchase date
        days_held    = _days_since_purchase(h.get('created_at'))
        accrued      = cost_pkr * annual_yield * (days_held / 365)
        current_pkr  = cost_pkr + accrued

        return {
            **h,
            "current_price_pkr": round(avg_buy, 2),
            "current_value_pkr": round(current_pkr, 2),
            "cost_basis_pkr":    round(cost_pkr, 2),
            "gain_loss_pkr":     round(accrued, 2),
            "gain_loss_pct":     round(accrued / cost_pkr * 100, 2) if cost_pkr > 0 else 0,
            "price_source":      "fixed_rate",
        }

    elif sym == 'GOLD':
        gold_data   = get_gold_pkr()
        tola_price  = gold_data.get('price_pkr_per_tola', avg_buy)
        current_pkr = tola_price * qty
        cost_pkr    = avg_buy * qty

        return {
            **h,
            "current_price_pkr": round(tola_price, 2),
            "current_value_pkr": round(current_pkr, 2),
            "cost_basis_pkr":    round(cost_pkr, 2),
            "gain_loss_pkr":     round(current_pkr - cost_pkr, 2),
            "gain_loss_pct":     round((tola_price - avg_buy) / avg_buy * 100, 2) if avg_buy > 0 else 0,
            "price_source":      "live_gold",
        }

    elif asset_class == 'MUTUAL_FUND':
        nav_data    = get_mufap_nav()
        nav         = nav_data.get(sym, avg_buy)
        current_pkr = nav * qty
        cost_pkr    = avg_buy * qty

        return {
            **h,
            "current_price_pkr": round(nav, 4),
            "current_value_pkr": round(current_pkr, 2),
            "cost_basis_pkr":    round(cost_pkr, 2),
            "gain_loss_pkr":     round(current_pkr - cost_pkr, 2),
            "gain_loss_pct":     round((nav - avg_buy) / avg_buy * 100, 2) if avg_buy > 0 else 0,
            "price_source":      "mufap_nav",
        }

    # Fallback
    cost_pkr = avg_buy * qty
    return {
        **h,
        "current_price_pkr": avg_buy,
        "current_value_pkr": cost_pkr,
        "cost_basis_pkr":    cost_pkr,
        "gain_loss_pkr":     0,
        "gain_loss_pct":     0,
        "price_source":      "fallback",
    }


def calculate_portfolio_performance(holdings: list) -> dict:
    """
    PERMANENT FIX — NEVER blocks on yFinance.
    
    Strategy:
    1. Resolve ALL prices instantly from cache → fallback (zero network calls)
    2. Return the response immediately (< 100ms)
    3. Kick off a background thread to refresh stale prices for NEXT page load
    """
    pkr_rate = get_pkr_usd_rate()
    
    if not holdings:
        return {
            "holdings":        [],
            "total_value_pkr": 0,
            "total_cost_pkr":  0,
            "total_gain_pkr":  0,
            "total_gain_pct":  0,
            "fx_edge_pkr":     0,
            "fx_edge_pct":     0,
            "pkr_usd_rate":    pkr_rate,
            "as_of":           datetime.now().isoformat(),
        }

    # ── STEP 1: Separate by asset type ───────────────────────
    stock_holdings = []
    other_holdings = []   # bonds, gold, mutual funds — no yFinance needed

    for h in holdings:
        asset_class = h.get('asset_class', '')
        if asset_class in ['BOND', 'MUTUAL_FUND']:
            other_holdings.append(h)
        elif h['symbol'] == 'GOLD':
            other_holdings.append(h)
        else:
            stock_holdings.append(h)

    # ── STEP 2: Resolve prices INSTANTLY (no network calls) ──
    FALLBACK_PRICES = {
        "VTI": 250.0, "QQQ": 430.0, "AGG": 97.0, "GLD": 220.0,
        "VEA": 50.0, "VWO": 40.0, "VNQ": 85.0,
        "ENGRO.KA": 300.0, "LUCK.KA": 800.0, "OGDC.KA": 120.0,
        "MCB.KA": 210.0, "HBL.KA": 115.0, "TRG.KA": 70.0,
        "SYS.KA": 450.0, "PSO.KA": 160.0, "HUBC.KA": 120.0,
        "MEBL.KA": 210.0, "GC=F": 2350.0,
    }

    resolved_prices = {}
    stale_symbols = []

    for h in stock_holdings:
        sym = h['symbol']
        
        # Priority 1: Fresh in-memory cache (< 5 min old)
        if sym in _price_cache:
            price, ts = _price_cache[sym]
            age_seconds = time.time() - ts
            resolved_prices[sym] = price
            if age_seconds > CACHE_TTL:
                stale_symbols.append(sym)
            continue

        # Priority 2: Hardcoded fallback prices (always available)
        clean_sym = sym.replace('.KA', '')
        if sym in FALLBACK_PRICES:
            resolved_prices[sym] = FALLBACK_PRICES[sym]
        elif clean_sym in FALLBACK_PRICES:
            resolved_prices[sym] = FALLBACK_PRICES[clean_sym]
        else:
            # Priority 3: Use the buy price stored in DB (never zero)
            resolved_prices[sym] = float(h.get('avg_buy_price', 100.0))
        
        stale_symbols.append(sym)

    # ── STEP 3: Calculate P&L for all holdings (instant) ─────
    enriched      = []
    total_current = 0.0
    total_cost    = 0.0
    fx_edge_pkr   = 0.0

    for h in stock_holdings:
        sym         = h['symbol']
        qty         = float(h['quantity'])
        avg_buy     = float(h['avg_buy_price'])
        mkt         = h.get('market', 'INTL')
        is_psx      = mkt == 'PSX' or sym.endswith('.KA')

        price_raw   = resolved_prices.get(sym, avg_buy)
        price_pkr   = price_raw if is_psx else price_raw * pkr_rate
        avg_buy_pkr = avg_buy   if is_psx else avg_buy   * pkr_rate
        
        buy_pkr_rate = float(h.get("avg_buy_pkr_rate", 278.0))

        current_val = price_pkr   * qty
        cost_basis  = avg_buy_pkr * qty
        gain_pkr    = current_val - cost_basis
        gain_pct    = (gain_pkr / cost_basis * 100) if cost_basis > 0 else 0
        
        if not is_psx:
            fx_gain = avg_buy * (pkr_rate - buy_pkr_rate) * qty
        else:
            fx_gain = 0
            
        fx_edge_pkr += fx_gain

        # Determine price source label
        is_cached = sym in _price_cache
        is_fresh  = is_cached and (time.time() - _price_cache[sym][1] < CACHE_TTL)
        source    = "live" if is_fresh else "cached" if is_cached else "estimated"

        enriched.append({
            **h,
            "current_price_pkr": round(price_pkr, 2),
            "current_price_usd": round(price_raw, 4) if not is_psx else None,
            "current_value_pkr": round(current_val, 2),
            "cost_basis_pkr":    round(cost_basis, 2),
            "gain_loss_pkr":     round(gain_pkr, 2),
            "gain_loss_pct":     round(gain_pct, 2),
            "fx_gain_pkr":       round(fx_gain, 2),
            "current_pkr_rate":  round(pkr_rate, 2),
            "buy_pkr_rate":      round(buy_pkr_rate, 2),
            "price_source":      source,
        })
        total_current += current_val
        total_cost    += cost_basis

    # Process bonds, gold, mutual funds (no API call needed)
    for h in other_holdings:
        result = _calculate_other_asset(h, pkr_rate)
        enriched.append(result)
        total_current += result['current_value_pkr']
        total_cost    += result['cost_basis_pkr']

    total_gain = total_current - total_cost

    # ── STEP 4: Kick off BACKGROUND refresh for stale prices ─
    # Also refresh the PKR/USD exchange rate in background
    if "USDPKR=X" not in stale_symbols:
        stale_symbols.append("USDPKR=X")
    if stale_symbols:
        thread = threading.Thread(
            target=_bg_refresh_prices,
            args=(stale_symbols,),
            daemon=True,
        )
        thread.start()
        logger.info(f"BG refresh queued for {len(stale_symbols)} stale symbols")

    return {
        "holdings":        enriched,
        "total_value_pkr": round(total_current, 2),
        "total_cost_pkr":  round(total_cost, 2),
        "total_gain_pkr":  round(total_gain, 2),
        "total_gain_pct":  round(total_gain / total_cost * 100, 2) if total_cost > 0 else 0,
        "fx_edge_pkr":     round(fx_edge_pkr, 2),
        "fx_edge_pct":     round(fx_edge_pkr / total_cost * 100, 2) if total_cost > 0 else 0.0,
        "pkr_usd_rate":    round(pkr_rate, 2),
        "as_of":           datetime.now().isoformat(),
    }

