# Consensus Python Package

Python package for vector indexing and bill recommendations using Milvus (vector database) and Supabase (SQL database).

## Features

- **Ingest bills**: Generate embeddings and store them in Milvus (vector database) and Supabase (SQL database)
- **Recommend bills**: Perform vector similarity search using Milvus to find relevant bills
- **Classify bills**: Automatically categorize bills using zero-shot classification

## Setup

### Option 1: Using Poetry (Recommended)

1. Install Poetry if you haven't already:
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. Install dependencies:
   ```bash
   cd python
   poetry install
   ```

3. Activate the Poetry shell:
   ```bash
   poetry shell
   ```

### Option 2: Using pip/venv

1. Create a virtual environment:
   ```bash
   cd python
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Milvus Setup

Milvus is used as the vector database for storing bill embeddings. You can run it using Docker Compose:

1. Start Milvus (from project root):
   ```bash
   docker-compose up -d milvus
   ```

   This will start Milvus along with its dependencies (etcd and MinIO).

2. Verify Milvus is running:
   ```bash
   docker ps | grep milvus
   ```

3. Setup the Milvus collection:
   ```bash
   cd python
   # Using Poetry
   poetry run python setup_milvus.py
   
   # Using pip/venv
   python setup_milvus.py
   ```

4. Test the connection:
   ```bash
   # Using Poetry
   poetry run python test_milvus.py
   
   # Using pip/venv
   python test_milvus.py
   ```

### Alternative: Using Milvus Cloud or Self-Hosted

If you're using Milvus Cloud or a self-hosted instance, update your `.env` file with the correct connection details:
- `MILVUS_HOST`: Your Milvus host (default: `localhost`)
- `MILVUS_PORT`: Your Milvus port (default: `19530`)
- `MILVUS_COLLECTION_NAME`: Collection name (default: `bill_embeddings`)

## Configuration

1. Create a `.env` file in the `python` directory:
   ```bash
   cd python
   touch .env
   ```

2. Fill in your environment variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-only)
   - `MILVUS_HOST`: Milvus host (default: `localhost`)
   - `MILVUS_PORT`: Milvus port (default: `19530`)
   - `MILVUS_COLLECTION_NAME`: Collection name (default: `bill_embeddings`)
   - `EMBED_MODEL`: Sentence transformer model for embeddings (default: `sentence-transformers/all-mpnet-base-v2`)
   - `DATABASE_URL`: PostgreSQL connection string (optional, if using direct DB connection)

## Usage

### Ingest Bills

Generate embeddings for bills and store them in Supabase:

```bash
# Using Poetry
poetry run python src/vectors.py

# Using pip/venv
python src/vectors.py
```

This will:
1. Fetch bills from the Supabase database
2. Generate embeddings using sentence-transformers
3. Store embeddings in Milvus (vector database)

**Note:** This processes all bills. Use `--force-recreate` to recreate all embeddings.

### Sync New Bills Automatically

The system can automatically detect and process new bills that don't have embeddings yet.

#### Option 1: Background Sync Service (Recommended)

Run a continuous background service that periodically checks for new bills:

```bash
# Run continuously, checking every 5 minutes (default)
poetry run python src/sync_service.py

# Custom interval (e.g., every 10 minutes = 600 seconds)
poetry run python src/sync_service.py --interval 600

# Process only first 50 bills per sync
poetry run python src/sync_service.py --limit 50

# Run once and exit
poetry run python src/sync_service.py --once

# Check status (how many bills need embeddings)
poetry run python src/sync_service.py --status
```

#### Option 2: API Endpoint

The embedding service exposes a `/sync` endpoint that can be called via HTTP:

```bash
# Sync all new bills
curl -X POST http://localhost:5001/sync

# Sync with limit
curl -X POST http://localhost:5001/sync \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Process specific bills
curl -X POST http://localhost:5001/sync \
  -H "Content-Type: application/json" \
  -d '{"bill_ids": ["hr1234-118", "s5678-118"]}'

# Check status
curl http://localhost:5001/sync/status
```

#### Option 3: Next.js API Endpoint

Call the Next.js API endpoint from your application:

```typescript
// Sync all new bills
await fetch('/api/bills/sync-embeddings', { method: 'POST' });

// Sync specific bills
await fetch('/api/bills/sync-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bill_ids: ['hr1234-118'] })
});

// Check status
const status = await fetch('/api/bills/sync-embeddings').then(r => r.json());
```

#### Option 4: Process Individual Bills

Process a single bill programmatically:

```python
from vectors import process_single_bill

# Process a single bill
success = process_single_bill("hr1234-118", verbose=True)
```

### Process Multiple Bills

```python
from vectors import process_bills

# Process multiple bills
results = process_bills(["hr1234-118", "s5678-118"], verbose=True)
# Returns: {"hr1234-118": True, "s5678-118": False}
```

### Recommend Bills

Find bills similar to a query or generate personalized recommendations:

```bash
# Search by query
poetry run python src/recommend.py --query "climate change renewable energy" --top-n 5

# Generate recommendations for a user
poetry run python src/recommend.py --user-id "user-123" --top-n 5

# Default query (climate change)
poetry run python src/recommend.py
```

## Database Setup

### Supabase Setup

Make sure you've run the database schema (`db/schema.sql`) which includes:
- `bills` table for bill metadata
- `bill_summaries` table for bill summaries
- `categories` support for bill classification

### Milvus Setup

The Milvus collection is automatically created when you run `setup_milvus.py` or when you first ingest bills. The collection schema includes:
- `bill_id`: Primary key (VARCHAR, max 100 chars)
- `embedding`: Vector field (768 dimensions for all-mpnet-base-v2 model)
- Index: IVF_FLAT with L2 distance metric

### Clearing Milvus Database

To clear all data from Milvus:
```python
from ingest import clear_milvus_database
clear_milvus_database()
```

Or use the setup script:
```bash
python setup_milvus.py --clear
```

## Vector Similarity Search

The `recommend.py` script uses Milvus for vector similarity search. It:
1. Generates an embedding for the query text
2. Searches Milvus for similar bill embeddings
3. Returns the most similar bills with similarity scores

## Development

### Running Tests

```bash
# Using Poetry
poetry run pytest

# Using pip/venv
pytest
```

### Code Formatting

```bash
# Using Poetry
poetry run black src/
poetry run ruff check src/

# Using pip/venv
black src/
ruff check src/
```

## Automatic Embedding Generation

When new bills are added to the Supabase database, you have several options to ensure their embeddings are generated:

1. **Background Service**: Run `sync_service.py` as a background process (recommended for production)
2. **API Call**: Call the `/sync` endpoint when bills are inserted
3. **Manual Sync**: Run `sync_service.py --once` periodically via cron
4. **On-Demand**: Call the API endpoint from your application when bills are created

### Setting Up Automatic Syncing

#### Using systemd (Linux)

Create `/etc/systemd/system/bill-sync.service`:

```ini
[Unit]
Description=Bill Embedding Sync Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Consensus/python
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/python src/sync_service.py --interval 300
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable bill-sync
sudo systemctl start bill-sync
```

#### Using cron

Add to crontab (`crontab -e`):
```bash
# Check for new bills every 5 minutes
*/5 * * * * cd /path/to/Consensus/python && /path/to/venv/bin/python src/sync_service.py --once --quiet
```

## TODO

- [ ] Implement actual Congress.gov API integration in `ingest.py`
- [ ] Implement vector similarity search using Supabase RPC in `recommend.py`
- [ ] Add user preference-based recommendations
- [x] Add batch processing for large numbers of bills
- [x] Add automatic syncing for new bills
- [ ] Add error handling and retry logic
- [ ] Add logging and monitoring

