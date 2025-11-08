"""
Bill classification script: classifies bills in the database into categories that we have specified.

Provides classification functions and processes all bills in the database to assign categories.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from transformers import pipeline

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

# Check if required env vars are set
if not SUPABASE_URL or SUPABASE_URL == "replace_me":
    print("⚠️  SUPABASE_URL not configured. Using mock mode.")
    SUPABASE_URL = None

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "replace_me":
    print("⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Using mock mode.")
    SUPABASE_SERVICE_ROLE_KEY = None

# Bill classification categories
CANDIDATE_LABELS = [
    'Healthcare', 'Environmentalism', 'Armed Services', 'Economy', 'Education', 
    'Technology', 'Immigration', 'Agriculture + Food', 'Government Operations', 
    'Taxation', 'Civil Rights', 'Criminal Justice', 'Foreign Policy',
]

# Initialize classifier (lazy loading)
_classifier = None


def get_classifier():
    """Get or initialize the zero-shot classifier"""
    global _classifier
    if _classifier is None:
        _classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    return _classifier


def softmax(x: np.ndarray) -> np.ndarray:
    """Compute softmax values for each sets of scores in x."""
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=0)


def classify_bill_text(text: str, threshold_std: float = 0.65) -> List[Tuple[str, float]]:
    """
    Classify bill text into categories using zero-shot classification.
    
    Args:
        text: The bill text to classify
        threshold_std: Number of standard deviations above mean to use as threshold (default: 0.5)
    
    Returns:
        List of tuples (label, score) for categories that meet the threshold
    """
    classifier = get_classifier()
    
    # Perform classification
    return_value = classifier(text, CANDIDATE_LABELS, multi_label=True)
    
    # Get scores and apply softmax
    scores = np.array(return_value["scores"])
    softmax_scores = softmax(scores)
    
    # Calculate threshold
    mean_score = np.mean(softmax_scores)
    std_dev = np.std(softmax_scores)
    threshold = mean_score + (threshold_std * std_dev)
    
    # Filter results
    top_results = []
    for i in range(len(softmax_scores)):
        if softmax_scores[i] >= threshold:
            top_results.append((return_value['labels'][i], float(softmax_scores[i])))
    
    # Sort by score (descending)
    top_results.sort(key=lambda x: x[1], reverse=True)
    
    return top_results


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


def update_bill_categories(bill_id: str, categories: List[str]) -> bool:
    """Update bill categories in the database"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(f"  [MOCK] Would update categories for bill {bill_id}: {categories}")
        return True  # Return True in mock mode to allow testing
    
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        print(f"  [DEBUG] Updating bill {bill_id} with categories: {categories}")
        result = supabase.table("bills").update(
            {"categories": categories}
        ).eq("id", bill_id).execute()
        
        if result.data:
            print(f"  [DEBUG] Successfully updated bill {bill_id}")
            return True
        else:
            print(f"  [WARNING] Update returned no data for bill {bill_id}")
            return False
    except Exception as e:
        print(f"  [ERROR] Failed to update categories for {bill_id}: {e}")
        import traceback
        traceback.print_exc()
        return False


def classify_bill_in_database(bill: Dict[str, Any], threshold_std: float = 0.5) -> bool:
    """Classify a single bill and update its categories in the database"""
    bill_id = bill["id"]
    bill_title = bill.get("title", "")
    
    # Get bill summary text
    summary_text = get_bill_summary_text(bill_id)
    
    # Prepare text for classification
    if summary_text:
        classification_text = f"{bill_title} {summary_text}"
    else:
        classification_text = f"{bill_title} {bill.get('summary_key', '')}"
    
    # Classify bill
    try:
        classification_results = classify_bill_text(classification_text, threshold_std)
        
        # Print each prediction from the AI model
        print(f"  📊 AI Model Predictions for {bill_id}:")
        if classification_results:
            for label, score in classification_results:
                print(f"     - {label}: {score:.4f} ({score*100:.2f}%)")
        else:
            print(f"     - No categories met the threshold")
        print()
        
        categories = [label for label, score in classification_results]
        
        # Update database
        if categories:
            print(f"  💾 Updating database with categories: {categories}")
            success = update_bill_categories(bill_id, categories)
            if success:
                print(f"  ✅ Classified: {', '.join(categories)}")
            else:
                print(f"  ⚠️  Classification succeeded but update failed")
            return success
        else:
            print(f"  ⚠️  No categories found (threshold too high)")
            # Update with empty categories
            print(f"  💾 Updating database with empty categories")
            success = update_bill_categories(bill_id, [])
            return success
            
    except Exception as e:
        print(f"  [ERROR] Classification failed: {e}")
        return False


def classify_all_bills(threshold_std: float = 0.5, limit: Optional[int] = None, offset: int = 0, update_existing: bool = False):
    """Classify all bills in the database"""
    print("🏷️  Starting bill classification...")
    print()
    
    # Fetch bills from database (with pagination if no limit specified)
    print("📥 Fetching bills from database...")
    
    if limit is not None:
        # If limit is specified, use it directly (for backward compatibility)
        all_bills = get_bills_from_database(limit=limit, offset=offset)
    else:
        # If no limit, fetch all bills with pagination
        all_bills = []
        page_size = 1000
        current_offset = offset
        
        while True:
            bills = get_bills_from_database(limit=page_size, offset=current_offset)
            if not bills:
                break
            all_bills.extend(bills)
            print(f"  Fetched {len(bills)} bills (total: {len(all_bills)})...")
            
            # If we got fewer than page_size, we've reached the end
            if len(bills) < page_size:
                break
            current_offset += page_size
    
    if not all_bills:
        print("  No bills found in database.")
        return
    
    print(f"  Found {len(all_bills)} bills total")
    print()
    
    # Process each bill
    successful = 0
    failed = 0
    skipped = 0
    
    for i, bill in enumerate(all_bills, 1):
        bill_id = bill["id"]
        bill_title = bill.get("title", "Unknown")
                
        print(f"[{i}/{len(all_bills)}] Classifying: {bill_title} ({bill_id})")
        
        if classify_bill_in_database(bill, threshold_std):
            successful += 1
        else:
            failed += 1
        
        print()
    
    # Summary
    print("✅ Classification complete!")
    print()
    print(f"📊 Summary:")
    print(f"   - Total bills: {len(all_bills)}")
    print(f"   - Successfully classified: {successful}")
    print(f"   - Failed: {failed}")
    print(f"   - Skipped: {skipped}")
    print()


def main():
    """Main classification function"""
    import argparse

    parser = argparse.ArgumentParser(description="Classify bills in the database into categories")
    parser.add_argument(
        "--threshold-std",
        type=float,
        default=0.5,
        help="Number of standard deviations above mean for classification threshold (default: 0.5)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of bills to process",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Offset for pagination (default: 0)",
    )
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help="Update bills that already have categories",
    )

    args = parser.parse_args()

    classify_all_bills(
        threshold_std=args.threshold_std,
        limit=args.limit,
        offset=args.offset,
        update_existing=args.update_existing
    )


if __name__ == "__main__":
    main()

