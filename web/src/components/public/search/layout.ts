// Kelas tata letak /sewa yang dipakai hasil asli dan skeleton, supaya tidak ada lompatan saat data tiba.
// md: sidebar 240px + 2 kolom; lg: sidebar 280px + 2 kolom; xl: 3 kolom. Tiga kolom baru di xl karena
// di lebar 1024px kartu hanya ±200px dan harga 7 digit "/malam" terpotong.

/** Dua kolom md+: sidebar filter + hasil. Mobile: satu kolom (filter lewat bar menempel). */
export const SEWA_COLUMNS =
  "md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8";

/** Grid kartu hasil (dan saran "Unit terdekat"). */
export const RESULTS_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3";

/** Bar Filter/Urutkan menempel tepat di bawah header mobile (60px). */
export const MOBILE_BAR =
  "sticky top-[60px] z-30 -mx-4 mt-3 border-b border-line bg-white/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 md:hidden";

/** Sidebar menempel di bawah header desktop (72px) + 16px. */
export const SIDEBAR_PANEL =
  "sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto overscroll-contain rounded-card bg-white p-4 ring-1 ring-line lg:p-5";
