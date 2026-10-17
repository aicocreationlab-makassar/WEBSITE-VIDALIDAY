import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/data/settings";
import { formatWhatsappDisplay, toDisplayLegalName } from "@/lib/format";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

// DRAF: teks final kebijakan privasi perlu disetujui klien sebelum go-live (PRD 6.8, PROGRESS.md).

export const metadata: Metadata = {
  title: "Kebijakan privasi",
  description:
    "Data apa yang dikumpulkan VIDALIDAY saat kamu mengirim permintaan sewa, untuk apa, berapa lama disimpan, dan cara meminta penghapusannya.",
  alternates: { canonical: "/kebijakan-privasi" },
};

const UPDATED = "18 Oktober 2026";

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-24 text-h2 font-bold text-ink">
      {children}
    </h2>
  );
}

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const legalName = toDisplayLegalName(settings.companyLegalName);
  const wa = formatWhatsappDisplay(settings.whatsappNumber);

  return (
    <article className="mx-auto max-w-[760px] px-4 py-10 sm:px-6 md:py-16">
      <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-lg">Kebijakan privasi</h1>
      <p className="mt-2 text-lg text-ink-2">Bagaimana kami menjaga data kamu.</p>
      <p className="mt-1 text-sm text-muted">Terakhir diperbarui {UPDATED}</p>

      <div className="mt-6 space-y-4 text-base leading-[26px] text-ink-2 [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          VIDALIDAY dikelola oleh {legalName}. Halaman ini menjelaskan data yang kami kumpulkan saat kamu memakai situs
          vidaliday.com dan mengirim permintaan sewa, mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang
          Pelindungan Data Pribadi.
        </p>

        <Heading id="data">Data yang kami kumpulkan</Heading>
        <p>Saat kamu mengisi form sewa, kami menyimpan:</p>
        <ul>
          <li>nama lengkap, kota asal, dan nomor WhatsApp;</li>
          <li>rencana tanggal check-in dan check-out, serta jumlah tamu;</li>
          <li>keperluan menginap dan catatan, kalau kamu mengisinya;</li>
          <li>unit yang kamu minati dan halaman tempat form dikirim.</li>
        </ul>
        <p>Situs ini tidak meminta data pembayaran, nomor identitas, atau kata sandi dari tamu.</p>

        <Heading id="tujuan">Untuk apa data dipakai</Heading>
        <ul>
          <li>Memproses permintaan sewa dan menghubungi kamu lewat WhatsApp untuk konfirmasi ketersediaan dan harga.</li>
          <li>Mencatat riwayat permintaan supaya admin tidak menanyakan hal yang sama dua kali.</li>
          <li>
            Statistik kunjungan tanpa identitas (jumlah pencarian, halaman yang dibuka). Statistik ini tidak memuat nama
            atau nomor telepon.
          </li>
        </ul>
        <p>Dasar pemrosesannya adalah persetujuan yang kamu berikan saat mengirim form sewa.</p>

        <Heading id="penyimpanan">Lama penyimpanan</Heading>
        <p>
          Data permintaan sewa disimpan selama diperlukan untuk melayani sewa dan administrasi, dan dihapus kalau kamu
          memintanya. Data disimpan di layanan basis data berbasis cloud yang hanya bisa diakses admin VIDALIDAY.
        </p>

        <Heading id="perangkat">Data di perangkat kamu</Heading>
        <ul>
          <li>
            Kalau kamu mencentang &ldquo;Ingat data saya&rdquo;, nama, kota asal, dan nomor WhatsApp disimpan di browser perangkat
            ini supaya form berikutnya terisi otomatis.
          </li>
          <li>
            Daftar &ldquo;Terakhir kamu lihat&rdquo; disimpan di browser perangkat ini untuk rekomendasi unit dan tidak
            pernah dikirim ke server kami.
          </li>
          <li>
            Percakapan dengan chat bantuan &ldquo;Asisten VIDALIDAY&rdquo; dijawab langsung di browser dari data unit
            di situs ini. Riwayatnya disimpan sementara di perangkat ini (paling lama 24 jam atau sampai tab ditutup)
            dan tidak pernah dikirim ke server kami.
          </li>
        </ul>
        <p>
          Daftar &ldquo;Terakhir kamu lihat&rdquo; bisa dihapus kapan saja lewat tombol &ldquo;Hapus riwayat&rdquo;, dan
          riwayat chat lewat tombol &ldquo;Mulai ulang&rdquo; di panel chat. Nama, kota asal, dan nomor yang tersimpan
          terhapus kalau kamu mengirim form tanpa mencentang &ldquo;Ingat data saya&rdquo;. Semuanya juga bisa dihapus
          lewat pengaturan browser (hapus data situs).
        </p>

        <Heading id="berbagi">Berbagi data</Heading>
        <p>
          Kami tidak menjual atau menyewakan data kamu. Data hanya dipakai oleh tim pengelola VIDALIDAY. Saat kamu
          menekan &ldquo;Kirim via WhatsApp&rdquo;, pesan dikirim melalui layanan WhatsApp dan tunduk pada kebijakan
          privasi WhatsApp.
        </p>

        <Heading id="hak">Hak kamu</Heading>
        <p>Kamu berhak meminta salinan data, memperbaikinya, menghapusnya, atau menarik persetujuan.</p>
        <p>
          Caranya: hubungi admin lewat{" "}
          <a
            className="font-semibold text-brand-700 underline underline-offset-2"
            href={waLink(settings.whatsappNumber, GENERAL_INQUIRY_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp {wa}
          </a>
          {settings.contactEmail ? (
            <>
              {" "}atau email{" "}
              <a className="font-semibold text-brand-700 underline underline-offset-2" href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            </>
          ) : null}
          , sebutkan nama dan nomor yang dipakai saat mengirim permintaan. Kami memprosesnya paling lama 3 x 24 jam
          pada hari kerja.
        </p>

        <Heading id="keamanan">Keamanan</Heading>
        <p>
          Data dikirim melalui koneksi terenkripsi (HTTPS). Akses ke data permintaan sewa dibatasi untuk akun admin
          yang terdaftar.
        </p>

        <Heading id="perubahan">Perubahan kebijakan</Heading>
        <p>
          Kalau kebijakan ini berubah, tanggal di atas ikut diperbarui. Perubahan besar akan kami tampilkan di situs.
        </p>

        <p className="pt-6">
          <Link href="/" className="font-semibold text-brand-700 underline underline-offset-2">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </article>
  );
}
