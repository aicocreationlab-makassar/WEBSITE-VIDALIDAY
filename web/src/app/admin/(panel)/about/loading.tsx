import { SettingsFormSkeleton } from "@/components/admin/settings/settings-skeleton";

/** Kerangka halaman About selama data dimuat. */
export default function AboutLoading() {
  return <SettingsFormSkeleton label="Memuat halaman About" chips={4} cards={[2, 3, 6]} search={false} />;
}
