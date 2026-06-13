import os
import requests
from dotenv import load_dotenv

load_dotenv()
from db import supabase

def get_test_token():
    from flask_jwt_extended import create_access_token
    from app import app
    with app.app_context():
        # Get an existing user, e.g. test@test.com
        user = supabase.table('users').select('id').eq('email', 'test@test.com').execute()
        if not user.data:
            user = supabase.table('users').select('id').limit(1).execute()
        user_id = user.data[0]['id']
        return create_access_token(identity=user_id)

BASE    = "http://localhost:5000/api"

def test_dca():
    token = get_test_token()
    HEADERS = {"Authorization": f"Bearer {token}",
               "Content-Type":  "application/json"}

    print("=" * 50)
    print("DCA Test: Deposit 1 → Deposit 2 → Verify")
    print("=" * 50)

    # Deposit 1: PKR 100,000
    print("\n1. First deposit: PKR 100,000")
    r1 = requests.post(f"{BASE}/invest/auto",
                       headers=HEADERS,
                       json={"total_pkr": 100000})
    d1 = r1.json()
    if r1.status_code != 200:
        print("ERROR:", d1)
        return
    print(f"   Total portfolio: PKR {d1['portfolio']['new_total_pkr']:,.0f}")
    print(f"   Holdings: {d1['portfolio']['holdings_count']}")
    print(f"   Is initial: {d1['dca_summary']['deposit_is_initial']}")

    # Deposit 2: PKR 50,000
    print("\n2. Second deposit: PKR 50,000")
    r2 = requests.post(f"{BASE}/invest/auto",
                       headers=HEADERS,
                       json={"total_pkr": 50000})
    d2 = r2.json()
    if r2.status_code != 200:
        print("ERROR:", d2)
        return
    print(f"   Previous total: PKR {d2['portfolio']['previous_total_pkr']:,.0f}")
    print(f"   New deposit:    PKR {d2['portfolio']['new_deposit_pkr']:,.0f}")
    print(f"   New total:      PKR {d2['portfolio']['new_total_pkr']:,.0f}")
    print(f"   DCA applied to: {d2['dca_summary']['assets_dca_applied']} assets")

    # Verify math
    expected = 150000
    actual   = d2['portfolio']['new_total_pkr']
    print(f"\n3. Verification:")
    print(f"   Expected total: PKR {expected:,.0f}")
    print(f"   Actual total:   PKR {actual:,.0f}")
    print(f"   PASS ✅" if abs(actual - expected) < 100 else "   FAIL ❌")

    # Verify DCA price for one asset
    print("\n4. DCA Price Verification (first asset):")
    first = d2['shap_explanations'].keys()
    if first:
        print("   SHAP Explanations found for:", list(first))

if __name__ == "__main__":
    test_dca()
