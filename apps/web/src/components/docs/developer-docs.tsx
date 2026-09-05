"use client";

import { useMemo, useRef, useState } from "react";
import { useScrollSpy } from "@/lib/use-scroll-spy";

type Lang = "curl" | "node";

const SECTIONS = [
  {
    id: "intro",
    title: "Pengenalan",
    body: (
      <>
        <p>
          Emplobo menyediakan API REST untuk mengelola business brain, training
          AI, guide, dan progress karyawan. Semua request (kecuali webhook Clerk
          dan health check) wajib membawa token sesi Clerk pada header{" "}
          <code className="font-data-point">Authorization: Bearer &lt;token&gt;</code>{" "}
          dan ter-isolasi per organisasi (orgId diambil dari token, bukan dari
          body request).
        </p>
        <p>
          Base URL:{" "}
          <code className="font-data-point">{process.env.NEXT_PUBLIC_API_URL ?? "https://api.emplobo-demo.example.com"}</code>
        </p>
      </>
    ),
  },
  {
    id: "roles",
    title: "Training & Role",
    endpoints: [
      {
        method: "POST",
        path: "/api/roles",
        desc: "Membuat role training baru berstatus DRAFT.",
        params: [
          { name: "name", type: "string", required: true, desc: "Nama role (max 100)" },
          { name: "description", type: "string", required: false, desc: "Deskripsi (max 500)" },
        ],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/roles" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Barista","description":"Menangani espresso & milk"}'`
            : `const res = await fetch(\`\${API}/roles\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Barista",
    description: "Menangani espresso & milk",
  }),
});
const { role } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/roles/:id/training/messages",
        desc: "Mengirim pesan training admin → AI. Setiap 5 pesan, AI menilai ulang completeness (0-100).",
        params: [
          { name: "content", type: "string", required: true, desc: "Teks SOP / know-how (max 4000)" },
        ],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/roles/$ROLE_ID/training/messages" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Prosedur closing: backflush 5x dengan cafiza…"}'`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/training/messages\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "Prosedur closing: backflush 5x dengan cafiza…",
    }),
  },
);
const { aiMessage, role } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/roles/:id/guide/generate",
        desc: "Membuat/memperbarui guide ber-bab + kuis. Hanya ketika status READY atau PUBLISHED.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/roles/$ROLE_ID/guide/generate" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/guide/generate\`,
  {
    method: "POST",
    headers: { Authorization: \`Bearer \${token}\` },
  },
);
const { role } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/roles/:id/assignments",
        desc: "Menugaskan karyawan ke role (idempotent). Hanya untuk status PUBLISHED.",
        params: [{ name: "userIds", type: "string[]", required: true, desc: "Clerk user ids" }],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/roles/$ROLE_ID/assignments" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"userIds":["user_abc","user_def"]}'`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/assignments\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userIds: ["user_abc", "user_def"] }),
  },
);`,
      },
      {
        method: "POST",
        path: "/api/roles/:id/training/lock",
        desc: "Mengunci Training Room untuk satu admin (atomik). 423 jika dipegang admin lain.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/roles/$ROLE_ID/training/lock" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/training/lock\`,
  { method: "POST", headers: { Authorization: \`Bearer \${token}\` } },
);
// 423 → sedang dikunci admin lain; body berisi activeTrainerName`,
      },
      {
        method: "PATCH",
        path: "/api/roles/:id/training/heartbeat",
        desc: "Denyut jantung dari admin pemegang lock (setiap 60 detik). Lock dianggap basi setelah 30 menit tanpa denyut.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X PATCH "$API/roles/$ROLE_ID/training/heartbeat" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/training/heartbeat\`,
  { method: "PATCH", headers: { Authorization: \`Bearer \${token}\` } },
);`,
      },
      {
        method: "DELETE",
        path: "/api/roles/:id/training/lock",
        desc: "Melepas kunci Training Room secara eksplisit (saat menutup panel).",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X DELETE "$API/roles/$ROLE_ID/training/lock" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/training/lock\`,
  { method: "DELETE", headers: { Authorization: \`Bearer \${token}\` } },
);`,
      },
      {
        method: "GET",
        path: "/api/roles/:id/training/messages",
        desc: "Transkrip percakapan training + status role.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/roles/$ROLE_ID/training/messages" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/training/messages\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { role, messages } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/roles/:id/guide",
        desc: "Guide terpublikasi role (chapter + pertanyaan kuis, tanpa kunci jawaban).",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/roles/$ROLE_ID/guide" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/guide\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { guide } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/roles/:id/assignable-users",
        desc: "Daftar karyawan org yang bisa ditugaskan + status assignment mereka.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/roles/$ROLE_ID/assignable-users" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/roles/\${roleId}/assignable-users\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { role, users } = await res.json();`,
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge Library",
    endpoints: [
      {
        method: "GET",
        path: "/api/knowledge",
        desc: "Daftar dokumen knowledge org + kuota (draft, storage, limit). " +
          "Dokumen DRAFT tidak pernah dipakai AI.",
        params: [
          { name: "q", type: "string", required: false, desc: "Filter pencarian (max 200)" },
        ],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/knowledge?q=espresso" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(\`\${API}/knowledge?q=espresso\`, {
  headers: { Authorization: \`Bearer \${token}\` },
});
const { documents, quota } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/knowledge/documents",
        desc: "Membuat dokumen knowledge manual (DRAFT; perlu dikonfirmasi sebelum dipakai AI). " +
          "Batas draft 5 dokumen — 409 jika penuh.",
        params: [
          { name: "title", type: "string", required: true, desc: "Judul (max 200)" },
          { name: "content", type: "string", required: true, desc: "Teks dokumen (max 400.000)" },
          { name: "description", type: "string", required: false, desc: "Deskripsi (max 500)" },
        ],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/knowledge/documents" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Prosedur Jam Buka","content":"1. Nyalakan mesin. 2. Kalibrasi espresso…"}'`
            : `const res = await fetch(\`\${API}/knowledge/documents\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Prosedur Jam Buka",
    content: "1. Nyalakan mesin. 2. Kalibrasi espresso…",
  }),
});
const { document } = await res.json();`,
      },
    ],
  },
  {
    id: "employee",
    title: "Employee Learning",
    endpoints: [
      {
        method: "GET",
        path: "/api/my/modules",
        desc: "Modul yang ditugaskan ke sesi pengguna, lengkap dengan progress.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/my/modules" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(\`\${API}/my/modules\`, {
  headers: { Authorization: \`Bearer \${token}\` },
});
const { modules } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/my/modules/:roleId/chapters",
        desc: "Chapter guide + quiz (tanpa kunci jawaban) untuk modul yang ditugaskan.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/my/modules/$ROLE_ID/chapters" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/my/modules/\${roleId}/chapters\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { guide, chapters } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/my/chapters/:id/complete",
        desc: "Menandai chapter selesai (upsert ChapterProgress untuk pengguna).",
        params: [],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/my/chapters/$CHAPTER_ID/complete" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/my/chapters/\${chapterId}/complete\`,
  { method: "POST", headers: { Authorization: \`Bearer \${token}\` } },
);
const { progress } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/my/chapters/:id/quiz/submit",
        desc: "Mengirim jawaban kuis. Digrading server-side; correctIndex tidak pernah dikirim sebelum submit.",
        params: [{ name: "answers", type: "number[]", required: true, desc: "Index jawaban, urutan sesuai soal" }],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/my/chapters/$CHAPTER_ID/quiz/submit" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"answers":[0,2,1,3]}'`
            : `const res = await fetch(
  \`\${API}/my/chapters/\${chapterId}/quiz/submit\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers: [0, 2, 1, 3] }),
  },
);
const { score, passed, results } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/my/chat/sessions",
        desc: "Membuat sesi chat AI Tutor untuk role tertentu. Kapasitas 10 sesi/role — sesi tertua otomatis dibersihkan.",
        params: [{ name: "roleId", type: "string", required: true, desc: "Role yang ditugaskan ke pengguna" }],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/my/chat/sessions" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"roleId":"$ROLE_ID"}'`
            : `const res = await fetch(\`\${API}/my/chat/sessions\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${token}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ roleId }),
});
const { session } = await res.json();`,
      },
      {
        method: "POST",
        path: "/api/my/chat/sessions/:id/messages",
        desc: "Mengirim pesan ke AI Tutor. Dibatasi rate limit (15/5 menit) + cooldown 2 detik per sesi.",
        params: [{ name: "content", type: "string", required: true, desc: "Pertanyaan karyawan" }],
        response: 201,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl -X POST "$API/my/chat/sessions/$SESSION_ID/messages" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Bagaimana prosedur kalibrasi espresso?"}'`
            : `const res = await fetch(
  \`\${API}/my/chat/sessions/\${sessionId}/messages\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "Bagaimana prosedur kalibrasi espresso?" }),
  },
);
const { aiMessage } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/my/chat/sessions",
        desc: "Daftar sesi chat AI Tutor milik pengguna (opsional filter ?roleId=).",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/my/chat/sessions?roleId=$ROLE_ID" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/my/chat/sessions?roleId=\${roleId}\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { sessions } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/my/chat/sessions/:id/messages",
        desc: "Riwayat percakapan sebuah sesi (ownership diverifikasi per request).",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/my/chat/sessions/$SESSION_ID/messages" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(
  \`\${API}/my/chat/sessions/\${sessionId}/messages\`,
  { headers: { Authorization: \`Bearer \${token}\` } },
);
const { messages } = await res.json();`,
      },
      {
        method: "GET",
        path: "/api/dashboard/summary",
        desc: "Ringkasan dashboard admin: jumlah, skor kuis, completion per role, aktivitas terbaru.",
        params: [],
        response: 200,
        code: (lang: Lang) =>
          lang === "curl"
            ? `curl "$API/dashboard/summary" \\
  -H "Authorization: Bearer $CLERK_TOKEN"`
            : `const res = await fetch(\`\${API}/dashboard/summary\`, {
  headers: { Authorization: \`Bearer \${token}\` },
});
const { summary } = await res.json();`,
      },
    ],
  },
  {
    id: "security",
    title: "Keamanan & Batas",
    body: (
      <ul className="mt-4 space-y-2">
        <li>Setiap model tenant-owned di-scope dengan <code className="font-data-point">orgId</code> dari token sesi.</li>
        <li>Kuis digrading di server; kunci jawaban tidak pernah bocor sebelum submit.</li>
        <li>Semua teks user dibungkus <code className="font-data-point">&lt;business_data&gt;</code> sebagai data, bukan instruksi.</li>
        <li>Dokumen Knowledge Library hanya dipakai AI setelah dikonfirmasi (AKTIF); dokumen DRAFT dibatasi 5 per org.</li>
        <li>Rate limit: training 20 pesan/10 menit · guide 3/jam · chat 15 pesan/5 menit + cooldown 2 detik.</li>
        <li>Lock training tunggal per role, staleness 30 menit.</li>
      </ul>
    ),
  },
];

function MethodBadge({ method }: { method: string }) {
  const isGet = method === "GET";
  return (
    <span
      className={`inline-flex w-14 items-center justify-center rounded-md px-2 py-1 font-data-point text-[11px] font-bold ${
        isGet
          ? "bg-status-ready/10 text-status-ready"
          : "bg-primary-container text-on-primary-container"
      }`}
    >
      {method}
    </span>
  );
}

function endpointKey(sectionId: string, path: string) {
  return `${sectionId}:${path}`;
}

function endpointDomId(sectionId: string, path: string) {
  return `ep-${endpointKey(sectionId, path).replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export function DeveloperDocs() {
  const [lang, setLang] = useState<Lang>("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const detailsRefs = useRef(new Map<string, HTMLDetailsElement>());
  const copyTimer = useRef<number | null>(null);

  const allIds = useMemo(() => {
    const ids: string[] = [];
    for (const section of SECTIONS) {
      ids.push(section.id);
      if (section.endpoints) {
        for (const ep of section.endpoints) {
          ids.push(endpointDomId(section.id, ep.path));
        }
      }
    }
    return ids;
  }, []);

  const spy = useScrollSpy(allIds);

  const activeEndpoint = spy !== null && spy.startsWith("ep-") ? spy : null;
  const activeSection = useMemo(() => {
    if (!spy) return SECTIONS[0].id;
    if (spy.startsWith("ep-")) {
      const owner = SECTIONS.find((s) =>
        s.endpoints?.some((ep) => endpointDomId(s.id, ep.path) === spy),
      );
      return owner ? owner.id : SECTIONS[0].id;
    }
    return spy;
  }, [spy]);

  function scrollToId(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToEndpoint(sectionId: string, path: string) {
    const domId = endpointDomId(sectionId, path);
    const details = detailsRefs.current.get(domId);
    if (details) details.open = true;
    document
      .getElementById(domId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedKey("sample");
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(
        () => setCopiedKey(null),
        1600,
      );
    } catch {
      // clipboard unavailable (e.g. insecure context) — ignore
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ── Left TOC (desktop) ─────────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="font-label-caps text-label-caps text-secondary">
            API DOCS
          </p>
          <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">
            Developer Hub
          </h2>
          <nav className="mt-6 space-y-0.5" aria-label="Daftar isi API">
            {SECTIONS.map((section) => {
              const isSectionActive = activeSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToId(section.id)}
                    aria-current={isSectionActive ? "location" : undefined}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
                      isSectionActive
                        ? "bg-primary-container font-medium text-on-primary-container"
                        : "text-secondary hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span>{section.title}</span>
                    {section.endpoints ? (
                      <span className="font-data-point text-[11px] text-outline">
                        {section.endpoints.length}
                      </span>
                    ) : null}
                  </button>
                  {section.endpoints ? (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-outline-variant pl-2.5">
                      {section.endpoints.map((ep) => {
                        const key = endpointKey(section.id, ep.path);
                        const domId = endpointDomId(section.id, ep.path);
                        const isActive = activeEndpoint === domId;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => scrollToEndpoint(section.id, ep.path)}
                            aria-current={isActive ? "location" : undefined}
                            className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left font-data-point text-[12px] transition-colors ${
                              isActive
                                ? "bg-status-ready/10 font-medium text-status-ready"
                                : "text-secondary hover:text-on-surface"
                            }`}
                          >
                            <span
                              className={`mr-1.5 font-bold ${
                                isActive ? "text-status-ready" : "text-outline"
                              }`}
                            >
                              {ep.method}
                            </span>
                            {ep.path}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Center: docs content ───────────────────────────────────────── */}
      <div className="min-w-0">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              API Reference
            </h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Endpoint inti untuk melatih business brain dan mengelola
              pembelajaran karyawan.
            </p>
          </div>

          {/* Global language toggle */}
          <div className="inline-flex shrink-0 self-start rounded-lg border border-outline-variant bg-surface-container-lowest p-1">
            {(["curl", "node"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-md px-3.5 py-1.5 font-data-point text-[12px] transition-colors ${
                  lang === l
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-baseline justify-between gap-4 border-b border-outline-variant pb-3">
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  {section.title}
                </h2>
                {section.endpoints ? (
                  <span className="shrink-0 font-data-point text-[12px] text-secondary">
                    {section.endpoints.length} ENDPOINT
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-6">
                {"body" in section && section.body ? (
                  <div className="guide-content text-body-md leading-6">
                    {section.body}
                  </div>
                ) : null}

                {"endpoints" in section && section.endpoints ? (
                  section.endpoints.map((ep) => {
                    const key = endpointKey(section.id, ep.path);
                    const domId = endpointDomId(section.id, ep.path);
                    return (
                      <div
                        key={key}
                        id={domId}
                        className="scroll-mt-24 rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:border-outline-variant md:p-6"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <MethodBadge method={ep.method} />
                          <code className="rounded border border-outline-variant bg-surface-muted px-2.5 py-1 font-data-point text-[13px] text-on-surface">
                            {ep.path}
                          </code>
                          <span className="ml-auto font-data-point text-[11px] text-secondary">
                            RESPONSE {ep.response} · JSON
                          </span>
                        </div>
                        <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
                          {ep.desc}
                        </p>

                        {ep.params.length > 0 ? (
                          <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-outline-variant bg-surface-bright">
                                  <th className="px-4 py-2 font-label-caps text-label-caps text-secondary">
                                    PARAM
                                  </th>
                                  <th className="px-4 py-2 font-label-caps text-label-caps text-secondary">
                                    TIPE
                                  </th>
                                  <th className="px-4 py-2 font-label-caps text-label-caps text-secondary">
                                    STATUS
                                  </th>
                                  <th className="px-4 py-2 font-label-caps text-label-caps text-secondary">
                                    DESKRIPSI
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {ep.params.map((p) => (
                                  <tr
                                    key={p.name}
                                    className="border-t border-outline-variant first:border-t-0"
                                  >
                                    <td className="px-4 py-2 font-data-point text-[13px] text-on-surface">
                                      {p.name}
                                    </td>
                                    <td className="px-4 py-2 font-data-point text-[13px] text-secondary">
                                      {p.type}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="font-label-caps text-[10px] uppercase text-error">
                                        {p.required ? "Required" : "Opsional"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-body-sm text-body-sm text-on-surface-variant">
                                      {p.desc}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="mt-4 font-label-caps text-[11px] text-secondary">
                            TANPA PARAMETER BODY
                          </p>
                        )}

                        <details
                          ref={(el) => {
                            if (el) detailsRefs.current.set(domId, el);
                            else detailsRefs.current.delete(domId);
                          }}
                          className="group mt-4"
                        >
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg font-label-caps text-label-caps text-status-ready hover:underline">
                            <span className="flex h-6 w-6 items-center justify-center rounded border border-status-ready/30 bg-status-ready/10">
                              <span className="material-symbols-outlined text-[14px]">
                                code
                              </span>
                            </span>
                            <span>LIHAT CONTOH {lang === "curl" ? "CURL" : "NODE.JS"}</span>
                            <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-180">
                              expand_more
                            </span>
                          </summary>
                          <div className="relative mt-3">
                            <pre className="scroll-slim-dark overflow-x-auto rounded-lg bg-inverse-surface p-4 font-data-point text-[12px] leading-5 text-inverse-on-surface">
                              <code>{ep.code(lang)}</code>
                            </pre>
                            <button
                              type="button"
                              onClick={() => copyCode(ep.code(lang))}
                              aria-label="Salin contoh kode"
                              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 font-label-caps text-[10px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedKey === "sample" ? "check" : "content_copy"}
                              </span>
                              {copiedKey === "sample" ? "TERSALIN" : "SALIN"}
                            </button>
                          </div>
                        </details>
                      </div>
                    );
                  })
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}