import sys
import bcrypt
from db import supabase

email = "admin@finai.com"
password = "admin"

password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Check if admin exists
res = supabase.table('users').select('id').eq('email', email).execute()

if res.data:
    # update password
    user_id = res.data[0]['id']
    supabase.table('users').update({'password_hash': password_hash}).eq('id', user_id).execute()
    print("Password reset successfully.")
else:
    # create user
    res = supabase.table('users').insert({
        'email': email,
        'password_hash': password_hash,
        'name': 'Admin',
        'country': 'Pakistan'
    }).execute()
    print("Admin user created successfully.")
