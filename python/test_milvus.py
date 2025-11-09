#!/usr/bin/env python3
"""
Test script to verify Milvus connection and setup
Run this after setting up Milvus to verify the connection works.
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

MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
MILVUS_URI = os.getenv("MILVUS_URI")  # For serverless/cloud connections
MILVUS_USER = os.getenv("MILVUS_USER")
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN")
MILVUS_COLLECTION_NAME = os.getenv("MILVUS_COLLECTION_NAME", "bill_embeddings")

print("🔍 Testing Milvus Connection...")
print()
print(f"📋 Configuration:")
if MILVUS_URI:
    print(f"   - URI: {MILVUS_URI}")
    if MILVUS_USER:
        print(f"   - User: {MILVUS_USER}")
    if MILVUS_TOKEN:
        print(f"   - Using Token authentication")
else:
    print(f"   - Host: {MILVUS_HOST}")
    print(f"   - Port: {MILVUS_PORT}")
print(f"   - Collection: {MILVUS_COLLECTION_NAME}")
print()

# Try to connect
try:
    from pymilvus import connections, utility
    
    print("🔌 Connecting to Milvus...")
    try:
        # Check if already connected
        connections.get_connection_addr("default")
        print("   Already connected to Milvus")
    except:
        # Connect to Milvus - support both traditional and serverless
        if MILVUS_URI:
            # Serverless/Cloud connection
            connection_params = {
                "alias": "default",
                "uri": MILVUS_URI,
            }
            if MILVUS_TOKEN:
                connection_params["token"] = MILVUS_TOKEN
            elif MILVUS_USER and MILVUS_PASSWORD:
                connection_params["user"] = MILVUS_USER
                connection_params["password"] = MILVUS_PASSWORD
            connections.connect(**connection_params)
            print("   ✅ Connected to serverless Milvus successfully!")
        else:
            # Traditional host/port connection
            connections.connect(
                alias="default",
                host=MILVUS_HOST,
                port=int(MILVUS_PORT)
            )
            print("   ✅ Connected successfully!")
    
    print()
    
    # List all collections
    print("📊 Checking collections...")
    collections = utility.list_collections()
    print(f"   Found {len(collections)} collection(s): {collections}")
    print()
    
    # Check if our collection exists
    if utility.has_collection(MILVUS_COLLECTION_NAME):
        print(f"✅ Collection '{MILVUS_COLLECTION_NAME}' exists")
        
        # Get collection info
        from pymilvus import Collection
        collection = Collection(MILVUS_COLLECTION_NAME)
        collection.load()
        
        # Get entity count
        num_entities = collection.num_entities
        print(f"   - Entities: {num_entities}")
        
        # Get schema info
        schema = collection.schema
        print(f"   - Fields: {[field.name for field in schema.fields]}")
        
        # Check indexes
        indexes = collection.indexes
        print(f"   - Indexes: {len(indexes)}")
        for idx in indexes:
            print(f"     * {idx.field_name}: {idx.params}")
    else:
        print(f"⚠️  Collection '{MILVUS_COLLECTION_NAME}' does not exist")
        print("   Run setup_milvus.py to create it")
    
    print()
    print("🎉 Milvus connection test complete!")
    
except ImportError:
    print("❌ pymilvus package not installed")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print()
    print("💡 Troubleshooting:")
    if MILVUS_URI:
        print("   1. Verify MILVUS_URI in your .env file")
        print("   2. Check MILVUS_USER/MILVUS_PASSWORD or MILVUS_TOKEN for authentication")
        print("   3. Ensure your Zilliz Cloud cluster is active and accessible")
    else:
        print("   1. Make sure Milvus is running:")
        print("      - If using Docker: docker ps | grep milvus")
        print("      - If using local install: Check Milvus service status")
        print("   2. Verify MILVUS_HOST and MILVUS_PORT in your .env file")
        print("   3. Check firewall settings if connecting to remote Milvus")
        print("   4. For Docker setup, run: docker-compose up -d milvus")
    sys.exit(1)

