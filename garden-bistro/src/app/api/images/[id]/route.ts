import { db } from "@/lib/db";
import { authorized } from "@/lib/auth";
import { z } from "zod";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  try {
    const admin = await authorized();
    const r = await db().query(
      `SELECT mime_type,bytes FROM images WHERE id=$1 AND ($2 OR EXISTS(SELECT 1 FROM content WHERE published=true AND data->>'imageId'=$3))`,
      [id, admin, id],
    );
    if (!r.rowCount) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(r.rows[0].bytes), {
      headers: {
        "Content-Type": r.rows[0].mime_type,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
