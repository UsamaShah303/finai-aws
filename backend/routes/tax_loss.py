"""
Tax Loss Harvesting route with Supabase-backed holdings and JWT auth.

Scans virtual holdings for unrealised losses > 5%, suggests replacement
assets (wash-sale compliant), and simulates the harvest.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase
from services.market import get_price
from services.portfolio import get_pkr_usd_rate
import logging
import json

logger = logging.getLogger(__name__)

tax_bp = Blueprint("tax_loss", __name__)

# ---------------------------------------------------------------------------
# Replacement asset map (wash-sale compliant pairs)
# ---------------------------------------------------------------------------
WASH_SALE_REPLACEMENTS = {
    # PSX Stocks
    "OGDC.KA":  {"symbol": "PPL.KA",   "name": "Pakistan Petroleum Ltd",    "reason": "Same energy sector, different company"},
    "HBL.KA":   {"symbol": "MCB.KA",   "name": "MCB Bank Ltd",              "reason": "Same banking sector, different bank"},
    "MCB.KA":   {"symbol": "UBL.KA",   "name": "United Bank Ltd",           "reason": "Same banking sector, different bank"},
    "ENGRO.KA": {"symbol": "EFERT.KA", "name": "Engro Fertilizers",         "reason": "Same conglomerate segment"},
    "LUCK.KA":  {"symbol": "DGKC.KA",  "name": "DG Khan Cement",            "reason": "Same materials sector"},
    "PSO.KA":   {"symbol": "OGDC.KA",  "name": "Oil & Gas Dev Corp",        "reason": "Same energy sector"},
    "HUBC.KA":  {"symbol": "KAPCO.KA", "name": "Kot Addu Power Company",    "reason": "Same utilities sector"},
    "SYS.KA":   {"symbol": "TRG.KA",   "name": "TRG Pakistan",              "reason": "Same technology sector"},
    "TRG.KA":   {"symbol": "SYS.KA",   "name": "Systems Ltd",               "reason": "Same technology sector"},
    "MEBL.KA":  {"symbol": "HBL.KA",   "name": "Habib Bank Ltd",            "reason": "Same Islamic banking sector"},
    "OGDC":     {"symbol": "PPL",      "name": "Pakistan Petroleum Ltd",    "reason": "Same energy sector, different company"},
    "ENGRO":    {"symbol": "EFERT",    "name": "Engro Fertilizers",         "reason": "Same conglomerate segment"},
    "LUCK":     {"symbol": "DGKC",     "name": "DG Khan Cement",            "reason": "Same materials sector"},
    "HBL":      {"symbol": "MCB",      "name": "MCB Bank Ltd",              "reason": "Same banking sector, different bank"},

    # International ETFs
    "VTI":  {"symbol": "ITOT", "name": "iShares Core S&P Total US",   "reason": "Same total market exposure, different provider"},
    "QQQ":  {"symbol": "QQQM", "name": "Invesco Nasdaq 100 (mini)",   "reason": "Same Nasdaq 100 exposure, lower cost"},
    "VWO":  {"symbol": "IEMG", "name": "iShares Core EM ETF",         "reason": "Same emerging market exposure"},
    "VNQ":  {"symbol": "IYR",  "name": "iShares US Real Estate ETF",  "reason": "Same REIT exposure"},
    "AGG":  {"symbol": "BND",  "name": "Vanguard Total Bond Market",  "reason": "Same bond market exposure"},
    "GLD":  {"symbol": "IAU",  "name": "iShares Gold Trust",          "reason": "Same gold exposure, lower fees"},

    # Gold
    "GOLD": {"symbol": "SILVER", "name": "Silver (Physical)",         "reason": "Precious metal hedge, different commodity"},
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@tax_bp.route('/tax-loss/opportunities', methods=['GET'])
@jwt_required()
def get_opportunities():
    user_id = get_jwt_identity()

    holdings = supabase.table('virtual_holdings')\
        .select('*')\
        .eq('user_id', user_id)\
        .execute().data or []

    if not holdings:
        return jsonify({
            "opportunities": [],
            "message":       "No holdings found"
        }), 200

    from services.portfolio import calculate_portfolio_performance
    perf = calculate_portfolio_performance(holdings)
    enriched_holdings = perf.get('holdings', [])

    opportunities = []

    for h in enriched_holdings:
        symbol          = h['symbol']
        qty             = float(h['quantity'])
        avg_buy_pkr     = float(h.get('cost_basis_pkr', 0)) / qty if qty > 0 else 0
        current_pkr     = float(h.get('current_price_pkr', 0))
        unrealized_pct  = float(h.get('gain_loss_pct', 0)) / 100
        loss_amount_pkr = abs(float(h.get('gain_loss_pkr', 0)))

        # Only flag if loss exceeds 5% threshold
        if unrealized_pct < -0.05:
            tax_saved_pkr = loss_amount_pkr * 0.15   # 15% CGT rate

            # Wash-sale compliant replacement
            replacement = WASH_SALE_REPLACEMENTS.get(symbol, {})

            opportunities.append({
                "symbol":            symbol,
                "name":              h.get('name', symbol),
                "quantity":          qty,
                "avg_buy_price_pkr": round(avg_buy_pkr, 2),
                "current_price_pkr": round(current_pkr, 2),
                "unrealized_loss_pct": round(unrealized_pct * 100, 2),
                "loss_amount_pkr":   round(loss_amount_pkr, 2),
                "tax_saved_pkr":     round(tax_saved_pkr, 2),
                "replacement_symbol": replacement.get('symbol'),
                "replacement_name":   replacement.get('name'),
                "replacement_reason": replacement.get('reason'),
                "fbr_compliant":     True,
            })

    # Sort by largest loss first
    opportunities.sort(key=lambda x: x['loss_amount_pkr'], reverse=True)

    total_harvestable_pkr = sum(o['loss_amount_pkr'] for o in opportunities)
    total_tax_saved_pkr   = sum(o['tax_saved_pkr']   for o in opportunities)

    return jsonify({
        "opportunities":          opportunities,
        "count":                  len(opportunities),
        "total_harvestable_pkr":  round(total_harvestable_pkr, 2),
        "total_tax_saved_pkr":    round(total_tax_saved_pkr, 2),
        "fbr_year":               "2024-25",
        "cgt_rate_pct":           15,
        "threshold_pct":          5,
        "scanned_holdings":       len(holdings),
    }), 200

@tax_bp.route('/tax-loss/harvest', methods=['POST'])
@jwt_required()
def harvest():
    user_id = get_jwt_identity()
    data    = request.json or {}
    symbol  = data.get('symbol')

    if not symbol:
        return jsonify({"error": "symbol is required"}), 400

    # Get current holding
    holding = supabase.table('virtual_holdings')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('symbol', symbol)\
        .execute()

    if not holding.data:
        return jsonify({"error": f"{symbol} not in your portfolio"}), 404

    h = holding.data[0]
    
    # Use centralized logic to evaluate the holding
    from services.portfolio import calculate_portfolio_performance
    perf = calculate_portfolio_performance([h])
    enriched_h = perf.get('holdings', [])[0] if perf.get('holdings') else {}

    if not enriched_h:
        return jsonify({"error": "Could not price the asset"}), 500

    qty         = float(enriched_h['quantity'])
    avg_buy_pkr = float(enriched_h.get('cost_basis_pkr', 0)) / qty if qty > 0 else 0
    current_pkr = float(enriched_h.get('current_price_pkr', 0))
    
    loss_amount_pkr   = abs(float(enriched_h.get('gain_loss_pkr', 0)))
    tax_saved_pkr     = loss_amount_pkr * 0.15
    proceeds_pkr      = float(enriched_h.get('current_value_pkr', 0))

    replacement       = WASH_SALE_REPLACEMENTS.get(symbol, {})
    replacement_sym   = replacement.get('symbol')

    # ── Simulate the sell ────────────────────────────────────
    # 1. Remove old holding
    supabase.table('virtual_holdings')\
        .delete()\
        .eq('user_id', user_id)\
        .eq('symbol', symbol)\
        .execute()

    # 2. Log the SELL transaction
    supabase.table('virtual_transactions').insert({
        "user_id":    user_id,
        "type":       "TAX_HARVEST_SELL",
        "symbol":     symbol,
        "amount_pkr": proceeds_pkr,
        "quantity":   qty,
        "notes": json.dumps({
            "avg_buy_price_pkr": avg_buy_pkr,
            "sell_price_pkr":    current_pkr,
            "loss_amount_pkr":   loss_amount_pkr,
            "tax_saved_pkr":     tax_saved_pkr,
            "replacement":       replacement_sym,
            "fbr_compliant":     True,
        })
    }).execute()

    # 3. Buy replacement asset with proceeds
    if replacement_sym:
        # Use calculate_portfolio_performance to get replacement price
        dummy_h = {
            'symbol': replacement_sym,
            'quantity': 1,
            'avg_buy_price': 0,
            'market': 'PSX' if replacement_sym.endswith('.KA') else 'INTL',
            'asset_class': 'STOCK'
        }
        repl_perf = calculate_portfolio_performance([dummy_h])
        enriched_repl = repl_perf.get('holdings', [])[0] if repl_perf.get('holdings') else {}
        
        if enriched_repl and enriched_repl.get('current_price_pkr'):
            repl_price_pkr     = float(enriched_repl['current_price_pkr'])
            replacement_price  = float(enriched_repl.get('current_price_usd', 0)) or repl_price_pkr
            is_replacement_psx = enriched_repl.get('market') == 'PSX'
            repl_qty           = proceeds_pkr / repl_price_pkr

            # Add replacement to portfolio
            supabase.table('virtual_holdings').upsert({
                "user_id":       user_id,
                "symbol":        replacement_sym,
                "quantity":      round(repl_qty, 6),
                "avg_buy_price": round(repl_price_pkr, 4) if is_replacement_psx else round(replacement_price, 4),
                "avg_buy_pkr_rate": perf.get('pkr_usd_rate', 278.0),
                "weight":        h.get('weight', 0),
                "asset_class":   h.get('asset_class'),
                "market":        h.get('market'),
                "name":          replacement.get('name', replacement_sym),
            }, on_conflict="user_id,symbol").execute()

            # Log the BUY transaction
            supabase.table('virtual_transactions').insert({
                "user_id":    user_id,
                "type":       "TAX_HARVEST_BUY",
                "symbol":     replacement_sym,
                "amount_pkr": proceeds_pkr,
                "quantity":   repl_qty,
                "notes": json.dumps({
                    "replaced_symbol": symbol,
                    "buy_price_pkr":   repl_price_pkr,
                    "tax_saved_pkr":   tax_saved_pkr,
                })
            }).execute()

    return jsonify({
        "status":             "success",
        "harvested_symbol":   symbol,
        "replacement_symbol": replacement_sym,
        "replacement_name":   replacement.get('name'),
        "loss_harvested_pkr": round(loss_amount_pkr, 2),
        "tax_saved_pkr":      round(tax_saved_pkr, 2),
        "proceeds_pkr":       round(proceeds_pkr, 2),
        "message": (
            f"Successfully harvested PKR {loss_amount_pkr:,.0f} loss from {symbol}. "
            f"Proceeds reinvested in {replacement_sym}. "
            f"Estimated CGT saving: PKR {tax_saved_pkr:,.0f}"
        )
    }), 200

@tax_bp.route("/tax-loss/history", methods=["GET"])
@jwt_required()
def harvest_history():
    """Return past harvest simulations from DB."""
    user_id = get_jwt_identity()

    result = supabase.table("virtual_transactions") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("type", "TAX_HARVEST_SELL") \
        .order("created_at", desc=True) \
        .execute()

    return jsonify({"harvests": result.data or []}), 200
