import assert from "node:assert/strict";
// Run only against an isolated, unconfigured local Netlify server.
const base=process.env.SMOKE_BASE_URL;
if(!base)throw new Error("Set SMOKE_BASE_URL to your isolated local Netlify server");
const url=new URL(base);
if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname))throw new Error("Smoke tests require a local server");
for(const path of ["/en","/fr/menu","/sw/reservations","/images/garden-bistro-logo.png"]){
 const response=await fetch(new URL(path,url));assert.equal(response.status,200,`${path} should be served`);
 if(!path.startsWith("/images/"))assert.match(response.headers.get("content-type")??"",/text\/html/);
}
const options=await fetch(new URL("/.netlify/functions/order-options?locale=en",url));
assert.equal(options.status,200);assert.match(options.headers.get("content-type")??"",/application\/json/);assert.deepEqual(await options.json(),{enabled:false});
const invalid=await fetch(new URL("/.netlify/functions/public-content?kind=requests&locale=en",url));assert.equal(invalid.status,400);assert.match(invalid.headers.get("content-type")??"",/application\/json/);
const denied=await fetch(new URL("/.netlify/functions/requests",url),{method:"POST",headers:{origin:"https://foreign.invalid","content-type":"application/json"},body:"{}"});assert.equal(denied.status,403);assert.match(denied.headers.get("content-type")??"",/application\/json/);
console.log("Netlify local smoke checks passed: three SPA routes, logo, disabled ordering, invalid public query and rejected foreign origin.");
