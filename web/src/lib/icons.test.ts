import { describe, expect, it } from "vitest";
import {
  ICONS,
  ICON_CHOICES,
  LANDMARK_ICON_CHOICES,
  resolveAmenityIcon,
  resolveFacilityIcon,
  resolveIconName,
  resolveLandmarkIcon,
} from "./icons";

describe("icon registry", () => {
  it("maps every name to an existing lucide-react export", () => {
    for (const [name, component] of Object.entries(ICONS)) {
      expect(component, name).toBeTruthy();
      expect(["function", "object"]).toContain(typeof component);
    }
  });

  it("only offers registered icons to admins", () => {
    for (const choice of [...ICON_CHOICES, ...LANDMARK_ICON_CHOICES]) {
      expect(ICONS[choice.name], choice.name).toBeTruthy();
    }
  });

  it("resolves legacy names through aliases", () => {
    expect(resolveIconName("swimming-pool")).toBe("waves");
    expect(resolveIconName("gym")).toBe("dumbbell");
    expect(resolveIconName("running")).toBe("footprints");
    expect(resolveIconName("home")).toBe("house");
    expect(resolveIconName("chat")).toBe("message-circle");
    expect(resolveIconName("shield")).toBe("shield-check");
    expect(resolveIconName("Sun")).toBe("sun");
    expect(resolveIconName("chair")).toBe("armchair");
    expect(resolveIconName("closet")).toBe("wardrobe");
    expect(resolveIconName("hanger")).toBe("hanger");
    expect(resolveIconName("tidak-ada")).toBe("check");
    expect(resolveIconName(null, "map-pin")).toBe("map-pin");
  });
});

describe("guessing icons from names", () => {
  it.each([
    ["AC Dingin Daikin", "air-vent"],
    ["Free High-Speed WiFi", "wifi"],
    ['Smart TV 43" Netflix', "clapperboard"],
    ["Smart TV 50 Inch", "tv"],
    ["Water Heater Ariston", "shower-head"],
    ["Kitchen Set + Kompor Listrik", "cooking-pot"],
    ["Kulkas 2 Pintu", "refrigerator"],
    ["Mesin Cuci", "washing-machine"],
    ["Dispenser Air", "glass-water"],
    ["Teko Listrik", "coffee"],
    ["Meja Kerja & Belajar", "laptop"],
    ["Sofa Bed Santai", "sofa"],
    ["Balkon View Laut", "fence"],
    ["Handuk & Amenities Bersih", "bath"],
    ["Queen Bed Premium", "bed-double"],
    ["Kapasitas 4-5 Orang", "users"],
    ["Kursi Santai", "armchair"],
    ["Lemari Pakaian", "wardrobe"],
    ["Lemari Es 2 Pintu", "refrigerator"],
    ["Gantungan Baju", "hanger"],
    ["Setrika + Meja Setrika", "shirt"],
    ["Iron Board", "shirt"],
  ])("amenity %s → %s", (name, icon) => {
    expect(resolveAmenityIcon(name, "check")).toBe(icon);
  });

  it("keeps a stored amenity icon that is not check", () => {
    expect(resolveAmenityIcon("Apa saja", "wifi")).toBe("wifi");
    expect(resolveAmenityIcon("Sesuatu yang aneh", "check")).toBe("check");
  });

  it.each([
    ["Bandara Sultan Hasanuddin", "plane"],
    ["Mall Panakkukang", "shopping-bag"],
    ["Pisang Epe Losari", "utensils-crossed"],
    ["RS Siloam Makassar", "hospital"],
    ["Universitas Hasanuddin", "graduation-cap"],
    ["Masjid 99 Kubah", "landmark"],
    ["Pantai Losari", "tree-palm"],
    ["Akses Tol Reformasi", "route"],
    // Nama landmark dari data asli (impor 16 Okt 2026)
    ["Pantai Losari & Kuliner Pisang Epe", "tree-palm"],
    ["A.P Pettarrani Toll Road Southern End", "route"],
    ["UC Makassar | Ciputra School of Business, CitraLand City CPI", "graduation-cap"],
    ["RSUP Kemenkes Makassar", "hospital"],
    ["Onyx Club Makassar", "music"],
    ["Elite Bar Makassar", "music"],
    ["Pallubasa Serigala", "utensils-crossed"],
    ["Mie Titi Boulevard", "utensils-crossed"],
    ["Trans Studio Mall Makassar", "shopping-bag"],
    ["Tempat lain", "map-pin"],
  ])("landmark %s → %s", (name, icon) => {
    expect(resolveLandmarkIcon(name, null)).toBe(icon);
  });

  it("guesses building facility icons", () => {
    expect(resolveFacilityIcon("Infinity Ocean Pool", null)).toBe("waves");
    expect(resolveFacilityIcon("Fitness Center", null)).toBe("dumbbell");
    expect(resolveFacilityIcon("Kolam Renang", "swimming-pool")).toBe("waves");
    expect(resolveFacilityIcon("Fasilitas misterius", null)).toBe("sparkles");
    expect(resolveFacilityIcon("Kolam Renang Anak", null)).toBe("waves");
    expect(resolveFacilityIcon("Kids Area & Relax", null)).toBe("baby");
    expect(resolveFacilityIcon("Lobby Ashton", null)).toBe("door-open");
    expect(resolveFacilityIcon("Working Space & Relax Area", null)).toBe("laptop");
  });
});
