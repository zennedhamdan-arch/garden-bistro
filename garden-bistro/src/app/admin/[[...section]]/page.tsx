import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authorized } from "@/lib/auth";
import { db, settings } from "@/lib/db";
import {
  ImageUpload,
  Login,
  ContentEditor,
  StatusControl,
  SettingsEditor,
  UserEditor,
} from "@/components/AdminControls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration | Garden Bistro",
  robots: { index: false, follow: false },
};
const sections = [
  "dashboard",
  "orders",
  "reservations",
  "hotel",
  "events",
  "content",
  "menu",
  "rooms",
  "pages",
  "translations",
  "gallery",
  "settings",
  "audit",
  "users",
];
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section } = await params;
  const key = section?.[0] ?? "dashboard";
  if (key === "login") return <Login />;
  const isAdmin = await authorized();
  const scope =
    key === "orders"
      ? "orders"
      : ["reservations", "hotel", "events"].includes(key)
        ? "requests"
        : undefined;
  if (!isAdmin && !(scope && (await authorized(scope))))
    redirect("/admin/login");
  const visibleSections = isAdmin
    ? sections
    : sections.filter((k) =>
        scope === "orders"
          ? k === "orders"
          : ["reservations", "hotel", "events"].includes(k),
      );
  if (!sections.includes(key) || (section && section.length > 1)) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").slice(0, 100);
  const status = (sp.status ?? "").slice(0, 50);
  const query = new URLSearchParams({ q, status });
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>❧ Garden Bistro</h2>
        <span className="eyebrow" style={{ color: "#d3c194" }}>
          ADMINISTRATION
        </span>
        {visibleSections.map((k) => (
          <Link key={k} href={"/admin/" + k}>
            {k[0].toUpperCase() + k.slice(1)}
          </Link>
        ))}
        <Link href="/en">View website ↗</Link>
        <form action="/api/admin/logout" method="post">
          <button className="button small">Sign out</button>
        </form>
      </aside>
      <main className="admin-main">
        <span className="eyebrow">PRIVATE WORKSPACE · AFRICA/KIGALI</span>
        <h1>{key[0].toUpperCase() + key.slice(1)}</h1>
        {key === "dashboard" ? (
          await (async () => {
            const counts = await db().query(
              "SELECT kind,count(*)::int FROM requests WHERE status='pending' GROUP BY kind",
            );
            const orders = (
              await db().query(
                "SELECT count(*)::int FROM orders WHERE status='pending'",
              )
            ).rows[0].count;
            return (
              <>
                <p>
                  Pending requests require manual confirmation. Contact
                  customers directly; automated notifications are not
                  configured.
                </p>
                <div className="admin-grid">
                  {["reservation", "hotel", "event", "orders"].map((k) => (
                    <div className="metric" key={k}>
                      <span>{k}</span>
                      <strong>
                        {k === "orders"
                          ? orders
                          : (counts.rows.find((r) => r.kind === k)?.count ?? 0)}
                      </strong>
                    </div>
                  ))}
                </div>
                <h2 style={{ marginTop: 40 }}>Launch checklist</h2>
                <p>
                  Approve property photography, room details, restaurant menu,
                  privacy and booking policies, opening hours and fulfilment
                  arrangements before enabling the corresponding features.
                </p>
              </>
            );
          })()
        ) : ["orders", "reservations", "hotel", "events"].includes(key) ? (
          await (async () => {
            const table = key === "orders" ? "orders" : "requests";
            const kind = {
              reservations: "reservation",
              hotel: "hotel",
              events: "event",
            }[key];
            const rows = (
              await db().query(
                `SELECT * FROM ${table} WHERE ($1='' OR name ILIKE '%'||$1||'%' OR reference ILIKE '%'||$1||'%') AND ($2='' OR status=$2) ${kind ? "AND kind=$4" : ""} ORDER BY created_at DESC LIMIT 25 OFFSET $3`,
                kind
                  ? [q, status, (page - 1) * 25, kind]
                  : [q, status, (page - 1) * 25],
              )
            ).rows;
            return (
              <>
                <form className="menu-tools">
                  <input
                    name="q"
                    aria-label="Search records"
                    placeholder="Search name or reference"
                    defaultValue={q}
                  />
                  <input
                    name="status"
                    aria-label="Filter status"
                    placeholder="Status (e.g. pending)"
                    defaultValue={status}
                  />
                  <button className="button">Filter</button>
                </form>
                <p>
                  Private customer information. Changes do not send a
                  notification. Contact the customer before or after updating
                  their request.
                </p>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference / received</th>
                      <th>Guest</th>
                      <th>Details</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.reference}
                          <br />
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Africa/Kigali",
                          }).format(new Date(r.created_at))}
                        </td>
                        <td>
                          {r.name}
                          <br />
                          <a href={"tel:" + r.phone}>{r.phone}</a>
                          <br />
                          {r.email}
                        </td>
                        <td>
                          <pre
                            style={{ whiteSpace: "pre-wrap", maxWidth: 330 }}
                          >
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                          {key === "orders" && (
                            <>
                              <strong>{r.total} RWF</strong>
                              <OrderItems id={r.id} />
                            </>
                          )}
                        </td>
                        <td>
                          <StatusControl
                            id={r.id}
                            status={r.status}
                            table={table}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && <p>No records found.</p>}
                <div className="admin-tabs">
                  {page > 1 && (
                    <Link href={`?${query}&page=${page - 1}`}>← Previous</Link>
                  )}
                  <span>Page {page}</span>
                  {rows.length === 25 && (
                    <Link href={`?${query}&page=${page + 1}`}>Next →</Link>
                  )}
                </div>
              </>
            );
          })()
        ) : key === "settings" ? (
          <SettingsEditor settings={await settings()} />
        ) : key === "users" ? (
          <UserEditor
            users={
              (
                await db().query(
                  "SELECT u.id,u.email,u.active,r.role,r.permissions FROM users u JOIN user_roles r ON r.user_id=u.id ORDER BY u.email",
                )
              ).rows
            }
          />
        ) : key === "audit" ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Record</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(
                await db().query(
                  "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100",
                )
              ).rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.actor}</td>
                  <td>{r.action}</td>
                  <td>{r.record_id}</td>
                  <td>{new Date(r.created_at).toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            <p>
              Draft content is never shown publicly. Review each language
              independently. Use the English, French or Swahili language field
              to edit translations.
            </p>
            <ImageUpload />
            <ContentEditor
              records={
                (
                  await db().query(
                    "SELECT * FROM content ORDER BY kind,locale,title",
                  )
                ).rows
              }
            />
          </>
        )}
      </main>
    </div>
  );
}
async function OrderItems({ id }: { id: string }) {
  const rows = (
    await db().query("SELECT * FROM order_items WHERE order_id=$1", [id])
  ).rows;
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.id}>
          {r.name} × {r.quantity} · {r.unit_price} RWF
        </li>
      ))}
    </ul>
  );
}
