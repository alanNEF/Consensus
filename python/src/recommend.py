"""
Recommendation script: performs vector similarity search to recommend bills
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
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


def recommend_bills_by_query(query: str, top_n: int = 5) -> List[Dict[str, Any]]:
    """Recommend bills based on a text query"""
    print(f"🔍 Searching for bills similar to: '{query}'")
    print()

    # Generate embedding for query
    print("  Generating query embedding...")
    query_embedding = generate_embedding(query)

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("  [MOCK] Would perform vector similarity search")
        print("  [MOCK] Returning mock recommendations...")
        return [
            {"bill_id": "hr1234-118", "similarity": 0.95, "title": "Infrastructure Investment and Jobs Act"},
            {"bill_id": "s5678-118", "similarity": 0.87, "title": "Climate Action and Clean Energy Bill"},
        ]

    try:
        from supabase import create_client, Client

        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Convert embedding to string format for pgvector
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

        # Perform vector similarity search using cosine distance
        # Note: This requires the pgvector extension and proper indexing
        # SQL: SELECT bill_id, 1 - (embedding <=> $1::vector) as similarity
        #      FROM bill_embeddings
        #      ORDER BY embedding <=> $1::vector
        #      LIMIT $2

        # Using Supabase RPC (if you create a function) or raw SQL
        # For now, we'll use a mock approach
        # TODO: Implement actual vector similarity search using Supabase RPC or raw SQL

        print("  [TODO] Vector similarity search not yet implemented")
        print("  Create a Supabase RPC function for vector search:")
        print("  CREATE OR REPLACE FUNCTION match_bills(query_embedding vector(1536), match_count int)")
        print("  RETURNS TABLE (bill_id text, similarity float)")
        print("  AS $$")
        print("  BEGIN")
        print("    RETURN QUERY")
        print("    SELECT be.bill_id, 1 - (be.embedding <=> query_embedding) as similarity")
        print("    FROM bill_embeddings be")
        print("    ORDER BY be.embedding <=> query_embedding")
        print("    LIMIT match_count;")
        print("  END;")
        print("  $$ LANGUAGE plpgsql;")

        return []
    except Exception as e:
        print(f"  [ERROR] Failed to perform similarity search: {e}")
        return []


def recommend_bills_for_user(user_id: str, top_n: int = 5) -> List[Dict[str, Any]]:
    """Recommend bills for a specific user based on their preferences"""
    print(f"👤 Generating recommendations for user: {user_id}")
    print()

    # TODO: Fetch user preferences from database
    # For now, use a mock query
    query = "infrastructure jobs climate energy"
    return recommend_bills_by_query(query, top_n)


def main():
    """Main recommendation function"""
    import argparse

    parser = argparse.ArgumentParser(description="Recommend bills using vector similarity")
    parser.add_argument(
        "--query",
        type=str,
        help="Text query to search for similar bills",
    )
    parser.add_argument(
        "--user-id",
        type=str,
        help="User ID to generate personalized recommendations",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=5,
        help="Number of recommendations to return (default: 5)",
    )

    args = parser.parse_args()

    if args.query:
        recommendations = recommend_bills_by_query(args.query, args.top_n)
    elif args.user_id:
        recommendations = recommend_bills_for_user(args.user_id, args.top_n)
    else:
        # Default: use a sample query
        recommendations = recommend_bills_by_query("climate change renewable energy", args.top_n)

    print()
    print("📊 Recommendations:")
    print()
    for i, rec in enumerate(recommendations, 1):
        print(f"  {i}. {rec.get('title', rec.get('bill_id', 'Unknown'))}")
        print(f"     Bill ID: {rec.get('bill_id', 'N/A')}")
        if 'similarity' in rec:
            print(f"     Similarity: {rec['similarity']:.2f}")
        print()


if __name__ == "__main__":
    main()

