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
import LocationMap from "@/components/LocationMap";
import { FoodPreview, PhotoStory, BookingBanner } from "@/components/EditorialSections";
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
                <Link className="button gold" href={link("reservations")}>
                  {t.reservations}
                  <ArrowUpRight size={17} />
                </Link>
                <Link
                  className="button outline-light"
                  href={link("menu")}
                >
                  {t.menu}
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
          <section className="home-editorial"><div className="home-editorial-image"><Image src="/images/restaurant-interior.webp" alt={{en:"Dining room at Garden Bistro",fr:"La salle de Garden Bistro",sw:"Chumba cha kulia Garden Bistro"}[l]} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.restaurant}</h2><p>{t.restaurantText}</p><Link className="button" href={link("restaurant")}>{t.discover} <ArrowUpRight size={16}/></Link></div></section>
          <PhotoStory locale={l} variant="food" />
          <PhotoStory locale={l} variant="stay" />
          <FoodPreview locale={l} items={items} />
          <section className="home-editorial home-editorial-reverse"><div className="home-editorial-image"><Image src="/images/celebration.webp" alt={{en:"A table prepared for a celebration",fr:"Une table préparée pour une célébration",sw:"Meza iliyoandaliwa kwa sherehe"}[l]} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.events}</h2><p>{t.contactText}</p><Link className="button" href={link("events")}>{t.events} <ArrowUpRight size={16}/></Link></div></section>
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
            <LocationMap locale={l} />
          </section>
          <BookingBanner locale={l} />
        </>
      ) : (
        <>
          <section className={`page-hero page-hero-${key} ${["restaurant", "hotel", "rooms"].includes(key) ? "split-page-hero" : ""}`}>
            {(!!page?.data.imageId || ["restaurant", "hotel", "rooms"].includes(key)) && <><Image className="page-hero-photo" src={page?.data.imageId ? "/api/images/" + page.data.imageId : key === "restaurant" ? "/images/terrace-meal.webp" : "/images/room.webp"} alt={String(page?.data.alt || ({en: key === "restaurant" ? "Dining at Garden Bistro" : "A guest room at Garden Bistro", fr: key === "restaurant" ? "Repas à Garden Bistro" : "Une chambre à Garden Bistro", sw: key === "restaurant" ? "Chakula Garden Bistro" : "Chumba cha wageni Garden Bistro"})[l])} fill unoptimized={!!page?.data.imageId} sizes="(max-width: 760px) 100vw, 50vw" /><span className="page-hero-overlay" /></>}
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
                <div className="editorial-feature"><Image src="/images/room.webp" alt={{en:"A guest room at Garden Bistro",fr:"Une chambre à Garden Bistro",sw:"Chumba cha wageni Garden Bistro"}[l]} width={900} height={700} sizes="(max-width: 760px) 100vw, 50vw" /><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.rooms}</h2><p>{t.hotelText}</p><Link className="text-link" href={link("rooms")}>{t.rooms} <ArrowUpRight size={16}/></Link></div></div>
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
                      {!!r.data.imageId && <Image src={"/api/images/" + r.data.imageId} alt={String(r.data.alt ?? r.title)} width={800} height={600} unoptimized className="room-card-photo" />}
                      <h2>{r.title}</h2>
                      <p>{r.description}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-state">{t.unavailable}</p>
              ))}
            {key === "rooms" && !p.slug?.[1] && <><PhotoStory locale={l} variant="stay" /><div className="room-enquiry"><h2>{t.enquire}</h2><RequestForm locale={l} kind="hotel" /></div></>}
            {key === "restaurant" && <div className="editorial-feature"><Image src="/images/food-green.webp" alt={{en:"A dish served at Garden Bistro",fr:"Un plat servi à Garden Bistro",sw:"Chakula kilichotolewa Garden Bistro"}[l]} width={900} height={700} sizes="(max-width: 760px) 100vw, 50vw" /><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.restaurant}</h2><p>{t.restaurantText}</p><Link className="text-link" href={link("menu")}>{t.menu} <ArrowUpRight size={16}/></Link></div></div>}
            {key === "restaurant" && <><PhotoStory locale={l} variant="garden" /><FoodPreview locale={l} items={items} /><BookingBanner locale={l} /></>}
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
            {key === "menu" && !p.slug?.[1] && <div className="menu-editorial-photos"><Image src="/images/grill.webp" alt={{en:"Grilled food at Garden Bistro",fr:"Grillades à Garden Bistro",sw:"Chakula cha kuchoma Garden Bistro"}[l]} width={600} height={600} /><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.restaurant}</h2><p>{t.restaurantText}</p></div><Image src="/images/food-green.webp" alt={{en:"A dish at Garden Bistro",fr:"Un plat à Garden Bistro",sw:"Chakula Garden Bistro"}[l]} width={600} height={600} /></div>}
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
              <div className="reservation-layout">
                <div className="reservation-aside"><Image src="/images/restaurant-interior.webp" alt={{en:"Dining room at Garden Bistro",fr:"Salle du restaurant Garden Bistro",sw:"Chumba cha kulia cha Garden Bistro"}[l]} width={900} height={1100} sizes="(max-width: 760px) 100vw, 45vw" /><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.restaurant}</h2><p>{t.restaurantText}</p><p>KN 159 St, Nyamirambo, Kigali</p></div></div>
                <div className="reservation-panel"><span className="eyebrow">GARDEN BISTRO</span><h2>{t.reservations}</h2><RequestForm locale={l} kind="reservation" /></div>
              </div>
            )}
            {key === "reservations" && <><FoodPreview locale={l} items={items} /><BookingBanner locale={l} /></>}
            {key === "events" && (
              <>
                <p>{page ? t.approved : t.unavailable}</p>
                <RequestForm locale={l} kind="event" />
              </>
            )}
            {key === "contact" && (
              <><div className="contact-details">
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
              </div><LocationMap locale={l} /></>
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
