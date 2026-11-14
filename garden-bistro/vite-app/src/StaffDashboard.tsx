import { useEffect, useState } from "react";
import type {Locale} from "./i18n";
import { StaffOverview } from "./StaffOverview";
import { StaffAudit } from "./StaffAudit";
import { StaffBusinessProfile } from "./BusinessProfile";
import { StaffRequests } from "./StaffRequests";
import { StaffOrders } from "./StaffOrders";
import { StaffSettings } from "./StaffSettings";
import { MediaUpload } from "./MediaUpload";
import { MediaLibrary } from "./MediaLibrary";
import { StaffContent } from "./StaffContent";
import { StaffManagement } from "./StaffManagement";
type Access={role:string;permissions:string[]};
const labels={en:{overview:"Overview",requests:"Requests",orders:"Orders",settings:"Ordering settings",profile:"Business profile",content:"Content",media:"Media",audit:"Audit",staff:"Staff",role:"Role",denied:"No staff access, or the staff service is unavailable.",loading:"Loading staff access…"},fr:{overview:"Vue d’ensemble",requests:"Demandes",orders:"Commandes",settings:"Paramètres de commande",profile:"Profil de l’établissement",content:"Contenu",media:"Médias",audit:"Journal",staff:"Personnel",role:"Rôle",denied:"Accès refusé ou service du personnel indisponible.",loading:"Chargement de l’accès…"},sw:{overview:"Muhtasari",requests:"Maombi",orders:"Maagizo",settings:"Mipangilio ya maagizo",profile:"Wasifu wa biashara",content:"Maudhui",media:"Picha",audit:"Ukaguzi",staff:"Wafanyakazi",role:"Jukumu",denied:"Hakuna ufikiaji au huduma haipatikani.",loading:"Inapakia ufikiaji…"}};
export function StaffDashboard({token,locale}:{token:string;locale:Locale}){
 const t=labels[locale];
 const [access,setAccess]=useState<Access|null>(null);const [error,setError]=useState(false);const [tab,setTab]=useState("requests");
 useEffect(()=>{let live=true;setAccess(null);setError(false);void fetch("/.netlify/functions/staff-session",{method:"POST",headers:{Authorization:`Bearer ${token}`}}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(live){setAccess(data);const p=data.permissions as string[];setTab(p.includes("dashboard.read")?"overview":p.includes("requests.read")?"requests":p.includes("orders.read")?"orders":p.includes("settings.read")?"settings":p.some(x=>x.startsWith("content.")&&x.endsWith(".read"))?"content":(p.includes("media.read")||p.includes("media.write"))?"media":p.includes("audit.read")?"audit":"staff")}}).catch(()=>{if(live)setError(true)});return()=>{live=false}},[token]);
 if(error)return <p role="alert">{t.denied}</p>;
 if(!access)return <p role="status">{t.loading}</p>;
 const p=access.permissions;const tabs=[...(p.includes("dashboard.read")?["overview"]:[]),...(p.includes("audit.read")?["audit"]:[]),...(p.includes("settings.read")?["profile"]:[]),...(p.includes("requests.read")?["requests"]:[]),...(p.includes("orders.read")?["orders"]:[]),...(p.includes("settings.read")?["settings"]:[]),...(p.some(x=>x.startsWith("content.")&&x.endsWith(".read"))?["content"]:[]),...((p.includes("media.read")||p.includes("media.write"))?["media"]:[]),...(access.role==="owner"&&p.includes("staff.manage")?["staff"]:[])];
 return <div className="dashboard"><p>{t.role}: {access.role}</p><div className="dashboard-tabs" aria-label="Staff sections">{tabs.map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{labels[locale][t as keyof typeof labels.en]}</button>)}</div>{tab==="overview"&&tabs.includes(tab)&&<StaffOverview token={token} locale={locale}/>} {tab==="audit"&&tabs.includes(tab)&&<StaffAudit token={token} locale={locale}/>} {tab==="profile"&&tabs.includes(tab)&&<StaffBusinessProfile token={token} locale={locale} canWrite={p.includes("settings.write")}/>} {tab==="requests"&&tabs.includes(tab)&&<StaffRequests token={token} canWrite={p.includes("requests.write")}/>} {tab==="orders"&&tabs.includes(tab)&&<StaffOrders token={token} canWrite={p.includes("orders.write")}/>} {tab==="settings"&&tabs.includes(tab)&&<StaffSettings token={token} canWrite={p.includes("settings.write")}/>} {tab==="content"&&tabs.includes(tab)&&<StaffContent token={token} permissions={p}/>} {tab==="media"&&tabs.includes(tab)&&<>{p.includes("media.write")&&<MediaUpload token={token}/>} {p.includes("media.read")&&<MediaLibrary token={token} canWrite={p.includes("media.write")}/>}</>} {tab==="staff"&&tabs.includes(tab)&&<StaffManagement token={token}/>}</div>
}
