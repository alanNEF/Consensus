#!/usr/bin/env python3
"""
Background service to periodically sync new bills and add embeddings to Milvus.
Can be run as a standalone script or as a scheduled task (cron, systemd, etc.)
"""

import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
python_dir = Path(__file__).parent.parent
env_path = python_dir / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from vectors import sync_new_bills, get_bills_needing_embeddings


def run_sync(limit=None, verbose=True):
    """Run a single sync operation"""
    if verbose:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting sync...")
    
    try:
        result = sync_new_bills(limit=limit, verbose=verbose)
        
        if verbose:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Sync complete:")
            print(f"  - Processed: {result['processed']}")
            print(f"  - Successful: {result['successful']}")
            print(f"  - Failed: {result['failed']}")
        
        return result
    except Exception as e:
        if verbose:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Sync failed: {e}")
        return None


def run_continuous_sync(interval_seconds=300, limit=None, verbose=True):
    """
    Run continuous sync: check for new bills every interval_seconds.
    
    Args:
        interval_seconds: How often to check for new bills (default: 5 minutes)
        limit: Maximum number of bills to process per sync (None for all)
        verbose: Whether to print progress messages
    """
    if verbose:
        print(f"Starting continuous sync service...")
        print(f"  - Check interval: {interval_seconds} seconds ({interval_seconds/60:.1f} minutes)")
        print(f"  - Limit per sync: {limit if limit else 'unlimited'}")
        print(f"  - Press Ctrl+C to stop")
        print()
    
    try:
        while True:
            run_sync(limit=limit, verbose=verbose)
            
            if verbose:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Waiting {interval_seconds} seconds until next sync...")
                print()
            
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        if verbose:
            print()
            print("Sync service stopped by user")
    except Exception as e:
        if verbose:
            print(f"Fatal error in sync service: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Sync new bills and add embeddings to Milvus"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run sync once and exit (default: run continuously)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=300,
        help="Sync interval in seconds when running continuously (default: 300 = 5 minutes)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of bills to process per sync (default: unlimited)"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress output (except errors)"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show how many bills need embeddings and exit"
    )
    
    args = parser.parse_args()
    
    if args.status:
        # Just show status
        try:
            bill_ids = get_bills_needing_embeddings()
            print(f"Bills needing embeddings: {len(bill_ids)}")
            if bill_ids and not args.quiet:
                print(f"Bill IDs: {', '.join(bill_ids[:10])}")
                if len(bill_ids) > 10:
                    print(f"... and {len(bill_ids) - 10} more")
        except Exception as e:
            print(f"Error checking status: {e}")
            sys.exit(1)
    elif args.once:
        # Run once and exit
        result = run_sync(limit=args.limit, verbose=not args.quiet)
        if result is None:
            sys.exit(1)
        elif result['failed'] > 0 and result['successful'] == 0:
            # All failed
            sys.exit(1)
    else:
        # Run continuously
        run_continuous_sync(
            interval_seconds=args.interval,
            limit=args.limit,
            verbose=not args.quiet
        )


if __name__ == "__main__":
    main()
