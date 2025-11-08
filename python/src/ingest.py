"""
Bill ingestion script: pulls bills, generates embeddings, and upserts to Supabase (pgvector)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
DATABASE_URL = os.getenv("DATABASE_URL")

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


def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using OpenAI"""
    if not OPENAI_API_KEY:
        # Return mock embedding
        print("  [MOCK] Generating mock embedding...")
        import random
        return [random.random() for _ in range(1536)]

    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model=EMBED_MODEL,
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"  [ERROR] Failed to generate embedding: {e}")
        # Return mock embedding on error
        import random
        return [random.random() for _ in range(1536)]


def upsert_bill_embedding(bill_id: str, embedding: List[float]) -> bool:
    """Upsert bill embedding to Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(f"  [MOCK] Would upsert embedding for bill {bill_id}")
        return False

    try:
        from supabase import create_client, Client

        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Convert embedding to string format for pgvector
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        # Upsert to bill_embeddings table
        result = supabase.table("bill_embeddings").upsert(
            {
                "bill_id": bill_id,
                "embedding": embedding_str,  # pgvector expects string format
            },
            on_conflict="bill_id",
        ).execute()

        return True
    except Exception as e:
        print(f"  [ERROR] Failed to upsert embedding: {e}")
        return False


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

        # Generate text for embedding (combine title and summary_key)
        text = f"{bill['title']} {bill.get('summary_key', '')}"

        # Generate embedding
        print("  Generating embedding...")
        embedding = generate_embedding(text)

        # Upsert to database
        print("  Upserting to database...")
        success = upsert_bill_embedding(bill["id"], embedding)

        if success:
            print(f"  ✅ Successfully processed {bill['id']}")
        else:
            print(f"  ⚠️  Processed {bill['id']} (mock mode)")

        print()

    print("✅ Ingestion complete!")
    print()
    print("💡 Next steps:")
    print("   - Verify embeddings in Supabase dashboard")
    print("   - Run recommend.py to test similarity search")


if __name__ == "__main__":
    ingest_bills()

