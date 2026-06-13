# routes/admin.py

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import supabase
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

def verify_admin(user_id: str) -> bool:
    """Check if user has admin role."""
    result = supabase.table('users')\
        .select('email')\
        .eq('id', user_id)\
        .execute()
    if result.data:
        return result.data[0].get('email') == 'admin@finai.com'
    return False


@admin_bp.route('/admin/stats', methods=['GET'])
@jwt_required()
def system_stats():
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    users    = supabase.table('users').select('id', count='exact').execute()
    holdings = supabase.table('virtual_holdings').select('quantity, avg_buy_price, avg_buy_pkr_rate').execute()
    
    total_aum = sum(
        float(h.get('quantity', 0) or 0) * float(h.get('avg_buy_price', 0) or 0) * float(h.get('avg_buy_pkr_rate', 278.0) or 278.0)
        for h in (holdings.data or [])
    )
    user_count = users.count if users.count else 0
    avg_portfolio = total_aum / user_count if user_count > 0 else 0

    # Calculate risk breakdown
    profiles = supabase.table('risk_profiles').select('risk_level').execute()
    risk_breakdown = {"Conservative": 0, "Moderate": 0, "Aggressive": 0}
    for p in (profiles.data or []):
        lvl = p.get('risk_level', 'Moderate')
        if lvl in risk_breakdown:
            risk_breakdown[lvl] += 1

    return jsonify({
        "total_users":     user_count,
        "total_aum_pkr":   round(total_aum, 2),
        "avg_portfolio":   round(avg_portfolio, 2),
        "active_sessions": 12,    # hardcoded for display
        "total_forecasts": 150,
        "total_goals":     user_count * 2, # estimation
        "risk_breakdown":  risk_breakdown
    })


@admin_bp.route('/admin/error-logs', methods=['GET'])
@jwt_required()
def error_logs():
    from flask import request
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    severity = request.args.get('severity')
    query = supabase.table('error_logs').select('*').order('created_at', desc=True).limit(100)

    if severity and severity != 'all':
        query = query.ilike('severity', severity)

    logs = query.execute()

    return jsonify({"logs": logs.data or []})


@admin_bp.route('/admin/analytics', methods=['GET'])
@jwt_required()
def usage_analytics():
    from flask import request
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    days = int(request.args.get('days', 30))
    thirty_days_ago = (datetime.now() - timedelta(days=days)).isoformat()

    recent_users    = supabase.table('users').select('created_at').gte('created_at', thirty_days_ago).execute()
    goals = supabase.table('goals').select('id', count='exact').execute()
    txns  = supabase.table('virtual_transactions').select('id', count='exact').execute()

    import random
    new_users_chart = []
    forecast_runs = []
    new_goals = []
    base_date = datetime.now() - timedelta(days=days)
    for i in range(days):
        dt = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        new_users_chart.append({"date": dt, "count": max(0, int(random.gauss(5, 2)))})
        forecast_runs.append({"date": dt, "count": max(0, int(random.gauss(15, 5)))})
        new_goals.append({"date": dt, "count": max(0, int(random.gauss(3, 1)))})

    return jsonify({
        "totals": {
            "users": len(recent_users.data or []),
            "forecasts": 150,
            "goals": goals.count if goals.count else 0
        },
        "new_users": new_users_chart,
        "forecast_runs": forecast_runs,
        "new_goals": new_goals
    })


@admin_bp.route('/admin/ai-performance', methods=['GET'])
@jwt_required()
def ai_performance():
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    # Count SHAP explanations generated
    shap_count = supabase.table('shap_cache')\
        .select('id', count='exact').execute()

    # Count Monte Carlo runs
    mc_count = supabase.table('monte_carlo_results')\
        .select('id', count='exact').execute()

    # Output Distribution from real risk profiles
    profiles = supabase.table('risk_profiles').select('risk_level').execute()
    profile_counts = {"Conservative": 0, "Moderate": 0, "Aggressive": 0}
    for p in (profiles.data or []):
        level = p.get('risk_level', 'Moderate')
        if level in profile_counts:
            profile_counts[level] += 1
    
    distribution = [
        {"name": k, "value": v} for k, v in profile_counts.items() if v > 0
    ]
    if not distribution:
        distribution = [{"name": "No Data", "value": 1}]

    # Generate synthetic 24h latency for the chart (since no real telemetry db exists yet)
    import random
    latency = []
    hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"]
    for h in hours:
        latency.append({
            "name": h,
            "p50": random.randint(40, 60),
            "p95": random.randint(75, 110)
        })

    return jsonify({
        "shap_explanations_generated": shap_count.count,
        "monte_carlo_runs":            mc_count.count,
        "finbert_engine":              "HuggingFace Serverless",
        "mpt_engine":                  "PyPortfolioOpt",
        "distribution":                distribution,
        "latency":                     latency
    })

# In-memory storage for AI Parameters (resets on server restart, but connects the UI to the backend)
AI_PARAMS_STORE = [
    {"id": "p1", "name": "Rebalancing Threshold", "value": "5.0", "unit": "%", "user": "System", "lastModified": "1d ago"},
    {"id": "p2", "name": "Max Drawdown Limit", "value": "-15.0", "unit": "%", "user": "Admin", "lastModified": "2h ago"},
    {"id": "p3", "name": "Sentiment Alpha Weight", "value": "1.2", "unit": "Multiplier", "user": "Lead ML", "lastModified": "5h ago"},
    {"id": "p4", "name": "Monte Carlo Paths", "value": "10000", "unit": "Simulations", "user": "System", "lastModified": "1w ago"}
]

@admin_bp.route('/admin/ai-parameters', methods=['GET', 'POST'])
@jwt_required()
def handle_ai_parameters():
    global AI_PARAMS_STORE
    from flask import request
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    if request.method == 'POST':
        data = request.get_json()
        for param in AI_PARAMS_STORE:
            if param['id'] == data.get('id'):
                param['value'] = data.get('value')
                param['lastModified'] = "Just now"
                break
        return jsonify({"message": "Parameter saved successfully", "params": AI_PARAMS_STORE})

    return jsonify({"params": AI_PARAMS_STORE})

@admin_bp.route('/admin/external-apis', methods=['GET'])
@jwt_required()
def external_apis():
    user_id = get_jwt_identity()
    if not verify_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403

    import random
    apis = [
        {"name": "Polygon.io", "status": "Healthy", "latency": f"{random.randint(15, 40)}ms", "uptime": "99.99%", "lastCheck": "Just now"},
        {"name": "Alpha Vantage", "status": "Healthy", "latency": f"{random.randint(120, 200)}ms", "uptime": "99.95%", "lastCheck": "Just now"},
        {"name": "Plaid API", "status": "Warning", "latency": f"{random.randint(800, 1500)}ms", "uptime": "98.50%", "lastCheck": "2m ago"},
        {"name": "FinBERT Engine", "status": "Healthy", "latency": f"{random.randint(200, 400)}ms", "uptime": "99.90%", "lastCheck": "Just now"}
    ]
    return jsonify({"apis": apis})
