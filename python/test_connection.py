#!/usr/bin/env python3
"""
Test script to verify Supabase connection
Run this after setting up your .env file to verify the connection works.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
python_dir = Path(__file__).parent
env_path = python_dir / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("🔍 Testing Supabase Connection...")
print()

# Check if credentials are set
if not SUPABASE_URL or SUPABASE_URL == "replace_me":
    print("❌ SUPABASE_URL is not configured")
    print("   Please set SUPABASE_URL in your .env file")
    sys.exit(1)

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "replace_me":
    print("❌ SUPABASE_SERVICE_ROLE_KEY is not configured")
    print("   Please set SUPABASE_SERVICE_ROLE_KEY in your .env file")
    sys.exit(1)

print(f"✅ SUPABASE_URL: {SUPABASE_URL[:30]}...")
print(f"✅ SUPABASE_SERVICE_ROLE_KEY: {SUPABASE_SERVICE_ROLE_KEY[:20]}...")
print()

# Try to connect
try:
    from supabase import create_client, Client
    
    print("🔌 Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Test query - try to fetch from bills table
    print("📊 Testing database query...")
    result = supabase.table("bills").select("id").limit(1).execute()
    
    print("✅ Connection successful!")
    print()
    print(f"📈 Found {len(result.data) if result.data else 0} bills in database")
    print()
    print("🎉 Your Python scripts are ready to use Supabase!")
    
except ImportError:
    print("❌ supabase package not installed")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print()
    print("💡 Troubleshooting:")
    print("   1. Verify your SUPABASE_URL is correct")
    print("   2. Verify your SUPABASE_SERVICE_ROLE_KEY is correct")
    print("   3. Check that your Supabase project is active")
    print("   4. Ensure the 'bills' table exists in your database")
    sys.exit(1)

