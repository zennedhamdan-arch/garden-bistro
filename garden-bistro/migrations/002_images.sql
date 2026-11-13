BEGIN;
CREATE TABLE IF NOT EXISTS images(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),filename text NOT NULL,mime_type text NOT NULL CHECK(mime_type IN ('image/webp')),bytes bytea NOT NULL CHECK(octet_length(bytes)<=5242880),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
COMMIT;
