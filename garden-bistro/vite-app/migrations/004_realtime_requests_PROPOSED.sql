-- PROPOSED ONLY. Apply after 003 and review of existing RLS and policies.
-- Requires a Supabase project whose supabase_realtime publication exists and
-- a migration role authorized to modify it. This never removes existing tables.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    RAISE EXCEPTION 'supabase_realtime publication missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
  END IF;
END;
$$;
COMMIT;
