import { PagePlaceholder } from "@/components/public/layout/page-placeholder";
import { getSiteChrome } from "@/lib/data/chrome";

// Beranda memakai judul bawaan dari root layout (setting seo_title), tanpa override.

export default async function HomePage() {
  const { settings } = await getSiteChrome();
  return <PagePlaceholder title={settings.heroTitle} text={settings.heroSubtitle} />;
}
