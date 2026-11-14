import { useRef, useState, type FormEvent } from "react";
import { messages, type Locale } from "./i18n";
type Kind = "reservation" | "hotel" | "event";
export function RequestForm({locale,kind}:{locale:Locale;kind:Kind}) {
  const t=messages[locale]; const [busy,setBusy]=useState(false); const [error,setError]=useState(false); const [reference,setReference]=useState(""); const key=useRef("");
  const [method,setMethod]=useState("whatsapp");
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(busy)return; setBusy(true);setError(false);key.current ||= crypto.randomUUID();
    const values=Object.fromEntries(new FormData(e.currentTarget));
    try {const response=await fetch("/.netlify/functions/requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,locale,kind,idempotencyKey:key.current})});
      if(!response.ok)throw new Error(); const data=await response.json(); if(typeof data.reference!=="string")throw new Error();setReference(data.reference);
    } catch {setError(true)} finally {setBusy(false)}
  }
  if(reference)return <div role="status" className="notice"><strong>{reference}</strong><p>{t.pending}</p></div>;
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Kigali",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <form className="request-form" onSubmit={submit}><p className="notice">{t.notice}</p><div className="form-grid">
    <label>{t.name}<input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
    <label>{t.phone}<input name="phone" required type="tel" pattern="[+0-9 ()-]{7,25}" autoComplete="tel"/></label>
    <label>{t.email}<input name="email" type="email" required={method==="email"} autoComplete="email"/></label>
    <label>{t.method}<select name="method" value={method} onChange={e=>setMethod(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="phone">{t.phone}</option><option value="email">{t.email}</option></select></label>
    <label>{kind==="hotel"?t.arrival:t.date}<input name="date" type="date" min={today} required/></label>
    {kind==="hotel"?<label>{t.departure}<input name="departure" type="date" min={today} required/></label>:kind==="reservation"?<label>{t.time}<input name="time" type="time" required/></label>:<label>{t.eventType}<input name="eventType" maxLength={120} required/></label>}
    <label>{t.guests}<input name="guests" type="number" min={1} max={1000} defaultValue={2} required/></label>
    {kind==="hotel" && <label>{t.preference}<input name="preference" maxLength={120}/></label>}
    {kind==="reservation" && <><label>{t.eventType}<input name="eventType" maxLength={120}/></label><label>{t.preference}<input name="preference" maxLength={120}/></label></>}
  </div><label>{t.message}<textarea name="message" rows={4} maxLength={2000}/></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>{error && <p role="alert">{t.error}</p>}<button className="button" disabled={busy}>{busy?t.sending:t.send}</button></form>;
}
