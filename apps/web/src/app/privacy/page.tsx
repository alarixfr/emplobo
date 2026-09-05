import { LegalPage } from "@/components/legal/legal-page";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <LegalPage
        title="Kebijakan Privasi"
        lastUpdated="5 September 2026"
        intro="Emplobo menghormati privasi Anda. Dokumen ini menjelaskan bagaimana kami mengelola data bisnis, data karyawan, dan hasil pelatihan AI Anda."
        crossLinks={[
          { label: "Syarat & Ketentuan", href: "/terms" },
          { label: "Dokumentasi Developer", href: "/docs" },
        ]}
        sections={[
          {
            id: "data",
            title: "Data yang Kami Kelola",
            paragraphs: [
              "Kami memproses data yang Anda masukkan secara sadar: profil organisasi dan pengguna (nama, email), definisi role, percakapan training, dokumen Knowledge Library, guide yang dihasilkan, serta progress dan hasil kuis karyawan.",
              "Kami tidak pernah meminta atau menyimpan data pembayaran. Emplobo gratis untuk semua pengguna dan tidak memiliki mekanisme pembayaran. Data otentikasi (login, organisasi, keanggotaan) dikelola sepenuhnya oleh Clerk sebagai penyedia identitas pihak ketiga.",
              "Kami tidak menjual data Anda kepada pihak mana pun, dan tidak menggunakan data Anda untuk iklan.",
            ],
          },
          {
            id: "ai",
            title: "AI yang Ter-grounding Ketat",
            paragraphs: [
              "Materi training dan dokumen Knowledge Library yang Anda ajarkan dipakai untuk mengontekstualisasi AI tutor bisnis Anda. AI tutor hanya menjawab berdasarkan materi yang benar-benar Anda ajarkan — tidak dari pengetahuan umum di luar itu. Dokumen yang belum Anda konfirmasi (DRAFT) tidak pernah dipakai oleh AI.",
              "Semua panggilan AI (training, penilaian kesiapan, penyusunan guide, dan tutor) diproses melalui OpenRouter sebagai penyedia model pihak ketiga. Teks Anda selalu dibungkus sebagai data, bukan instruksi, sebelum dikirim.",
              "Jika jawaban tidak tercakup dalam materi, AI tutor akan menyatakannya secara eksplisit dan menyarankan menghubungi atasan, tanpa pernah mengarang prosedur.",
            ],
          },
          {
            id: "isolation",
            title: "Isolasi Antar-Tenant",
            paragraphs: [
              "Setiap organisasi (UMKM) adalah tenant yang terisolasi. Data satu bisnis tidak pernah tercampur atau dapat diakses oleh bisnis lain.",
              "Karyawan hanya dapat melihat modul yang ditugaskan kepada mereka, dan sesi chat AI tutor dibatasi pada role yang mereka miliki.",
            ],
          },
          {
            id: "security",
            title: "Keamanan Teknis",
            paragraphs: [
              "Seluruh akses data melewati otentikasi Clerk dan identitas organisasi diambil dari token sesi, bukan dari input klien. Setiap query data tenant selalu difilter oleh identitas organisasi.",
              "Kuis dinilai di server dan kunci jawaban tidak pernah dikirim ke perangkat pengguna sebelum pengiriman jawaban.",
              "Semua halaman memakai header keamanan (CSP, frame denial, dan lainnya) serta transport TLS pada lingkungan produksi.",
            ],
          },
          {
            id: "retention",
            title: "Retensi & Penghapusan",
            paragraphs: [
              "Kami menyimpan data selama organisasi Anda masih aktif. Anda dapat menghapus role, guide, dokumen knowledge, dan data terkait kapan saja dari dalam aplikasi.",
              "Untuk penghapusan akun secara menyeluruh, hubungi kami melalui email dukungan yang tercantum di bawah.",
            ],
          },
          {
            id: "contact",
            title: "Hubungi Kami",
            paragraphs: [
              "Pertanyaan tentang kebijakan privasi dapat dikirim ke support@emplobo.app. Kami berkomitmen merespons secepatnya.",
            ],
          },
        ]}
      />
      <MarketingFooter />
    </div>
  );
}