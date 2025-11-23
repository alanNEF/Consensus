#!/usr/bin/env python3
"""
Verify which index type is actually being used in Milvus
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

sys.path.insert(0, str(python_dir / "src"))
from vectors import get_milvus_connection, MILVUS_COLLECTION_NAME

def verify_index():
    """Check what index is actually being used"""
    try:
        from pymilvus import Collection, utility
        
        print("🔍 Verifying Milvus Index Configuration...")
        print()
        
        # Connect
        if not get_milvus_connection():
            print("❌ Failed to connect to Milvus")
            return
        
        # Check if collection exists
        if not utility.has_collection(MILVUS_COLLECTION_NAME):
            print(f"❌ Collection '{MILVUS_COLLECTION_NAME}' does not exist")
            print("   Run: python setup_milvus.py")
            return
        
        # Get collection
        collection = Collection(MILVUS_COLLECTION_NAME)
        collection.load()
        
        print(f"✅ Collection '{MILVUS_COLLECTION_NAME}' found")
        print(f"   Entities: {collection.num_entities}")
        print()
        
        # Check indexes
        indexes = collection.indexes
        print(f"📊 Indexes ({len(indexes)} found):")
        print()
        
        found_embedding_index = False
        for idx in indexes:
            print(f"   Field: {idx.field_name}")
            print(f"   Index Type: {idx.params.get('index_type', 'UNKNOWN')}")
            print(f"   Metric Type: {idx.params.get('metric_type', 'UNKNOWN')}")
            
            if idx.field_name == "embedding":
                found_embedding_index = True
                index_type = idx.params.get('index_type', 'UNKNOWN')
                metric = idx.params.get('metric_type', 'UNKNOWN')
                
                print()
                if index_type == "HNSW":
                    print("   ✅ HNSW INDEX DETECTED!")
                    print(f"      M: {idx.params.get('params', {}).get('M', 'N/A')}")
                    print(f"      efConstruction: {idx.params.get('params', {}).get('efConstruction', 'N/A')}")
                elif index_type == "IVF_FLAT":
                    print("   ⚠️  IVF_FLAT INDEX DETECTED (OLD INDEX)")
                    print("   ⚠️  You need to recreate the collection with HNSW!")
                    print()
                    print("   To fix:")
                    print("   1. python setup_milvus.py --clear")
                    print("   2. python setup_milvus.py")
                    print("   3. python src/vectors.py --force-recreate")
                else:
                    print(f"   ⚠️  Unknown index type: {index_type}")
            
            print()
        
        if not found_embedding_index:
            print("   ⚠️  No index found on 'embedding' field!")
            print("   Run: python setup_milvus.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_index()
