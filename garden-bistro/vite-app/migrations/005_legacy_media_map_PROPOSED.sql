-- PROPOSED ONLY. Review target schema and take a verified backup before applying.
-- The source may be a separate database, so legacy_id deliberately has no FK.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gb_legacy_media_map (
 legacy_id uuid PRIMARY KEY,
 source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
 source_size integer NOT NULL CHECK (source_size > 0),
 media_id uuid NOT NULL UNIQUE REFERENCES public.gb_media(id),
 verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gb_legacy_media_map ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gb_legacy_media_map FROM anon, authenticated;
COMMIT;
