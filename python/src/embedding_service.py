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

from vectors import generate_embedding
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

if __name__ == '__main__':
    # Pre-load model on startup
    print("🚀 Starting embedding service...")
    print("📦 Pre-loading embedding model...")
    from vectors import get_embedding_model
    model = get_embedding_model()  # Load model once
    print("✅ Model loaded and ready!")
    print("🌐 Starting server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, threaded=True)  # Changed from 5000 to 5001
