# routes/paycheck.py — complete rewrite

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase
from datetime import datetime

paycheck_bp = Blueprint('paycheck', __name__)

RULES = {
    "Conservative": {
        "needs": 0.50, "savings": 0.25,
        "investments": 0.15, "wants": 0.10
    },
    "Moderate": {
        "needs": 0.45, "savings": 0.20,
        "investments": 0.25, "wants": 0.10
    },
    "Aggressive": {
        "needs": 0.40, "savings": 0.15,
        "investments": 0.35, "wants": 0.10
    },
}

CATEGORY_LABELS = {
    "needs":       "Bills & Needs",
    "savings":     "Savings",
    "investments": "Investments",
    "wants":       "Lifestyle & Wants",
}

# Color and icon for each category — frontend can use these
CATEGORY_META = {
    "needs":       {"color": "#EF4444", "icon": "home"},
    "savings":     {"color": "#3B82F6", "icon": "piggy-bank"},
    "investments": {"color": "#10B981", "icon": "trending-up"},
    "wants":       {"color": "#8B5CF6", "icon": "star"},
}


@paycheck_bp.route('/paycheck/recommend', methods=['POST'])
@jwt_required()
def recommend():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}

    # ── Validate income ──────────────────────────────────────
    monthly_income = data.get('monthly_income_pkr')
    if not monthly_income:
        return jsonify({"error": "monthly_income_pkr is required"}), 400

    try:
        monthly_income = float(monthly_income)
    except (TypeError, ValueError):
        return jsonify({"error": "monthly_income_pkr must be a number"}), 400

    if monthly_income <= 0:
        return jsonify({"error": "Income must be greater than zero"}), 400

    if monthly_income > 100_000_000:   # sanity check PKR 100M
        return jsonify({"error": "Income value seems unrealistic"}), 400

    # ── Get user risk profile ────────────────────────────────
    profile = supabase.table('risk_profiles')\
        .select('risk_level, risk_score')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()

    risk_level = profile.data[0]['risk_level'] \
        if profile.data else 'Moderate'
    risk_score = profile.data[0].get('risk_score', 50) \
        if profile.data else 50

    alloc = RULES.get(risk_level, RULES['Moderate'])

    # ── Build response ───────────────────────────────────────
    allocations = {}
    for category, pct in alloc.items():
        amount = round(monthly_income * pct, 2)
        allocations[category] = {
            "label":       CATEGORY_LABELS[category],
            "percentage":  int(pct * 100),
            "amount_pkr":  amount,
            "color":       CATEGORY_META[category]["color"],
            "icon":        CATEGORY_META[category]["icon"],
        }

    # Annual projections
    annual_savings      = allocations['savings']['amount_pkr'] * 12
    annual_investments  = allocations['investments']['amount_pkr'] * 12

    result = {
        "monthly_income_pkr":      monthly_income,
        "risk_level":              risk_level,
        "risk_score":              risk_score,
        "allocations":             allocations,
        "projections": {
            "annual_savings_pkr":      round(annual_savings, 2),
            "annual_investments_pkr":  round(annual_investments, 2),
            "10yr_investment_pkr":     round(annual_investments * 10, 2),
        },
        "recommended_at": datetime.now().isoformat(),
    }

    # ── Save to Supabase ─────────────────────────────────────
    try:
        supabase.table('virtual_transactions').insert({
            "user_id":    user_id,
            "type":       "PAYCHECK_SPLIT",
            "symbol":     "PAYCHECK",
            "amount_pkr": monthly_income,
            "metadata":   result,
            "created_at": datetime.now().isoformat(),
        }).execute()
    except Exception as e:
        # Don't fail the request if saving fails
        pass

    return jsonify(result), 200


@paycheck_bp.route('/paycheck/history', methods=['GET'])
@jwt_required()
def history():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    results = supabase.table('virtual_transactions')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('symbol', 'PAYCHECK')\
        .order('created_at', desc=True)\
        .limit(10)\
        .execute()

    return jsonify({
        "history": results.data or [],
        "count":   len(results.data or [])
    }), 200
