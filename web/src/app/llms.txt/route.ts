import { getLlmsTxt } from "@/lib/data/llms";

/** llms.txt (llmstxt.org): ringkasan situs untuk asisten AI. Diprerender; 'use cache' ada di helper. */
export async function GET() {
  return new Response(await getLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, must-revalidate" },
  });
}
