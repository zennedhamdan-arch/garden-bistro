"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Locale, messages, locales } from "@/lib/i18n";
export default function Header({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const t = messages[locale];
  return (
    <>
      <div className="topbar">
        <span>
          Kigali, Rwanda <span className="tiny-dot">•</span> KN 159 St,
          Nyamirambo
        </span>
        <a href="tel:+250786458663">
          +250 786 458 663 <ArrowUpRight size={12} />
        </a>
      </div>
      <header>
        <Link
          className="brand"
          href={`/${locale}`}
          aria-label="Garden Bistro home"
        >
          <img className="brand-logo" src="/images/garden-bistro-logo.png" alt="" width="62" height="62" />
          <span>
            GARDEN BISTRO<small>{t.brandType}</small>
          </span>
        </Link>
        <nav className={open ? "nav open" : "nav"} aria-label="Main">
          {(["hotel", "restaurant", "menu", "about", "contact"] as const).map(
            (k) => (
              <Link
                onClick={() => setOpen(false)}
                key={k}
                href={`/${locale}/${k}`}
                className={path.includes("/" + k) ? "active" : ""}
              >
                {t[k]}
              </Link>
            ),
          )}
          <div className="languages">
            {locales.map((l) => (
              <Link
                key={l}
                onClick={() => setOpen(false)}
                href={path.replace(/^\/(en|fr|sw)/, "/" + l)}
                lang={l}
                aria-label={
                  { en: "English", fr: "Français", sw: "Kiswahili" }[l]
                }
                className={locale === l ? "selected" : ""}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
          <Link
            className="button small"
            onClick={() => setOpen(false)}
            href={`/${locale}/reservations`}
          >
            {t.reservations}
            <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
    </>
  );
}
