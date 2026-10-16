// Pesan bawaan zod (mis. "tipe salah") dalam Bahasa Indonesia, di klien dan server.
// Pesan khusus yang ditulis di skema tetap dipakai; ini hanya untuk kasus yang tidak diberi pesan.

import { z } from "zod";

z.config(z.locales.id());
