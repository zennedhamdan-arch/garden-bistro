"use client";
import { useRef, useState } from "react";
import { Locale, messages } from "@/lib/i18n";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
export default function RequestForm({
  locale,
  kind,
}: {
  locale: Locale;
  kind: "hotel" | "reservation" | "event";
}) {
  const t = messages[locale];
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const key = useRef("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    key.current ||= crypto.randomUUID();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          kind,
          locale,
          idempotencyKey: key.current,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error();
      setReference(data.reference);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <div className="success" role="status">
        <CheckCircle2 />
        <h2>{reference}</h2>
        <p>{t.pending}</p>
      </div>
    );
  return (
    <form onSubmit={submit} className="request-form">
      <p className="form-notice">
        {t.notice} <a href={`/${locale}/privacy`}>{t.privacy}</a>
      </p>
      <div className="form-grid">
        <label>
          {t.name}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </label>
        <label>
          {t.phone}
          <input
            name="phone"
            type="tel"
            required
            pattern="[+0-9 ()\-]{7,25}"
            autoComplete="tel"
          />
        </label>
        <label>
          {t.email}
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          {t.method}
          <select name="method">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">{t.phone}</option>
            <option value="email">{t.email}</option>
          </select>
        </label>
        <label>
          {kind === "hotel" ? t.arrival : t.date}
          <input
            name="date"
            type="date"
            min={new Intl.DateTimeFormat("en-CA", {
              timeZone: "Africa/Kigali",
            }).format(new Date())}
            required
          />
        </label>
        {kind === "hotel" ? (
          <label>
            {t.departure}
            <input type="date" name="departure" required />
          </label>
        ) : kind === "reservation" ? (
          <label>
            {t.time}
            <input type="time" name="time" required />
          </label>
        ) : (
          <label>
            {t.eventType}
            <input name="eventType" maxLength={120} required />
          </label>
        )}
        <label>
          {t.guests}
          <input
            type="number"
            min="1"
            max="1000"
            name="guests"
            required
            defaultValue="2"
          />
        </label>
        {kind === "hotel" && (
          <label>
            {t.preference}
            <input name="preference" maxLength={120} />
          </label>
        )}
      </div>
      <label>
        {t.message}
        <textarea name="message" rows={4} maxLength={2000} />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? t.sending : t.send}
        <ArrowUpRight size={16} />
      </button>
    </form>
  );
}
