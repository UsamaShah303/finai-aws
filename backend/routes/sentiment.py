# routes/sentiment.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from services.sentiment import get_market_mood, analyse_sentiment

sentiment_bp = Blueprint("sentiment", __name__)

@sentiment_bp.route("/sentiment/market-mood", methods=["GET"])
@jwt_required()
def market_mood():
    tickers = request.args.getlist("tickers") or None
    result  = get_market_mood(tickers)
    return jsonify(result), 200

@sentiment_bp.route("/sentiment/analyse", methods=["POST"])
@jwt_required()
def analyse():
    """
    Analyse sentiment of financial headlines.
    Body: { "headlines": ["Fed signals rate cut", "Markets crash on trade war fears"] }
    """
    data = request.get_json() or {}
    headlines = data.get("headlines", [])

    if not headlines or not isinstance(headlines, list):
        return jsonify({"error": "headlines must be a non-empty list of strings"}), 400

    results = analyse_sentiment(headlines)
    
    if results and isinstance(results, list):
        pos_count = sum(1 for r in results if r["label"] == "Positive")
        neg_count = sum(1 for r in results if r["label"] == "Negative")
        neu_count = sum(1 for r in results if r["label"] == "Neutral")
        n = len(results)
        
        avg_pos = pos_count / n
        avg_neg = neg_count / n
        avg_neu = neu_count / n
        
        label = "positive" if avg_pos > avg_neg else "negative" if avg_neg > avg_pos else "neutral"
        
        details = []
        for r in results:
            details.append({
                "headline": r["headline"],
                "positive": r["score"] if r["label"] == "Positive" else 0.0,
                "negative": r["score"] if r["label"] == "Negative" else 0.0,
                "neutral": 1.0 if r["label"] == "Neutral" else 0.0,
                "label": r["label"].lower()
            })
            
        return jsonify({
            "positive": round(avg_pos, 3),
            "neutral": round(avg_neu, 3),
            "negative": round(avg_neg, 3),
            "label": label,
            "count": n,
            "details": details
        }), 200
        
    return jsonify({
        "positive": 0.0,
        "neutral": 1.0,
        "negative": 0.0,
        "label": "neutral",
        "count": 0,
        "details": []
    }), 200
