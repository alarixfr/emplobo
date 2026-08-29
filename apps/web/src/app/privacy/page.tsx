import { LegalPage } from "@/components/legal/legal-page";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <LegalPage
        title="Kebijakan Privasi"
        lastUpdated="29 Agustus 2026"
        intro="Emplobo menghormati privasi Anda. Dokumen ini menjelaskan bagaimana kami mengelola data bisnis, data karyawan, dan hasil pelatihan AI Anda."
        sections={[
          {
            id: "data",
            title: "Data yang Kami Kumpulkan",
            heading: "Data yang Kami Kumpulkan",
            paragraphs: [
              "Kami memproses data yang Anda masukkan secara sadar: profil organisasi dan pengguna (nama, email), definisi role, percakapan training, guide yang dihasilkan, serta progress dan hasil kuis karyawan.",
              "Kami tidak pernah meminta atau menyimpan data pembayaran. Emplobo gratis untuk semua pengguna dan tidak memiliki mekanisme pembayaran.",
              "Data otentikasi (login, organisasi, keanggotaan) dikelola sepenuhnya oleh Clerk sebagai penyedia identitas pihak ketiga.",
            ],
          },
          {
            id: "ai",
            title: "AI yang Ter-grounding Ketat",
            heading: "AI yang Ter-grounding Ketat",
            paragraphs: [
              "Materi training yang Anda ajarkan digunakan untuk melatih dan mengontekstualisasi AI tutor bisnis Anda. AI tutor hanya menjawab berdasarkan materi yang benar-benar Anda ajarkan, tidak dari pengetahuan umum di luar itu.",
              "Semua percakapan training dan chat diproses melalui penyedia AI pihak ketiga (Anthropic Claude) untuk menghasilkan jawaban. Teks yang Anda berikan dibungkus sebagai data, bukan instruksi.",
              "Jika jawaban tidak tercakup dalam materi, AI tutor akan menyatakannya secara eksplisit dan menyarankan Anda menghubungi atasan — tidak pernah mengarang prosedur.",
            ],
          },
          {
            id: "isolation",
            title: "Isolasi Antar-Tenant",
            heading: "Isolasi Antar-Tenant",
            paragraphs: [
              "Setiap organisasi (UMKM) adalah tenant yang terisolasi. Data satu bisnis tidak pernah tercampur atau dapat diakses oleh bisnis lain.",
              "Karyawan hanya dapat melihat modul yang ditugaskan kepada mereka, dan sesi chat AI tutor dibatasi pada role yang mereka miliki.",
            ],
          },
          {
            id: "retention",
            title: "Retensi & Penghapusan",
            heading: "Retensi & Penghapusan",
            paragraphs: [
              "Kami menyimpan data selama organisasi Anda masih aktif. Anda dapat menghapus role, guide, dan data terkait kapan saja dari dalam aplikasi.",
              "Untuk penghapusan akun secara menyeluruh, hubungi kami melalui email dukungan yang tercantum di bawah.",
            ],
          },
          {
            id: "contact",
            title: "Kontak",
            heading: "Hubungi Kami",
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
