import {
  createHmac,
  timingSafeEqual,
  scryptSync,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [salt, value] = hash.split(":");
    const a = Buffer.from(value, "hex"),
      b = scryptSync(password, salt, 64);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
function sign(value: string) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error("Session secret missing");
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");
}
export function token(userId = "bootstrap", role = "administrator") {
  const value = JSON.stringify({
    role,
    userId,
    expires: Date.now() + 8 * 3600000,
  });
  return Buffer.from(value).toString("base64url") + "." + sign(value);
}
export async function authorized(scope?: string) {
  try {
    const raw = (await cookies()).get("gb_session")?.value;
    if (!raw) return false;
    const [encoded, sig] = raw.split(".");
    const value = Buffer.from(encoded, "base64url").toString();
    const expected = sign(value);
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return false;
    const session = JSON.parse(value);
    if (session.expires <= Date.now()) return false;
    if (session.userId === "bootstrap") return session.role === "administrator";
    const r = await db().query(
      "SELECT r.role,r.permissions FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND u.active=true",
      [session.userId],
    );
    const user = r.rows[0];
    return (
      !!user &&
      (user.role === "administrator" ||
        (!!scope && user.permissions.includes(scope)))
    );
  } catch {
    return false;
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      origin === new URL(request.url).origin ||
      (parsed.host === request.headers.get("host") &&
        ["http:", "https:"].includes(parsed.protocol))
    );
  } catch {
    return false;
  }
}

export async function actor() {
  try {
    const raw = (await cookies()).get("gb_session")?.value;
    if (!raw) return "unknown";
    const value = JSON.parse(
      Buffer.from(raw.split(".")[0], "base64url").toString(),
    );
    return value.userId === "bootstrap"
      ? (process.env.ADMIN_EMAIL ?? "bootstrap")
      : value.userId;
  } catch {
    return "unknown";
  }
}
