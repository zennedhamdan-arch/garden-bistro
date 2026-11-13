const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
async function main() {
  let count = 0;
  for (const locale of ["en", "fr", "sw"])
    for (const route of [
      "",
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
    ]) {
      const r = await fetch(`${base}/${locale}/${route}`);
      if (r.status !== 200) throw new Error(`${locale}/${route}: ${r.status}`);
      const html = await r.text();
      if (!html.includes("250786458663")) throw new Error("Contact missing");
      count++;
    }
  for (const path of ["/xx", "/en/unknown", "/en/rooms/unpublished"]) {
    const r = await fetch(base + path);
    if (r.status !== 404) throw new Error(`${path}: ${r.status}`);
  }
  const admin = await fetch(base + "/admin/orders", { redirect: "manual" });
  if (admin.status !== 307) throw new Error("Admin not protected");
  for (const route of ["content", "records", "users", "upload"]) {
    const r = await fetch(base + "/api/admin/" + route, {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json" },
      body: "{}",
    });
    if (r.status !== 403) throw new Error("Unprotected API " + route);
  }
  const csrf = await fetch(base + "/api/requests", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (csrf.status !== 403) throw new Error("CSRF not blocked");
  const offline = await fetch(base + "/api/requests", {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: "{}",
  });
  if (offline.status !== 503)
    throw new Error("Expected explicit unavailable database");
  const robots = await (await fetch(base + "/robots.txt")).text();
  if (!robots.includes("Disallow: /"))
    throw new Error("Preview indexing enabled");
  console.log(
    `${count} localized routes, 3 missing routes, admin redirect, 4 admin API guards, CSRF, unavailable DB and robots checks passed.`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
