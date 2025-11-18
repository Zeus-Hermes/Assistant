ALTER TABLE memories
ADD COLUMN IF NOT EXISTS embedding vector(768);
