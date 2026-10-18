import { getLlmsFullTxt } from "@/lib/data/llms";

/** llms-full.txt: ringkasan situs + daftar semua unit published. */
export async function GET() {
  return new Response(await getLlmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, must-revalidate" },
  });
}
