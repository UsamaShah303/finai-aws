# services/sentiment.py
# FinAI Nexus — FinBERT Sentiment via HuggingFace Serverless API

import os
import logging
import requests
import yfinance as yf
from datetime import datetime

logger = logging.getLogger(__name__)

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_API_URL   = "https://api-inference.huggingface.co/models/ProsusAI/finbert"

HEADERS = {
    "Authorization": f"Bearer {HF_API_TOKEN}" if HF_API_TOKEN else "",
    "Content-Type":  "application/json"
}

DEFAULT_TICKERS = [
    "ENGRO.KA", "OGDC.KA", "HBL.KA",
    "AAPL", "MSFT", "TSLA",
    "^GSPC", "GC=F", "USDPKR=X",
]

# ── Keyword fallback (when HuggingFace unavailable) ──────────
POSITIVE_KEYWORDS = [
    "profit", "growth", "rise", "gain", "surge", "record",
    "beat", "strong", "bullish", "rally", "up", "high",
    "earnings", "revenue", "expansion", "upgrade", "buy"
]
NEGATIVE_KEYWORDS = [
    "loss", "fall", "drop", "crash", "decline", "weak",
    "bearish", "down", "low", "cut", "layoff", "miss",
    "recession", "inflation", "debt", "default", "sell"
]

def keyword_sentiment(headline: str) -> dict:
    """Fast keyword-based fallback sentiment."""
    text  = headline.lower()
    pos   = sum(1 for w in POSITIVE_KEYWORDS if w in text)
    neg   = sum(1 for w in NEGATIVE_KEYWORDS if w in text)

    if pos > neg:
        label, compound = "Positive", round(pos / (pos + neg + 1), 3)
    elif neg > pos:
        label, compound = "Negative", round(-neg / (pos + neg + 1), 3)
    else:
        label, compound = "Neutral", 0.0

    return {
        "headline": headline,
        "label":    label,
        "score":    abs(compound),
        "compound": compound,
        "engine":   "keyword_fallback"
    }


def truncate(text: str, max_words: int = 40) -> str:
    """Truncate to respect FinBERT 512 token limit."""
    words = text.split()
    return " ".join(words[:max_words]) if len(words) > max_words else text


def parse_hf_result(result: list) -> dict:
    """Parse HuggingFace FinBERT response for one headline."""
    top       = max(result, key=lambda x: x["score"])
    label_map = {"positive": "Positive", "negative": "Negative", "neutral": "Neutral"}
    label     = label_map.get(top["label"].lower(), "Neutral")
    score     = round(top["score"], 4)
    compound  = round(
        score  if label == "Positive" else
        -score if label == "Negative" else 0.0, 4
    )
    return {
        "label":    label,
        "score":    score,
        "compound": compound,
        "engine":   "finbert"
    }


def query_finbert_batch(headlines: list) -> list | None:
    """
    Send all headlines to HuggingFace FinBERT in one batch request.
    Returns list of results or None if failed.
    """
    try:
        truncated = [truncate(h) for h in headlines]
        response  = requests.post(
            HF_API_URL,
            headers=HEADERS,
            json={"inputs": truncated},
            timeout=30
        )

        # Cold start
        if response.status_code == 503:
            wait = response.json().get("estimated_time", 20)
            logger.info(f"FinBERT loading (ETA {wait}s) — using fallback")
            return None

        # Rate limited
        if response.status_code == 429:
            logger.warning("HuggingFace rate limited — using fallback")
            return None

        if response.status_code != 200:
            logger.warning(f"HuggingFace error {response.status_code}")
            return None

        raw = response.json()

        # HuggingFace returns list of lists for batch
        results = []
        for item in raw:
            if isinstance(item, list):
                results.append(parse_hf_result(item))
            else:
                results.append(parse_hf_result(raw))
                break

        return results

    except requests.Timeout:
        logger.warning("HuggingFace timeout — using fallback")
        return None
    except Exception as e:
        logger.warning(f"HuggingFace failed: {e} — using fallback")
        return None


def analyse_sentiment(headlines: list) -> list:
    """
    Main sentiment function.
    Tries FinBERT batch first, falls back to keyword engine.
    """
    if not headlines:
        return []

    # Try FinBERT batch
    finbert_results = query_finbert_batch(headlines)

    if finbert_results and len(finbert_results) == len(headlines):
        # FinBERT succeeded
        return [
            {"headline": h, **r}
            for h, r in zip(headlines, finbert_results)
        ]

    # Fallback to keyword engine
    logger.info("Using keyword fallback for all headlines")
    return [keyword_sentiment(h) for h in headlines]


def extract_news(ticker: str) -> list:
    """Fetch news headlines from yFinance."""
    try:
        news     = yf.Ticker(ticker).news or []
        articles = []

        for item in news[:5]:
            # Handle both old and new yFinance formats
            if "content" in item:
                content   = item.get("content", {})
                title     = content.get("title", "")
                publisher = content.get("provider", {}).get("displayName", "Unknown")
                link      = content.get("canonicalUrl", {}).get("url", "#")
            else:
                title     = item.get("title", "")
                publisher = item.get("publisher", "Unknown")
                link      = item.get("link", "#")

            if title:
                articles.append({
                    "title":     title,
                    "publisher": publisher,
                    "link":      link,
                    "ticker":    ticker,
                })

        return articles

    except Exception as e:
        logger.warning(f"News fetch failed for {ticker}: {e}")
        return []


def get_market_mood(tickers: list = None) -> dict:
    """
    Master function: fetch news → analyse sentiment → return full response.
    """
    tickers = tickers or DEFAULT_TICKERS

    # 1. Fetch all articles
    all_articles = []
    for ticker in tickers:
        all_articles.extend(extract_news(ticker))

    # 2. Deduplicate
    seen, unique = set(), []
    for a in all_articles:
        if a["title"] not in seen:
            seen.add(a["title"])
            unique.append(a)

    if not unique:
        return {
            "market_mood": {"score": 50, "label": "Neutral", "color": "gray"},
            "articles":    [],
            "engine":      "none",
            "error":       "No news available"
        }

    # 3. Analyse sentiment in one batch
    headlines = [a["title"] for a in unique]
    results   = analyse_sentiment(headlines)
    engine    = results[0].get("engine", "keyword_fallback") if results else "none"

    # 4. Enrich articles
    enriched = []
    for article, sentiment in zip(unique, results):
        enriched.append({
            **article,
            "sentiment": sentiment["label"],
            "score":     sentiment["compound"],
        })

    # 5. Sort by sentiment strength
    enriched.sort(key=lambda x: abs(x["score"]), reverse=True)

    # 6. Overall market mood (0-100)
    compounds   = [r["score"] for r in results]
    avg         = sum(compounds) / len(compounds)
    index_score = int((avg + 1) / 2 * 100)

    if avg >= 0.05:
        mood_label, color = "Bullish", "green"
    elif avg <= -0.05:
        mood_label, color = "Bearish", "red"
    else:
        mood_label, color = "Neutral", "gray"

    # 7. Per-asset breakdown
    asset_breakdown = {}
    for article in enriched:
        t = article["ticker"]
        if t not in asset_breakdown:
            asset_breakdown[t] = {"positive": 0, "negative": 0, "neutral": 0}
        asset_breakdown[t][article["sentiment"].lower()] += 1

    return {
        "market_mood": {
            "score":          index_score,
            "label":          mood_label,
            "color":          color,
            "avg_compound":   round(avg, 3),
            "positive_count": sum(1 for r in results if r["label"] == "Positive"),
            "negative_count": sum(1 for r in results if r["label"] == "Negative"),
            "neutral_count":  sum(1 for r in results if r["label"] == "Neutral"),
            "total_articles": len(results),
        },
        "articles":        enriched[:30],
        "asset_breakdown": asset_breakdown,
        "engine":          engine,
        "generated_at":    datetime.now().isoformat(),
    }
