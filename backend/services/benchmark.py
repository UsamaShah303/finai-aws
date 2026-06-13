import logging
import pandas as pd
import yfinance as yf
import pandas_datareader.data as web
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def get_kse100_stooq(period: str = "3y") -> pd.Series | None:
    try:
        end   = datetime.now()
        days  = {"1mo":30,"3mo":90,"6mo":180,"1y":365,"3y":1095}
        start = end - timedelta(days=days.get(period, 1095))

        df = web.DataReader("^KSE", "stooq", start, end)

        if df.empty:
            return None

        return df['Close'].sort_index()

    except Exception as e:
        logger.warning(f"Stooq KSE fetch failed: {e}")
        return None

def get_kse100_proxy(period: str = "3y") -> pd.Series | None:
    """
    Equal-weighted proxy of top PSX blue-chips.
    """
    PSX_PROXY = ["OGDC.KA", "HBL.KA", "LUCK.KA", "ENGRO.KA", "MCB.KA"]

    try:
        prices = yf.download(
            PSX_PROXY,
            period=period,
            auto_adjust=True,
            progress=False
        )['Close']

        if prices.empty:
            return None

        proxy_index = prices.mean(axis=1)
        return proxy_index.sort_index()

    except Exception as e:
        logger.warning(f"PSX proxy failed: {e}")
        return None

def get_kse_benchmark(period: str = "3y") -> tuple[pd.Series | None, str | None]:
    result = get_kse100_stooq(period)
    if result is not None:
        return result, "KSE-100"

    result = get_kse100_proxy(period)
    if result is not None:
        return result, "PSX Top Stocks*"

    return None, None

def get_sp500_benchmark(period: str = "3y") -> pd.Series | None:
    try:
        prices = yf.download("^GSPC", period=period, auto_adjust=True, progress=False)
        if prices.empty:
            return None
        series = prices['Close'] if isinstance(prices.columns, pd.MultiIndex) else prices['Close']
        if hasattr(series, "squeeze"):
            series = series.squeeze()
        return series.sort_index()
    except Exception as e:
        logger.warning(f"SP500 benchmark failed: {e}")
        return None
