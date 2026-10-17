import { indexNowKey } from "@/lib/seo/indexnow";

/** Berkas kunci IndexNow (isinya = kunci itu sendiri). 404 kalau INDEXNOW_KEY tidak diisi. */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
