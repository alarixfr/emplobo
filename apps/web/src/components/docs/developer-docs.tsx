"use client";

import { useState } from "react";

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
    title: "Training Endpoints",
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
        desc: "Mengirim pesan training admin → AI. Setiap 5 pesan, AI menilai ulang completeness (0–100).",
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

export function DeveloperDocs() {
  const [lang, setLang] = useState<Lang>("curl");
  const [activeSection, setActiveSection] = useState("intro");
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  function scrollToId(id: string) {
    setActiveSection(id);
    setActiveEndpoint(null);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToEndpoint(secId: string, path: string) {
    setActiveSection(secId);
    const key = `${secId}:${path}`;
    setActiveEndpoint(key);
    const el = document.getElementById(`ep-${key.replace(/[^a-zA-Z0-9]/g, "-")}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeCode =
    activeEndpoint !== null
      ? (() => {
          for (const s of SECTIONS) {
            if (!s.endpoints) continue;
            const ep = s.endpoints.find(
              (e) => `${s.id}:${e.path}` === activeEndpoint,
            );
            if (ep) return ep.code(lang);
          }
          return "";
        })()
      : `# Emplobo REST API
# Pilih endpoint pada kolom sebelah kiri untuk melihat contoh request.
#
# Semua request memerlukan:
#   Authorization: Bearer <CLERK_SESSION_TOKEN>
#
# Coba di lingkungan pengembangan Anda:

$API=${process.env.NEXT_PUBLIC_API_URL ?? "https://api.emplobo-demo.example.com"}

curl "$API/health"`;

  const activeEndpointStatus =
    activeEndpoint !== null
      ? (() => {
          for (const s of SECTIONS) {
            if (!s.endpoints) continue;
            const ep = s.endpoints.find(
              (e) => `${s.id}:${e.path}` === activeEndpoint,
            );
            if (ep) return ep.response;
          }
          return 200;
        })()
      : 200;

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr_420px]">
      {/* ── Left TOC ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <p className="font-label-caps text-label-caps text-secondary">
              API DOCS
            </p>
            <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">
              Emplobo Developer Hub
            </h2>
          </div>
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToId(section.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-primary-container font-medium text-on-primary-container"
                    : "text-secondary hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Center: endpoint docs ─────────────────────────────────────── */}
      <div className="min-w-0">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          API Reference
        </h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Endpoint inti untuk melatih business brain dan mengelola pembelajaran
          karyawan.
        </p>

        <div className="mt-8 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-headline-sm text-headline-sm text-primary">
                {section.title}
              </h2>
              <div className="mt-4 space-y-6">
                {"body" in section && section.body ? (
                  <div className="guide-content text-body-md leading-6">
                    {section.body}
                  </div>
                ) : null}

                {"endpoints" in section && section.endpoints ? (
                  section.endpoints.map((ep) => {
                    const key = `${section.id}:${ep.path}`;
                    return (
                      <div
                        key={key}
                        id={`ep-${key.replace(/[^a-zA-Z0-9]/g, "-")}`}
                        className="scroll-mt-24 rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <MethodBadge method={ep.method} />
                          <code className="rounded border border-outline-variant bg-surface-muted px-2.5 py-1 font-data-point text-[13px] text-on-surface">
                            {ep.path}
                          </code>
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
                                  <tr key={p.name} className="border-t border-outline-variant first:border-t-0">
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
                          <p className="mt-3 font-label-caps text-[11px] text-secondary">
                            TANPA PARAMETER BODY
                          </p>
                        )}

                        {/* Inline code sample for mobile/tablet — the dark
                            right pane is hidden below lg, so the "see example"
                            action must work without it. */}
                        <details className="group mt-4 lg:hidden">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-label-caps text-label-caps text-status-ready">
                            <span className="material-symbols-outlined text-[16px]">
                              code
                            </span>
                            LIHAT CONTOH cURL
                          </summary>
                          <pre className="scroll-slim-dark mt-3 overflow-x-auto rounded-lg bg-inverse-surface p-4 font-data-point text-[12px] leading-5 text-inverse-on-surface">
                            {ep.code("curl")}
                          </pre>
                        </details>

                        <button
                          type="button"
                          onClick={() => scrollToEndpoint(section.id, ep.path)}
                          className="mt-4 hidden items-center gap-2 font-label-caps text-label-caps text-status-ready hover:underline lg:inline-flex"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            code
                          </span>
                          LIHAT CONTOH {lang === "curl" ? "cURL" : "NODE.JS"}
                        </button>
                        <p className="mt-3 font-data-point text-[11px] text-secondary">
                          RESPONSE: {ep.response} · JSON
                        </p>
                      </div>
                    );
                  })
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Right dark code pane ──────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-lg bg-inverse-surface p-0 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-error/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-status-locked/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary-fixed-dim" />
            </div>
            <div className="flex gap-1 rounded-lg bg-white/10 p-1">
              {(["curl", "node"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-md px-3 py-1 font-data-point text-[11px] transition-colors ${
                    lang === l
                      ? "bg-white/15 text-on-primary"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <pre className="scroll-slim-dark max-h-[640px] overflow-auto p-4 font-data-point text-[13px] leading-6 text-inverse-on-surface">
            <code>{activeCode}</code>
          </pre>
          <div className="border-t border-white/10 px-4 py-2.5 font-data-point text-[11px] text-primary-fixed-dim">
            RESPONSE: {activeEndpoint !== null ? activeEndpointStatus : "—"} OK · JSON
          </div>
        </div>
      </aside>
    </div>
  );
}
