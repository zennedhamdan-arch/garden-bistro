import Link from "next/link";
import { ArrowUpRight, MapPin, Phone, Mail } from "lucide-react";
import Header from "./Header";
import { Locale, messages } from "@/lib/i18n";
export default function Shell({
  locale,
  children,
  context = "",
  whatsapp = true,
}: {
  locale: Locale;
  children: React.ReactNode;
  context?: string;
  whatsapp?: boolean;
}) {
  const t = messages[locale];
  return (
    <>
      <a href="#main" className="skip">
        {t.skip}
      </a>
      <Header locale={locale} />
      <main id="main" lang={locale}>
        {children}
      </main>
      <section className="contact-band">
        <div>
          <span className="eyebrow">GARDEN BISTRO · KIGALI</span>
          <h2>{t.visit}</h2>
          <p>{t.contactText}</p>
        </div>
        <div className="contact-links">
          <p>
            <MapPin size={18} />
            KN 159 St, Nyamirambo, Kigali, Rwanda
          </p>
          <a href="tel:+250786458663">
            <Phone size={18} />
            +250 786 458 663
          </a>
          <a href="mailto:info@gardenbistro.net">
            <Mail size={18} />
            info@gardenbistro.net
          </a>
          <Link href={`/${locale}/contact`}>
            {t.contact}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <footer>
        <div className="footer-top">
          <div>
            <div className="brand footer-brand">❧ GARDEN BISTRO</div>
            <p>{t.footer}</p>
          </div>
          <div className="footer-nav">
            {(
              [
                "hotel",
                "restaurant",
                "rooms",
                "menu",
                "order",
                "reservations",
                "about",
                "contact",
                "faq",
              ] as const
            ).map((k) => (
              <Link key={k} href={`/${locale}/${k}`}>
                {t[k]}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Garden Bistro. {t.rights}
          </span>
          <div>
            {(["privacy", "terms", "policies"] as const).map((k) => (
              <Link key={k} href={`/${locale}/${k}`}>
                {t[k]}
              </Link>
            ))}
          </div>
        </div>
      </footer>
      {whatsapp && (
        <a
          className="whatsapp"
          href={`https://wa.me/250786458663?text=${encodeURIComponent(t.hello + " " + (context || "Garden Bistro"))}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.whatsapp}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M20.5 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z" />
            <path d="M8 7c0 5 4 9 8 9l1-3-3-1-1 1c-2-1-3-2-3-3l1-1-1-3Z" />
          </svg>
        </a>
      )}
    </>
  );
}
