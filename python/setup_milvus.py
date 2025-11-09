#!/usr/bin/env python3
"""
Setup script to initialize Milvus database and collection
Run this script to create the bill_embeddings collection in Milvus.
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

# Import setup function from ingest.py
sys.path.insert(0, str(python_dir / "src"))
from ingest import setup_milvus_collection, clear_milvus_database, get_milvus_connection, MILVUS_COLLECTION_NAME

def main():
    """Main setup function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup Milvus database and collection")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing collection before setup (WARNING: This will delete all data!)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force recreate collection even if it exists",
    )
    
    args = parser.parse_args()
    
    print("🚀 Setting up Milvus database...")
    print()
    
    # Test connection first
    print("🔌 Testing connection...")
    if not get_milvus_connection():
        print("❌ Failed to connect to Milvus")
        print()
        print("💡 Make sure Milvus is running:")
        print("   - If using Docker: docker-compose up -d milvus")
        print("   - Check MILVUS_HOST and MILVUS_PORT in your .env file")
        sys.exit(1)
    print("   ✅ Connected to Milvus")
    print()
    
    # Clear if requested (either --clear or --force)
    if args.clear or args.force:
        print("🗑️  Clearing existing collection...")
        if clear_milvus_database():
            print("   ✅ Collection cleared")
        else:
            print("   ⚠️  Failed to clear collection (may not exist)")
        print()
    
    # Setup collection
    print(f"📦 Setting up collection '{MILVUS_COLLECTION_NAME}'...")
    collection = setup_milvus_collection()
    
    if collection is None:
        print("❌ Failed to setup collection")
        sys.exit(1)
    
    print()
    print("✅ Milvus setup complete!")
    print()
    print("💡 Next steps:")
    print("   - Run test_milvus.py to verify the setup")
    print("   - Run ingest.py to add bill embeddings")
    print("   - Use recommend.py to search for similar bills")

if __name__ == "__main__":
    main()

