import type { Locale } from "@/lib/i18n";

const embedUrl = "https://www.google.com/maps/embed?pb=!1m16!1m11!1m3!1d3!2d30.05853736381212!3d-1.9500506313243995!2m2!1f0!2f90!3m2!1i1024!2i768!4f75!3m3!1m2!1s0x19dca72425f612f1%3A0x4cfa125dd6aa1120!2sGarden%20Bistro%20Hotel%20and%20Restaurant!4v1794576011395";
const directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=-1.9500506313243995%2C30.05853736381212";
const directions = { en: "Get directions", fr: "Obtenir l’itinéraire", sw: "Pata maelekezo" };

export default function LocationMap({ locale }: { locale: Locale }) {
  return (
    <div className="location-map">
      <div className="map-container">
        <iframe src={embedUrl} width="600" height="450" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" title="Garden Bistro Hotel and Restaurant location" />
      </div>
      <a className="text-link map-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">{directions[locale]} ↗</a>
    </div>
  );
}
