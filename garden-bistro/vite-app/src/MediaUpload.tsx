import { useState, type FormEvent } from "react";
export function MediaUpload({token}:{token:string}) {
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const form=e.currentTarget;setBusy(true);setMessage("");try{const response=await fetch("/.netlify/functions/media-upload",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:new FormData(form)});if(!response.ok)throw new Error();setMessage("Image uploaded.");form.reset()}catch{setMessage("Upload failed or your account does not have permission.")}finally{setBusy(false)}}
 return <section><h2>Upload public image</h2><p>Images are published to the configured public media domain. JPEG, PNG or WebP, up to 5 MB.</p><form onSubmit={submit}><label>Image<input type="file" name="file" accept="image/jpeg,image/png,image/webp" required/></label><label>Image description<input name="alt" maxLength={250} required/></label><button disabled={busy}>{busy?"Uploading…":"Upload"}</button></form>{message && <p role="status">{message}</p>}</section>
}
