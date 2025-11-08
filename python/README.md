# Consensus Python Package

Python package for vector indexing and bill recommendations using pgvector on Supabase.

## Features

- **Ingest bills**: Generate embeddings and store them in Supabase with pgvector
- **Recommend bills**: Perform vector similarity search to find relevant bills

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

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-only)
   - `OPENAI_API_KEY`: Your OpenAI API key for generating embeddings
   - `EMBED_MODEL`: OpenAI embedding model (default: `text-embedding-3-small`)
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
2. Generate embeddings using OpenAI
3. Upsert embeddings to the `bill_embeddings` table in Supabase

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

Make sure you've run the database schema (`db/schema.sql`) which includes:
- `bill_embeddings` table with pgvector support
- Vector indexes for efficient similarity search

## Vector Similarity Search

To enable efficient vector similarity search, create a Supabase RPC function:

```sql
CREATE OR REPLACE FUNCTION match_bills(query_embedding vector(1536), match_count int)
RETURNS TABLE (bill_id text, similarity float)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    be.bill_id, 
    1 - (be.embedding <=> query_embedding) as similarity
  FROM bill_embeddings be
  ORDER BY be.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

Then update `recommend.py` to use this function via Supabase RPC.

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

