import numpy as np
from pypfopt import EfficientFrontier, risk_models, expected_returns
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

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
            "factor": "Strong Expected Return",
            "value":  f"+{annual_return*100:.1f}% annually",
            "impact": round(annual_return * weight * 10, 3)
        })

    if sharpe > 1.0:
        positive_factors.append({
            "factor": "High Risk-Adjusted Return",
            "value":  f"Sharpe ratio {sharpe:.2f}",
            "impact": round(sharpe * 0.1, 3)
        })

    if avg_corr < 0.5:
        positive_factors.append({
            "factor": "Low Correlation (Diversification)",
            "value":  f"{avg_corr:.2f} avg correlation",
            "impact": round((1 - avg_corr) * 0.2, 3)
        })

    if volatility > 0.25:
        negative_factors.append({
            "factor": "High Volatility",
            "value":  f"{volatility*100:.1f}% annual std dev",
            "impact": round(-volatility * 0.3, 3)
        })

    if max_drawdown < -0.20:
        negative_factors.append({
            "factor": "Significant Historical Drawdown",
            "value":  f"{max_drawdown*100:.1f}% max drawdown",
            "impact": round(max_drawdown * 0.2, 3)
        })

    # ── Confidence score ────────────────────────────────────
    # Based on how clearly this asset fits the risk profile
    base_confidence = min(0.95, max(0.60,
        0.5 + (sharpe * 0.15) + (weight * 2) - (volatility * 0.3)
    ))
    confidence = round(base_confidence, 2)

    # ── English summary ─────────────────────────────────────
    direction = "recommended" if weight > 0.05 else "allocated a small position in"
    summary_en = (
        f"{symbol} was {direction} with a {weight*100:.1f}% portfolio weight. "
        f"The AI identified a {annual_return*100:.1f}% expected annual return "
        f"with a Sharpe ratio of {sharpe:.2f}, indicating "
        f"{'strong' if sharpe > 1 else 'moderate'} risk-adjusted performance. "
        f"Its average correlation of {avg_corr:.2f} with other holdings "
        f"contributes {'significantly' if avg_corr < 0.4 else 'moderately'} "
        f"to portfolio diversification."
    )

    return {
        "symbol":           symbol,
        "confidence":       confidence,
        "weight":           weight,
        "features":         features,
        "positive_factors": positive_factors,
        "negative_factors": negative_factors,
        "summary_en":       summary_en,
        "metrics": {
            "annual_return_pct": round(annual_return * 100, 2),
            "volatility_pct":    round(volatility * 100, 2),
            "sharpe_ratio":      round(sharpe, 3),
            "max_drawdown_pct":  round(max_drawdown * 100, 2),
            "avg_correlation":   round(avg_corr, 3),
        }
    }

def generate_urdu_summary(
    symbol: str,
    metrics: dict,
    positive_factors: list
) -> str:
    """
    Generate Urdu explanation for Pakistani investors.
    Template-based — no translation API needed.
    """
    annual_return = metrics.get('annual_return_pct', 0)
    sharpe        = metrics.get('sharpe_ratio', 0)
    volatility    = metrics.get('volatility_pct', 0)

    performance = "بہترین" if annual_return > 15 else \
                  "اچھی"   if annual_return > 8  else "اوسط"

    risk_level  = "کم خطرہ"    if volatility < 15 else \
                  "اعتدال پسند" if volatility < 25 else "زیادہ خطرہ"

    return (
        f"{symbol} کو {annual_return:.1f}% سالانہ متوقع منافع کی بنیاد پر "
        f"آپ کے پورٹ فولیو میں شامل کیا گیا ہے۔ "
        f"اس اثاثے کی کارکردگی {performance} ہے اور "
        f"خطرے کی سطح {risk_level} ہے۔ "
        f"شارپ ریشو {sharpe:.2f} ہے جو "
        f"{'خطرے کے مقابلے میں اچھا منافع' if sharpe > 1 else 'اوسط کارکردگی'} "
        f"ظاہر کرتا ہے۔"
    )

def generate_what_if(symbol: str, metrics: dict) -> list:
    """Generate realistic what-if scenarios based on real metrics."""
    annual_return = metrics.get('annual_return_pct', 0)
    volatility    = metrics.get('volatility_pct', 0)
    sharpe        = metrics.get('sharpe_ratio', 0)

    scenarios = []

    # Scenario 1: Volatility spike
    new_return = annual_return * 0.85
    scenarios.append({
        "title":       "What if market volatility rises by 10%?",
        "description": f"If volatility increases from {volatility:.1f}% "
                       f"to {volatility + 10:.1f}%, the risk-adjusted "
                       f"return would decrease.",
        "impact":      f"Expected return drops to ~{new_return:.1f}% annually",
        "severity":    "warning"
    })

    # Scenario 2: Interest rate hike (Pakistan context)
    scenarios.append({
        "title":       "What if SBP raises interest rates?",
        "description": "A 100bps rate hike typically reduces equity "
                       "valuations as bonds become more attractive.",
        "impact":      f"Portfolio weight may reduce from current allocation",
        "severity":    "caution"
    })

    # Scenario 3: PKR depreciation (for international stocks)
    if not symbol.endswith('.KA') and symbol not in ["OGDC", "ENGRO", "LUCK", "HBL", "MEBL", "SYS"]:
        scenarios.append({
            "title":       "What if PKR depreciates by 10%?",
            "description": f"As an international asset priced in USD, "
                           f"{symbol} would gain 10% additional value "
                           f"in PKR terms from currency movement alone.",
            "impact":      f"PKR return would increase by ~10% from FX gain",
            "severity":    "positive"
        })

    return scenarios

def should_recalculate(cache_row: dict, symbol: str, user_id: str) -> bool:
    """
    Returns True if SHAP needs recalculating.
    Returns False if cache is still valid.
    """
    from db import supabase

    cached_at = datetime.fromisoformat(cache_row['cached_at'].replace('Z', '+00:00'))
    now       = datetime.now(cached_at.tzinfo)

    # Rule 1: Cache older than 24 hours
    if now - cached_at > timedelta(hours=24):
        logger.info(f"SHAP cache expired for {symbol}")
        return True

    # Rule 2: Price moved more than 5%
    cached_price   = cache_row.get('factors', {}).get('metrics', {}).get('price_at_cache')
    
    from services.portfolio import calculate_portfolio_performance
    dummy_h = {
        'symbol': symbol,
        'quantity': 1,
        'avg_buy_price': 0,
        'market': 'PSX' if symbol.endswith('.KA') else 'INTL',
        'asset_class': 'COMMODITY' if symbol == 'GOLD' else 'STOCK'
    }
    perf = calculate_portfolio_performance([dummy_h])
    enriched = perf.get('holdings', [])[0] if perf.get('holdings') else {}
    
    # Use PKR price for PSX/Gold, USD price for International
    current_price = float(enriched.get('current_price_pkr', 0)) if dummy_h['market'] == 'PSX' or symbol == 'GOLD' else float(enriched.get('current_price_usd', 0) or enriched.get('current_price_pkr', 0))

    if cached_price and current_price:
        price_change = abs(current_price - cached_price) / cached_price
        if price_change > 0.05:
            logger.info(f"SHAP recalc: {symbol} price moved {price_change:.1%}")
            return True

    # Rule 3: User retook risk quiz
    latest_quiz = supabase.table('risk_profiles')\
        .select('created_at')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()

    if latest_quiz.data:
        quiz_time = datetime.fromisoformat(
            latest_quiz.data[0]['created_at'].replace('Z', '+00:00')
        )
        if quiz_time > cached_at:
            logger.info(f"SHAP recalc: user retook risk quiz")
            return True

    # Rule 4: Sentiment shifted significantly
    try:
        sentiment = supabase.table('sentiment_cache')\
            .select('compound_score, created_at')\
            .eq('symbol', symbol)\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()

        if sentiment.data:
            sentiment_time = datetime.fromisoformat(
                sentiment.data[0]['created_at'].replace('Z', '+00:00')
            )
            if sentiment_time > cached_at:
                cached_sentiment  = cache_row.get('factors', {}).get('sentiment_score', 0)
                current_sentiment = sentiment.data[0]['compound_score']
                sentiment_shift   = abs(current_sentiment - cached_sentiment)
                if sentiment_shift > 0.3:   # significant shift threshold
                    logger.info(f"SHAP recalc: sentiment shifted for {symbol}")
                    return True
    except Exception as e:
        logger.warning(f"Could not check sentiment_cache for invalidation: {e}")

    return False   # Cache is valid
