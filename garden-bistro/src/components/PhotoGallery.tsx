"use client";
import Image from "next/image";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Content } from "@/lib/db";

type Category = "food" | "restaurant" | "garden" | "hotel" | "events";
const photos: { file: string; category: Category; alt: Record<Locale, string> }[] = [
  {file:"table", category:"food", alt:{en:"A table set with food at Garden Bistro",fr:"Une table garnie de plats à Garden Bistro",sw:"Meza yenye chakula Garden Bistro"}},
  {file:"food-red", category:"food", alt:{en:"A dish served at Garden Bistro",fr:"Un plat servi à Garden Bistro",sw:"Chakula kilichotolewa Garden Bistro"}},
  {file:"food-green", category:"food", alt:{en:"A green dish served at the table",fr:"Un plat vert servi à table",sw:"Chakula cha kijani mezani"}},
  {file:"grill", category:"food", alt:{en:"Grilled food with salad",fr:"Grillades accompagnées de salade",sw:"Chakula cha kuchoma na saladi"}},
  {file:"flatbread", category:"food", alt:{en:"Flatbread with sauces",fr:"Pain plat accompagné de sauces",sw:"Mkate na michuzi"}},
  {file:"kebabs", category:"food", alt:{en:"Grilled food with lime and salad",fr:"Grillades avec citron vert et salade",sw:"Chakula cha kuchoma na limau na saladi"}},
  {file:"drink", category:"restaurant", alt:{en:"A drink beside the pool",fr:"Une boisson au bord de la piscine",sw:"Kinywaji karibu na bwawa"}},
  {file:"restaurant-interior", category:"restaurant", alt:{en:"Garden Bistro dining room",fr:"La salle de restaurant de Garden Bistro",sw:"Chumba cha kulia cha Garden Bistro"}},
  {file:"bar", category:"restaurant", alt:{en:"The bar at Garden Bistro",fr:"Le bar de Garden Bistro",sw:"Baa ya Garden Bistro"}},
  {file:"table-evening", category:"restaurant", alt:{en:"An evening meal at Garden Bistro",fr:"Un repas du soir à Garden Bistro",sw:"Chakula cha jioni Garden Bistro"}},
  {file:"terrace-meal", category:"restaurant", alt:{en:"A meal on the dining terrace",fr:"Un repas sur la terrasse",sw:"Chakula kwenye mtaro"}},
  {file:"garden", category:"garden", alt:{en:"The garden and outdoor bar",fr:"Le jardin et le bar extérieur",sw:"Bustani na baa ya nje"}},
  {file:"pool-photo", category:"garden", alt:{en:"The pool and garden setting",fr:"La piscine et le jardin",sw:"Bwawa na bustani"}},
  {file:"hero", category:"garden", alt:{en:"The dining terrace overlooking the pool",fr:"La terrasse donnant sur la piscine",sw:"Mtaro unaoangalia bwawa"}},
  {file:"room-photo", category:"hotel", alt:{en:"A guest room at Garden Bistro",fr:"Une chambre à Garden Bistro",sw:"Chumba cha wageni Garden Bistro"}},
  {file:"celebration", category:"events", alt:{en:"A table prepared for a birthday",fr:"Une table préparée pour un anniversaire",sw:"Meza iliyoandaliwa kwa siku ya kuzaliwa"}},
];
const labels: Record<Locale, Record<Category | "all" | "close", string>> = {
  en:{all:"All",food:"Food",restaurant:"Restaurant & bar",garden:"Garden",hotel:"Stay",events:"Celebrations",close:"Close image"},
  fr:{all:"Tout",food:"Cuisine",restaurant:"Restaurant et bar",garden:"Jardin",hotel:"Séjour",events:"Célébrations",close:"Fermer l’image"},
  sw:{all:"Yote",food:"Chakula",restaurant:"Mkahawa na baa",garden:"Bustani",hotel:"Malazi",events:"Sherehe",close:"Funga picha"},
};
export default function PhotoGallery({locale, records}: {locale: Locale; records: Content[]}) {
  const [category,setCategory] = useState<Category | "all">("all");
  const [selected,setSelected] = useState<{src:string;alt:string} | null>(null);
  const t=labels[locale];
  const list = [...photos.map(p=>({src:`/images/${p.file}.webp`, alt:p.alt[locale], category:p.category})), ...records.filter(r=>r.data.imageId).map(r=>({src:`/api/images/${r.data.imageId}`,alt:String(r.data.alt ?? r.title),category:null}))];
  return <>
    <div className="gallery-filters" aria-label={t.all}>
      {(["all","food","restaurant","garden","hotel","events"] as const).map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{t[c]}</button>)}
    </div>
    <div className="photo-grid">{list.filter(p=>category==="all" || p.category===category).map(p=><button type="button" key={p.src} className="photo-tile" onClick={()=>setSelected(p)} aria-label={p.alt}><Image src={p.src} alt={p.alt} width={800} height={650} sizes="(max-width: 600px) 100vw, (max-width: 950px) 50vw, 33vw" unoptimized={p.src.startsWith('/api/')} /></button>)}</div>
    {selected && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={selected.alt} onClick={()=>setSelected(null)} onKeyDown={e=>{if(e.key==='Escape')setSelected(null)}}><button type="button" autoFocus onClick={()=>setSelected(null)} aria-label={t.close}>×</button><Image src={selected.src} alt={selected.alt} width={1600} height={1200} unoptimized={selected.src.startsWith('/api/')} onClick={e=>e.stopPropagation()} /></div>}
  </>;
}
