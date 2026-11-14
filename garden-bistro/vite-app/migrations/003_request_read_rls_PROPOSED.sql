-- PROPOSED ONLY. Audit all existing policies (Postgres OR-combines permissive
-- policies), grants, ownership and publication configuration before applying.
-- Apply with an appropriately privileged migration role that owns both tables;
-- validate RLS under real Supabase JWTs before enabling realtime.
BEGIN;
CREATE SCHEMA IF NOT EXISTS gb_private;
REVOKE ALL ON SCHEMA gb_private FROM PUBLIC;
GRANT USAGE ON SCHEMA gb_private TO authenticated;
CREATE OR REPLACE FUNCTION gb_private.has_request_read_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.gb_staff_access
   WHERE auth_user_id = auth.uid() AND active IS TRUE
     AND 'requests.read' = ANY(permissions)
 );
$$;
REVOKE ALL ON FUNCTION gb_private.has_request_read_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gb_private.has_request_read_access() TO authenticated;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
-- This policy does not neutralize pre-existing permissive policies.
DROP POLICY IF EXISTS gb_staff_requests_read ON public.requests;
CREATE POLICY gb_staff_requests_read ON public.requests FOR SELECT TO authenticated
  USING (gb_private.has_request_read_access());
GRANT SELECT ON public.requests TO authenticated;
COMMIT;
