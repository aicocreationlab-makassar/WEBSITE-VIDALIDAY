import { getChatKnowledge } from "@/lib/data/chat";

/**
 * Data bot chat (PRD 6.11). Tanpa membaca request, jadi diprerender dan diperbarui lewat tag cache yang
 * sama dengan halaman. max-age=60 hanya untuk cache browser (paling lama 60 detik basi di dalam chat
 * setelah admin menyimpan). Bukan untuk diindeks (robots.txt juga melarang /chat-data).
 */
export async function GET() {
  const knowledge = await getChatKnowledge();
  return Response.json(knowledge, {
    headers: {
      "Cache-Control": "public, max-age=60, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
