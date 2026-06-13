"""Quick test: does calculate_portfolio_performance return instantly?"""
import time
from services.portfolio import calculate_portfolio_performance

fake_holdings = [
    {"symbol": "VTI",  "quantity": "10", "avg_buy_price": "240", "market": "INTL", "asset_class": "ETF"},
    {"symbol": "QQQ",  "quantity": "5",  "avg_buy_price": "400", "market": "INTL", "asset_class": "ETF"},
    {"symbol": "OGDC.KA", "quantity": "100", "avg_buy_price": "120", "market": "PSX", "asset_class": "STOCK"},
    {"symbol": "HBL.KA",  "quantity": "50",  "avg_buy_price": "110", "market": "PSX", "asset_class": "STOCK"},
    {"symbol": "TBILL_3M", "quantity": "1", "avg_buy_price": "100000", "market": "PKR_BOND", "asset_class": "BOND"},
]

start = time.time()
result = calculate_portfolio_performance(fake_holdings)
elapsed_ms = (time.time() - start) * 1000

print(f"⏱  Response time: {elapsed_ms:.0f}ms")
print(f"💰 Total value PKR: {result['total_value_pkr']:,.0f}")
print(f"📊 Holdings count: {len(result['holdings'])}")
print(f"🔄 PKR/USD rate: {result['pkr_usd_rate']}")

for h in result['holdings']:
    print(f"   {h['symbol']:12s}  PKR {h['current_value_pkr']:>12,.0f}  [{h['price_source']}]")

if elapsed_ms < 500:
    print(f"\n✅ PASS — Portfolio loaded in {elapsed_ms:.0f}ms (target < 500ms)")
else:
    print(f"\n❌ FAIL — Portfolio took {elapsed_ms:.0f}ms (target < 500ms)")
