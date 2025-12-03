"""
Vector search functionality for bills.
Provides semantic search capabilities using Milvus vector database.
"""

import time
from typing import List, Dict, Any

# Import shared functions and config from vectors.py
from vectors import (
    generate_embedding,
    get_milvus_collection,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)

# Add at module level
_cached_index_metric = None

def search_bills_by_keywords(query: str) -> List[Dict[str, Any]]:
    """
    Search for bills using keyword matching in title and bill_text fields.
    Prioritizes exact title matches, then phrase matches, then word matches.
    
    Args:
        query: User query text to search for
    
    Returns:
        List of dictionaries containing bill_id and score for each keyword match.
        Results are sorted by match quality: exact title > phrase match > word match.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("  [INFO] Supabase not configured, skipping keyword search")
        return []
    
    try:
        from supabase import create_client, Client
        
        start = time.time()
        print(f"  [INFO] Starting keyword search for: '{query}'")
        
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Normalize query
        query_stripped = query.strip()
        if not query_stripped:
            return []
        
        # Dictionary to store results with their scores
        # Key: bill_id, Value: dict with bill_id, score, distance
        results_dict = {}
        query_lower = query_stripped.lower()
        
        # Escape special characters for ILIKE
        escaped_query = query_stripped.replace('%', '\\%').replace('_', '\\_')
        phrase_pattern = f"%{escaped_query}%"
        
        # Step 1: Check for PHRASE match in title (contains the full query)
        # This will also catch exact matches (when phrase = exact title)
        try:
            phrase_results = supabase.table("bills").select("id, title").ilike("title", phrase_pattern).execute()
            if phrase_results.data:
                for bill in phrase_results.data:
                    bill_id = bill["id"]
                    title = bill.get("title", "")
                    title_lower = title.lower()
                    
                    # Check if it's an exact match (case-insensitive)
                    if title_lower == query_lower:
                        results_dict[bill_id] = {
                            "bill_id": bill_id,
                            "score": 3.0,  # Highest score for exact match
                            "distance": 0.0
                        }
                    # Check if title starts with query (high priority)
                    elif title_lower.startswith(query_lower):
                        if bill_id not in results_dict:
                            results_dict[bill_id] = {
                                "bill_id": bill_id,
                                "score": 2.8,  # Very high score for starts-with match
                                "distance": 0.0
                            }
                    # Regular phrase match
                    else:
                        if bill_id not in results_dict:
                            results_dict[bill_id] = {
                                "bill_id": bill_id,
                                "score": 2.5,  # High score for phrase match
                                "distance": 0.0
                            }
            
            exact_count = len([r for r in results_dict.values() if r["score"] == 3.0])
            phrase_count = len([r for r in results_dict.values() if r["score"] >= 2.5 and r["score"] < 3.0])
            print(f"  [INFO] Found {exact_count} exact title matches, {phrase_count} phrase matches")
        except Exception as e:
            print(f"  [WARNING] Error searching for phrase/exact matches: {e}")
        
        # Step 2: Split query into words and search for word matches
        words = [word.strip() for word in query_stripped.split() if word.strip()]
        
        if words:
            # Track bills that match multiple words (higher priority)
            word_match_counts = {}  # bill_id -> count of matching words
            
            # For each word, search in title and bill_text
            for word in words:
                escaped_word = word.replace('%', '\\%').replace('_', '\\_')
                word_pattern = f"%{escaped_word}%"
                
                # Search in title (word match)
                try:
                    title_results = supabase.table("bills").select("id").ilike("title", word_pattern).execute()
                    if title_results.data:
                        for bill in title_results.data:
                            bill_id = bill["id"]
                            # Only process if not already found as exact/phrase match
                            if bill_id not in results_dict:
                                word_match_counts[bill_id] = word_match_counts.get(bill_id, 0) + 1
                except Exception as e:
                    print(f"  [WARNING] Error searching title for word '{word}': {e}")
                
                # Search in bill_text (word match)
                try:
                    text_results = supabase.table("bills").select("id").ilike("bill_text", word_pattern).execute()
                    if text_results.data:
                        for bill in text_results.data:
                            bill_id = bill["id"]
                            # Only process if not already found
                            if bill_id not in results_dict:
                                word_match_counts[bill_id] = word_match_counts.get(bill_id, 0) + 1
                except Exception as e:
                    print(f"  [WARNING] Error searching bill_text for word '{word}': {e}")
            
            # Add word matches to results with scores based on match count
            for bill_id, match_count in word_match_counts.items():
                # Higher score if multiple words match
                if match_count == len(words):
                    # All words matched - score 2.0
                    score = 2.0
                elif match_count >= len(words) // 2:
                    # At least half the words matched - score 1.5
                    score = 1.5
                else:
                    # Few words matched - score 1.0
                    score = 1.0
                
                results_dict[bill_id] = {
                    "bill_id": bill_id,
                    "score": score,
                    "distance": 0.0
                }
            
            print(f"  [INFO] Found {len(word_match_counts)} additional word-based matches")
        
        # Convert to list and sort by score descending
        keyword_results = list(results_dict.values())
        keyword_results.sort(key=lambda x: x["score"], reverse=True)
        
        print(f"  [INFO] Keyword search found {len(keyword_results)} total matches in {time.time() - start:.3f}s")
        return keyword_results
        
    except Exception as e:
        print(f"  [ERROR] Keyword search failed: {e}")
        import traceback
        traceback.print_exc()
        return []


def search_bills(query: str, top_k: int = 10, metric: str = "L2") -> List[Dict[str, Any]]:
    """
    Search for bills using vector similarity search.
    
    Args:
        query: User query text to search for
        top_k: Number of top results to return (default: 10)
        metric: Similarity metric to use - "L2", "COSINE", or "IP" (default: "L2")
    
    Returns:
        List of dictionaries containing bill_id and distance/score for each result
    """
    try:
        start = time.time()
        
        # Generate embedding for the query
        print(f"Searching for: '{query}'")
        embed_start = time.time()
        query_embedding = generate_embedding(query)
        print(f"  Embedding generation: {time.time() - embed_start:.3f}s")
        
        if query_embedding is None:
            print("  [ERROR] Failed to generate embedding for query")
            return []
        
        # Get Milvus collection
        collection_start = time.time()
        collection = get_milvus_collection()
        print(f"  Collection loading: {time.time() - collection_start:.3f}s")
        
        if collection is None:
            return []
        
        # Get the index metric type (cached)
        global _cached_index_metric
        if _cached_index_metric is None:
            index_metric = "L2"  # Default
            try:
                indexes = collection.indexes
                if indexes and len(indexes) > 0:
                    for idx in indexes:
                        if idx.field_name == "embedding":
                            index_metric = idx.params.get("metric_type", "L2")
                            _cached_index_metric = index_metric
                            break
            except Exception:
                pass
        else:
            index_metric = _cached_index_metric
        
        # Normalize vectors for cosine similarity (but still use index metric for search)
        using_cosine = False
        if metric == "COSINE":
            import numpy as np
            query_embedding = np.array(query_embedding)
            norm = np.linalg.norm(query_embedding)
            if norm > 0:
                query_embedding = (query_embedding / norm).tolist()
            using_cosine = True
            # Use the index metric (likely L2) even for cosine similarity
            # Note: For true cosine similarity, stored vectors should also be normalized
            metric = index_metric
            print(f"  [INFO] Using {index_metric} metric (index type) with normalized query for cosine-like similarity")
        
        # Ensure we use the index metric for search
        search_metric = metric if metric == index_metric else index_metric
        if metric != index_metric and not using_cosine:
            print(f"  [WARNING] Index uses {index_metric} metric, switching from {metric} to {index_metric}")
            metric = index_metric
        
        # Calculate optimal ef for HNSW based on top_k
        # ef should be >= top_k, typically 2-3x for good recall
        # But not too high to avoid unnecessary computation
        ef_value = max(top_k * 2, 32)  # Minimum 32, ideally 2x top_k
        # Cap at reasonable maximum to avoid excessive computation
        ef_value = min(ef_value, 200)  # Maximum 200 for very large top_k
        
        # Perform vector similarity search
        search_params = {
            "metric_type": search_metric,
            "params": {"ef": ef_value}
        }
        
        print(f"  [INFO] HNSW search: top_k={top_k}, ef={ef_value}")
        
        search_start = time.time()
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["bill_id"]
        )
        print(f"  Milvus search: {time.time() - search_start:.3f}s")
        
        # Format results and filter by similarity threshold
        search_results = []
        similarity_threshold = 0.4  # Minimum similarity score to include
        
        if results and len(results) > 0:
            for hit in results[0]:
                if using_cosine:
                    # For cosine-like similarity with normalized query and L2 distance
                    # The L2 distance on normalized vectors approximates cosine distance
                    # Convert to similarity score (smaller distance = higher similarity)
                    score = 1 / (1 + hit.distance)
                elif search_metric == "IP":
                    # For IP metric, distance is already similarity
                    score = hit.distance
                else:
                    # For L2, convert distance to similarity score
                    score = 1 / (1 + hit.distance)
                
                # Only include results above the similarity threshold
                if score > similarity_threshold:
                    search_results.append({
                        "bill_id": hit.entity.get("bill_id"),
                        "distance": hit.distance,
                        "score": score
                    })
        
        metric_display = "COSINE-like" if using_cosine else search_metric
        print(f"Found {len(search_results)} results above {similarity_threshold} similarity threshold (using {metric_display} similarity)")
        print(f"  Total search time: {time.time() - start:.3f}s")
        return search_results
        
    except Exception as e:
        print(f"  [ERROR] Search failed: {e}")
        import traceback
        traceback.print_exc()
        return []


def _format_search_results_without_details(search_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format search results to match the expected structure when bill details are unavailable.
    Transforms bill_id -> id, score -> similarity_score, and adds title field.
    """
    formatted_results = []
    for result in search_results:
        formatted_results.append({
            "id": result.get("bill_id", "Unknown"),
            "title": f"Bill {result.get('bill_id', 'Unknown')} (details unavailable)",
            "similarity_score": result.get("score", 0.0),
            "distance": result.get("distance", 0.0)
        })
    return formatted_results


def search_bills_with_details(query: str, top_k: int = 10, metric: str = "L2") -> List[Dict[str, Any]]:
    """
    Search for bills using hybrid keyword + HNSW vector search.
    Keyword matches appear first, followed by HNSW semantic matches.
    
    Args:
        query: User query text to search for
        top_k: Number of top results to return (default: 10)
        metric: Similarity metric to use - "L2", "COSINE", or "IP" (default: "L2")
    
    Returns:
        List of dictionaries containing full bill information with similarity scores.
        Keyword matches are returned first, followed by HNSW matches, with deduplication.
    """
    start_time = time.time()
    
    # Step 1: Get keyword search results (exact matches in title/bill_text)
    keyword_results = search_bills_by_keywords(query)
    
    # Step 2: Get HNSW vector search results (semantic similarity)
    # Increase top_k for HNSW to account for deduplication
    # We'll need more results since some will be filtered out
    hnsw_results = search_bills(query, top_k=top_k * 2, metric=metric)
    
    # Step 3: Combine results with deduplication
    # Collect bill IDs from keyword matches
    keyword_bill_ids = {result["bill_id"] for result in keyword_results}
    
    # Filter out HNSW results that already appear in keyword results
    filtered_hnsw_results = [
        result for result in hnsw_results 
        if result["bill_id"] not in keyword_bill_ids
    ]
    
    # Step 4: Combine results - keyword matches first, then HNSW matches
    # Limit total results to top_k
    combined_results = keyword_results + filtered_hnsw_results
    combined_results = combined_results[:top_k]
    
    # Log search statistics
    print(f"  [INFO] Hybrid search summary:")
    print(f"    - Keyword matches: {len(keyword_results)}")
    print(f"    - HNSW matches (after deduplication): {len(filtered_hnsw_results)}")
    print(f"    - Total results: {len(combined_results)}")
    print(f"    - Total search time: {time.time() - start_time:.3f}s")
    
    if not combined_results:
        return []
    
    # Return formatted search results
    return _format_search_results_without_details(combined_results)


if __name__ == "__main__":
    """
    Example query for Climate Change related bills using cosine similarity.
    """
    print("=" * 60)
    print("Climate Change Bill Search")
    print("=" * 60)
    print()
    
    # Example query for climate change related bills
    query = "Climate Change"
    
    print(f"Searching for bills related to: '{query}'")
    print("Using cosine similarity for semantic search")
    print()
    
    # Search using cosine similarity
    results = search_bills_with_details(query, top_k=10, metric="COSINE")
    
    if results:
        print(f"Found {len(results)} climate change related bills:")
        print()
        for i, result in enumerate(results, 1):
            print(f"{i}. {result.get('title', 'Unknown Title')}")
            print(f"   Bill ID: {result.get('id', 'Unknown')}")
            print(f"   Cosine Similarity Score: {result.get('similarity_score', 0):.4f}")
            if result.get('status'):
                print(f"   Status: {result.get('status')}")
            if result.get('date'):
                print(f"   Date: {result.get('date')}")
            if result.get('categories'):
                print(f"   Categories: {', '.join(result.get('categories', []))}")
            print()
    else:
        print("No results found.")
        print("Make sure vectors have been created by running vectors.py")
        print()

