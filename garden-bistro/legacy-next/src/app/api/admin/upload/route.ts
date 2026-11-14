import { actor } from "@/lib/auth";
import { authorized, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import sharp from "sharp";
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await authorized()))
    return new Response(null, { status: 403 });
  if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
    return Response.json({ error: "Maximum upload 5 MB" }, { status: 413 });
  try {
    const f = (await req.formData()).get("image");
    if (
      !(f instanceof File) ||
      f.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(f.type)
    )
      return Response.json(
        { error: "Choose a JPEG, PNG or WebP under 5 MB" },
        { status: 400 },
      );
    const raw = Buffer.from(await f.arrayBuffer());
    const bytes = await sharp(raw, { limitInputPixels: 25000000 })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        "INSERT INTO images(filename,mime_type,bytes) VALUES($1,$2,$3) RETURNING id",
        [f.name.slice(0, 200), "image/webp", bytes],
      );
      await c.query(
        "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
        [await actor(), "image.upload", r.rows[0].id],
      );
      await c.query("COMMIT");
      return Response.json({ id: r.rows[0].id });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  } catch {
    return Response.json(
      { error: "Upload failed. Invalid image or unavailable storage." },
      { status: 400 },
    );
  }
}
