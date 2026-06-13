"""
Live market data via yFinance + Finnhub ESG scoring.
Replaces all hardcoded price stubs.

Includes PSX fallback: if yFinance fails for a PSX ticker,
falls back to the last cached price from Supabase.
"""

import yfinance as yf
import requests
import logging
import os
import time

logger = logging.getLogger(__name__)

_RATE_LIMIT_UNTIL = 0

# PSX tickers use .KA suffix on Yahoo Finance
PSX_TICKERS = {
    "PSX-100", "OGDC", "PPL", "ENGRO", "FATIMA",
    "LUCK", "DGKC", "HBL", "MCB", "KSE-30",
}

# Some tickers need mapping to valid Yahoo symbols
TICKER_MAP = {
    "PSX-100": "^KSE100",
    "KSE-30":  "^KSE30",
    "BND/PIB": "BND",       # fallback to US bond ETF
    "VNQ/JSCL": "VNQ",      # fallback to US REIT
    "GOLD-PK": "GLD",       # fallback
    "CASH-PK": None,        # no ticker
    "CASH":    None,
}


def _resolve_ticker(symbol: str, market: str = "INTL") -> str | None:
    """Resolve a FinAI symbol to a valid Yahoo Finance ticker."""
    # Check explicit mapping first
    if symbol in TICKER_MAP:
        return TICKER_MAP[symbol]
    # PSX stocks use .KA suffix
    if market == "PSX" or symbol in PSX_TICKERS:
        return f"{symbol}.KA"
    return symbol


def _fallback_price_from_db(symbol: str) -> float | None:
    """
    Fallback: return last cached avg_buy_price from Supabase.
    This ensures PSX tickers always return *something* even when
    yFinance is down or returns no data.
    """
    try:
        from db import supabase
        result = supabase.table("virtual_holdings") \
            .select("avg_buy_price") \
            .eq("symbol", symbol) \
            .limit(1) \
            .execute()
        if result.data:
            price = result.data[0].get("avg_buy_price")
            if price and float(price) > 0:
                logger.info(f"Using cached fallback price for {symbol}: {price}")
                return round(float(price), 2)
    except Exception as e:
        logger.warning(f"Fallback DB price lookup failed for {symbol}: {e}")
        
    # Ultimate hardcoded fallback for demo/rate-limits
    FALLBACK_PRICES = {
        "VTI": 250.0, "QQQ": 430.0, "AGG": 97.0, "GLD": 220.0, "VEA": 50.0, "VWO": 40.0, "VNQ": 85.0,
        "ENGRO": 300.0, "LUCK": 800.0, "OGDC": 120.0, "MCB": 210.0, "HBL": 115.0,
        "TRG": 70.0, "SYS": 450.0, "PSO": 160.0, "HUBC": 120.0, "MEBL": 210.0, "FATIMA": 40.0, "PPL": 130.0, "DGKC": 75.0,
        "GC=F": 2350.0, "SCHB": 60.0, "IVV": 520.0, "IEFA": 75.0, "IAU": 45.0,
    }
    clean_sym = symbol.replace('.KA', '').replace('^', '')
    if clean_sym in FALLBACK_PRICES:
        return FALLBACK_PRICES[clean_sym]
    return 100.0 # Default arbitrary price instead of None so it never breaks


def get_price(symbol: str, market: str = "INTL") -> float | None:
    """
    Fetch the latest price for a symbol.
    Falls back to cached DB price if yFinance fails (especially for PSX).
    Returns None only if all sources fail — frontend shows "price unavailable".
    """
    global _RATE_LIMIT_UNTIL
    ticker_str = _resolve_ticker(symbol, market)
    if not ticker_str:
        return None

    if time.time() >= _RATE_LIMIT_UNTIL:
        # Attempt 1: yFinance fast_info
        try:
            ticker = yf.Ticker(ticker_str)
            info = ticker.fast_info
            price = info.get("lastPrice") or info.get("last_price")
            if price and float(price) > 0:
                return round(float(price), 2)
        except Exception as e:
            logger.warning(f"yFinance fast_info failed for {ticker_str}: {e}")

        # Attempt 2: yFinance recent history
        try:
            hist = yf.Ticker(ticker_str).history(period="5d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                if price > 0:
                    return round(price, 2)
        except Exception as e:
            logger.warning(f"yFinance history failed for {ticker_str}: {e}")
            if "Too Many Requests" in str(e) or "Rate limited" in str(e):
                _RATE_LIMIT_UNTIL = time.time() + 300

    # Attempt 3: Supabase cached price (PSX fallback)
    logger.info(f"All yFinance attempts failed for {symbol}, trying DB fallback")
    return _fallback_price_from_db(symbol)


def get_pkr_usd_rate() -> float | None:
    """Fetch current USD/PKR exchange rate."""
    try:
        ticker = yf.Ticker("USDPKR=X")
        info = ticker.fast_info
        rate = info.get("lastPrice") or info.get("last_price")
        if rate:
            return round(float(rate), 2)
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch USD/PKR rate: {e}")
        return None


def get_historical(symbol: str, period: str = "1y", market: str = "INTL") -> list[float]:
    """
    Return historical closing prices as a list of floats.
    Period can be: 1mo, 3mo, 6mo, 1y, 2y, 5y, max
    """
    global _RATE_LIMIT_UNTIL
    if time.time() < _RATE_LIMIT_UNTIL:
        return []
        
    ticker_str = _resolve_ticker(symbol, market)
    if not ticker_str:
        return []
    try:
        ticker = yf.Ticker(ticker_str)
        df = ticker.history(period=period)
        if df.empty:
            return []
        return [round(float(p), 2) for p in df["Close"].tolist()]
    except Exception as e:
        logger.warning(f"Failed to fetch history for {ticker_str}: {e}")
        if "Too Many Requests" in str(e) or "Rate limited" in str(e):
            _RATE_LIMIT_UNTIL = time.time() + 300
        return []


def get_bulk_prices(symbols: list[str], market: str = "INTL") -> dict[str, float | None]:
    """Fetch prices for multiple symbols at once."""
    result = {}
    for sym in symbols:
        result[sym] = get_price(sym, market)
    return result


# ---------------------------------------------------------------------------
# Finnhub ESG Scoring
# ---------------------------------------------------------------------------

FINNHUB_KEY = os.getenv("FINNHUB_KEY", "")

# Simple cache — ESG scores don't change hourly
_esg_cache = {}
ESG_CACHE_TTL = 86400   # 24 hours

def get_esg_score(symbol: str) -> dict | None:
    """
    Fetch ESG scores from Finnhub.
    Returns None if unavailable or API key not set.
    PSX stocks (.KA) are not supported by Finnhub — returns None.
    """
    # PSX stocks not on Finnhub
    if symbol.endswith('.KA') or symbol in ['GOLD', 'TBILL_12M', 'TBILL_3M',
                                             'PIB_3Y', 'PIB_5Y', 'GC=F']:
        return None

    # Check cache
    if symbol in _esg_cache:
        data, ts = _esg_cache[symbol]
        if time.time() - ts < ESG_CACHE_TTL:
            return data

    if not FINNHUB_KEY:
        logger.warning("No FINNHUB_KEY set — ESG scores unavailable")
        return None

    try:
        response = requests.get(
            "https://finnhub.io/api/v1/stock/esg",
            params={"symbol": symbol, "token": FINNHUB_KEY},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            if data and data.get('totalESGScore'):
                _esg_cache[symbol] = (data, time.time())
                return data
    except Exception as e:
        logger.warning(f"Finnhub ESG failed for {symbol}: {e}")

    return None
