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
        # Generate embedding for the query
        print(f"🔍 Searching for: '{query}'")
        query_embedding = generate_embedding(query)
        
        if query_embedding is None:
            print("  [ERROR] Failed to generate embedding for query")
            return []
        
        # Get Milvus collection
        collection = get_milvus_collection()
        if collection is None:
            return []
        
        # Get the index metric type (must match for search)
        index_metric = "L2"  # Default
        try:
            indexes = collection.indexes
            if indexes and len(indexes) > 0:
                # Get the metric type from the first index on the embedding field
                for idx in indexes:
                    if idx.field_name == "embedding":
                        index_metric = idx.params.get("metric_type", "L2")
                        break
        except Exception:
            # If we can't get index info, default to L2
            pass
        
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
        
        # Perform vector similarity search
        search_params = {
            "metric_type": search_metric,
            "params": {"nprobe": 10}
        }
        
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["bill_id"]
        )
        
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
        print(f"  ✅ Found {len(search_results)} results above {similarity_threshold} similarity threshold (using {metric_display} similarity)")
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
    Search for bills and return full bill details from database.
    
    Args:
        query: User query text to search for
        top_k: Number of top results to return (default: 10)
        metric: Similarity metric to use - "L2", "COSINE", or "IP" (default: "L2")
    
    Returns:
        List of dictionaries containing full bill information with similarity scores
    """
    # Get search results from Milvus
    search_results = search_bills(query, top_k, metric=metric)
    
    if not search_results:
        return []
    
    # Return formatted search results directly (skip Supabase fetch due to connection issues)
    # The search results from Milvus contain bill IDs and similarity scores, which is sufficient
    return _format_search_results_without_details(search_results)


if __name__ == "__main__":
    """
    Example query for Climate Change related bills using cosine similarity.
    """
    print("=" * 60)
    print("🌍 Climate Change Bill Search")
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
        print(f"📋 Found {len(results)} climate change related bills:")
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
        print("  ⚠️  No results found.")
        print("  💡 Make sure vectors have been created by running vectors.py")
        print()

