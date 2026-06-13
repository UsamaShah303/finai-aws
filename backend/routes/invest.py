"""
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
        # Give a default starting balance for simulators
        supabase.table('virtual_wallets').insert({"user_id": user_id, "balance_pkr": 100000000, "balance_usd": 0}).execute()
        wallet_balance = 100000000.0
    else:
        wallet_balance = float(wallet.data[0].get('balance_pkr', 0))
        # Top up if they ran out of simulated money
        if wallet_balance <= 0:
            supabase.table('virtual_wallets').update({"balance_pkr": 100000000}).eq('user_id', user_id).execute()
            wallet_balance = 100000000.0

    if wallet_balance < new_deposit_pkr:
        return jsonify({
            "error": f"Insufficient balance. "
                     f"Wallet has PKR {wallet_balance:,.0f}, "
                     f"requested PKR {new_deposit_pkr:,.0f}"
        }), 400

    # ── STEP 2: Get risk profile ──────────────────────────────
    risk_result = supabase.table("risk_profiles").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    if not risk_result.data:
        return jsonify({
            "error": "No risk profile found. Please complete the risk quiz first.",
            "redirect": "?tab=Risk Assessment",
        }), 400

    risk_profile = risk_result.data[0]
    risk_level = risk_profile["risk_level"]

    # ── STEP 3: Fetch EXISTING holdings ──────────────────────
    existing_raw = supabase.table('virtual_holdings').select('*').eq('user_id', user_id).execute().data or []
    existing_holdings = {h['symbol']: h for h in existing_raw}

    # Calculate existing portfolio total value in PKR
    from services.portfolio import get_pkr_usd_rate
    pkr_rate = get_pkr_usd_rate()
    
    existing_total_pkr = 0.0
    for h in existing_raw:
        # Compute amount_pkr dynamically
        qty = float(h.get('quantity', 0))
        price = float(h.get('avg_buy_price', 0))
        is_usd = h.get('currency', 'USD') == 'USD'
        val = (qty * price * pkr_rate) if is_usd else (qty * price)
        h['amount_pkr'] = val
        existing_total_pkr += val

    # ── STEP 4: Run MPT on new deposit amount ────────────────
    from services.portfolio import optimise_pakistan_portfolio
    try:
        new_allocation = optimise_pakistan_portfolio(
            risk_level    = risk_level,
            total_pkr     = new_deposit_pkr,
            include_gold  = data.get("include_gold", True),
            include_bonds = data.get("include_bonds", True),
            include_mutual= data.get("include_mutual", False),
            include_psx   = data.get("include_psx", True),
            include_intl  = data.get("include_intl", True),
        )
    except Exception as e:
        logger.error(f"Portfolio optimisation error: {e}")
        return jsonify({"error": f"Portfolio error: {str(e)}"}), 500

    new_allocations = new_allocation.get('allocations', {})

    # ── STEP 5: Merge new allocations with existing holdings ──
    merged = {}
    for symbol, existing in existing_holdings.items():
        merged[symbol] = {
            "symbol":        symbol,
            "old_quantity":  float(existing.get('quantity', 0)),
            "old_price":     float(existing.get('avg_buy_price', 0)),
            "new_quantity":  0.0,
            "new_price":     float(existing.get('avg_buy_price', 0)),
            "old_amount_pkr": float(existing.get('amount_pkr', 0)),
            "new_amount_pkr": 0.0,
            "market":        existing.get('market'),
            "currency":      existing.get('currency', 'USD'),
            "esg_score":     existing.get('esg_score', 50),
        }

    for symbol, alloc_data in new_allocations.items():
        weight = alloc_data.get("weight", 0)
        if weight <= 0: continue
        
        market = alloc_data.get("market", "INTL")
        is_psx = market in ("PSX", "PKR_BOND", "MUFAP", "COMMODITY")
        new_price = alloc_data.get("current_price_usd") if not is_psx else alloc_data.get("current_price_pkr")
        new_qty = alloc_data.get("quantity", 0)
        new_amount_pkr = (new_qty * new_price * pkr_rate) if not is_psx else (new_qty * new_price)

        if symbol in merged:
            merged[symbol]['new_quantity'] = new_qty
            merged[symbol]['new_price'] = new_price
            merged[symbol]['new_amount_pkr'] = new_amount_pkr
        else:
            merged[symbol] = {
                "symbol":         symbol,
                "old_quantity":   0.0,
                "old_price":      new_price,
                "new_quantity":   new_qty,
                "new_price":      new_price,
                "old_amount_pkr": 0.0,
                "new_amount_pkr": new_amount_pkr,
                "market":         market,
                "currency":       "PKR" if is_psx else "USD",
                "esg_score":      alloc_data.get('esg_score', 50),
            }

    # ── STEP 6: Calculate DCA weighted average price ──────────
    final_holdings = []
    total_portfolio_pkr = 0.0

    for symbol, item in merged.items():
        old_qty = item['old_quantity']
        old_price = item['old_price']
        new_qty = item['new_quantity']
        new_price = item['new_price']
        total_qty = old_qty + new_qty

        if total_qty <= 0:
            continue

        if old_qty > 0 and new_qty > 0:
            avg_buy_price = ((old_qty * old_price) + (new_qty * new_price)) / total_qty
        elif new_qty > 0:
            avg_buy_price = new_price
        else:
            avg_buy_price = old_price

        total_amount_pkr = item['old_amount_pkr'] + item['new_amount_pkr']
        total_portfolio_pkr += total_amount_pkr

        final_holdings.append({
            "symbol":        symbol,
            "quantity":      total_qty,
            "avg_buy_price": avg_buy_price,
            "total_amount_pkr": total_amount_pkr,
            "market":        item['market'],
            "currency":      item['currency'],
            "esg_score":     item['esg_score'],
            "dca_applied":   old_qty > 0 and new_qty > 0,
        })

    # ── STEP 7: Recalculate correct portfolio weights ─────────
    for h in final_holdings:
        h['weight'] = h['total_amount_pkr'] / total_portfolio_pkr if total_portfolio_pkr > 0 else 0

    # ── STEP 8: Upsert to Supabase ────────────────────────────
    for h in final_holdings:
        try:
            supabase.table('virtual_holdings').upsert({
                "user_id":       user_id,
                "symbol":        h['symbol'],
                "quantity":      h['quantity'],
                "avg_buy_price": h['avg_buy_price'],
                "avg_buy_pkr_rate": pkr_rate,
                "weight":        round(h['weight'], 4),
                "market":        h['market'],
                "currency":      h['currency'],
                "esg_score":     h['esg_score'],
            }, on_conflict="user_id,symbol").execute()
        except Exception as e:
            logger.warning(f"Holdings write failed for {h['symbol']}: {e}")

    # Save target weights to portfolio_snapshots
    weights = {h['symbol']: h['weight'] for h in final_holdings}
    try:
        supabase.table('portfolio_snapshots').upsert({
            "user_id":        user_id,
            "target_weights": weights,
            "risk_level":     risk_level,
            "created_at":     datetime.now().isoformat()
        }).execute()
    except Exception as e:
        pass

    # ── STEP 9: Deduct ONLY new deposit from wallet ───────────
    new_balance = wallet_balance - new_deposit_pkr
    supabase.table('virtual_wallets').update({
        "balance_pkr": round(new_balance, 2),
        "updated_at":  datetime.now().isoformat(),
    }).eq('user_id', user_id).execute()

    import json
    # ── STEP 10: Log transaction ──────────────────────────────
    supabase.table('virtual_transactions').insert({
        "user_id":    user_id,
        "type":       "PORTFOLIO_INVEST",
        "amount_pkr": new_deposit_pkr,
        "symbol":     "PORTFOLIO",
        "notes": json.dumps({
            "deposit_number":      "incremental" if len(existing_raw) > 0 else "initial",
            "previous_total_pkr":  existing_total_pkr,
            "new_deposit_pkr":     new_deposit_pkr,
            "new_total_pkr":       total_portfolio_pkr,
            "assets_updated":      sum(1 for h in final_holdings if h['dca_applied']),
            "assets_added":        sum(1 for h in final_holdings if not h['dca_applied'] and h['quantity'] > 0),
        })
    }).execute()

    # ── STEP 11: Run Monte Carlo on FULL portfolio ────────────
    from services.monte_carlo import monte_carlo
    alloc = new_allocation.get('summary', {})
    ann_return = alloc.get('expected_annual_return_pct', 15) / 100
    volatility = 0.12 if risk_level == "Conservative" else (0.18 if risk_level == "Moderate" else 0.25)

    try:
        mc_result = monte_carlo(
            initial_amount  = total_portfolio_pkr,   # FULL portfolio
            monthly_deposit = monthly_deposit,
            annual_return   = ann_return,
            volatility      = volatility,
            years           = years,
        )
        supabase.table('monte_carlo_results').insert({
            "user_id":             user_id,
            "p10":                 mc_result['p10'],
            "p50":                 mc_result['p50'],
            "p90":                 mc_result['p90'],
            "paths":               mc_result['paths'][:10],
            "params": {
                "initial_amount": total_portfolio_pkr,
                "monthly_deposit": monthly_deposit,
                "annual_return": ann_return,
                "volatility": volatility,
                "years": years,
                "sharpe_ratio": alloc.get("sharpe_ratio", 0.0),
            }
        }).execute()
    except Exception as e:
        logger.error(f"Monte Carlo error: {e}")
        mc_result = None

    # SHAP logic
    shap_results = {}
    from services.portfolio import get_historical_prices
    from services.shap_explainer import generate_real_shap
    
    symbols_for_shap = [sym for sym in weights.keys() if sym not in ("GOLD", "TBILL_3M", "TBILL_6M", "TBILL_12M", "PIB_3Y", "PIB_5Y", "ABL_INCOME", "HBL_STOCK", "UBL_LIQUID", "NAFA_STOCK", "JS_INCOME")]
    try:
        prices_df = get_historical_prices(symbols_for_shap, period="1y")
        for sym in symbols_for_shap:
            try:
                shap_expl = generate_real_shap(sym, weights, prices_df, risk_level)
                shap_results[sym] = shap_expl
                supabase.table('shap_cache').upsert({
                    "user_id":    user_id,
                    "symbol":     sym,
                    "confidence": shap_expl["confidence"],
                    "factors":    shap_expl["features"],
                    "summary_en": shap_expl["summary_en"],
                    "cached_at":  datetime.now().isoformat()
                }, on_conflict="user_id,symbol").execute()
            except Exception as e:
                shap_results[sym] = {"symbol": sym, "summary_en": f"{sym} allocated at {weights[sym]*100:.1f}%"}
    except Exception as e:
        logger.error(f"Failed to fetch prices for SHAP: {e}")

    # ── STEP 12: Return complete response ─────────────────────
    return jsonify({
        "status":  "success",
        "message": f"Portfolio updated with PKR {new_deposit_pkr:,.0f} deposit",
        "portfolio": {
            "previous_total_pkr": round(existing_total_pkr, 2),
            "new_deposit_pkr":    round(new_deposit_pkr, 2),
            "new_total_pkr":      round(total_portfolio_pkr, 2),
            "wallet_balance_pkr": round(new_balance, 2),
            "holdings_count":     len(final_holdings),
            "risk_level":         risk_level,
        },
        "forecast": {
            "p10": mc_result['p10'] if mc_result else None,
            "p50": mc_result['p50'] if mc_result else None,
            "p90": mc_result['p90'] if mc_result else None,
        },
        "shap_explanations": shap_results,
        "dca_summary": {
            "assets_dca_applied": sum(1 for h in final_holdings if h['dca_applied']),
            "assets_new":         sum(1 for h in final_holdings if not h['dca_applied']),
            "deposit_is_initial": existing_total_pkr == 0,
        }
    }), 200
