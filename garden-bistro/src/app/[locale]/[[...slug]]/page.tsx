import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
} from "lucide-react";
import type { Metadata } from "next";
import { content, settings } from "@/lib/db";
import { locales, Locale, messages } from "@/lib/i18n";
import Shell from "@/components/Shell";
import Botanical from "@/components/Botanical";
import RequestForm from "@/components/RequestForm";
import MenuOrder from "@/components/MenuOrder";
import PhotoGallery from "@/components/PhotoGallery";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; slug?: string[] }> };
const routes = [
  "hotel",
  "rooms",
  "restaurant",
  "menu",
  "order",
  "reservations",
  "events",
  "gallery",
  "about",
  "contact",
  "faq",
  "privacy",
  "terms",
  "policies",
];
async function resolve(params: Props["params"]) {
  const p = await params;
  if (!locales.includes(p.locale as Locale)) notFound();
  if (p.slug?.length && !routes.includes(p.slug[0])) notFound();
  if (
    (p.slug?.length ?? 0) > 2 ||
    (p.slug?.length === 2 && !["rooms", "menu"].includes(p.slug[0]))
  )
    notFound();
  return { ...p, locale: p.locale as Locale, key: p.slug?.[0] ?? "home" };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await resolve(params);
  const t = messages[p.locale];
  const title = t[p.key as keyof typeof t] ?? "Garden Bistro";
  const suffix = p.slug ? "/" + p.slug.join("/") : "";
  const base = process.env.SITE_URL;
  return {
    title: `${title} | Garden Bistro Kigali`,
    description: t.intro,
    robots: {
      index: process.env.ALLOW_INDEXING === "true",
      follow: process.env.ALLOW_INDEXING === "true",
    },
    alternates: base
      ? {
          canonical: `${base}/${p.locale}${suffix}`,
          languages: Object.fromEntries([
            ...locales.map((l) => [l, `${base}/${l}${suffix}`]),
            ["x-default", `${base}/en${suffix}`],
          ]),
        }
      : undefined,
    openGraph: {
      title: `${title} | Garden Bistro`,
      description: t.intro,
      type: "website",
    },
  };
}
export default async function PublicPage({ params }: Props) {
  const p = await resolve(params);
  const l = p.locale,
    t = messages[l],
    key = p.key;
  const records = await content(l);
  const s = await settings();
  const page = records.find((r) => r.kind === "page" && r.slug === key);
  const items = records.filter((r) => r.kind === "menu");
  const rooms = records.filter((r) => r.kind === "room");
  const title = t[key as keyof typeof t] ?? key;
  const link = (route: string) => `/${l}/${route}`;
  return (
    <Shell locale={l} context={title} whatsapp={s.whatsappEnabled !== false}>
      {key === "home" ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="line" />
                {t.eyebrow}
              </span>
              <h1>
                {t.headline.split("\n").map((line, i) => (
                  <span key={line} className={i === 1 ? "italic" : ""}>
                    {line}
                  </span>
                ))}
              </h1>
              <p>{t.intro}</p>
              <div className="hero-actions">
                <Link className="button gold" href={link("hotel")}>
                  {t.explore}
                  <ArrowUpRight size={17} />
                </Link>
                <Link
                  className="button outline-light"
                  href={link("restaurant")}
                >
                  {t.discover}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="hero-actions hero-secondary-actions">
                <Link className="text-link" href={link("menu")}>{t.menu} <ArrowUpRight size={16} /></Link>
                <Link className="text-link" href={link("reservations")}>{t.reservations} <ArrowUpRight size={16} /></Link>
              </div>
              <div className="hero-foot">
                <span>01 — GARDEN BISTRO</span>
                <span>
                  KIGALI, RWANDA <span className="tiny-dot">✳</span>
                </span>
              </div>
            </div>
            <div className="hero-art">
              <Image src={page?.data.imageId ? "/api/images/" + page.data.imageId : "/images/hero.webp"} alt={String(page?.data.alt || ({en: "Garden Bistro dining terrace overlooking the pool", fr: "La terrasse de Garden Bistro donnant sur la piscine", sw: "Mtaro wa Garden Bistro unaoangalia bwawa"})[l])} fill priority unoptimized={!!page?.data.imageId} sizes="(max-width: 760px) 100vw, 55vw" className="cover-photo" />
            </div>
          </section>
          <div className="ribbon">
            <span>{t.brandType}</span>
            <span>✳</span>
            <span>NYAMIRAMBO, KIGALI</span>
            <span>✳</span>
            <span>GARDEN BISTRO</span>
            <span>✳</span>
            <span>{t.brandType}</span>
          </div>
          <section className="experiences">
            <div className="section-heading">
              <span className="eyebrow">{t.welcome}</span>
              <h2>
                {t.welcomeTitle.split("\n").map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </h2>
            </div>
            <div className="experience-grid">
              <Link className="experience hotel-card" href={link("hotel")}>
                <div className="experience-art">
                  <Image src="/images/room.webp" alt="A guest room at Garden Bistro" fill sizes="(max-width: 760px) 100vw, 50vw" className="cover-photo" />
                  <span className="card-number">01 / HOTEL</span>
                </div>
                <div className="experience-copy">
                  <div>
                    <span className="eyebrow">GARDEN BISTRO</span>
                    <h3>{t.hotel}</h3>
                  </div>
                  <ArrowUpRight />
                  <p>{t.hotelText}</p>
                  <span className="text-link">
                    {t.explore}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
              <Link
                className="experience restaurant-card"
                href={link("restaurant")}
              >
                <div className="experience-art">
                  <Image src="/images/dining.webp" alt="A meal served at Garden Bistro" fill sizes="(max-width: 760px) 100vw, 50vw" className="cover-photo" />
                  <span className="card-number">02 / RESTAURANT</span>
                </div>
                <div className="experience-copy">
                  <div>
                    <span className="eyebrow">GARDEN BISTRO</span>
                    <h3>{t.restaurant}</h3>
                  </div>
                  <ArrowUpRight />
                  <p>{t.restaurantText}</p>
                  <span className="text-link">
                    {t.discover}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </div>
          </section>
          <section className="home-gallery-preview">
            <div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.gallery}</h2><Link className="text-link" href={link("gallery")}>{t.gallery} <ArrowUpRight size={16} /></Link></div>
            <div className="home-gallery-images"><Image src="/images/garden.webp" alt={{en:"The garden at Garden Bistro",fr:"Le jardin de Garden Bistro",sw:"Bustani ya Garden Bistro"}[l]} width={900} height={600} sizes="(max-width: 760px) 100vw, 45vw" /><Image src="/images/bar.webp" alt={{en:"The bar at Garden Bistro",fr:"Le bar de Garden Bistro",sw:"Baa ya Garden Bistro"}[l]} width={900} height={600} sizes="(max-width: 760px) 100vw, 45vw" /></div>
          </section>
          <section className="location-teaser">
            <MapPin size={28} strokeWidth={1} />
            <span className="eyebrow">KN 159 ST · NYAMIRAMBO</span>
            <h2>{t.location}</h2>
            <Link className="text-link" href={link("contact")}>
              {t.contact}
              <ArrowUpRight size={16} />
            </Link>
          </section>
        </>
      ) : (
        <>
          <section className={`page-hero page-hero-${key}`}>
            {!!page?.data.imageId && <><Image className="page-hero-photo" src={"/api/images/" + page.data.imageId} alt={String(page.data.alt || page.title)} fill unoptimized sizes="100vw" /><span className="page-hero-overlay" /></>}
            <div>
              <span className="eyebrow">GARDEN BISTRO · {t.eyebrow}</span>
              <h1>
                {p.slug?.[1]
                  ? (records.find((r) => r.slug === p.slug?.[1])?.title ??
                    title)
                  : title}
              </h1>
              <p>
                {page?.description ??
                  (["hotel", "rooms"].includes(key)
                    ? t.hotelText
                    : ["restaurant"].includes(key)
                      ? t.restaurantText
                      : key === "contact"
                        ? t.contactText
                        : "")}
              </p>
            </div>
            <Botanical />
          </section>
          <section className="page-content">
            {!!page?.data.body && (
              <div className="prose">{String(page.data.body)}</div>
            )}
            {key === "hotel" && (
              <>
                <div className="inline-actions">
                  <Link className="button" href={link("rooms")}>
                    {t.rooms}
                    <ArrowUpRight size={16} />
                  </Link>
                  <a className="text-link" href="#enquiry">
                    {t.enquire} ↓
                  </a>
                </div>
                {rooms.length > 0 && (
                  <div className="content-grid">
                    {rooms.map((r) => (
                      <Link
                        key={r.id}
                        className="content-card"
                        href={link("rooms/" + r.slug)}
                      >
                        <h2>{r.title}</h2>
                        <p>{r.description}</p>
                      </Link>
                    ))}
                  </div>
                )}
                <div id="enquiry">
                  <h2>{t.enquire}</h2>
                  <RequestForm locale={l} kind="hotel" />
                </div>
              </>
            )}
            {key === "rooms" &&
              (p.slug?.[1] ? (
                (() => {
                  const room = rooms.find((r) => r.slug === p.slug![1]);
                  if (!room) notFound();
                  return (
                    <>
                      {!!room.data.imageId && (
                        <Image
                          src={"/api/images/" + room.data.imageId}
                          alt={String(room.data.alt ?? room.title)}
                          width={1000}
                          height={700}
                          unoptimized
                          className="room-image"
                        />
                      )}
                      <p>{room.description}</p>
                      {room.price !== null && (
                        <p>
                          {new Intl.NumberFormat(l, {
                            style: "currency",
                            currency: "RWF",
                          }).format(room.price)}
                        </p>
                      )}
                      <RequestForm locale={l} kind="hotel" />
                    </>
                  );
                })()
              ) : rooms.length ? (
                <div className="content-grid">
                  {rooms.map((r) => (
                    <Link
                      key={r.id}
                      className="content-card"
                      href={link("rooms/" + r.slug)}
                    >
                      <h2>{r.title}</h2>
                      <p>{r.description}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-state">{t.unavailable}</p>
              ))}
            {key === "restaurant" && (
              <div className="inline-actions">
                {(["menu", "reservations", "order"] as const).map((k) => (
                  <Link className="button" key={k} href={link(k)}>
                    {t[k]}
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            )}
            {(key === "menu" || key === "order") &&
              (p.slug?.[1] ? (
                (() => {
                  const item = items.find((i) => i.slug === p.slug![1]);
                  if (!item) notFound();
                  return (
                    <>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <Link className="button" href={link("order")}>
                        {t.order}
                      </Link>
                    </>
                  );
                })()
              ) : (
                <MenuOrder
                  locale={l}
                  items={items}
                  ordering={key === "order"}
                  settings={s}
                />
              ))}
            {key === "reservations" && (
              <RequestForm locale={l} kind="reservation" />
            )}
            {key === "events" && (
              <>
                <p>{page ? t.approved : t.unavailable}</p>
                <RequestForm locale={l} kind="event" />
              </>
            )}
            {key === "contact" && (
              <div className="contact-details">
                <p>KN 159 St, Nyamirambo, Kigali, Rwanda</p>
                <a href="tel:+250786458663">+250 786 458 663</a>
                <a href="mailto:info@gardenbistro.net">info@gardenbistro.net</a>
                <a
                  className="button"
                  href="https://wa.me/250786458663"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp <ArrowUpRight size={16} />
                </a>
              </div>
            )}
            {["privacy", "terms", "policies"].includes(key) && !page && (
              <p className="empty-state">{t.legal}</p>
            )}
            {key === "faq" &&
              (records.some((r) => r.kind === "faq") ? (
                records
                  .filter((r) => r.kind === "faq")
                  .map((r) => (
                    <details key={r.id}>
                      <summary>{r.title}</summary>
                      <p>{r.description}</p>
                    </details>
                  ))
              ) : (
                <p className="empty-state">{t.unavailable}</p>
              ))}
            {key === "gallery" && <PhotoGallery locale={l} records={records.filter(r => r.kind === "gallery")} />}
            {key === "about" && !page && (
              <div className="prose">
                <h2>Garden Bistro, Kigali</h2>
                <p>{t.intro}</p>
                <p>{t.hotelText}</p>
                <p>{t.restaurantText}</p>
              </div>
            )}
          </section>
        </>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Garden Bistro",
            telephone: "+250786458663",
            email: "info@gardenbistro.net",
            address: {
              "@type": "PostalAddress",
              streetAddress: "KN 159 St, Nyamirambo",
              addressLocality: "Kigali",
              addressCountry: "RW",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </Shell>
  );
}
