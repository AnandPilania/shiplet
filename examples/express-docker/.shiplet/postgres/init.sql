-- Shiplet — Express Docker example
-- PostgreSQL init script, runs once on first container start

CREATE TABLE IF NOT EXISTS items (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_created_at_idx ON items(created_at DESC);

-- Seed data
INSERT INTO items (name, description) VALUES
  ('Getting Started',       'Your first item — add more via POST /api/items'),
  ('Express + Docker Stack','Shiplet example with PostgreSQL, Redis, Mailpit, Adminer')
ON CONFLICT DO NOTHING;
