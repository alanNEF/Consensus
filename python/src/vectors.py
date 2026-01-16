"""
Bill ingestion and vector creation script: 
- Fetches bills from Supabase database, generates embeddings using sentence-transformers, 
  if they do not exist(or if you ask it to) and stores embeddings in Milvus (vector database)
- Manages Milvus collection setup and vector storage
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional, Set
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
# Look for .env file in the python directory (parent of src)
python_dir = Path(__file__).parent.parent
env_path = python_dir / ".env"
load_dotenv(dotenv_path=env_path)
# Also try loading from current directory (for backwards compatibility)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-mpnet-base-v2")
DATABASE_URL = os.getenv("DATABASE_URL")

# Milvus configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
MILVUS_URI = os.getenv("MILVUS_URI")  # For serverless/cloud connections (e.g., Zilliz Cloud)
MILVUS_USER = os.getenv("MILVUS_USER")  # Username for authentication
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")  # Password for authentication
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN")  # API token for authentication (alternative to user/password)
MILVUS_COLLECTION_NAME = os.getenv("MILVUS_COLLECTION_NAME", "bill_embeddings")

# Check if required env vars are set
if not SUPABASE_URL or SUPABASE_URL == "replace_me":
    print("!!SUPABASE_URL not configured. Using mock mode.!!")
    SUPABASE_URL = None

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "replace_me":
    print("!!SUPABASE_SERVICE_ROLE_KEY not configured. Using mock mode.!!")
    SUPABASE_SERVICE_ROLE_KEY = None

# Initialize sentence transformer model (lazy loading)
_embedding_model = None


def get_bills_from_database(limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
    """Fetch bills from the database"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("  [MOCK] Would fetch bills from database")
        return []
    
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        query = supabase.table("bills").select("*")
        
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        
        result = query.execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"  [ERROR] Failed to fetch bills: {e}")
        return []


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
        
        # Use faster model - all-MiniLM-L6-v2 is 5x faster with similar quality
        model_name = os.getenv("EMBED_MODEL", "sentence-transformers/all-mpnet-base-v2")
        print(f"  Loading embedding model: {model_name}")
        _embedding_model = SentenceTransformer(model_name)
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


def upsert_bill(bill: Dict[str, Any], categories: Optional[List[str]] = None, bill_text: Optional[str] = None) -> bool:
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
        
        # Add bill_text if provided, otherwise use empty string (required by schema)
        if bill_text is not None:
            bill_data["bill_text"] = bill_text
        else:
            # Use title + summary_key as fallback if no bill_text provided
            bill_data["bill_text"] = f"{bill.get('title', '')} {bill.get('summary_key', '')}".strip() or ""
        
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
        from pymilvus import connections, utility
        
        # Check if already connected and working
        try:
            addr = connections.get_connection_addr("default")
            # Verify connection is actually working by trying to list collections
            utility.list_collections()
            return True
        except Exception:
            # Connection doesn't exist or is broken, create new one
            pass
        
        # Connect to Milvus - support both traditional (host/port) and serverless (URI) connections
        if MILVUS_URI:
            # Serverless/Cloud connection (e.g., Zilliz Cloud)
            # Prepare URI - ensure it has a port if missing
            uri = MILVUS_URI.strip()
            
            # Note: Both .serverless. and .api. formats are valid depending on cluster type
            # Keep the original format from the user's configuration
            
            if uri.startswith("https://") and ":" not in uri.split("//")[1]:
                # Add default port 443 for HTTPS if not specified
                uri = f"{uri}:443"
            
            connection_params = {
                "alias": "default",
                "uri": uri,
            }
            # Add authentication if provided
            # For Zilliz Cloud: token can be either API key OR "username:password" format
            has_auth = False
            if MILVUS_TOKEN:
                connection_params["token"] = MILVUS_TOKEN
                has_auth = True
            elif MILVUS_USER and MILVUS_PASSWORD:
                # For Zilliz Cloud serverless, combine username:password as token
                connection_params["token"] = f"{MILVUS_USER}:{MILVUS_PASSWORD}"
                has_auth = True
            
            if not has_auth:
                print(f"  [WARNING] No authentication provided for Zilliz Cloud connection")
                print(f"  [WARNING] Zilliz Cloud requires either MILVUS_TOKEN (API key) or MILVUS_USER/MILVUS_PASSWORD")
                print(f"  [WARNING] For username/password, they will be combined as 'username:password'")
            
            print(f"  [INFO] Connecting to Milvus serverless at: {uri}")
            if has_auth:
                auth_type = "API key" if MILVUS_TOKEN else "username:password"
                print(f"  [INFO] Using authentication: {auth_type}")
            
            # Try connecting with the URI
            # First try with connections.connect (legacy API)
            try:
                connections.connect(**connection_params)
            except Exception as first_error:
                # If that fails, try MilvusClient (recommended for serverless)
                error_str = str(first_error)
                if "STOPPED" in error_str or "cluster status" in error_str:
                    # Cluster is stopped - provide helpful message
                    print(f"  [ERROR] Cluster appears to be STOPPED")
                    print(f"  [INFO] Please start your cluster in Zilliz Cloud Console")
                    raise first_error
                
                print(f"  [INFO] connections.connect() failed, trying MilvusClient...")
                try:
                    from pymilvus import MilvusClient
                    # MilvusClient works better with serverless clusters
                    client = MilvusClient(
                        uri=uri,
                        token=connection_params["token"]
                    )
                    # Test connection by listing collections
                    client.list_collections()
                    # If successful, we still need to use connections API for compatibility
                    # Close the client and try connections.connect again
                    client.close()
                    # Retry connections.connect - sometimes MilvusClient "wakes up" the cluster
                    connections.connect(**connection_params)
                except Exception as second_error:
                    # If connection fails and URI doesn't have port, try without port modification
                    if ":443" in uri and uri.endswith(":443"):
                        print(f"  [INFO] Connection with port 443 failed, trying original URI format...")
                        connection_params["uri"] = MILVUS_URI.strip()
                        try:
                            connections.connect(**connection_params)
                        except Exception:
                            # Re-raise the original error with better context
                            raise first_error
                    else:
                        raise first_error
        else:
            # Traditional host/port connection
            print(f"  [INFO] Connecting to Milvus at: {MILVUS_HOST}:{MILVUS_PORT}")
            connections.connect(
                alias="default",
                host=MILVUS_HOST,
                port=int(MILVUS_PORT)
            )
        
        # Verify connection works
        utility.list_collections()
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to connect to Milvus: {e}")
        if MILVUS_URI:
            print(f"  [DEBUG] URI: {MILVUS_URI}")
            print(f"  [DEBUG] Has MILVUS_TOKEN: {bool(MILVUS_TOKEN)}")
            print(f"  [DEBUG] Has MILVUS_USER: {bool(MILVUS_USER)}")
            print(f"  [DEBUG] Has MILVUS_PASSWORD: {bool(MILVUS_PASSWORD)}")
            if not MILVUS_TOKEN and not (MILVUS_USER and MILVUS_PASSWORD):
                print(f"  [HELP] Zilliz Cloud requires authentication!")
                print(f"  [HELP] Set either MILVUS_TOKEN or both MILVUS_USER and MILVUS_PASSWORD in your .env file")
        else:
            print(f"  [DEBUG] Host: {MILVUS_HOST}, Port: {MILVUS_PORT}")
        return False


def setup_milvus_collection(verbose: bool = True):
    """Create or get Milvus collection for bill embeddings"""
    try:
        from pymilvus import Collection, FieldSchema, CollectionSchema, DataType, utility, connections
        
        # Ensure connection is established and working
        if not get_milvus_connection():
            if verbose:
                print(f"  [ERROR] Cannot setup collection: Milvus connection failed")
            return None
        
        # Double-check connection is active before proceeding
        try:
            utility.list_collections()
        except Exception as e:
            if verbose:
                print(f"  [ERROR] Connection verification failed: {e}")
            # Try to reconnect
            if not get_milvus_connection():
                return None
        
        # Check if collection exists
        if utility.has_collection(MILVUS_COLLECTION_NAME):
            if verbose:
                print(f"  Collection '{MILVUS_COLLECTION_NAME}' already exists")
            collection = Collection(MILVUS_COLLECTION_NAME)
            collection.load()
            return collection
        
        # Define schema
        # bill_id: primary key (VARCHAR)
        # embedding: vector field (768 dimensions for all-mpnet-base-v2)
        fields = [
            FieldSchema(name="bill_id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768)  # Back to 768
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
            "index_type": "HNSW",
            "params": {
                "M": 16,
                "efConstruction": 200
            }
        }
        
        collection.create_index(
            field_name="embedding",
            index_params=index_params
        )
        
        # Load collection into memory
        collection.load()
        
        if verbose:
            print(f"  Created and loaded collection '{MILVUS_COLLECTION_NAME}'")
        return collection
        
    except Exception as e:
        print(f"  [ERROR] Failed to setup Milvus collection: {e}")
        return None


def upsert_bill_embedding_milvus(bill_id: str, embedding: List[float], collection=None) -> bool:
    """Upsert bill embedding to Milvus vector database"""
    try:
        from pymilvus import Collection, utility
        
        # Use provided collection or setup if not provided
        if collection is None:
            collection = setup_milvus_collection(verbose=False)
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


def check_vectors_exist() -> bool:
    """Check if vectors already exist in Milvus collection"""
    try:
        from pymilvus import Collection, utility
        
        # Ensure connection
        if not get_milvus_connection():
            return False
        
        # Check if collection exists
        if not utility.has_collection(MILVUS_COLLECTION_NAME):
            return False
        
        # Get collection and check entity count
        collection = Collection(MILVUS_COLLECTION_NAME)
        collection.load()
        num_entities = collection.num_entities
        return num_entities > 0
        
    except Exception as e:
        print(f"  [WARNING] Could not check if vectors exist: {e}")
        return False


def clear_milvus_database() -> bool:
    """Clear all data from the Milvus database by dropping the collection"""
    try:
        from pymilvus import utility
        
        # Ensure connection
        if not get_milvus_connection():
            print("  [ERROR] Failed to connect to Milvus")
            return False
        
        # Check if collection exists
        if not utility.has_collection(MILVUS_COLLECTION_NAME):
            print(f"  Collection '{MILVUS_COLLECTION_NAME}' does not exist. Nothing to clear.")
            return True
        
        # Drop the collection
        utility.drop_collection(MILVUS_COLLECTION_NAME)
        print(f"   Successfully dropped collection '{MILVUS_COLLECTION_NAME}'")
        return True
        
    except Exception as e:
        print(f"  [ERROR] Failed to clear Milvus database: {e}")
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


def ingest_bills(force_recreate: bool = False) -> bool:
    """
    Main ingestion function - fetches all bills from database and creates embeddings.
    
    Args:
        force_recreate: If True, clear existing vectors and recreate. If False, skip if vectors already exist.
    
    Returns:
        True if vectors were created/updated, False if skipped or failed
    """
    print("Starting bill ingestion...")
    print()

    # Check if vectors already exist
    print("Checking if vectors already exist...")
    vectors_exist = check_vectors_exist()
    
    if vectors_exist:
        if force_recreate:
            print("Vectors found, but force_recreate=True. Clearing existing vectors...")
            print("Clearing Milvus database...")
            if clear_milvus_database():
                print("Milvus database cleared")
            else:
                print("Failed to clear Milvus database!!")
            print()
        else:
            print("Vectors already exist in Milvus collection")
            print("Skipping ingestion. Use force_recreate=True to recreate vectors.")
            print()
            return False  # Vectors exist, skipped ingestion
    else:
        print("No existing vectors found. Proceeding with ingestion...")
        print()

    # Setup Milvus collection once
    print("📦 Setting up Milvus collection...")
    collection = setup_milvus_collection()
    if collection is None:
        print("Failed to setup Milvus collection")
        print("Make sure Milvus is running: docker-compose up -d milvus")
        return False
    print("Milvus collection ready")
    print()

    # Fetch all bills from database (with pagination to handle >1000 bills)
    print("Fetching bills from database...")
    all_bills = []
    page_size = 1000
    offset = 0
    
    while True:
        bills = get_bills_from_database(limit=page_size, offset=offset)
        if not bills:
            break
        all_bills.extend(bills)
        print(f"  Fetched {len(bills)} bills (total: {len(all_bills)})...")
        
        # If we got fewer than page_size, we've reached the end
        if len(bills) < page_size:
            break
        offset += page_size
    
    if not all_bills:
        print("No bills found in database")
        print("Make sure bills are already in the Supabase database")
        return False
    
    print(f"  Found {len(all_bills)} bills total")
    print()

    # Process each bill
    successful = 0
    failed = 0
    
    for i, bill in enumerate(all_bills, 1):
        bill_id = bill.get("id", "unknown")
        bill_title = bill.get("title", "Unknown")
        print(f"[{i}/{len(all_bills)}] Processing: {bill_title} ({bill_id})")

        # Get bill text for embedding (priority: bill_text > summary_text > title + summary_key)
        bill_text = bill.get("bill_text")
        summary_text = get_bill_summary_text(bill_id)
        
        # Determine embedding text
        if bill_text:
            embedding_text = bill_text
            print("  Using bill_text field for embedding")
        elif summary_text:
            embedding_text = f"{bill_title} {summary_text}"
            print("  Using summary_text for embedding (bill_text not available)")
        else:
            embedding_text = f"{bill_title} {bill.get('summary_key', '')}".strip()
            if not embedding_text:
                embedding_text = bill_title
            print("  Using title + summary_key for embedding (bill_text and summary not available)")

        # Generate embedding using sentence-transformers
        print("  Generating embedding...")
        try:
            embedding = generate_embedding(embedding_text)
            print(f"  Embedding dimension: {len(embedding)}")

            # Upsert embedding to Milvus vector database
            print("  Storing embedding in Milvus...")
            success = upsert_bill_embedding_milvus(bill_id, embedding, collection=collection)

            if success:
                print(f"    Successfully processed {bill_id}")
                successful += 1
            else:
                print(f"   Failed to store embedding for {bill_id}")
                failed += 1
        except Exception as e:
            print(f"    Error processing {bill_id}: {e}")
            failed += 1

        print()

    print("  Ingestion complete!")
    print()
    print(f"  Summary:")
    print(f"   - Total bills: {len(all_bills)}")
    print(f"   - Successfully processed: {successful}")
    print(f"   - Failed: {failed}")
    print()
    print("  Next steps:")
    print("   - Verify embeddings in Milvus vector database")
    print("   - Bills are linked between databases via bill_id")
    print("   - Use bill_id to join SQL metadata with Milvus vectors for search")
    
    # Return True if at least some vectors were successfully created
    return successful > 0


# Add at module level (after imports)
_cached_collection = None

def get_milvus_collection():
    """Get Milvus collection for bill embeddings (cached, only loads once)"""
    global _cached_collection
    
    # Return cached collection if already loaded
    if _cached_collection is not None:
        try:
            # Verify collection is still valid
            _cached_collection.num_entities
            return _cached_collection
        except Exception:
            # Collection was dropped or invalid, reset cache
            _cached_collection = None
    
    try:
        from pymilvus import Collection, utility
        
        # Ensure connection is established and working
        if not get_milvus_connection():
            return None
        
        # Check if collection exists
        if not utility.has_collection(MILVUS_COLLECTION_NAME):
            print(f"  [ERROR] Collection '{MILVUS_COLLECTION_NAME}' does not exist")
            print(f"    Run setup_milvus.py or ingest.py to create the collection")
            return None
        
        # Get collection
        collection = Collection(MILVUS_COLLECTION_NAME)
        
        # Only load if not already loaded
        try:
            # Check if already loaded
            collection.num_entities  # This will fail if not loaded
        except Exception:
            # Not loaded, load it now
            collection.load()
        
        # Cache the collection
        _cached_collection = collection
        return collection
    except Exception as e:
        print(f"  [ERROR] Failed to get Milvus collection: {e}")
        return None


def process_single_bill(bill_id: str, verbose: bool = True) -> bool:
    """
    Process a single bill: fetch from database, generate embedding, and add to Milvus.
    
    Args:
        bill_id: The ID of the bill to process
        verbose: Whether to print progress messages
    
    Returns:
        True if successful, False otherwise
    """
    if verbose:
        print(f"Processing bill: {bill_id}")
    
    # Fetch bill from database
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        if verbose:
            print(f"  [ERROR] Supabase not configured")
        return False
    
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        result = supabase.table("bills").select("*").eq("id", bill_id).limit(1).execute()
        
        if not result.data or len(result.data) == 0:
            if verbose:
                print(f"  [ERROR] Bill {bill_id} not found in database")
            return False
        
        bill = result.data[0]
    except Exception as e:
        if verbose:
            print(f"  [ERROR] Failed to fetch bill from database: {e}")
        return False
    
    # Setup Milvus collection
    collection = setup_milvus_collection(verbose=verbose)
    if collection is None:
        if verbose:
            print(f"  [ERROR] Failed to setup Milvus collection")
        return False
    
    # Get bill text for embedding
    bill_title = bill.get("title", "Unknown")
    bill_text = bill.get("bill_text")
    summary_text = get_bill_summary_text(bill_id)
    
    # Determine embedding text (same priority as ingest_bills)
    if bill_text:
        embedding_text = bill_text
        if verbose:
            print("  Using bill_text field for embedding")
    elif summary_text:
        embedding_text = f"{bill_title} {summary_text}"
        if verbose:
            print("  Using summary_text for embedding (bill_text not available)")
    else:
        embedding_text = f"{bill_title} {bill.get('summary_key', '')}".strip()
        if not embedding_text:
            embedding_text = bill_title
        if verbose:
            print("  Using title + summary_key for embedding (bill_text and summary not available)")
    
    # Generate embedding
    if verbose:
        print("  Generating embedding...")
    try:
        embedding = generate_embedding(embedding_text)
        if verbose:
            print(f"  Embedding dimension: {len(embedding)}")
    except Exception as e:
        if verbose:
            print(f"  [ERROR] Failed to generate embedding: {e}")
        return False
    
    # Upsert to Milvus
    if verbose:
        print("  Storing embedding in Milvus...")
    success = upsert_bill_embedding_milvus(bill_id, embedding, collection=collection)
    
    if success:
        if verbose:
            print(f"  Successfully processed {bill_id}")
        return True
    else:
        if verbose:
            print(f"  [ERROR] Failed to store embedding for {bill_id}")
        return False


def process_bills(bill_ids: List[str], verbose: bool = True) -> Dict[str, bool]:
    """
    Process multiple bills and add their embeddings to Milvus.
    
    Args:
        bill_ids: List of bill IDs to process
        verbose: Whether to print progress messages
    
    Returns:
        Dictionary mapping bill_id to success status (True/False)
    """
    results = {}
    
    # Setup Milvus collection once for all bills
    collection = setup_milvus_collection(verbose=verbose)
    if collection is None:
        if verbose:
            print("  [ERROR] Failed to setup Milvus collection")
        return {bill_id: False for bill_id in bill_ids}
    
    for bill_id in bill_ids:
        results[bill_id] = process_single_bill(bill_id, verbose=verbose)
        if verbose:
            print()
    
    return results


def get_bills_in_milvus() -> Set[str]:
    """
    Get set of all bill IDs that currently have embeddings in Milvus.
    
    Returns:
        Set of bill IDs
    """
    try:
        from pymilvus import Collection, utility
        
        # Ensure connection
        if not get_milvus_connection():
            return set()
        
        # Check if collection exists
        if not utility.has_collection(MILVUS_COLLECTION_NAME):
            return set()
        
        collection = Collection(MILVUS_COLLECTION_NAME)
        collection.load()
        
        # Query all bill_ids (using expr="*" to get all)
        # Note: We need to use a valid expression, so we'll query with a condition that matches all
        # Since bill_id is VARCHAR, we can use a range query or just query all
        try:
            # Get all entities - use a query that matches everything
            # For VARCHAR fields, we can use a pattern or just iterate
            # The simplest approach: query with no filter (but pymilvus requires expr)
            # We'll use a query that should match all: bill_id != "" (which should match all)
            results = collection.query(
                expr='bill_id != ""',
                output_fields=["bill_id"]
            )
            
            bill_ids = {item["bill_id"] for item in results}
            return bill_ids
        except Exception as e:
            # Fallback: if query fails, return empty set
            print(f"  [WARNING] Could not query Milvus for bill IDs: {e}")
            return set()
            
    except Exception as e:
        print(f"  [WARNING] Could not get bills from Milvus: {e}")
        return set()


def get_bills_needing_embeddings(limit: Optional[int] = None) -> List[str]:
    """
    Find bills in the database that don't have embeddings in Milvus yet.
    
    Args:
        limit: Maximum number of bill IDs to return (None for all)
    
    Returns:
        List of bill IDs that need embeddings
    """
    # Get all bills from database
    all_bills = get_bills_from_database(limit=None)
    database_bill_ids = {bill.get("id") for bill in all_bills if bill.get("id")}
    
    # Get bills that already have embeddings
    milvus_bill_ids = get_bills_in_milvus()
    
    # Find bills that need embeddings
    needing_embeddings = list(database_bill_ids - milvus_bill_ids)
    
    if limit:
        needing_embeddings = needing_embeddings[:limit]
    
    return needing_embeddings


def sync_new_bills(limit: Optional[int] = None, verbose: bool = True) -> Dict[str, Any]:
    """
    Sync new bills: find bills in database without embeddings and process them.
    
    Args:
        limit: Maximum number of bills to process in this sync (None for all)
        verbose: Whether to print progress messages
    
    Returns:
        Dictionary with sync results: {
            "processed": int,
            "successful": int,
            "failed": int,
            "results": Dict[str, bool]
        }
    """
    if verbose:
        print("Syncing new bills...")
        print()
    
    # Find bills that need embeddings
    if verbose:
        print("Finding bills that need embeddings...")
    bill_ids = get_bills_needing_embeddings(limit=limit)
    
    if not bill_ids:
        if verbose:
            print("No bills need embeddings. All bills are up to date.")
        return {
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "results": {}
        }
    
    if verbose:
        print(f"Found {len(bill_ids)} bill(s) that need embeddings")
        print()
    
    # Process all bills
    results = process_bills(bill_ids, verbose=verbose)
    
    # Count successes and failures
    successful = sum(1 for success in results.values() if success)
    failed = len(results) - successful
    
    if verbose:
        print(f"Sync complete: {successful} successful, {failed} failed")
        print()
    
    return {
        "processed": len(bill_ids),
        "successful": successful,
        "failed": failed,
        "results": results
    }


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest bills and create embeddings in Milvus")
    parser.add_argument(
        "--force-recreate",
        action="store_true",
        help="Force recreation of vectors even if they already exist"
    )
    
    args = parser.parse_args()
    
    # Check if vectors already exist
    print("  Checking if vectors already exist...")
    vectors_exist = check_vectors_exist()
    
    if vectors_exist and not args.force_recreate:
        print("    Vectors already exist in Milvus collection")
        print("    Use --force-recreate to recreate vectors")
        print()
    else:
        # Create vectors
        if vectors_exist and args.force_recreate:
            print("     Vectors found, but force_recreate=True. Recreating vectors...")
            print()
        
        # Run ingestion
        vectors_created = ingest_bills(force_recreate=args.force_recreate)
        
        if vectors_created:
            print("    Vector creation complete!")
        else:
            print("     Vector creation failed or was skipped!!!!")
        print()

