// Pesan bawaan zod (mis. "tipe salah") dalam Bahasa Indonesia, di klien dan server.
// Pesan khusus yang ditulis di skema tetap dipakai; ini hanya untuk kasus yang tidak diberi pesan.
// Locale diimpor langsung: `z.locales.id()` ikut membundel semua locale zod (±300 KB) ke klien.

import { z } from "zod";
import id from "zod/v4/locales/id.js";

z.config(id());
