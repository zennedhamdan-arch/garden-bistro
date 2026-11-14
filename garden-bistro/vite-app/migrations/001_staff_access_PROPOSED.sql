-- Proposed additive migration; do not apply until the deployed schema, grants and
-- existing RLS policies have been inspected and this migration has been reviewed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gb_staff_access (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  role text NOT NULL CHECK (role IN ('owner','administrator','manager','restaurant_staff','reception_staff','editor')),
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gb_staff_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gb_staff_access FROM anon, authenticated;
-- Access is intentionally provisioned by a trusted operator, never by the client.
-- Staff functions validate the Supabase JWT and check explicit permissions here.
-- No realtime policy is installed: existing deployed policies must first be reviewed.
COMMIT;
