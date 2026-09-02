CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  taken_on TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  bytes INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1)),
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_public ON photos(category, published, is_cover, taken_on, sort_order);
CREATE TABLE IF NOT EXISTS auth_attempts (
  ip_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  failures INTEGER NOT NULL DEFAULT 0
);
