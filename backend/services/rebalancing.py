from db import supabase
from services.market import get_price
from datetime import datetime

def check_rebalancing_needed(
    user_id:        str,
    target_weights: dict,   # from last optimisation
    threshold:      float = 0.05   # 5% drift triggers alert
) -> dict:
    """
    Check if any holding has drifted more than threshold
    from its target weight. Called on dashboard load.
    """

    # Get current holdings with live prices
    holdings = supabase.table('virtual_holdings')\
        .select('*').eq('user_id', user_id).execute().data

    if not holdings:
        return {"needs_rebalancing": False, "alerts": []}

    from services.portfolio import calculate_portfolio_performance
    perf = calculate_portfolio_performance(holdings)
    enriched_holdings = perf.get('holdings', [])
    total_value = perf.get('total_value_pkr', 0)

    alerts = []
    for holding in enriched_holdings:
        symbol         = holding['symbol']
        target_weight  = target_weights.get(symbol, 0)
        
        current_value  = float(holding.get('current_value_pkr', 0))
        
        if current_value == 0 or total_value == 0:
            continue

        current_weight = current_value / total_value
        drift          = abs(current_weight - target_weight)

        if drift > threshold:
            alerts.append({
                "symbol":         symbol,
                "target_weight":  round(target_weight * 100, 1),
                "current_weight": round(current_weight * 100, 1),
                "drift_pct":      round(drift * 100, 1),
                "action":         "BUY" if current_weight < target_weight else "SELL",
                "message": (
                    f"{symbol} has drifted {drift*100:.1f}% from target. "
                    f"Consider {'buying more' if current_weight < target_weight else 'trimming'} "
                    f"to restore {target_weight*100:.1f}% allocation."
                )
            })

    return {
        "needs_rebalancing": len(alerts) > 0,
        "alerts":            alerts,
        "total_drift":       sum(a['drift_pct'] for a in alerts),
        "checked_at":        datetime.now().isoformat()
    }

def get_target_weights(user_id: str) -> dict:
    result = supabase.table('portfolio_snapshots')\
        .select('target_weights')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()

    if result.data:
        return result.data[0]['target_weights']
    return {}
