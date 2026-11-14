import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Content } from "@/lib/db";
import { messages, type Locale } from "@/lib/i18n";

const copy = {
  en: {food:"From our kitchen to your table.", dining:"A table worth gathering around.", stay:"Take your time.", garden:"A little more green.", discover:"Discover Garden Bistro", kitchen:"From our kitchen", seeMenu:"Explore the menu", booking:"Make a request", gallery:"A glimpse of Garden Bistro"},
  fr: {food:"De notre cuisine à votre table.", dining:"Le plaisir de se retrouver à table.", stay:"Prenez votre temps.", garden:"Un peu plus de nature.", discover:"Découvrez Garden Bistro", kitchen:"Notre cuisine", seeMenu:"Découvrir la carte", booking:"Faire une demande", gallery:"Un aperçu de Garden Bistro"},
  sw: {food:"Kutoka jikoni kwetu hadi mezani pako.", dining:"Furahia kukutana mezani.", stay:"Chukua muda wako.", garden:"Karibu na mazingira.", discover:"Gundua Garden Bistro", kitchen:"Kutoka jikoni kwetu", seeMenu:"Angalia menyu", booking:"Tuma ombi", gallery:"Fahamu Garden Bistro"},
} as const;
export function FoodPreview({locale, items}: {locale:Locale; items:Content[]}) {
  const t=messages[locale], c=copy[locale];
  const featured=items.slice(0,4);
  return <section className="food-preview"><span className="eyebrow">GARDEN BISTRO · {c.kitchen}</span><h2>{c.food}</h2>
    {featured.length ? <div className="food-preview-list">{featured.map(item=><Link href={`/${locale}/menu/${item.slug}`} className="food-preview-row" key={item.id}><div><h3>{item.title}</h3><p>{item.description}</p></div>{item.price !== null && <strong>{new Intl.NumberFormat(locale,{style:"currency",currency:"RWF",maximumFractionDigits:0}).format(item.price)}</strong>}</Link>)}</div> : <p>{t.menuEmpty}</p>}
    <Link className="button" href={`/${locale}/menu`}>{c.seeMenu} <ArrowUpRight size={16}/></Link>
  </section>;
}
export function PhotoStory({locale, variant}: {locale:Locale; variant:"food"|"stay"|"garden"}) {
  const t=messages[locale], c=copy[locale];
  const config = variant === "food" ? {title:c.dining, text:t.restaurantText, photos:["table","kebabs","flatbread"], link:"restaurant", label:t.discover} : variant === "stay" ? {title:c.stay,text:t.hotelText,photos:["pool-photo","room-photo","drink"],link:"rooms",label:t.rooms} : {title:c.garden,text:t.restaurantText,photos:["pool-photo","garden","bar"],link:"gallery",label:t.gallery};
  const alt: Record<Locale, string[]> = {en:["A Garden Bistro view", "Garden Bistro detail", "A moment at Garden Bistro"],fr:["Une vue de Garden Bistro", "Un détail de Garden Bistro", "Un moment à Garden Bistro"],sw:["Mandhari ya Garden Bistro", "Garden Bistro", "Wakati Garden Bistro"]};
  return <section className={`photo-story photo-story-${variant}`}><div className="photo-story-copy"><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{config.title}</h2><p>{config.text}</p><Link className="text-link" href={`/${locale}/${config.link}`}>{config.label} <ArrowUpRight size={16}/></Link></div><div className="photo-story-grid">{config.photos.map((photo,i)=><div className={`story-image story-image-${i}`} key={photo}><Image src={`/images/${photo}.webp`} alt={alt[locale][i]} fill sizes="(max-width: 760px) 50vw, 30vw" /></div>)}</div></section>;
}
export function BookingBanner({locale}: {locale:Locale}) {
 const t=messages[locale], c=copy[locale];
 return <section className="booking-banner"><div><span className="eyebrow">GARDEN BISTRO · KIGALI</span><h2>{t.reservations}</h2><p>{t.contactText}</p></div><div><Link className="button" href={`/${locale}/reservations`}>{c.booking} <ArrowUpRight size={16}/></Link><Link className="text-link" href={`/${locale}/contact`}>{t.contact} <ArrowUpRight size={16}/></Link></div></section>;
}
