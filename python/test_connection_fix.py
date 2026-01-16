#!/usr/bin/env python3
"""
Quick test script to verify Milvus connection is working
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from vectors import get_milvus_connection, get_bills_needing_embeddings

print("Testing Milvus connection...")
print()

# Test connection
if get_milvus_connection():
    print("✅ Milvus connection successful!")
    print()
    
    # Check bills needing embeddings
    print("Checking bills needing embeddings...")
    bill_ids = get_bills_needing_embeddings()
    print(f"Found {len(bill_ids)} bill(s) that need embeddings")
    
    if bill_ids:
        print(f"Sample bill IDs: {list(bill_ids)[:5]}")
        print()
        print("You can now run:")
        print("  python src/sync_service.py --once")
        print("to process these bills.")
    else:
        print("All bills already have embeddings!")
else:
    print("❌ Milvus connection failed!")
    print()
    print("Please check:")
    print("  1. MILVUS_URI is set correctly in your .env file")
    print("  2. MILVUS_TOKEN (API key) OR MILVUS_USER/MILVUS_PASSWORD are set")
    print("  3. Your Zilliz Cloud cluster is running and accessible")
    sys.exit(1)
