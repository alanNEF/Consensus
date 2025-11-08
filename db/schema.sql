-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  topics TEXT[],
  race TEXT,
  residency TEXT NOT NULL,
  religion TEXT,
  gender TEXT,
  age_range TEXT,
  party TEXT ,
  income TEXT ,
  education TEXT 
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary_key TEXT,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  origin TEXT NOT NULL,
  url TEXT NOT NULL,
  sponsors TEXT[] NOT NULL,
  bill_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill summaries table
CREATE TABLE IF NOT EXISTS bill_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved bills table (user's saved bills)
CREATE TABLE IF NOT EXISTS saved_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bill_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_saved_bills_user_id ON saved_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_bills_user_id ON saved_bills(bill_id);

-- Vector similarity search index (using ivfflat for pgvector)
-- Note: Create this after inserting some data for better performance
-- CREATE INDEX ON bill_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

