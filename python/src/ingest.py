"""
Bill ingestion script: pulls bills, generates embeddings using sentence-transformers,
classifies bills, and stores data in Supabase (SQL) and Milvus (vector database)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Import classification function from recommend.py
from recommend import classify_bill_text

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-mpnet-base-v2")
DATABASE_URL = os.getenv("DATABASE_URL")

# Milvus configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
MILVUS_COLLECTION_NAME = os.getenv("MILVUS_COLLECTION_NAME", "bill_embeddings")

# Check if required env vars are set
if not SUPABASE_URL or SUPABASE_URL == "replace_me":
    print("⚠️  SUPABASE_URL not configured. Using mock mode.")
    SUPABASE_URL = None

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "replace_me":
    print("⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Using mock mode.")
    SUPABASE_SERVICE_ROLE_KEY = None

if not OPENAI_API_KEY or OPENAI_API_KEY == "replace_me":
    print("⚠️  OPENAI_API_KEY not configured. Using mock embeddings.")
    OPENAI_API_KEY = None

# Initialize sentence transformer model (lazy loading)
_embedding_model = None


def get_mock_bills() -> List[Dict[str, Any]]:
    """Return mock bills for testing"""
    return [
        {
            "id": "hr1234-118",
            "title": "Infrastructure Investment and Jobs Act",
            "summary_key": "infrastructure-jobs-2024",
            "date": "2024-01-15",
            "status": "Passed House",
            "origin": "House",
            "url": "https://www.congress.gov/bill/118th-congress/house-bill/1234",
            "sponsors": ["Rep. Jane Smith", "Rep. John Doe"],
        },
        {
            "id": "s5678-118",
            "title": "Climate Action and Clean Energy Bill",
            "summary_key": "climate-action-2024",
            "date": "2024-02-20",
            "status": "In Committee",
            "origin": "Senate",
            "url": "https://www.congress.gov/bill/118th-congress/senate-bill/5678",
            "sponsors": ["Sen. Alice Johnson", "Sen. Bob Williams"],
        },
    ]


def get_embedding_model():
    """Get or initialize the sentence transformer model"""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        print(f"  Loading embedding model: {EMBED_MODEL}")
        _embedding_model = SentenceTransformer(EMBED_MODEL)
    return _embedding_model


def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using sentence-transformers"""
    try:
        model = get_embedding_model()
        # Encode the text - model.encode expects a list of strings
        sentences = [text]
        embeddings = model.encode(sentences)
        # Return the first (and only) embedding as a list
        return embeddings[0].tolist()
    except Exception as e:
        print(f"  [ERROR] Failed to generate embedding: {e}")
        # Return mock embedding on error (768 dims for all-mpnet-base-v2)
        import random
        return [random.random() for _ in range(768)]


def upsert_bill(bill: Dict[str, Any], categories: Optional[List[str]] = None) -> bool:
    """Upsert bill data to Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(f"  [MOCK] Would upsert bill {bill['id']}")
        if categories:
            print(f"  [MOCK] Categories: {categories}")
        return False

    try:
        from supabase import create_client, Client

        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Prepare bill data
        bill_data = {
            "id": bill["id"],
            "title": bill["title"],
            "summary_key": bill.get("summary_key"),
            "date": bill.get("date"),
            "status": bill.get("status"),
            "origin": bill.get("origin"),
            "url": bill.get("url"),
            "sponsors": bill.get("sponsors", []),
        }
        
        # Add categories if provided
        if categories:
            bill_data["categories"] = categories

        # Upsert to bills table
        result = supabase.table("bills").upsert(
            bill_data,
            on_conflict="id",
        ).execute()

        return True
    except Exception as e:
        print(f"  [ERROR] Failed to upsert bill: {e}")
        return False


def get_milvus_connection():
    """Get or create Milvus connection"""
    try:
        from pymilvus import connections
        
        # Check if already connected
        try:
            connections.get_connection_addr("default")
            return True
        except:
            pass
        
        # Connect to Milvus
        connections.connect(
            alias="default",
            host=MILVUS_HOST,
            port=int(MILVUS_PORT)
        )
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to connect to Milvus: {e}")
        return False


def setup_milvus_collection():
    """Create or get Milvus collection for bill embeddings"""
    try:
        from pymilvus import Collection, FieldSchema, CollectionSchema, DataType, utility, connections
        
        # Ensure connection
        if not get_milvus_connection():
            return None
        
        # Check if collection exists
        if utility.has_collection(MILVUS_COLLECTION_NAME):
            print(f"  Collection '{MILVUS_COLLECTION_NAME}' already exists")
            collection = Collection(MILVUS_COLLECTION_NAME)
            collection.load()
            return collection
        
        # Define schema
        # bill_id: primary key (VARCHAR)
        # embedding: vector field (768 dimensions for all-mpnet-base-v2)
        fields = [
            FieldSchema(name="bill_id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768)
        ]
        
        schema = CollectionSchema(
            fields=fields,
            description="Bill embeddings for semantic search"
        )
        
        # Create collection
        collection = Collection(
            name=MILVUS_COLLECTION_NAME,
            schema=schema
        )
        
        # Create index for vector field
        index_params = {
            "metric_type": "L2",  # L2 distance for similarity search
            "index_type": "IVF_FLAT",
            "params": {"nlist": 128}
        }
        collection.create_index(
            field_name="embedding",
            index_params=index_params
        )
        
        # Load collection into memory
        collection.load()
        
        print(f"  Created and loaded collection '{MILVUS_COLLECTION_NAME}'")
        return collection
        
    except Exception as e:
        print(f"  [ERROR] Failed to setup Milvus collection: {e}")
        return None


def upsert_bill_embedding_milvus(bill_id: str, embedding: List[float]) -> bool:
    """Upsert bill embedding to Milvus vector database"""
    try:
        from pymilvus import Collection, utility
        
        # Setup collection
        collection = setup_milvus_collection()
        if collection is None:
            print(f"  [MOCK] Would upsert embedding for bill {bill_id} to Milvus")
            return False
        
        # Check if bill_id already exists - if so, delete it first (upsert behavior)
        expr = f'bill_id == "{bill_id}"'
        existing = collection.query(expr=expr, output_fields=["bill_id"])
        if existing:
            collection.delete(expr=expr)
        
        # Prepare data for insertion
        data = [
            [bill_id],  # bill_id
            [embedding]  # embedding vector
        ]
        
        # Insert into collection
        collection.insert(data)
        collection.flush()  # Ensure data is written
        
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to upsert embedding to Milvus: {e}")
        return False


def get_bill_summary_text(bill_id: str) -> Optional[str]:
    """Fetch bill summary text from database if available"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        result = supabase.table("bill_summaries").select("summary_text").eq("bill_id", bill_id).limit(1).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]["summary_text"]
        return None
    except Exception as e:
        print(f"  [WARNING] Could not fetch summary for {bill_id}: {e}")
        return None


def get_bill_full_text(bill_id: str) -> Optional[str]:
    """
    Fetch full bill text from database or file system.
    Priority: database field > file system (bill_id.txt) > None
    """
    # First, try to get from database if there's a full_text field
    # (This would require adding a full_text column to bills table or a separate table)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            from supabase import create_client, Client
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Try to get from bills table if full_text column exists
            result = supabase.table("bills").select("full_text").eq("id", bill_id).limit(1).execute()
            if result.data and len(result.data) > 0 and result.data[0].get("full_text"):
                return result.data[0]["full_text"]
        except Exception as e:
            # Column might not exist, that's okay
            pass
    
    # Fallback: try to read from file system (e.g., example_bill.txt or {bill_id}.txt)
    try:
        # Try common file locations
        possible_paths = [
            f"{bill_id}.txt",
            f"example_bill.txt",
            f"bills/{bill_id}.txt",
            f"data/bills/{bill_id}.txt",
        ]
        
        for file_path in possible_paths:
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
    except Exception as e:
        print(f"  [WARNING] Could not read bill text from file: {e}")
    
    return None


def ingest_bills():
    """Main ingestion function"""
    print("🚀 Starting bill ingestion...")
    print()

    # Fetch bills (mock for now)
    # TODO: Replace with actual Congress.gov API call or database query
    print("📥 Fetching bills...")
    bills = get_mock_bills()
    print(f"  Found {len(bills)} bills")
    print()

    # Process each bill
    for i, bill in enumerate(bills, 1):
        print(f"[{i}/{len(bills)}] Processing: {bill['title']}")

        # Get full bill text for embedding (priority: full text > summary > title)
        full_text = get_bill_full_text(bill["id"])
        summary_text = get_bill_summary_text(bill["id"])
        
        # Prepare text for classification (use summary if available, otherwise title + summary_key)
        if summary_text:
            classification_text = f"{bill['title']} {summary_text}"
        else:
            classification_text = f"{bill['title']} {bill.get('summary_key', '')}"

        # Classify bill into categories
        print("  Classifying bill into categories...")
        try:
            classification_results = classify_bill_text(classification_text, threshold_std=0.5)
            categories = [label for label, score in classification_results]
            print(f"  Categories: {', '.join(categories) if categories else 'None'}")
        except Exception as e:
            print(f"  [WARNING] Classification failed: {e}")
            categories = []

        # Upsert bill with categories
        print("  Upserting bill to database...")
        upsert_bill(bill, categories=categories if categories else None)

        # Generate text for embedding - USE FULL TEXT if available
        if full_text:
            embedding_text = full_text
            print("  Using full bill text for embedding")
        elif summary_text:
            embedding_text = f"{bill['title']} {summary_text}"
            print("  Using summary text for embedding (full text not available)")
        else:
            embedding_text = f"{bill['title']} {bill.get('summary_key', '')}"
            print("  Using title + summary_key for embedding (full text and summary not available)")

        # Generate embedding using sentence-transformers
        print("  Generating embedding using sentence-transformers...")
        embedding = generate_embedding(embedding_text)
        print(f"  Embedding dimension: {len(embedding)}")

        # Upsert embedding to Milvus vector database
        print("  Upserting embedding to Milvus...")
        success = upsert_bill_embedding_milvus(bill["id"], embedding)

        if success:
            print(f"  ✅ Successfully processed {bill['id']}")
            print(f"     - Categories stored in Supabase (SQL)")
            print(f"     - Embedding stored in Milvus (linked via bill_id: {bill['id']})")
        else:
            print(f"  ⚠️  Processed {bill['id']} (mock mode)")

        print()

    print("✅ Ingestion complete!")
    print()
    print("💡 Next steps:")
    print("   - Verify bill metadata and categories in Supabase (SQL database)")
    print("   - Verify embeddings in Milvus vector database")
    print("   - Bills are linked between databases via bill_id")
    print("   - Use bill_id to join SQL metadata with Milvus vectors for search")


if __name__ == "__main__":
    ingest_bills()

