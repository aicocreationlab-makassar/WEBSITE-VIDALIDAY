import path from "node:path";
import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

// Host Supabase diambil dari env. Kalau env belum diisi (mis. sebelum .env.local dibuat),
// pola Storage dilewati supaya build tetap jalan; gambar Storage baru tampil setelah env ada.
function supabaseStoragePattern(): RemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname } = new URL(raw);
    return [
      {
        protocol: protocol === "http:" ? "http" : "https",
        hostname,
        pathname: "/storage/v1/object/public/media/**",
      },
    ];
  } catch {
    return [];
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // 75 = bawaan; 50 hanya untuk foto hero (tertutup overlay gelap) supaya LCP mobile lebih ringan.
    qualities: [50, 75],
    remotePatterns: [
      ...supabaseStoragePattern(),
      // Data lama masih menyimpan URL Unsplash; dianggap "tanpa foto" oleh lib/media.ts.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vidaliday.com" }],
        destination: "https://vidaliday.com/:path*",
        permanent: true,
      },
      { source: "/preview-client", destination: "/", permanent: true },
      { source: "/login", destination: "/admin/login", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
