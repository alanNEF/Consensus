# Automatic Bill Embedding Sync System

This document explains how the automatic embedding generation system works for new bills.

## Overview

When new bills are added to the Supabase database, their embeddings need to be generated and stored in Milvus for vector search. The sync system provides multiple ways to ensure this happens automatically.

## Components

### 1. Core Functions (`vectors.py`)

- `process_single_bill(bill_id)`: Process one bill and add its embedding to Milvus
- `process_bills(bill_ids)`: Process multiple bills at once
- `sync_new_bills(limit)`: Find and process all bills that need embeddings
- `get_bills_needing_embeddings()`: Get list of bill IDs that need embeddings
- `get_bills_in_milvus()`: Get all bill IDs that already have embeddings

### 2. Background Sync Service (`sync_service.py`)

A standalone script that can run continuously to periodically check for new bills.

**Usage:**
```bash
# Run continuously (checks every 5 minutes)
python src/sync_service.py

# Custom interval (10 minutes)
python src/sync_service.py --interval 600

# Run once and exit
python src/sync_service.py --once

# Check status
python src/sync_service.py --status
```

### 3. Embedding Service API (`embedding_service.py`)

The Flask service exposes HTTP endpoints for syncing:

- `POST /sync`: Sync new bills (accepts `limit` and `bill_ids` in body)
- `GET /sync/status`: Get count of bills needing embeddings
- `POST /process/<bill_id>`: Process a specific bill

### 4. Next.js API Endpoint (`app/api/bills/sync-embeddings/route.ts`)

A Next.js API route that proxies requests to the Python embedding service:

- `POST /api/bills/sync-embeddings`: Trigger sync
- `GET /api/bills/sync-embeddings`: Get sync status

## Usage Patterns

### Pattern 1: Background Service (Recommended for Production)

Run the sync service as a background process that continuously monitors for new bills:

```bash
# Start the service
python src/sync_service.py --interval 300
```

**Pros:**
- Automatic, no manual intervention needed
- Processes bills as soon as they're detected
- Can run as a system service (systemd, supervisor, etc.)

**Cons:**
- Requires a long-running process
- Slight delay between bill insertion and embedding generation

### Pattern 2: API Hook (Recommended for Real-time)

Call the sync API immediately after inserting bills:

```typescript
// After inserting a bill
await insertBill(billData);

// Trigger embedding generation
await fetch('/api/bills/sync-embeddings', {
  method: 'POST',
  body: JSON.stringify({ bill_ids: [billData.id] })
});
```

**Pros:**
- Immediate processing
- No background service needed
- Can process specific bills

**Cons:**
- Requires code changes where bills are inserted
- API must be available

### Pattern 3: Scheduled Task (Cron)

Run the sync service periodically via cron:

```bash
# Add to crontab (every 5 minutes)
*/5 * * * * cd /path/to/python && python src/sync_service.py --once --quiet
```

**Pros:**
- No long-running process
- Simple setup
- Reliable

**Cons:**
- Delay between bill insertion and processing (up to interval time)
- Requires cron access

### Pattern 4: Hybrid Approach

Combine API hooks for immediate processing with a background service as a fallback:

1. Call API immediately after bill insertion (Pattern 2)
2. Run background service to catch any missed bills (Pattern 1)

## Setup Instructions

### 1. Ensure Embedding Service is Running

```bash
cd python
python src/embedding_service.py
```

The service runs on `http://localhost:5001` by default.

### 2. Set Environment Variable (Optional)

In your Next.js `.env`:
```
EMBEDDING_SERVICE_URL=http://localhost:5001
```

### 3. Choose Your Sync Pattern

Select one of the patterns above based on your needs.

## Monitoring

### Check Sync Status

```bash
# Via command line
python src/sync_service.py --status

# Via API
curl http://localhost:5001/sync/status

# Via Next.js API
curl http://localhost:3000/api/bills/sync-embeddings
```

### View Logs

The sync service prints progress messages. For production, consider redirecting to a log file:

```bash
python src/sync_service.py >> /var/log/bill-sync.log 2>&1
```

## Troubleshooting

### Bills Not Being Processed

1. Check if embedding service is running:
   ```bash
   curl http://localhost:5001/health
   ```

2. Check if bills need embeddings:
   ```bash
   python src/sync_service.py --status
   ```

3. Check Milvus connection:
   ```bash
   python test_milvus.py
   ```

4. Check Supabase connection:
   ```bash
   python test_connection.py
   ```

### Performance

- The sync service processes bills one at a time by default
- For large batches, consider using `--limit` to process in chunks
- Embedding generation is CPU-intensive; consider running on a separate server

## Example: Processing a Single Bill

```python
from vectors import process_single_bill

# Process a bill
success = process_single_bill("hr1234-118", verbose=True)
if success:
    print("Bill processed successfully!")
else:
    print("Failed to process bill")
```

## Example: Processing Multiple Bills

```python
from vectors import process_bills

# Process multiple bills
results = process_bills(["hr1234-118", "s5678-118"], verbose=True)
for bill_id, success in results.items():
    print(f"{bill_id}: {'✓' if success else '✗'}")
```
