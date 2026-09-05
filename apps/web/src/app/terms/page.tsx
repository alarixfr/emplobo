import { LegalPage } from "@/components/legal/legal-page";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <LegalPage
        title="Syarat & Ketentuan"
        lastUpdated="5 September 2026"
        intro="Dengan menggunakan Emplobo, Anda menyetujui syarat dan ketentuan berikut. Emplobo adalah platform pelatihan berbasis AI untuk UMKM Indonesia."
        crossLinks={[
          { label: "Kebijakan Privasi", href: "/privacy" },
          { label: "Dokumentasi Developer", href: "/docs" },
        ]}
        sections={[
          {
            id: "service",
            title: "Layanan yang Disediakan",
            paragraphs: [
              "Emplobo menyediakan layanan pelatihan SDM berbasis AI: pemilik/HR melatih business brain per role, AI mengevaluasi kesiapan materi, menghasilkan guide ber-bab beserta kuis, dan memberikan tutor AI 24/7 kepada karyawan.",
              "Layanan ini gratis untuk seluruh pengguna. Kami tidak menawarkan tier berbayar atau masa uji coba.",
              "Dokumen yang diunggah ke Knowledge Library baru digunakan AI setelah dikonfirmasi oleh admin, dan pemakaian AI dibatasi kuota dan rate limit agar adil bagi semua pengguna.",
            ],
          },
          {
            id: "obligations",
            title: "Tanggung Jawab Pengguna",
            paragraphs: [
              "Anda bertanggung jawab atas akurasi materi SOP yang diajarkan ke AI. Emplobo menjadikan materi tersebut sebagai satu-satunya dasar jawaban AI tutor.",
              "Anda menjamin bahwa materi yang diunggah tidak melanggar hukum atau hak pihak ketiga, dan bahwa Anda berhak mengunggahnya.",
              "Karyawan diwajibkan memverifikasi prosedur kritis (keselamatan, uang, layanan) kepada atasan. Jawaban AI tutor bersifat informatif dan bukan pengganti keputusan atau prosedur resmi.",
            ],
          },
          {
            id: "processing",
            title: "Pemrosesan Data secara Otomatis",
            paragraphs: [
              "Sebagian besar alur layanan dijalankan otomatis oleh AI: evaluasi kelengkapan training, pembuatan guide, penilaian kuis, dan jawaban tutor. Keputusan penting (seperti penugasan karyawan dan publikasi guide) selalu berada di tangan admin.",
              "Kuis dinilai secara otomatis di server. Kunci jawaban tidak pernah dibuka kepada klien sebelum pengiriman jawaban.",
            ],
          },
          {
            id: "limitations",
            title: "Batasan Tanggung Jawab",
            paragraphs: [
              "Emplobo berusaha menjaga ketersediaan layanan tetapi tidak menjamin layanan bebas gangguan, terutama karena sebagian alur bergantung pada penyedia model AI pihak ketiga.",
              "Kami tidak bertanggung jawab atas kerugian akibat penggunaan prosedur yang belum diverifikasi atau materi yang tidak diajarkan secara benar oleh admin.",
            ],
          },
          {
            id: "changes",
            title: "Perubahan Ketentuan",
            paragraphs: [
              "Kami dapat memperbarui ketentuan ini sewaktu-waktu. Perubahan signifikan akan diumumkan melalui aplikasi atau email.",
              "Penggunaan Emplobo setelah perubahan berlaku merupakan penerimaan terhadap ketentuan yang diperbarui.",
            ],
          },
        ]}
      />
      <MarketingFooter />
    </div>
  );
}