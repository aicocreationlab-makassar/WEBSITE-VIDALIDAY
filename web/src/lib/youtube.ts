// Parser URL YouTube (pola situs lama: youtu.be/ID, ?v=ID, /embed/ID, /shorts/ID).

const PATTERNS = [
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /[?&]v=([A-Za-z0-9_-]{11})/,
  /\/embed\/([A-Za-z0-9_-]{11})/,
  /\/shorts\/([A-Za-z0-9_-]{11})/,
  /\/live\/([A-Za-z0-9_-]{11})/,
];

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!/youtu\.?be/i.test(value)) return null;
  for (const pattern of PATTERNS) {
    const match = pattern.exec(value);
    if (match) return match[1];
  }
  return null;
}

export function youtubeEmbedUrl(id: string, autoplay = true): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
