#!/usr/bin/env python3
"""
Persistent embedding service that keeps the model loaded in memory.
Run this as a long-running service instead of spawning new processes.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from vectors import generate_embedding, process_single_bill, process_bills, sync_new_bills, get_bills_needing_embeddings
from vector_search import search_bills_with_details

app = Flask(__name__)
CORS(app)  # Allow requests from Next.js

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.json
        query = data.get('query', '')
        top_k = data.get('top_k', 12)
        metric = data.get('metric', 'COSINE')
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        results = search_bills_with_details(query, top_k=top_k, metric=metric)
        return jsonify({"results": results})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sync', methods=['POST'])
def sync():
    """
    Sync new bills: find bills in database without embeddings and process them.
    
    Request body (optional):
    {
        "limit": 100,  # Maximum number of bills to process (None for all)
        "bill_ids": ["hr1234-118", "s5678-118"]  # Specific bill IDs to process (optional)
    }
    """
    try:
        data = request.json or {}
        limit = data.get('limit')
        bill_ids = data.get('bill_ids')
        
        if bill_ids:
            # Process specific bills
            if not isinstance(bill_ids, list):
                return jsonify({"error": "bill_ids must be a list"}), 400
            
            results = process_bills(bill_ids, verbose=False)
            successful = sum(1 for success in results.values() if success)
            failed = len(results) - successful
            
            return jsonify({
                "processed": len(bill_ids),
                "successful": successful,
                "failed": failed,
                "results": results
            })
        else:
            # Sync all new bills
            sync_result = sync_new_bills(limit=limit, verbose=False)
            return jsonify(sync_result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sync/status', methods=['GET'])
def sync_status():
    """
    Get status of bills needing embeddings.
    
    Returns:
    {
        "bills_needing_embeddings": ["hr1234-118", "s5678-118"],
        "count": 2
    }
    """
    try:
        bill_ids = get_bills_needing_embeddings()
        return jsonify({
            "bills_needing_embeddings": bill_ids,
            "count": len(bill_ids)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/process/<bill_id>', methods=['POST'])
def process_bill(bill_id):
    """
    Process a single bill and add its embedding to Milvus.
    
    URL parameter: bill_id - The ID of the bill to process
    """
    try:
        success = process_single_bill(bill_id, verbose=False)
        if success:
            return jsonify({
                "bill_id": bill_id,
                "status": "success",
                "message": f"Successfully processed bill {bill_id}"
            })
        else:
            return jsonify({
                "bill_id": bill_id,
                "status": "failed",
                "message": f"Failed to process bill {bill_id}"
            }), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Pre-load model on startup
    print("🚀 Starting embedding service...")
    print("📦 Pre-loading embedding model...")
    from vectors import get_embedding_model
    model = get_embedding_model()  # Load model once
    print("✅ Model loaded and ready!")
    print("🌐 Starting server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, threaded=True)  # Changed from 5000 to 5001
