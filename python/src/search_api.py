#!/usr/bin/env python3
"""
API wrapper for vector search.
Accepts query as command line argument and outputs JSON results.
All debug/info messages are redirected to stderr so only JSON goes to stdout.
"""

import sys
import json

def main():
    if len(sys.argv) < 2:
        # Output JSON to stdout
        print(json.dumps([]))
        sys.exit(0)
    
    query = sys.argv[1]
    
    # Save original stdout
    original_stdout = sys.stdout
    
    # Redirect stdout to stderr for all print statements from imported modules
    sys.stdout = sys.stderr
    
    try:
        # Import and run search with stdout redirected to stderr
        from vector_search import search_bills_with_details
        results = search_bills_with_details(query, top_k=12, metric="COSINE")
    finally:
        # Restore original stdout for JSON output
        sys.stdout = original_stdout
    
    # Output only JSON to stdout
    print(json.dumps(results))

if __name__ == "__main__":
    main()

