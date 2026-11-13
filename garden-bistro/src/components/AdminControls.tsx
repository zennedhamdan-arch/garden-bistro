"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Content } from "@/lib/db";
export function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      location.href = (await r.json()).destination;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="login">
      <span className="eyebrow">GARDEN BISTRO · ADMINISTRATION</span>
      <h1>Welcome back.</h1>
      <p>Authorized staff only. Customer information is private.</p>
      <label>
        Email
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
export function StatusControl({
  id,
  table,
  status,
}: {
  id: string;
  table: "orders" | "requests";
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options =
    table === "orders"
      ? [
          "pending",
          "accepted",
          "preparing",
          "ready_for_pickup",
          "out_for_delivery",
          "completed",
          "cancelled",
        ]
      : ["pending", "confirmed", "declined", "alternative_proposed"];
  return (
    <>
      <select
        aria-label="Status"
        disabled={busy}
        value={status}
        onChange={async (e) => {
          if (
            !confirm(
              "Update status? Contact the customer separately to communicate this change.",
            )
          )
            return;
          setBusy(true);
          try {
            const r = await fetch("/api/admin/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, table, status: e.target.value }),
            });
            if (!r.ok) throw new Error();
            router.refresh();
          } catch {
            setError("Update failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function ContentEditor({ records }: { records: Content[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Content | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      const body = {
        id: selected?.id,
        kind: f.kind,
        slug: f.slug,
        locale: f.locale,
        title: f.title,
        description: f.description,
        price: f.price === "" ? null : Number(f.price),
        published: f.published === "on",
        sort_order: Number(f.sort_order),
        data: JSON.parse(String(f.data)),
      };
      if (
        body.published &&
        !confirm(
          "Publish this approved translation? Verify every fact, price and label first.",
        )
      )
        return;
      const r = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setMessage("Saved.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-editor">
      <label>
        Edit existing content
        <select
          value={selected?.id ?? ""}
          onChange={(e) => {
            setSelected(records.find((r) => r.id === e.target.value) ?? null);
            setVersion(version + 1);
            setMessage("");
          }}
        >
          <option value="">Create new draft</option>
          {records.map((r) => (
            <option value={r.id} key={r.id}>
              {r.locale.toUpperCase()} · {r.kind} · {r.title}{" "}
              {r.published ? "(published)" : "(draft)"}
            </option>
          ))}
        </select>
      </label>
      <form onSubmit={save} key={version}>
        <div className="form-grid">
          <label>
            Content type
            <select name="kind" defaultValue={selected?.kind ?? "page"}>
              {[
                "page",
                "room",
                "menu",
                "category",
                "faq",
                "gallery",
                "event",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Language
            <select name="locale" defaultValue={selected?.locale ?? "en"}>
              {["en", "fr", "sw"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              defaultValue={selected?.slug}
            />
          </label>
          <label>
            Title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={selected?.title}
            />
          </label>
          <label>
            Price (RWF; leave blank if unconfirmed)
            <input
              name="price"
              type="number"
              min="0"
              step="1"
              defaultValue={selected?.price ?? ""}
            />
          </label>
          <label>
            Sort order
            <input name="sort_order" type="number" defaultValue="0" />
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            maxLength={6000}
            defaultValue={selected?.description}
          />
        </label>
        <label>
          Additional content (JSON)
          <textarea
            name="data"
            defaultValue={JSON.stringify(selected?.data ?? {}, null, 2)}
            spellCheck={false}
          />
        </label>
        <p>
          Pages: {`{"body":"Approved text"}`}. Menu:{" "}
          {`{"category":"Category name","soldOut":false,"labels":[]}`}. Only use
          confirmed labels. Each translation is independently published. For
          approved photographs, upload below and add imageId and translated alt
          text to this JSON.
        </p>
        <label>
          <span>
            <input
              style={{ width: "auto" }}
              name="published"
              type="checkbox"
              defaultChecked={selected?.published}
            />{" "}
            Approved for publication
          </span>
        </label>
        <button className="button" disabled={busy}>
          Save content
        </button>
        {selected && (
          <button
            type="button"
            className="button"
            style={{ marginLeft: 12, background: "#7c3830" }}
            onClick={async () => {
              if (!confirm("Permanently delete this content?")) return;
              const r = await fetch("/api/admin/content", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected.id }),
              });
              setMessage(r.ok ? "Deleted." : "Delete failed.");
              if (r.ok) {
                setSelected(null);
                setVersion(version + 1);
                router.refresh();
              }
            }}
          >
            Delete
          </button>
        )}
        <p role="status">{message}</p>
      </form>
    </div>
  );
}
export function SettingsEditor({
  settings,
}: {
  settings: Record<string, unknown>;
}) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="admin-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(
            String(new FormData(e.currentTarget).get("data")),
          );
          const r = await fetch("/api/admin/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "settings", data }),
          });
          setMessage(
            r.ok ? "Settings saved." : "Save failed. Check the configuration.",
          );
        } catch {
          setMessage("Invalid JSON");
        }
      }}
    >
      <p>
        Ordering must remain disabled until fulfilment, fees and payment
        arrangements are approved. Payment instructions are required separately
        in each enabled language. No card payments are collected.
      </p>
      <label>
        Business settings (JSON)
        <textarea
          name="data"
          rows={22}
          spellCheck={false}
          defaultValue={JSON.stringify(
            {
              orderingEnabled: false,
              pickupEnabled: false,
              deliveryEnabled: false,
              whatsappEnabled: true,
              minimumOrder: 0,
              paymentInstructions: { en: "", fr: "", sw: "" },
              deliveryZones: [],
              ...settings,
            },
            null,
            2,
          )}
        />
      </label>
      <button className="button">Save settings</button>
      <p role="status">{message}</p>
    </form>
  );
}

export function ImageUpload() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="request-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/admin/upload", {
            method: "POST",
            body: new FormData(e.currentTarget),
          });
          const data = await r.json();
          setMessage(
            r.ok
              ? "Uploaded. Add to content JSON: " +
                  JSON.stringify({
                    imageId: data.id,
                    alt: "Enter an accurate description in the selected language",
                  })
              : data.error,
          );
        } catch {
          setMessage("Upload failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Property photography</h2>
      <p>
        Only upload approved photographs you have permission to use. JPEG, PNG
        or WebP, maximum 5 MB. Metadata is removed and images are resized.
        Uploads remain private until linked to published content.
      </p>
      <label>
        Image
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Uploading…" : "Upload image"}
      </button>
      <p role="status" style={{ overflowWrap: "anywhere" }}>
        {message}
      </p>
    </form>
  );
}
export function UserEditor({
  users,
}: {
  users: {
    id: string;
    email: string;
    active: boolean;
    role: string;
    permissions: string[];
  }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof users)[number] | null>(null);
  const [message, setMessage] = useState("");
  return (
    <div className="admin-editor">
      <p>
        Administrators have full access. Staff may only access assigned orders
        and/or enquiries. Deactivate accounts to revoke access immediately.
      </p>
      <label>
        Account
        <select
          onChange={(e) =>
            setSelected(users.find((u) => u.id === e.target.value) ?? null)
          }
        >
          <option value="">Create account</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </label>
      <form
        key={selected?.id ?? "new"}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const body = {
            id: selected?.id,
            email: f.get("email"),
            password: f.get("password") || undefined,
            role: f.get("role"),
            active: f.has("active"),
            permissions: f.getAll("permission"),
          };
          const r = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          setMessage(
            r.ok
              ? "Account saved."
              : "Save failed. Use unique email and at least 14 password characters.",
          );
          router.refresh();
        }}
      >
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            defaultValue={selected?.email}
          />
        </label>
        <label>
          New password (blank to keep existing)
          <input
            type="password"
            name="password"
            minLength={14}
            required={!selected}
            autoComplete="new-password"
          />
        </label>
        <label>
          Role
          <select name="role" defaultValue={selected?.role ?? "staff"}>
            <option value="staff">Staff</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
        {["orders", "requests"].map((p) => (
          <label key={p}>
            <span>
              <input
                style={{ width: "auto" }}
                name="permission"
                type="checkbox"
                value={p}
                defaultChecked={selected?.permissions.includes(p)}
              />{" "}
              {p}
            </span>
          </label>
        ))}
        <label>
          <span>
            <input
              style={{ width: "auto" }}
              name="active"
              type="checkbox"
              defaultChecked={selected?.active ?? true}
            />{" "}
            Active
          </span>
        </label>
        <button className="button">Save account</button>
        <p role="status">{message}</p>
      </form>
    </div>
  );
}
