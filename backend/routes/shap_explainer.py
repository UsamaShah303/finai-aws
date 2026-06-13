"""
SHAP Explainer route with Supabase-backed caching and JWT auth.

Cache is recalculated only when something meaningful changes:
  - User retook the quiz
  - Price moved > 5%
  - Sentiment changed
  - Cache is older than 24 hours
  - User requests a manual refresh
"""

from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase
from services.market import get_price
from services.sentiment import analyse_sentiment
import json, random, logging

logger = logging.getLogger(__name__)

shap_bp = Blueprint("shap", __name__)





@shap_bp.route('/shap/assets', methods=['GET'])
@jwt_required()
def get_assets():
    user_id = get_jwt_identity()

    holdings = supabase.table('virtual_holdings')\
        .select('symbol, weight, market')\
        .eq('user_id', user_id)\
        .execute().data

    if not holdings:
        return jsonify({"assets": [], "message": "No holdings found"}), 200

    # Only return assets that can have SHAP explanations (exclude bonds/commodities)
    exclude_symbols = ['BND', 'AGG', 'GLD', 'PIB', 'TBILL_3M', 'TBILL_12M']
    explainable = [
        h for h in holdings
        if h.get('market') not in ['PKR_BOND', 'COMMODITY'] and h.get('symbol') not in exclude_symbols
    ]

    return jsonify({
        "assets": [
            {
                "symbol":     h['symbol'],
                "name":       h.get('name', h['symbol']),
                "weight_pct": round(float(h.get('weight', 0)) * 100, 1),
                "asset_class": h.get('market'), # Map market to asset_class for frontend logic
                "market":     h.get('market'),
            }
            for h in explainable
        ],
        "total": len(explainable)
    })

@shap_bp.route('/shap/<symbol>', methods=['GET'])
@jwt_required()
def get_shap(symbol):
    user_id = get_jwt_identity()

    # 1. Check cache first
    cached = supabase.table('shap_cache')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('symbol', symbol)\
        .order('cached_at', desc=True)\
        .limit(1)\
        .execute()

    from services.shap_explainer import should_recalculate, generate_real_shap, generate_what_if, generate_urdu_summary
    
    if cached.data:
        cache_row = cached.data[0]

        # 2. Cache invalidation checks
        if not should_recalculate(cache_row, symbol, user_id):
            # Return cached explanation
            factors_json = cache_row.get('factors', {})
            return jsonify({
                "symbol": symbol,
                "confidence": cache_row.get('confidence', 85) / 100.0 if cache_row.get('confidence', 85) > 1 else cache_row.get('confidence', 0.85),
                "positive_factors": factors_json.get('positive', []),
                "negative_factors": factors_json.get('negative', []),
                "summary_en": cache_row.get('summary_en', ''),
                "summary_ur": cache_row.get('summary_ur', ''),
                "what_if_scenarios": cache_row.get('what_if', []),
                "metrics": factors_json.get('metrics', {}),
                "cached": True,
                "cached_at": cache_row['cached_at']
            }), 200

    # 3. Cache miss or invalidated — generate fresh explanation
    holding = supabase.table('virtual_holdings')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('symbol', symbol)\
        .execute()

    if not holding.data:
        return jsonify({"error": f"{symbol} not in your portfolio"}), 404

    # Get all holdings for correlation calculation
    # To avoid Yahoo Finance rate limits, we don't fetch all 17 assets. 
    # We fetch the target symbol and 'SPY' (as a market benchmark) to calculate correlation.
    fetch_symbols = [symbol, 'SPY']

    # Get last optimisation weights from virtual_holdings
    all_holdings = supabase.table('virtual_holdings')\
        .select('symbol, weight')\
        .eq('user_id', user_id)\
        .execute().data
    weights = {h['symbol']: h.get('weight', 0) for h in all_holdings}

    # Generate real SHAP explanation
    from services.portfolio import get_historical_prices
    
    # We must ensure we have prices for all symbols
    prices_df  = get_historical_prices(fetch_symbols, period='1y')
    
    if prices_df.empty or len(prices_df) < 5:
        # Fallback for Yahoo Finance Rate Limits during demo
        # Generate synthetic 1-year random walk (252 days) for these symbols
        import numpy as np
        import pandas as pd
        dates = pd.date_range(end=pd.Timestamp.today(), periods=252, freq='B')
        mock_data = {}
        for sym in fetch_symbols:
            # Simulate a stock with ~12% annual return and 20% volatility
            daily_returns = np.random.normal(0.12/252, 0.20/np.sqrt(252), 252)
            price_path = 100 * np.exp(np.cumsum(daily_returns))
            mock_data[sym] = price_path
        prices_df = pd.DataFrame(mock_data, index=dates)

    if symbol not in prices_df.columns:
        return jsonify({"error": f"Missing price data for {symbol}"}), 400

    explanation = generate_real_shap(
        symbol=symbol,
        weights=weights,
        prices_df=prices_df,
        risk_level=holding.data[0].get('risk_level', 'Moderate')
    )

    # Add what-if scenarios
    explanation['what_if_scenarios'] = generate_what_if(
        symbol, explanation['metrics']
    )

    # Add Urdu summary
    explanation['summary_ur'] = generate_urdu_summary(
        symbol,
        explanation['metrics'],
        explanation['positive_factors']
    )
    
    # Add price at cache to metrics for invalidation logic
    from services.portfolio import calculate_portfolio_performance
    dummy_h = {
        'symbol': symbol,
        'quantity': 1,
        'avg_buy_price': 0,
        'market': holding.data[0].get('market', 'INTL') if holding.data else ('PSX' if symbol.endswith('.KA') else 'INTL'),
        'asset_class': holding.data[0].get('asset_class', 'STOCK') if holding.data else ('COMMODITY' if symbol == 'GOLD' else 'STOCK')
    }
    perf = calculate_portfolio_performance([dummy_h])
    enriched = perf.get('holdings', [])[0] if perf.get('holdings') else {}
    
    current_price = float(enriched.get('current_price_pkr', 0)) if dummy_h['market'] == 'PSX' or symbol == 'GOLD' else float(enriched.get('current_price_usd', 0) or enriched.get('current_price_pkr', 0))
    explanation['metrics']['price_at_cache'] = current_price

    # 4. Save to cache
    try:
        supabase.table('shap_cache').upsert({
            "user_id":    user_id,
            "symbol":     symbol,
            "confidence": explanation['confidence'] * 100 if explanation['confidence'] <= 1 else explanation['confidence'],
            "factors": {
                "positive": explanation['positive_factors'],
                "negative": explanation['negative_factors'],
                "metrics":  explanation['metrics']
            },
            "summary_en": explanation['summary_en'],
            "summary_ur": explanation['summary_ur'],
            "what_if": explanation['what_if_scenarios'],
            "cached_at":  datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id,symbol").execute()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Could not save shap cache for {symbol}: {e}")

    return jsonify({**explanation, "cached": False}), 200
