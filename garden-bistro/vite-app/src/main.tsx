import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider, supabase, useAuth } from "./auth";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/dm-sans";
import "./style.css";

function Shell({children}:{children:React.ReactNode}) { return <><header><Link className="brand" to="/"><img src="/images/garden-bistro-logo.png" alt="Garden Bistro logo" /><span>Garden Bistro<small>HOTEL & RESTAURANT · KIGALI</small></span></Link><nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/staff">Staff sign in</Link></nav></header><main>{children}</main><footer>Garden Bistro · KN 159 St, Nyamirambo, Kigali, Rwanda</footer></>; }
function Home() { return <Shell><section className="hero"><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h1>A little more green.<br/>A little more together.</h1><p>A place to stay. A table to gather around. Welcome to Garden Bistro.</p></div></section><section className="intro"><img src="/images/dining.webp" alt="A meal at Garden Bistro"/><div><span className="eyebrow">GARDEN BISTRO</span><h2>Welcome to Garden Bistro</h2><p>A table to gather around and a place to stay in Kigali.</p><p className="notice">This replacement site is under construction. Please use the existing website for reservations and enquiries.</p></div></section></Shell>; }
function Staff() {
  const {session, loading, configured, error} = useAuth();
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || busy) return; setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try { const { error } = await supabase.auth.signInWithPassword({email:String(form.get("email")),password:String(form.get("password"))}); if (error) setMessage("Unable to sign in. Check your details and try again."); }
    catch { setMessage("Unable to sign in. Please try again."); } finally { setBusy(false); }
  }
  async function signOut() { if (!supabase || busy) return; setBusy(true); setMessage(""); try {const {error}=await supabase.auth.signOut(); if(error) setMessage("Unable to sign out. Please try again.");} catch {setMessage("Unable to sign out. Please try again.");} finally {setBusy(false);} }
  return <Shell><section className="staff"><h1>Staff sign in</h1>{!configured ? <p>Authentication is not configured. Staff should continue to use the existing administration system.</p> : loading ? <p role="status">Checking your session…</p> : error ? <p role="alert">Unable to restore your session. Please reload and try again.</p> : session ? <><p>Signed in. The replacement administration dashboard is not yet available.</p><button onClick={signOut} disabled={busy}>Sign out</button></> : <form onSubmit={signIn}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>}{message && <p role="alert">{message}</p>}</section></Shell>;
}
function App(){return <AuthProvider><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/staff" element={<Staff/>}/><Route path="*" element={<Shell><section className="staff"><h1>Page not found</h1><Link to="/">Home</Link></section></Shell>}/></Routes></BrowserRouter></AuthProvider>}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
