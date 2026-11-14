import { useEffect, useState } from "react";
import { StaffRequests } from "./StaffRequests";
import { MediaUpload } from "./MediaUpload";
import { MediaLibrary } from "./MediaLibrary";
import { StaffContent } from "./StaffContent";
import { StaffManagement } from "./StaffManagement";
type Access={role:string;permissions:string[]};
export function StaffDashboard({token}:{token:string}){
 const [access,setAccess]=useState<Access|null>(null);const [error,setError]=useState(false);const [tab,setTab]=useState("requests");
 useEffect(()=>{let live=true;setAccess(null);setError(false);void fetch("/.netlify/functions/staff-session",{method:"POST",headers:{Authorization:`Bearer ${token}`}}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(live){setAccess(data);const p=data.permissions as string[];setTab(p.includes("requests.read")?"requests":p.some(x=>x.startsWith("content.")&&x.endsWith(".read"))?"content":(p.includes("media.read")||p.includes("media.write"))?"media":"staff")}}).catch(()=>{if(live)setError(true)});return()=>{live=false}},[token]);
 if(error)return <p role="alert">No staff access, or the staff service is unavailable.</p>;
 if(!access)return <p role="status">Loading staff access…</p>;
 const p=access.permissions;const tabs=[...(p.includes("requests.read")?["requests"]:[]),...(p.some(x=>x.startsWith("content.")&&x.endsWith(".read"))?["content"]:[]),...((p.includes("media.read")||p.includes("media.write"))?["media"]:[]),...(access.role==="owner"&&p.includes("staff.manage")?["staff"]:[])];
 return <div className="dashboard"><p>Role: {access.role}</p><div className="dashboard-tabs" aria-label="Staff sections">{tabs.map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==="requests"&&tabs.includes(tab)&&<StaffRequests token={token} canWrite={p.includes("requests.write")}/>} {tab==="content"&&tabs.includes(tab)&&<StaffContent token={token} permissions={p}/>} {tab==="media"&&tabs.includes(tab)&&<>{p.includes("media.write")&&<MediaUpload token={token}/>} {p.includes("media.read")&&<MediaLibrary token={token} canWrite={p.includes("media.write")}/>}</>} {tab==="staff"&&tabs.includes(tab)&&<StaffManagement token={token}/>}</div>
}
