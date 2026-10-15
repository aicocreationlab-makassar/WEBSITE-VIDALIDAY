import { describe, expect, it, vi } from "vitest";
import { deleteUnusedUnitPhotos, removedPaths } from "@/lib/storage-cleanup";

type Supabase = Parameters<typeof deleteUnusedUnitPhotos>[0];

/** Klien tiruan: hitungan referensi selalu `count`, `remove` dicatat. */
function fakeSupabase(count: number) {
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const query = {
    select: () => query,
    or: () => query,
    neq: () => query,
    then: (resolve: (value: { count: number; error: null }) => void) => resolve({ count, error: null }),
  };
  const client = {
    from: vi.fn(() => query),
    storage: { from: () => ({ remove }) },
  };
  return { client: client as unknown as Supabase, remove, from: client.from };
}

describe("removedPaths", () => {
  it("hanya path bucket yang hilang, dinormalkan", () => {
    expect(removedPaths(["units/a.webp", "/storage/units/b.webp", "https://x.test/c.jpg"], ["units/a.webp"])).toEqual([
      "units/b.webp",
    ]);
  });
});

describe("deleteUnusedUnitPhotos", () => {
  it("tidak menyentuh file di luar folder units/", async () => {
    const { client, remove, from } = fakeSupabase(0);
    const result = await deleteUnusedUnitPhotos(client, ["locations/hero.webp", "facilities/kolam.webp"]);
    expect(result).toEqual({ deleted: [], kept: [] });
    expect(from).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("menghapus foto unit yang tidak dipakai unit lain", async () => {
    const { client, remove } = fakeSupabase(0);
    const result = await deleteUnusedUnitPhotos(client, ["storage/units/a.webp", "locations/hero.webp"], 7);
    expect(result).toEqual({ deleted: ["units/a.webp"], kept: [] });
    expect(remove).toHaveBeenCalledWith(["units/a.webp"]);
  });

  it("menyimpan foto unit yang masih dipakai unit lain", async () => {
    const { client, remove } = fakeSupabase(1);
    const result = await deleteUnusedUnitPhotos(client, ["units/a.webp"], 7);
    expect(result).toEqual({ deleted: [], kept: ["units/a.webp"] });
    expect(remove).not.toHaveBeenCalled();
  });
});
