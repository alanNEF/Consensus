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
poetry run python src/ingest.py

# Using pip/venv
python src/ingest.py
```

This will:
1. Fetch bills (currently using mock data)
2. Classify bills into categories using zero-shot classification
3. Generate embeddings using sentence-transformers
4. Store bill metadata and categories in Supabase (SQL database)
5. Store embeddings in Milvus (vector database)

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

## TODO

- [ ] Implement actual Congress.gov API integration in `ingest.py`
- [ ] Implement vector similarity search using Supabase RPC in `recommend.py`
- [ ] Add user preference-based recommendations
- [ ] Add batch processing for large numbers of bills
- [ ] Add error handling and retry logic
- [ ] Add logging and monitoring

