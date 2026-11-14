import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// Do not initialize a client against an invented endpoint when configuration is missing.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
type AuthState = { session: Session | null; loading: boolean; configured: boolean; error: boolean };
const AuthContext = createContext<AuthState>({ session: null, loading: true, configured: false, error: false });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: !!supabase, configured: !!supabase, error: false });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    // A later auth event must not be overwritten by a stale initial session response.
    let revision = 0;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (alive) setState({ session, loading: false, configured: true, error: false });
    });
    const initialRevision = revision;
    void client.auth.getSession().then(({ data, error }) => {
      if (alive && revision === initialRevision) setState({ session: data.session, loading: false, configured: true, error: !!error });
    }).catch(() => { if (alive && revision === initialRevision) setState({ session: null, loading: false, configured: true, error: true }); });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
