import { describe, expect, it } from "vitest";
import { openingHoursSpecification, parseOfficeHours } from "./hours";

describe("jam layanan → OpeningHoursSpecification", () => {
  it("membaca berbagai format jam", () => {
    expect(parseOfficeHours("Setiap Hari: 08.00 - 23.00 WITA")).toEqual({ opens: "08:00", closes: "23:00" });
    expect(parseOfficeHours("10.00–23.00 WITA")).toEqual({ opens: "10:00", closes: "23:00" });
    expect(parseOfficeHours("9:30-21:00")).toEqual({ opens: "09:30", closes: "21:00" });
    expect(parseOfficeHours("24 jam")).toBeNull();
    expect(parseOfficeHours("")).toBeNull();
    expect(parseOfficeHours("25.00-26.00")).toBeNull();
  });

  it("satu spesifikasi untuk semua hari", () => {
    const spec = openingHoursSpecification("08.00–23.00 WITA");
    expect(spec).toHaveLength(1);
    expect(spec[0]).toMatchObject({ "@type": "OpeningHoursSpecification", opens: "08:00", closes: "23:00" });
    expect(spec[0].dayOfWeek).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(openingHoursSpecification(null)).toEqual([]);
  });
});
