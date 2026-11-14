"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Content } from "@/lib/db";
import { Locale, messages } from "@/lib/i18n";
type Settings = {
  orderingEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  minimumOrder?: number;
  paymentInstructions?: Record<string, string>;
  deliveryZones?: { id: string; name: string; fee: number; enabled: boolean }[];
};
export default function MenuOrder({
  locale,
  items,
  ordering = false,
  settings: s,
}: {
  locale: Locale;
  items: Content[];
  ordering?: boolean;
  settings: Settings;
}) {
  const t = messages[locale];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfilment, setFulfilment] = useState(
    s.pickupEnabled ? "pickup" : "delivery",
  );
  const [zone, setZone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState(false);
  const key = useRef("");
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    }).format(n);
  const zones = s.deliveryZones?.filter((z) => z.enabled) ?? [];
  const fee =
    fulfilment === "delivery"
      ? (zones.find((z) => z.id === zone)?.fee ?? 0)
      : 0;
  const total =
    items.reduce((sum, i) => sum + (i.price ?? 0) * (cart[i.id] ?? 0), 0) + fee;
  const enabled =
    s.orderingEnabled &&
    s.paymentInstructions?.[locale] &&
    (s.pickupEnabled || s.deliveryEnabled);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    key.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          locale,
          fulfilment,
          zone,
          idempotencyKey: key.current,
          items: Object.entries(cart)
            .filter(([, n]) => n > 0)
            .map(([id, quantity]) => ({ id, quantity })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error();
      setResult(d.reference);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (ordering && !enabled)
    return (
      <div className="empty-state">
        <p>{t.orderEmpty}</p>
        <a className="text-link" href="https://wa.me/250786458663">
          WhatsApp ↗
        </a>
      </div>
    );
  if (result)
    return (
      <div className="success" role="status">
        <h2>{result}</h2>
        <p>{t.pending}</p>
      </div>
    );
  return (
    <>
      <div className="menu-tools">
        <input
          aria-label={t.search}
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label={t.all}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t.all}</option>
          {Array.from(
            new Set(
              items.map((i) => String(i.data.category ?? "")).filter(Boolean),
            ),
          ).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="menu-categories" aria-label={t.all}>
        {["", ...Array.from(new Set(items.map(i => String(i.data.category ?? "")).filter(Boolean)))].map(c => <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{c || t.all}</button>)}
      </div>
      {items.length === 0 ? (
        <div className="empty-state">{t.menuEmpty}</div>
      ) : (
        <div className="menu-list">
          {items
            .filter(
              (i) =>
                (i.title + " " + i.description)
                  .toLowerCase()
                  .includes(search.toLowerCase()) &&
                (!category || i.data.category === category),
            )
            .map((i) => (
              <article className="menu-item" key={i.id}>
                {!!i.data.imageId && <Image className="menu-photo" src={"/api/images/" + i.data.imageId} alt={String(i.data.alt || i.title)} width={180} height={140} unoptimized />}
                <div>
                  <h3>{i.title}</h3>
                  <p>{i.description}</p>
                  {!!i.data.soldOut && <small className="sold-out">{ {en:"Unavailable",fr:"Indisponible",sw:"Haipatikani"}[locale] }</small>}
                  {Array.isArray(i.data.labels) && (
                    <small>{i.data.labels.join(" · ")}</small>
                  )}
                </div>
                <div>
                  {i.price !== null && <strong>{money(i.price)}</strong>}
                  {ordering && (
                    <label>
                      {t.add}
                      <input
                        type="number"
                        min="0"
                        max="50"
                        disabled={!!i.data.soldOut || i.price === null}
                        value={cart[i.id] ?? 0}
                        onChange={(e) => {
                          setCart({ ...cart, [i.id]: Math.min(50, Math.max(0, Math.floor(Number(e.target.value) || 0))) });
                          key.current = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
      {ordering && (
        <form className="request-form" onSubmit={submit}>
          <h2>{t.cart}</h2>
          {Object.entries(cart)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => (
              <p key={id}>
                {items.find((i) => i.id === id)?.title} × {n}
              </p>
            ))}
          <div className="form-grid">
            <label>
              {t.name}
              <input name="name" required minLength={2} />
            </label>
            <label>
              {t.phone}
              <input name="phone" type="tel" required />
            </label>
            <label>
              {t.pickup} / {t.delivery}
              <select
                value={fulfilment}
                onChange={(e) => setFulfilment(e.target.value)}
              >
                {s.pickupEnabled && <option value="pickup">{t.pickup}</option>}
                {s.deliveryEnabled && (
                  <option value="delivery">{t.delivery}</option>
                )}
              </select>
            </label>
            {fulfilment === "delivery" && (
              <>
                <label>
                  {t.address}
                  <input
                    name="address"
                    required
                    minLength={5}
                    maxLength={500}
                  />
                </label>
                <label>
                  {t.delivery}
                  <select
                    required
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    <option value="">—</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {money(z.fee)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <label>
            {t.message}
            <textarea name="message" maxLength={2000} />
          </label>
          <div className="honeypot">
            <input name="website" tabIndex={-1} aria-label="Website" />
          </div>
          <h3>
            {t.total}: {money(total)}
          </h3>
          <p>
            {t.payment}: {s.paymentInstructions?.[locale]}
          </p>
          <p className="form-notice">{t.notice}</p>
          {error && <p role="alert">{t.error}</p>}
          <button
            className="button"
            disabled={
              busy ||
              !Object.values(cart).some((n) => n > 0) ||
              total - fee < (s.minimumOrder ?? 0)
            }
          >
            {busy ? t.sending : t.checkout}
          </button>
        </form>
      )}
    </>
  );
}
