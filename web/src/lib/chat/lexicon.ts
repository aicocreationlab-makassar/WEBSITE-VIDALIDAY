// Kamus lokal bot chat (PRD 6.11): singkatan/slang chat Indonesia, frasa yang dibakukan jadi satu
// token, kata tak bermakna, alias apartemen dan tipe, serta kata pemicu tiap maksud (intent).
// Semua murni data supaya mudah diperluas tanpa menyentuh mesin.

import type { RoomCategory } from "@/types/domain";

/** Token → token baku. Diterapkan per kata setelah teks dinormalkan. */
export const SLANG: Record<string, string> = {
  brp: "berapa",
  brapa: "berapa",
  brpa: "berapa",
  berapaan: "berapa",
  hrg: "harga",
  hrga: "harga",
  harganya: "harga",
  hargany: "harga",
  kmr: "kamar",
  tdk: "tidak",
  gak: "tidak",
  ga: "tidak",
  gk: "tidak",
  nggak: "tidak",
  ngga: "tidak",
  engga: "tidak",
  enggak: "tidak",
  bs: "bisa",
  bsa: "bisa",
  dmn: "dimana",
  dmna: "dimana",
  dimn: "dimana",
  utk: "untuk",
  buat: "untuk",
  bwt: "untuk",
  dgn: "dengan",
  org: "orang",
  orng: "orang",
  mlm: "malam",
  mlam: "malam",
  bln: "bulan",
  mgg: "minggu",
  mggu: "minggu",
  hr: "hari",
  sy: "saya",
  aq: "saya",
  aku: "saya",
  gw: "saya",
  gue: "saya",
  gua: "saya",
  yg: "yang",
  ad: "ada",
  avail: "tersedia",
  available: "tersedia",
  availability: "tersedia",
  kosong: "tersedia",
  tgl: "tanggal",
  jm: "jam",
  cekin: "checkin",
  chekin: "checkin",
  checkin: "checkin",
  cekout: "checkout",
  checkout: "checkout",
  apart: "apartemen",
  apt: "apartemen",
  apartement: "apartemen",
  apartment: "apartemen",
  apartmen: "apartemen",
  apartemennya: "apartemen",
  wa: "whatsapp",
  thx: "terimakasih",
  thanks: "terimakasih",
  mksh: "terimakasih",
  makasih: "terimakasih",
  makasi: "terimakasih",
  trims: "terimakasih",
  terima: "terimakasih",
  gmn: "bagaimana",
  gimana: "bagaimana",
  gmana: "bagaimana",
  bgt: "banget",
  dr: "dari",
  sm: "sama",
  ok: "oke",
  okey: "oke",
  okay: "oke",
  sip: "oke",
  pax: "orang",
  ppl: "orang",
  people: "orang",
  person: "orang",
  persons: "orang",
  deket: "dekat",
  dket: "dekat",
  dkt: "dekat",
  msh: "masih",
  msih: "masih",
  lg: "lagi",
  klo: "kalau",
  kalo: "kalau",
  kl: "kalau",
  hrs: "harus",
  blh: "boleh",
  bole: "boleh",
  tlg: "tolong",
  tlng: "tolong",
  min: "admin",
  kak: "kak",
  jd: "jadi",
  dl: "dulu",
  dlu: "dulu",
  sdh: "sudah",
  udh: "sudah",
  udah: "sudah",
  blm: "belum",
  blum: "belum",
  bgmn: "bagaimana",
  brgkt: "berangkat",
  tmpt: "tempat",
  dkat: "dekat",
  sktr: "sekitar",
  skitar: "sekitar",
  knp: "kenapa",
  trs: "terus",
  lbh: "lebih",
  plg: "paling",
  trmurah: "termurah",
  mrh: "murah",
  mhl: "mahal",
  jln: "jalan",
  dpt: "dapat",
  pny: "punya",
  punya: "punya",
  bnyk: "banyak",
  byk: "banyak",
  smua: "semua",
  smw: "semua",
  tp: "tapi",
  tpi: "tapi",
  krn: "karena",
  hello: "halo",
  hallo: "halo",
  hai: "halo",
  hay: "halo",
  hi: "halo",
  helo: "halo",
  pagi: "halo",
  siang: "halo",
  sore: "halo",
  assalamualaikum: "halo",
  permisi: "halo",
  wifinya: "wifi",
  wifii: "wifi",
  acnya: "ac",
  tv: "tv",
  tvnya: "tv",
  dapurnya: "dapur",
  kolamnya: "kolam",
  gymnya: "gym",
  parkirnya: "parkir",
  unitnya: "unit",
  kamarnya: "kamar",
  tipenya: "tipe",
  lokasinya: "lokasi",
  alamatnya: "alamat",
  promonya: "promo",
  diskonnya: "diskon",
  nomornya: "nomor",
  nomer: "nomor",
  no: "nomor",
  telp: "telepon",
  tlp: "telepon",
  hp: "telepon",
  bisakah: "bisa",
  adakah: "ada",
  masihkah: "masih",
  bolehkah: "boleh",
  berapakah: "berapa",
  dimanakah: "dimana",
};

/** Frasa multi-kata → token tunggal, dijalankan sebelum pemetaan slang. */
export const PHRASES: [RegExp, string][] = [
  [/\b(1|satu|one)\s*-?\s*(br|bedroom|bed\s*room|kamar(\s*tidur)?|kmr|bed|kt)\b/g, " 1br "],
  [/\b(2|dua|two)\s*-?\s*(br|bedroom|bed\s*room|kamar(\s*tidur)?|kmr|bed|kt)\b/g, " 2br "],
  [/\b(3|tiga|three)\s*-?\s*(br|bedroom|bed\s*room|kamar(\s*tidur)?|kmr|bed|kt)\b/g, " 3br "],
  [/\bc(h)?e(c|k)?k\s*-?\s*in\b/g, " checkin "],
  [/\bc(h)?e(c|k)?k\s*-?\s*out\b/g, " checkout "],
  [/\bper\s*malam\b|\/\s*malam|\bpermalam\b/g, " permalam "],
  [/\bper\s*bulan\b|\/\s*bulan|\bperbulan\b|\bbulanan\b/g, " bulanan "],
  [/\bper\s*minggu\b|\/\s*minggu|\bperminggu\b|\bmingguan\b/g, " mingguan "],
  [/\bvida\s*-?\s*view\b|\bvida\s*vew\b|\bvidaviu\b/g, " vidaview "],
  [/\bcenter\s*point\b|\bcentre\s*point\b|\bcenterpoint\b|\bcpi\b/g, " delftcpi "],
  [/\bgoogle\s*maps?\b|\bgmaps?\b|\bmaps?\b/g, " peta "],
  [/\bjam\s*berapa\b|\bjam\s*brp\b/g, " jamberapa "],
  [/\bstudio\s*plus\b/g, " studioplus "],
  [/\bstudio\s*corner\b/g, " studiocorner "],
  [/\b2br\s*corner\b/g, " 2brcorner "],
  [/\bmasih\s*ada\b|\bmsh\s*ada\b|\bmasi\s*ada\b/g, " masihada "],
  [/\bapa\s*(aja|saja)\b/g, " apasaja "],
  [/\bcara\s*(pesan|booking|book|sewa|order|pesannya|bookingnya)\b/g, " carapesan "],
  [/\bjam\s*(layanan|operasional|buka|kerja)\b/g, " jamlayanan "],
  [/\bdi\s*bawah\b/g, " dibawah "],
  [/\bdi\s*atas\b/g, " diatas "],
  [/\bkurang\s*dari\b/g, " dibawah "],
  [/\blebih\s*dari\b/g, " diatas "],
  [/\bmulai\s*ulang\b|\bdari\s*awal\b/g, " reset "],
  [/\bwater\s*heater\b|\bair\s*panas\b/g, " waterheater "],
  [/\bmesin\s*cuci\b/g, " mesincuci "],
  [/\bsmart\s*tv\b/g, " tv "],
  [/\bkitchen\s*set\b/g, " dapur "],
  [/\bhewan\s*(peliharaan)?\b/g, " hewan "],
  [/\bberapa\s*jauh\b|\bberapa\s*menit\b|\bberapa\s*lama\b/g, " berapajauh "],
  [/\bbisa\s*bantu\b|\bbisa\s*apa\b/g, " bisaapa "],
  [/\bjangka\s*panjang\b|\blong\s*stay\b/g, " bulanan "],
  [/\buang\s*muka\b/g, " dp "],
];

/** Kata yang dibuang saat mencocokkan FAQ dan nama (tetap ada untuk pemicu intent). */
export const STOPWORDS = new Set([
  "yang", "di", "ke", "dari", "untuk", "nya", "dong", "ya", "sih", "kah", "deh", "mau", "ingin", "saya", "kak",
  "admin", "itu", "ini", "apa", "apakah", "dan", "atau", "juga", "aja", "saja", "ada", "gitu", "gini", "nih", "tuh",
  "kalau", "bisa", "boleh", "tolong", "mohon", "info", "infonya", "tanya", "mau", "pengen", "pingin", "lagi", "dengan",
  "sama", "min", "halo", "oke", "the", "a", "an", "is", "are", "to", "in", "on", "for", "of", "with", "jadi", "apasaja",
  "bagaimana", "tidak", "sudah", "belum", "masih", "dong", "nih",
]);

/** Kata bilangan kecil (tamu, malam). */
export const NUMBER_WORDS: Record<string, number> = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seminggu: 7,
  sebulan: 30,
  semalam: 1,
  sehari: 1,
  berdua: 2,
  bertiga: 3,
  berempat: 4,
  berlima: 5,
  berenam: 6,
  sendiri: 1,
  sendirian: 1,
};

/** Alias apartemen per slug (digabung dengan alias otomatis dari nama di knowledge). */
export const APARTMENT_ALIASES: Record<string, string[]> = {
  "vida-view": ["vida", "vidaview", "vv", "vidavew", "vidaviu", "vidavieww", "panakkukang", "panakukang", "pettarani", "boulevard"],
  "delft-cpi": ["delft", "dlft", "delf", "delpt", "delft", "delftcpi", "cpi", "centerpoint", "losari", "tanjung", "bunga"],
};

/** Kata yang tidak boleh jadi alias otomatis apartemen (terlalu umum). */
export const GENERIC_NAME_WORDS = new Set(["apartemen", "apartment", "view", "tower", "residence", "city", "point", "of", "the", "by"]);

export const CATEGORY_ALIASES: Record<RoomCategory, string[]> = {
  studio: ["studio", "stud", "studi", "sudio", "stdio", "studioo", "studi0"],
  "1br": ["1br", "1bedroom", "satukamar", "onebedroom"],
  "2br": ["2br", "2bedroom", "duakamar", "twobedroom", "2brcorner"],
  "3br": ["3br", "3bedroom", "tigakamar", "threebedroom"],
  other: [],
};

export const CATEGORY_LABEL: Record<RoomCategory, string> = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
  "3br": "3 Bedroom",
  other: "Lainnya",
};

export type IntentName =
  | "greeting"
  | "thanks"
  | "help"
  | "reset"
  | "price"
  | "availability"
  | "type_list"
  | "unit_detail"
  | "capacity"
  | "monthly"
  | "weekly"
  | "stay_estimate"
  | "promo"
  | "amenities"
  | "facilities"
  | "landmarks"
  | "location"
  | "checkin"
  | "house_rules"
  | "contact"
  | "booking_how"
  | "faq"
  | "followup"
  | "fallback";

export type IntentCue = {
  /** Token pemicu → bobot (dicocokkan fuzzy). */
  tokens: Record<string, number>;
  /** Pola teks penuh → bobot. */
  phrases?: [RegExp, number][];
};

export const INTENT_CUES: Partial<Record<IntentName, IntentCue>> = {
  greeting: { tokens: { halo: 2, test: 2, tes: 2, p: 1, ping: 2, malam: 1 } },
  thanks: { tokens: { terimakasih: 3, oke: 1, mantap: 1, siap: 1, sip: 1, noted: 1 } },
  help: { tokens: { bantuan: 2, help: 2, menu: 2, bisaapa: 3, bantu: 1, fitur: 2 } },
  reset: { tokens: { reset: 3, ulang: 2, restart: 3 } },
  price: {
    tokens: {
      harga: 3, berapa: 2, tarif: 2, rate: 2, biaya: 2, cost: 2, price: 2, permalam: 2, budget: 2, murah: 2,
      termurah: 2, hemat: 1, cheap: 2, mahal: 1, termahal: 2, harganya: 3, pricelist: 3, bayar: 1, dibawah: 2,
      diatas: 2, sekitar: 1, maksimal: 1,
    },
  },
  availability: {
    tokens: {
      tersedia: 3, masihada: 3, booking: 1, pesan: 1, sewa: 1, book: 1, sewanya: 1, unit: 1, kamar: 1, ready: 3,
      tanggal: 2, nginap: 1, menginap: 1, inap: 1, stay: 1, cari: 1, rekomendasi: 2, rekomen: 2, saran: 2,
    },
    phrases: [[/\bada (unit|kamar|yang)\b/, 2], [/\bbisa (sewa|pesan|booking)\b/, 2], [/\bmau (sewa|pesan|booking|nginap|menginap)\b/, 2]],
  },
  type_list: { tokens: { tipe: 3, jenis: 2, apasaja: 2, pilihan: 2, macam: 2, type: 3, tipenya: 3 }, phrases: [[/\bunit apa\b/, 2]] },
  unit_detail: { tokens: {}, phrases: [[/\b(unit|yang) (ini|itu)\b/, 2], [/\bdetail\b/, 1], [/\bspek\b|\bspesifikasi\b/, 2]] },
  capacity: {
    tokens: { muat: 3, kapasitas: 3, maks: 1, maksimal: 1, max: 1, cukup: 1 },
    phrases: [[/\bberapa orang\b|\bbrp orang\b|\bmaks(imal)? (tamu|orang)\b|\bmax (tamu|orang)\b/, 3], [/\b(untuk|buat) (\d+|berdua|bertiga|berempat|berlima|berenam) orang\b/, 1]],
  },
  monthly: { tokens: { bulanan: 3, sebulan: 2, tinggal: 2, bulan: 1 } },
  weekly: { tokens: { mingguan: 3, seminggu: 2, minggu: 1 } },
  stay_estimate: { tokens: { total: 2, totalnya: 2, estimasi: 2 } },
  promo: { tokens: { promo: 3, diskon: 2, discount: 2, potongan: 2, hemat: 2, penawaran: 2, voucher: 2, cashback: 2 } },
  amenities: {
    tokens: {
      fasilitas: 1, wifi: 3, ac: 3, dapur: 3, kulkas: 3, tv: 3, netflix: 3, balkon: 3, mesincuci: 3, waterheater: 3,
      microwave: 3, dispenser: 3, kompor: 3, setrika: 3, kasur: 2, bed: 2, sofa: 3, handuk: 3, internet: 3, masak: 2,
      lengkap: 1, perlengkapan: 2, peralatan: 2, kelengkapan: 2, isi: 1, dalam: 1,
    },
    phrases: [[/\b(dalam|di) (unit|kamar)\b/, 1], [/\bfasilitas (unit|kamar)\b/, 3]],
  },
  facilities: {
    tokens: {
      kolam: 3, renang: 3, pool: 3, gym: 3, fitness: 3, parkir: 3, lift: 2, minimarket: 3, lobi: 2, lobby: 2,
      keamanan: 2, satpam: 2, cctv: 2, taman: 2, playground: 2, jogging: 3, rooftop: 3, laundry: 2, resepsionis: 2,
      gedung: 2, apartemen: 1,
    },
    phrases: [[/\bfasilitas (gedung|apartemen|umum|bersama)\b/, 3], [/\bfasilitas\b/, 1]],
  },
  landmarks: {
    tokens: { dekat: 2, jarak: 2, berapajauh: 3, sekitar: 2, mall: 2, bandara: 2, pantai: 2, kampus: 2, terdekat: 3, jauh: 1, menit: 1, akses: 1 },
    phrases: [[/\b(dari|ke) (bandara|mall|pantai|losari|kampus|stasiun|pelabuhan)\b/, 2], [/\bapa (aja|saja) (yang )?dekat\b/, 2]],
  },
  location: {
    tokens: { alamat: 3, lokasi: 2, dimana: 2, where: 2, peta: 2, arah: 2, daerah: 2, letak: 2, letaknya: 3, posisi: 2 },
    phrases: [[/\bjalan apa\b/, 2], [/\bdi (daerah|kawasan|area) mana\b/, 3]],
  },
  checkin: {
    tokens: {
      checkin: 3, checkout: 3, jamberapa: 2, early: 2, late: 2, syarat: 2, persyaratan: 2, ktp: 2, identitas: 2,
      deposit: 2, umur: 2, usia: 2, jaminan: 2, masuk: 1, keluar: 1, ketentuan: 1, dokumen: 2,
    },
    phrases: [[/\bjam (masuk|keluar)\b/, 2], [/\bbawa apa\b/, 2], [/\bperlu bawa\b/, 2]],
  },
  house_rules: {
    tokens: {
      aturan: 3, peraturan: 3, rules: 3, boleh: 2, merokok: 2, rokok: 2, vape: 2, hewan: 2, kucing: 2, anjing: 2,
      pet: 2, pesta: 2, party: 2, berisik: 2, larangan: 3, dilarang: 2, ngerokok: 2, bebas: 1, tamu: 1, bawa: 1,
    },
    phrases: [[/\btamu tambahan\b/, 2], [/\bboleh (bawa|ajak)\b/, 2]],
  },
  contact: {
    tokens: {
      kontak: 2, hubungi: 2, telepon: 2, nomor: 2, whatsapp: 2, email: 2, jamlayanan: 3, cs: 2, operator: 2,
      pemilik: 2, owner: 2, marketing: 2, chat: 1, admin: 1, nomornya: 3, kontaknya: 3,
    },
    phrases: [[/\b(mau |ingin )?(tanya|bicara|ngobrol|chat) (sama |dengan |ke )?(admin|orang|manusia|cs)\b/, 3], [/\bnomor (wa|whatsapp|telepon|hp)\b/, 3]],
  },
  booking_how: {
    tokens: { carapesan: 3, bayar: 2, pembayaran: 2, transfer: 2, dp: 2, cicil: 2, pelunasan: 2, invoice: 2, bukti: 1, caranya: 2, prosedur: 2, langkah: 2, booking: 1 },
    phrases: [[/\bbagaimana (cara |caranya )?(pesan|booking|sewa|bayar)\b/, 3], [/\bbayar (dimana|kemana|gimana|bagaimana)\b/, 3]],
  },
};

/** Urutan pemenang saat skor seri (yang lebih spesifik dulu). */
export const INTENT_PRIORITY: IntentName[] = [
  "reset",
  "unit_detail",
  "stay_estimate",
  "monthly",
  "weekly",
  "promo",
  "capacity",
  "checkin",
  "house_rules",
  "booking_how",
  "contact",
  "location",
  "landmarks",
  "amenities",
  "facilities",
  "type_list",
  "price",
  "availability",
  "faq",
  "help",
  "thanks",
  "greeting",
];

/** Intent yang tidak mengubah slot pencarian (kecuali apartemen yang disebut). */
export const NON_SEARCH_INTENTS = new Set<IntentName>([
  "greeting", "thanks", "help", "checkin", "house_rules", "contact", "booking_how", "faq", "location", "landmarks", "facilities",
]);
