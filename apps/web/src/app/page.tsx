import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

const ADVANTAGES = [
  {
    icon: "model_training",
    title: "Latih Sekali",
    desc: "Owner/HR menuangkan SOP dan know-how ke AI Business Brain lewat chat. Cukup sekali saja, per role.",
  },
  {
    icon: "trending_up",
    title: "Skala Tanpa Batas",
    desc: "Setiap karyawan baru langsung mendapat panduan, kuis, dan tutor AI. Tanpa HR mengulang materi.",
  },
  {
    icon: "verified_user",
    title: "Konsistensi Terjamin",
    desc: "AI tutor di-grounding ketat pada materi yang benar-benar diajarkan. Tidak ada prosedur yang dikarang.",
  },
];

const INDUSTRIES = [
  { icon: "local_cafe", name: "KOPI & KEDAI" },
  { icon: "restaurant", name: "RESTORAN & WARUNG" },
  { icon: "local_laundry_service", name: "LAUNDRY" },
  { icon: "storefront", name: "RITEL & TOKO" },
  { icon: "delivery_dining", name: "KULINER & DELIVERY" },
  { icon: "spa", name: "KECANTIKAN & SALON" },
  { icon: "car_repair", name: "BENGKEL" },
  { icon: "support_agent", name: "JASA LAYANAN" },
];

const STATS = [
  { value: "1×", label: "Latih pengetahuan sekali", sub: "per role kerja" },
  { value: "3", label: "Langkah menuju tim siap", sub: "latih → guide → on-board" },
  { value: "0", label: "Rupiah biaya bulanan", sub: "gratis untuk semua UMKM" },
  { value: "24/7", label: "Tutor AI selalu siaga", sub: "ter-grounding pada SOP Anda" },
];

const AUDIENCES = [
  {
    icon: "storefront",
    title: "Owner UMKM",
    desc: "Bangun SOP dari kepala Anda sendiri — tanpa konsultan dan tanpa menulis dokumen bertele-tele.",
  },
  {
    icon: "groups",
    title: "HR / Manajer",
    desc: "Hentikan repetisi onboarding. Materi sekali jadi, dikerjakan ulang oleh AI untuk setiap karyawan baru.",
  },
  {
    icon: "school",
    title: "Karyawan",
    desc: "Belajar sesuai ritme sendiri: baca panduan, kerjakan kuis, dan tanya tutor AI kapan pun dibutuhkan.",
  },
];

const FEATURES = [
  {
    icon: "forum",
    title: "Training Room",
    desc: "Latih AI per role lewat percakapan. AI bertanya untuk mengisi celah pengetahuan bisnis Anda.",
    tag: "CHAT",
  },
  {
    icon: "speed",
    title: "Skor kesiapan otomatis",
    desc: "AI mengukur kelengkapan materi 0–100 dan memberi tahu saat sebuah role siap dibuatkan guide.",
    tag: "0–100",
  },
  {
    icon: "auto_stories",
    title: "Guide ber-bab + kuis",
    desc: "Pengetahuan tersusun menjadi panduan terstruktur lengkap dengan evaluasi pemahaman karyawan.",
    tag: "STRUCTURED",
  },
  {
    icon: "support_agent",
    title: "AI Tutor 24/7",
    desc: "Karyawan bertanya kapan pun. Jawaban dibatasi pada SOP yang benar-benar diajarkan — tidak mengarang.",
    tag: "GROUNDED",
  },
  {
    icon: "inventory",
    title: "Knowledge Library",
    desc: "Unggah dokumen SOP dan catatan. AI memakainya hanya setelah Anda konfirmasi.",
    tag: "DOCS",
  },
  {
    icon: "monitor_heart",
    title: "Dashboard progres",
    desc: "Pantau kelulusan per role, skor kuis, dan progress tiap karyawan secara real-time.",
    tag: "INSIGHT",
  },
];

const BEFORE = [
  "HR mengulang materi dari nol setiap ada karyawan baru",
  "SOP tersebar di kepala, catatan, dan grup chat",
  "Tidak ada cara mengukur siapa yang sudah benar-benar paham",
  "Pelatihan berhenti selama HR sibuk beroperasional",
];

const AFTER = [
  "AI mengajar ulang materi yang sama — konsisten, tanpa lelah",
  "SOP tersusun jadi guide terstruktur lengkap dengan kuis",
  "Skor dan progress terlihat real-time di dashboard admin",
  "Tutor 24/7 menjawab pertanyaan karyawan kapan pun",
];

const STEPS = [
  {
    num: "01",
    tone: "primary" as const,
    title: "Buat role kerja",
    desc: "Kasir, Barista, Waiter. Definisikan peran yang perlu dilatih di bisnis Anda.",
  },
  {
    num: "02",
    tone: "ai" as const,
    title: "AI mengekstrak pengetahuan",
    desc: "Chat dengan AI Brain untuk menuangkan SOP dan prosedur role tersebut. AI menilai kelengkapan materi (0-100) dan bilang saat materi sudah cukup.",
  },
  {
    num: "03",
    tone: "ready" as const,
    title: "AI mengajar karyawan",
    desc: "Guide ber-bab + kuis + AI Tutor 24/7 untuk seluruh karyawan yang ditugaskan.",
  },
];

const SECURITY = [
  {
    icon: "lock",
    title: "Isolasi antar-bisnis",
    desc: "Data setiap UMKM terpisah total. Setiap query di-scope otomatis ke organisasi Anda — karyawan hanya melihat bagian miliknya.",
  },
  {
    icon: "verified_user",
    title: "AI tidak mengarang SOP",
    desc: "Tutor di-grounding pada materi yang diajarkan. Bila tidak ada jawabannya dalam materi, AI mengatakannya dan memberi tahu atasan.",
  },
  {
    icon: "fact_check",
    title: "Nilai yang jujur",
    desc: "Kuis dinilai di server. Kunci jawaban tidak pernah dikirim ke perangkat pengguna sebelum penilaian terjadi.",
  },
  {
    icon: "monitoring",
    title: "Pemakaian terkendali",
    desc: "Rate limit, cooldown, dan pencatatan penggunaan menjaga biaya AI tetap sehat dan adil bagi semua pengguna.",
  },
];

const FAQS = [
  {
    q: "Apakah Emplobo benar-benar gratis?",
    a: "Ya. Tidak ada paket berbayar, masa uji coba, atau biaya bulanan. Fokus kami adalah membuat pelatihan SDM terjangkau bagi UMKM.",
  },
  {
    q: "Berapa banyak karyawan yang bisa dilatih satu business brain?",
    a: "Tanpa batas. Begitu guide diterbitkan, semua karyawan yang ditugaskan dapat membaca panduan, mengerjakan kuis, dan bertanya pada tutor AI kapan saja.",
  },
  {
    q: "Bagaimana saya tahu materi sudah cukup untuk dilatihkan?",
    a: "AI menilai kelengkapan materi tiap role dengan skor 0–100. Saat skor mencapai 75+, status role menjadi READY dan tombol Generate Guide muncul.",
  },
  {
    q: "Apa bedanya dengan LMS atau video training biasa?",
    a: "LMS hanya menyimpan materi. Emplobo mengubah pengetahuan Anda menjadi asisten mengajar yang mampu menjawab pertanyaan spesifik tiap karyawan dan menguji pemahamannya.",
  },
  {
    q: "Bisakah jawaban tutor AI keluar dari SOP yang diajarkan?",
    a: "Tidak. Tutor hanya menjawab berdasarkan materi yang Anda ajarkan. Jika pertanyaan tidak tercakup, AI menyarankan karyawan untuk bertanya ke atasan.",
  },
  {
    q: "Dokumen seperti apa yang bisa saya berikan ke AI?",
    a: "File PDF, DOCX, atau TXT yang diunggah ke Knowledge Library. Dokumen baru aktif setelah Anda konfirmasi — hanya dokumen aktif yang dipakai AI.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 pb-16 pt-16 text-center md:px-10 md:pt-24">
          <h1 className="mx-auto max-w-4xl font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            Skalakan pengetahuan bisnis Anda dengan AI.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Emplobo adalah otak SDM untuk UMKM: latih AI sekali dengan SOP
            bisnis Anda, lalu biarkan AI meng-onboard dan mengajar setiap
            karyawan tanpa batas, 24/7.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <SignedOut>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                MULAI GRATIS
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg border border-secondary px-6 py-3.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
                >
                  MASUK
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                BUKA APP
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </SignedIn>
          </div>

          {/* Product frame */}
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5 border-b border-outline-variant bg-surface-container-low px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
            </div>
            <div className="grid gap-4 p-4 text-left md:grid-cols-12 md:p-6">
              <div className="hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:col-span-3 md:block">
                <p className="font-label-caps text-label-caps text-secondary">
                  ROLES CONTEXT
                </p>
                <div className="mt-3 space-y-2">
                  {["Barista", "Head Barista", "Kasir"].map((r, i) => (
                    <div
                      key={r}
                      className={`rounded-lg border p-3 ${
                        i === 0
                          ? "border-primary ring-1 ring-primary"
                          : "border-outline-variant"
                      }`}
                    >
                      <p className="font-data-point text-data-point font-bold text-on-surface">
                        {r}
                      </p>
                      <p className="mt-0.5 text-[12px] text-secondary">
                        {i === 0 ? "IN PROGRESS" : "DRAFT"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:col-span-6">
                <div className="flex items-center gap-2">
                  <p className="font-headline-sm text-[18px] text-on-surface">
                    Training Room
                  </p>
                  <span className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 font-label-caps text-label-caps text-on-surface-variant">
                    DRAFT
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                    Bagaimana urutan prosedur menutup espresso machine di akhir
                    shift?
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface">
                    Backflush tiap group head dengan cafiza 10 detik, ulangi 5x…
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                    Tercatat. Bagaimana penghitungan stok susu dan bean?
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center md:col-span-3">
                <p className="font-label-caps text-label-caps text-secondary">
                  BRAIN READINESS
                </p>
                <div className="mt-3 flex items-center justify-center">
                  <div className="relative inline-flex h-24 w-24 items-center justify-center">
                    <svg
                      className="h-full w-full -rotate-90 transform"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        className="text-outline-variant"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        className="text-primary"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="currentColor"
                        strokeDasharray="251.2"
                        strokeDashoffset="87.92"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute font-headline-sm text-2xl font-bold text-primary">
                      65%
                    </span>
                  </div>
                </div>
                <p className="mt-3 font-body-sm text-body-sm text-secondary">
                  Kelengkapan materi role
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Industry bar ──────────────────────────────────────────────── */}
        <section className="overflow-hidden border-y border-outline-variant bg-surface-container-lowest py-10">
          <p className="mb-7 text-center font-label-caps text-label-caps text-secondary">
            DIBANGUN UNTUK BERBAGAI INDUSTRI UMKM
          </p>

          {/* Endless marquee — item list duplicated for a seamless loop; the
              duplicated set is aria-hidden so screen readers read it once.
              Per-item mx-6 keeps spacing uniform across the loop seam. */}
          <div className="marquee-mask">
            <div className="marquee-track" aria-label="Industri UMKM yang didukung Emplobo">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1}
                  data-dup={copy === 1}
                  className="flex shrink-0 items-center"
                >
                  {INDUSTRIES.map((item) => (
                    <span
                      key={`${copy}-${item.name}`}
                      className="mx-6 flex items-center gap-3"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-bright text-secondary">
                        <span className="material-symbols-outlined text-[20px]">
                          {item.icon}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-headline-sm text-[16px] font-semibold text-outline">
                        {item.name}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats band ────────────────────────────────────────────────── */}
        <section className="border-b border-outline-variant bg-inverse-surface">
          <div className="mx-auto w-full max-w-container px-4 py-14 md:px-10 md:py-16">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-left">
                  <p className="font-headline-md text-headline-md text-on-primary md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 font-label-caps text-label-caps text-white/70">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-body-sm text-body-sm text-white/50">
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Emplobo Advantage ────────────────────────────────────── */}
        <section
          id="advantage"
          className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24"
        >
          <p className="text-center font-label-caps text-label-caps text-secondary">
            KEUNGGULAN EMPLOBO
          </p>
          <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
            Satu kali latih, semua karyawan siap
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {ADVANTAGES.map((adv) => (
              <div
                key={adv.title}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 transition-colors hover:bg-surface-bright"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
                  <span className="material-symbols-outlined ms-fill text-on-primary-container">
                    {adv.icon}
                  </span>
                </div>
                <h3 className="mt-5 font-headline-sm text-headline-sm text-primary">
                  {adv.title}
                </h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  {adv.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── For whom ──────────────────────────────────────────────────── */}
        <section className="border-y border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
            <p className="text-center font-label-caps text-label-caps text-secondary">
              DIBUAT UNTUK TIM UMKM
            </p>
            <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
              Satu platform untuk seluruh siklus pelatihan
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {AUDIENCES.map((a) => (
                <div
                  key={a.title}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center transition-colors hover:border-primary hover:bg-surface-bright"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ai-border bg-ai-accent">
                    <span className="material-symbols-outlined text-[30px] text-primary">
                      {a.icon}
                    </span>
                  </div>
                  <h3 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
                    {a.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-xs font-body-md text-body-md text-on-surface-variant">
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature grid ──────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
          <p className="text-center font-label-caps text-label-caps text-secondary">
            FITUR LENGKAP
          </p>
          <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
            Semua yang dibutuhkan untuk mengajar karyawan
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-7 transition-colors hover:border-primary/40 hover:bg-surface-bright"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-container transition-transform group-hover:scale-105">
                    <span className="material-symbols-outlined text-[22px] text-on-primary-container">
                      {f.icon}
                    </span>
                  </div>
                  <span className="rounded-full border border-outline-variant px-2.5 py-1 font-label-caps text-[10px] text-secondary">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-headline-sm text-headline-sm text-primary">
                  {f.title}
                </h3>
                <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Before / After ───────────────────────────────────────────── */}
        <section className="border-y border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
            <p className="text-center font-label-caps text-label-caps text-secondary">
              SEBELUM VS SESUDAH
            </p>
            <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
              Onboarding yang biasanya melelahkan, kini otomatis
            </h2>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-error/25 bg-surface-container-lowest p-8 md:p-10">
                <p className="font-label-caps text-label-caps text-error">
                  TANPA EMPLOBO
                </p>
                <ul className="mt-6 space-y-4">
                  {BEFORE.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error/10">
                        <span className="material-symbols-outlined text-[14px] text-error">
                          close
                        </span>
                      </span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-primary bg-primary p-8 md:p-10">
                <p className="font-label-caps text-label-caps text-on-primary">
                  DENGAN EMPLOBO
                </p>
                <ul className="mt-6 space-y-4">
                  {AFTER.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container">
                        <span className="material-symbols-outlined text-[14px] text-on-primary-container">
                          check
                        </span>
                      </span>
                      <span className="font-body-md text-body-md text-on-primary">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it Works ─────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24"
        >
          <p className="text-center font-label-caps text-label-caps text-secondary">
            CARA KERJA
          </p>
          <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
            Tiga langkah, dari know-how ke tim yang siap
          </h2>

          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <div
              aria-hidden
              className="absolute left-[16%] right-[16%] top-6 hidden h-0.5 bg-outline-variant md:block"
            />
            {STEPS.map((step) => {
              const tone =
                step.tone === "primary"
                  ? "bg-primary text-on-primary"
                  : step.tone === "ai"
                    ? "border border-ai-border bg-ai-accent text-primary"
                    : "bg-status-ready text-white";
              return (
                <div key={step.num} className="relative text-center">
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full font-data-point text-data-point font-bold ${tone}`}
                  >
                    {step.num}
                  </div>
                  <h3 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-xs font-body-md text-body-md text-on-surface-variant">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── The Business Brain Loop ───────────────────────────────────── */}
        {/* A transparency feature, not marketing: walks through the actual
            train → self-assessed readiness → teach loop, annotating the
            honesty mechanism inside each stage. This is the product's real
            differentiator (an LMS stores material; Emplobo trains a teacher). */}
        <section className="border-y border-outline-variant bg-surface-container-lowest">
          <div className="relative mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
            <p className="text-center font-label-caps text-label-caps text-secondary">
              LOOP TRAINING AI
            </p>
            <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
              Dari obrolan sekali, menjadi pengajar yang jujur untuk semua
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center font-body-md text-body-md text-on-surface-variant">
              Bukan LMS yang sebatas menyimpan materi. Ini satu otak bisnis yang
              dilatih sekali, menguji kesiapannya sendiri, lalu mengajar setiap
              karyawan — dibatasi keras oleh materi yang Anda berikan. Berikut
              isinya, sebagaimana adanya di dalam produk.
            </p>

            {/* Vertically centered connector; numeric chips sit on it */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-y-0 left-10 hidden w-px bg-outline-variant md:left-[44%] lg:block"
              />

            {/* ── Stage 1 · Admin trains once ─────────────────────────── */}
            <div className="relative mt-14 grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className="md:order-1">
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-label-caps text-label-caps text-secondary">
                      TRAINING · BARISTA
                    </p>
                    <span className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-0.5 font-label-caps text-label-caps text-on-surface-variant">
                      DRAFT
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                      Masih ada celah di materi ini — bagaimana SOP menutup mesin
                      espresso di akhir shift?
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-outline-variant bg-surface-container-high p-3 text-sm text-on-surface">
                      Backflush tiap group head 10 detik, ulangi 5x, lalu
                      keringkan portafilter.
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                      Tercatat. Bagaimana perhitungan stok susu dan bean setiap
                      pagi?
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:order-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-data-point text-data-point font-bold text-on-primary lg:absolute lg:left-[44%] lg:-translate-x-1/2">
                  01
                </span>
                <h3 className="mt-4 font-headline-md text-headline-md text-primary">
                  Admin berbicara sekali
                </h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  SOP, kebijakan toko, dan know-how dituangkan lewat perbincangan
                  biasa dengan AI — sekali saja per role kerja.
                </p>
                <p className="mt-5 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined ms-fill shrink-0 text-[18px] text-primary">
                    fact_check
                  </span>
                  <span>
                    Setiap pesan tersimpan sebagai materi yang bisa ditinjau dan
                    disunting admin kapan saja — bukan kotak hitam.
                  </span>
                </p>
              </div>
            </div>

            {/* ── Stage 2 · AI self-assesses readiness ─────────────────── */}
            <div className="relative mt-14 grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className="md:order-2">
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-label-caps text-label-caps text-secondary">
                      BRAIN READINESS · BARISTA
                    </p>
                    <span className="rounded-full bg-status-ready/10 px-2.5 py-0.5 font-label-caps text-label-caps text-status-ready">
                      READY
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-5">
                    <div className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center">
                      <svg
                        className="h-full w-full -rotate-90 transform"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          className="text-outline-variant"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                        />
                        <circle
                          className="text-primary"
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke="currentColor"
                          strokeDasharray="251.2"
                          strokeDashoffset="45.2"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-headline-sm text-xl font-bold text-primary">
                        82%
                      </span>
                    </div>
                    <div>
                      <p className="font-data-point text-data-point text-on-surface">
                        Skor kelengkapan materi role
                      </p>
                      <p className="mt-1 font-body-sm text-body-sm text-secondary">
                        82 &gt; 75 — ambang tercapai, role siap dibentuk guide.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:order-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ai-border bg-ai-accent font-data-point text-data-point font-bold text-primary lg:absolute lg:left-[44%] lg:-translate-x-1/2">
                  02
                </span>
                <h3 className="mt-4 font-headline-md text-headline-md text-primary">
                  AI menguji kesiapannya sendiri
                </h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  Dari transkrip training, AI menghitung skor kelengkapan 0–100
                  secara berkala. Menembus 75, role berubah menjadi READY dan
                  pintu pembuatan guide terbuka.
                </p>
                <p className="mt-5 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined ms-fill shrink-0 text-[18px] text-primary">
                    fact_check
                  </span>
                  <span>
                    Skor dihitung dari materi Anda sendiri dan diperbarui
                    mengikuti training — bukan estimasi pemasaran.
                  </span>
                </p>
              </div>
            </div>

            {/* ── Stage 3 · AI teaches every employee ──────────────────── */}
            <div className="relative mt-14 grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className="md:order-1">
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-label-caps text-label-caps text-secondary">
                      LEARNING · BARISTA
                    </p>
                    <span className="rounded-full bg-primary-fixed/50 px-2.5 py-0.5 font-label-caps text-label-caps text-on-primary-fixed-variant">
                      PANDUAN V2
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
                      <span className="material-symbols-outlined ms-fill shrink-0 text-[18px] text-primary">
                        check_circle
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        1 · SOP Pembukaan Shift
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-lg border border-primary bg-primary-fixed/40 px-3 py-2.5">
                      <span className="material-symbols-outlined ms-fill shrink-0 text-[18px] text-primary">
                        menu_book
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        2 · Mesin &amp; Peralatan
                      </span>
                      <span className="ml-auto rounded-full bg-status-ready/10 px-2 py-0.5 font-label-caps text-label-caps text-status-ready">
                        KUIS 90%
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 opacity-70">
                      <span className="material-symbols-outlined shrink-0 text-[18px] text-secondary">
                        schedule
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        3 · Standar Rasa Kopi
                      </span>
                    </li>
                  </ul>
                  <div className="mt-3 rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                    “Kalau mesin bermasalah di tengah shift, langkah pertama
                    sesuai SOP adalah…”
                  </div>
                </div>
              </div>

              <div className="md:order-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-ready font-data-point text-data-point font-bold text-white lg:absolute lg:left-[44%] lg:-translate-x-1/2">
                  03
                </span>
                <h3 className="mt-4 font-headline-md text-headline-md text-primary">
                  AI mengajar semua karyawan
                </h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  Guide ber-bab, kuis yang dinilai di server, dan tutor 24/7 yang
                  menjawab hanya dari materi role tersebut. Setiap karyawan baru
                  tinggal belajar.
                </p>
                <p className="mt-5 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined ms-fill shrink-0 text-[18px] text-primary">
                    fact_check
                  </span>
                  <span>
                    Tutor tidak mengarang prosedur. Pertanyaan di luar materi
                    dijawab jujur: sarankan bertanya ke atasan.
                  </span>
                </p>
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* ── Security & trust ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
          <p className="text-center font-label-caps text-label-caps text-secondary">
            KEAMANAN & KEANDALAN
          </p>
          <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
            Dibangun untuk dipercaya, sejak hari pertama
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="flex items-start gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-7"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-container">
                  <span className="material-symbols-outlined text-[24px] text-on-primary-container">
                    {s.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary">
                    {s.title}
                  </h3>
                  <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section
          id="faq"
          className="border-t border-outline-variant bg-surface-container-lowest"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-10 md:py-24">
            <p className="text-center font-label-caps text-label-caps text-secondary">
              PERTANYAAN UMUM
            </p>
            <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
              Hal yang sering ditanyakan
            </h2>

            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors open:border-primary/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-headline-sm text-[16px] text-on-surface">
                    {faq.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-outline-variant text-secondary transition-transform group-open:rotate-45">
                      <span className="material-symbols-outlined text-[16px]">
                        add
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 font-body-md text-body-md leading-7 text-on-surface-variant">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-outline-variant bg-primary p-8 md:flex-row md:items-center md:p-12">
            <div className="flex items-start gap-5">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container sm:flex">
                <span className="material-symbols-outlined ms-fill text-on-primary-container">
                  auto_stories
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-primary">
                  Panduan SOP tersusun dari materi yang Anda ajarkan
                </h2>
                <p className="mt-2 max-w-xl font-body-md text-body-md text-on-primary-container">
                  Begitu materi dirasa cukup, AI menyusun panduan ber-bab
                  lengkap dengan kuis untuk mengukur pemahaman setiap karyawan.
                </p>
              </div>
            </div>
            <SignedOut>
              <Link
                href="/sign-up"
                className="shrink-0 rounded-lg bg-on-primary px-6 py-3 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed"
              >
                MULAI GRATIS
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/app"
                className="shrink-0 rounded-lg bg-on-primary px-6 py-3 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed"
              >
                BUKA APP
              </Link>
            </SignedIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}