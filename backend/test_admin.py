import sys
sys.path.append('c:\\Users\\usama\\finai\\backend')
from db import supabase
import traceback

try:
    print('Testing users count...')
    users = supabase.table('users').select('id', count='exact').execute()
    print('Users count:', getattr(users, 'count', 'N/A'))
    
    print('Testing virtual_holdings...')
    holdings = supabase.table('virtual_holdings').select('quantity').execute()
    print('Holdings fetched')
    
    print('Testing goals...')
    goals = supabase.table('goals').select('id', count='exact').execute()
    print('Goals count:', getattr(goals, 'count', 'N/A'))
    
    print('Testing txns...')
    txns = supabase.table('virtual_transactions').select('id', count='exact').execute()
    print('Txns count:', getattr(txns, 'count', 'N/A'))

except Exception as e:
    traceback.print_exc()
