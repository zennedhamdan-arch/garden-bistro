-- Proposed only. Inspect deployed schema, RLS and grants before applying.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gb_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 object_key text UNIQUE NOT NULL,
 public_url text NOT NULL,
 alt_text text NOT NULL,
 mime_type text NOT NULL CHECK (mime_type = 'image/webp'),
 size_bytes integer NOT NULL CHECK(size_bytes > 0),
 width integer NOT NULL CHECK(width > 0),
 height integer NOT NULL CHECK(height > 0),
 sha256 text NOT NULL,
 uploader uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gb_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gb_media FROM anon, authenticated;
COMMIT;
