import { LegalPage } from "@/components/legal/legal-page";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <LegalPage
        title="Syarat & Ketentuan"
        lastUpdated="29 Agustus 2026"
        intro="Dengan menggunakan Emplobo, Anda menyetujui syarat dan ketentuan berikut. Emplobo adalah platform pelatihan berbasis AI untuk UMKM Indonesia."
        sections={[
          {
            id: "service",
            title: "Layanan",
            heading: "Layanan yang Disediakan",
            paragraphs: [
              "Emplobo menyediakan layanan pelatihan SDM berbasis AI: pemilik/HR melatih business brain per role, AI mengevaluasi kesiapan materi, menghasilkan guide ber-bab beserta kuis, dan memberikan tutor AI 24/7 kepada karyawan.",
              "Layanan ini gratis untuk seluruh pengguna. Kami tidak menawarkan tier berbayar atau masa uji coba.",
            ],
          },
          {
            id: "obligations",
            title: "Tanggung Jawab Pengguna",
            heading: "Tanggung Jawab Pengguna",
            paragraphs: [
              "Anda bertanggung jawab atas akurasi materi SOP yang diajarkan ke AI. Emplobo menjadikan materi tersebut sebagai satu-satunya dasar jawaban AI tutor.",
              "Anda menjamin bahwa materi yang diunggah tidak melanggar hukum atau hak pihak ketiga.",
              "Karyawan diwajibkan memverifikasi prosedur kritis (keselamatan, uang, layanan) kepada atasan — jawaban AI tutor bersifat informatif.",
            ],
          },
          {
            id: "processing",
            title: "Pemrosesan Otomatis",
            heading: "Pemrosesan Data secara Otomatis",
            paragraphs: [
              "Sebagian besar alur layanan dijalankan otomatis oleh AI: evaluasi kelengkapan training, pembuatan guide, penilaian kuis, dan jawaban tutor. Keputusan penting (seperti penugasan karyawan dan publikasi guide) selalu berada di tangan admin.",
              "Kuis dinilai secara otomatis di server. Kunci jawaban tidak pernah dibuka kepada klien sebelum pengiriman.",
            ],
          },
          {
            id: "limitations",
            title: "Batasan Tanggung Jawab",
            heading: "Batasan Tanggung Jawab",
            paragraphs: [
              "Emplobo berusaha menjaga ketersediaan layanan tetapi tidak menjamin layanan bebas gangguan.",
              "Kami tidak bertanggung jawab atas kerugian akibat penggunaan prosedur yang belum diverifikasi dari materi yang tidak diajarkan secara benar oleh admin.",
            ],
          },
          {
            id: "changes",
            title: "Perubahan Ketentuan",
            heading: "Perubahan Ketentuan",
            paragraphs: [
              "Kami dapat memperbarui ketentuan ini sewaktu-waktu. Perubahan signifikan akan diumumkan melalui aplikasi atau email.",
            ],
          },
        ]}
      />
      <MarketingFooter />
    </div>
  );
}
