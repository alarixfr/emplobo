<div align="center">
  
  # Emplobo
  ### Latih sekali, ajar semua — otak SDM untuk UMKM
  
  [![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Site-success?style=for-the-badge)](https://[URL_DEMO])
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://[URL_REPO])
  [![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
  
  **Submission for ITECHNO CUP 2026 - Web Development**
  
  **By Trifecta**
  
</div>

---

## 📋 Daftar Isi

- [Tim Developer](#-tim-pengembang)
- [Tentang Proyek](#-tentang-proyek)
- [Fitur Unggulan](#-fitur-unggulan)
- [Demo & Screenshot](#-demo--screenshot)
- [Teknologi](#-teknologi)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Instalasi & Setup](#-instalasi--setup)
- [Penggunaan](#-penggunaan)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Lisensi](#-lisensi)

---

## 👥 Tim Developer

| Nama | Peran | GitHub |
|------|-------|--------|
| **[Nama Lengkap 1]** | Project Lead & Full Stack Developer | [GitHub](https://github.com/[username1]) |
| **[Nama Lengkap 2]** | Frontend Developer | [GitHub](https://github.com/[username2]) |
| **[Nama Lengkap 3]** | Backend Developer | [GitHub](https://github.com/[username3]) |
| **[Nama Lengkap 4]** | UI/UX Designer | [GitHub](https://github.com/[username4]) |

---

## 🎯 Tentang Proyek

### Latar Belakang

UMKM sering bergantung pada satu orang (owner/HR) untuk mengulang onboarding dan SOP yang sama ke setiap karyawan baru. Proses itu mahal, tidak skalabel, dan mudah inkonsisten — terutama saat bisnis tumbuh cepat tanpa tim training khusus. Emplobo menjawab kebutuhan itu dalam konteks SDG 8 (pekerjaan layak & pertumbuhan ekonomi): pengetahuan operasional yang sudah ada di kepala pemilik bisnis bisa diskalakan ke staf tanpa harus merekrut trainer.

### Solusi yang Ditawarkan

Emplobo adalah **AI-powered SDM/training brain** multi-tenant. Satu bisnis = satu AI “business brain.” Admin (owner/HR) melatih AI lewat Training Room berbasis chat per peran kerja (mis. Kasir, Barista). AI menilai kelengkapan knowledge (0–100), dan setelah siap menghasilkan panduan berstruktur + kuis. Karyawan yang di-assign ke peran itu membaca chapter, mengerjakan kuis, lalu chat dengan AI tutor yang **hanya** menjawab dari materi yang benar-benar diajarkan admin — tanpa mengarang SOP.

### Tujuan Proyek

- 🎯 **Tujuan Utama**: Satu kali training oleh admin → onboarding & tutoring tak terbatas untuk karyawan, 24/7
- 📊 **Target Pengguna**: Owner/HR UMKM (ADMIN) dan karyawan (EMPLOYEE) dalam organisasi Clerk B2B
- 💡 **Value Proposition**: Loop AI-trains-AI (owner ajar sekali → AI ajar semua), digate oleh skor completeness — bukan LMS generik

---

## ✨ Fitur Unggulan

### Fitur Utama

| Fitur | Deskripsi | Keunggulan |
|----------|--------------|---------------|
| **Training Room** | Admin chat dengan AI untuk mengisi SOP/know-how per Role | AI self-score completeness & gate readiness (≥75 → READY) |
| **Guide Generation** | Dari transcript training → chapter markdown + kuis | Structured JSON tervalidasi Zod, ditulis atomik di DB |
| **Employee Learning** | Baca chapter → kuis → progress tracking | Jawaban benar dinilai server-side; `correctIndex` tidak bocor ke client |
| **AI Tutor Chat** | Karyawan tanya AI scoped ke Role yang di-assign | Tidak boleh mengarang SOP di luar materi yang diajarkan |

### Fitur Tambahan

- **Multi-tenant Clerk B2B** - Satu org Clerk = satu UMKM; role `org:admin` / `org:member`
- **Training lock** - Mencegah dua admin train Role yang sama secara bersamaan
- **Rate limit & cooldown** - Proteksi biaya AI (Upstash Redis) di setiap endpoint AI (training, guide gen, chat message, chat session)
- **Dashboard admin** - Statistik lengkap: completion %, skor kuis, per-role progress, pemakaian AI 30 hari
- **Employee Directory** - Halaman khusus admin untuk memantau progress tiap karyawan (search, filter role, AI insight)
- **Developer Docs & Halaman Legal** - `/docs` (API reference 3-pane dengan dark code pane cURL/Node) dan `/privacy`, `/terms`
- **UI/UX polish** - Design system **"Institutional Intelligence"** (Forest Green `#144225`, Enterprise Slate, indigo AI accent) dengan tipografi Inter (headline & body) + JetBrains Mono (data/label-caps) + Material Symbols; sidebar tonal, mobile bottom nav, skeleton loading, readability ring, knowledge gaps, status badge label-caps di seluruh layar (landing, dashboard, training room, guide reader, quiz, chat tutor, learning center, docs, legal)

---

## 📸 Demo & Screenshot

### Live Demo

🔗 **[Kunjungi Website](https://[URL_DEMO])**

### Screenshot Aplikasi

<div align="center">
  <img src="[URL_SCREENSHOT_1]" alt="Homepage" width="800"/>
  <p><em>Homepage - Tampilan utama aplikasi</em></p>
  
  <img src="[URL_SCREENSHOT_2]" alt="Dashboard" width="800"/>
  <p><em>Dashboard - Panel kontrol pengguna</em></p>
  
  <img src="[URL_SCREENSHOT_3]" alt="Feature" width="800"/>
  <p><em>[Nama Fitur] - [Deskripsi screenshot]</em></p>
</div>

### Video Demo

📹 **[Link Video Demo](https://[URL_VIDEO])** _(opsional)_

---

## 🛠️ Teknologi

### Tech Stack

#### Frontend
```
Framework    : Next.js 15 (App Router) + TypeScript
UI Library   : Tailwind CSS v4 + design system "Institutional Intelligence"
               (Forest Green #144225 · Enterprise Slate · indigo AI accent #EEF2FF)
Typography   : Inter (headline + body) · JetBrains Mono (label-caps/data)
Icons        : Material Symbols Outlined (font, via Google Fonts)
Auth UI      : Clerk B2B (Organizations)
Validation   : Zod (client & server, .strict() di API)
Markdown     : react-markdown + remark-gfm + rehype-sanitize
```

#### Backend
```
Runtime      : Node.js
Framework    : Express + TypeScript (apps/api — Section 2+)
Database     : Neon PostgreSQL (pooled + direct URL)
ORM          : Prisma 6 (packages/db)
Auth         : Clerk B2B (JWT verify via @clerk/backend)
AI           : Claude (sonnet training/guide, haiku chat) via OpenRouter API
Cache/RL     : Upstash Redis
```

#### DevOps & Tools
```
Deployment   : Vercel (apps/web) · Railway/Render (apps/api)
Package mgr  : pnpm workspaces (monorepo)
DB host      : Neon
Redis        : Upstash
```

### Alasan Pemilihan Teknologi

| Teknologi | Alasan Pemilihan |
|-----------|------------------|
| **Next.js 15 + Express split** | UI di Next; AI endpoints butuh rate-limit/cooldown/cache konsisten di proses Node panjang (Express) |
| **Clerk B2B Organizations** | Multi-tenant org/role/invite/session tanpa custom auth — kurangi attack surface |
| **Prisma + Neon** | Schema typed, migrasi jelas; Neon pooled untuk runtime, direct URL untuk migrate |
| **Claude via OpenRouter + Upstash** | Model sesuai beban (sonnet vs haiku), satu gateway API untuk akses model; Redis untuk rate limit & cache guide |

### Dependencies Utama

```json
{
  "apps/web": {
    "@clerk/nextjs": "^6",
    "next": "^15.5",
    "zod": "^3",
    "react-markdown": "^10",
    "rehype-sanitize": "^6"
  },
  "packages/db": {
    "@prisma/client": "^6",
    "prisma": "^6"
  }
}
```

---

## 🏗️ Arsitektur Sistem

### System Architecture

```mermaid
flowchart TB
  subgraph Browser["Browser"]
    W["apps/web — Next.js 15<br/>(landing, dashboard, employee directory,<br/>training room, guide reader, quiz,<br/>AI tutor, learning center, docs, legal)"]
  end

  subgraph Clerk["Clerk B2B"]
    CL["Auth / Organizations<br/>org:admin · org:member"]
  end

  subgraph API["apps/api — Express + TypeScript"]
    A["Auth middleware<br/>(JWT verify)"]
    RL["Rate limit & cooldown<br/>(Upstash / in-memory)"]
    TR["Training Room<br/>(lock · heartbeat · AI scoring)"]
    GG["Guide Generation<br/>(structured JSON · Zod)"]
    EMP["Employee Learning<br/>(chapters · quiz grading)"]
    CH["AI Tutor Chat<br/>(grounded on SOP)"]
    DBX["Dashboard summary<br/>(cache 60s)"]
  end

  subgraph Data["Data & AI"]
    DB[("Neon PostgreSQL<br/>via packages/db (Prisma)")]
    RC[("Upstash Redis<br/>guide 10m · role-status 30s")]
    AI["Claude via OpenRouter<br/>sonnet: training/guide · haiku: chat"]
  end

  W -->|Clerk session JWT| A
  W --> CL
  CL --> W
  A --> RL
  RL --> TR & GG & EMP & CH
  TR --> AI
  GG --> AI
  CH --> AI
  TR & GG & CH --> DBX
  TR & GG & EMP & CH --> DB
  GG & TR --> RC
  DBX --> RC
```

**Alur inti (AI-trains-AI):** admin melatih AI per role di Training Room → AI
menilai completeness (≥75 → READY) → guide di-generate terstruktur + kuis →
employee membaca chapter, mengerjakan kuis, dan bertanya ke AI tutor yang
hanya menjawab dari materi yang diajarkan admin.

### Database Schema

Lihat `packages/db/prisma/schema.prisma`. Model inti: `User` (mirror Clerk), `TrainingRole`, `TrainingMessage`, `Guide`/`Chapter`, `Quiz`/`QuizQuestion`/`QuizAttempt`, `EmployeeModule`, `ChapterProgress`, `ChatSession`/`ChatMessage`, `AiUsageLog`. Setiap model tenant-owned punya kolom `orgId`.

### Folder Structure

```
emplobo/
├── apps/
│   ├── web/                 # Next.js 15 — UI + Clerk
│   │   ├── public/          # logo.png, logo-icon.png, favicon.ico
│   │   └── src/app/         # App Router pages
│   └── api/                 # Express API (auth, roles, …)
├── packages/
│   └── db/                  # Prisma schema + client
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml
├── CLAUDE.md                # Spec MVP (source of truth)
└── README.md
```

---

## ⚙️ Instalasi & Setup

### Prerequisites

Pastikan Anda telah menginstall:
- **Node.js** (v20.x atau lebih tinggi)
- **pnpm** (v9+)
- **Neon PostgreSQL** project (pooled + direct connection strings)
- **Clerk** application dengan Organizations diaktifkan
- **Git**

### Langkah Instalasi

#### 1️⃣ Clone Repository

```bash
git clone https://github.com/[username]/emplobo.git
cd emplobo
```

#### 2️⃣ Install Dependencies

```bash
pnpm install
```

#### 3️⃣ Setup Environment Variables

Salin contoh env lalu isi nilai asli (jangan commit file `.env` / `.env.local`):

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp packages/db/.env.example packages/db/.env
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/app"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

`packages/db/.env` (sama `DATABASE_URL` / `DIRECT_URL` dipakai migrasi):

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.neon.tech/emplobo?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/emplobo?sslmode=require"
```

`apps/api/.env` — salin dari `.env.example`, isi Neon + Clerk secret yang sama dengan web, plus webhook secret:

```env
DATABASE_URL="..."   # pooled, sama seperti packages/db
DIRECT_URL="..."
CLERK_SECRET_KEY="sk_test_xxx"
CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_WEBHOOK_SECRET="whsec_xxx"
WEB_APP_ORIGIN="http://localhost:3000"
PORT="4000"
```

Di Clerk Dashboard:
1. Aktifkan **Organizations**, roles `org:admin` / `org:member`
2. Redirect URLs → `http://localhost:3000`
3. **Webhooks** → endpoint `http://localhost:4000/webhooks/clerk` (atau URL tunnel ngrok untuk lokal), events: `user.created`, `user.updated`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`. Paste Signing Secret ke `CLERK_WEBHOOK_SECRET`.

#### 4️⃣ Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Terapkan migrasi awal ke Neon (butuh packages/db/.env terisi)
pnpm db:migrate:deploy
```

#### 5️⃣ Run Development Server

```bash
# Web + API
pnpm dev

# Atau terpisah
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:4000
```

---

## 🚀 Penggunaan

### Menjalankan Aplikasi

```bash
# Development — web (Clerk + UI)
pnpm dev:web

# Development — api (setelah Section 2)
pnpm dev:api

# Keduanya
pnpm dev

# Production build
pnpm build

# Linting
pnpm lint
```

---

## 🚀 Deployment

Arsitektur produksi: **apps/web → Vercel**, **apps/api → Railway/Render**,
**PostgreSQL → Neon (pooled)**, **Clerk B2B production instance**, **Upstash
Redis** (rate limit + cache). Checklist berikut adalah jalur deploy resmi
(Section 13).

### 1️⃣ Deploy `apps/api` ke Railway/Render

Set env vars berikut (nilai production, bukan dev):

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.neon.tech/emplobo?sslmode=require"  # pooled
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/emplobo?sslmode=require"           # direct
CLERK_SECRET_KEY="sk_live_xxx"
CLERK_PUBLISHABLE_KEY="pk_live_xxx"
CLERK_WEBHOOK_SECRET="whsec_xxx"
OPENROUTER_API_KEY="sk-or-xxx"
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
WEB_APP_ORIGIN="https://<web-domain>"   # harus persis origin web yang ter-deploy
PORT="4000"
NODE_ENV="production"
```

> ⚠️ `WEB_APP_ORIGIN` adalah satu-satunya origin yang diizinkan CORS — tidak
> ada wildcard. Pastikan nilainya persis domain web ter-deploy.

### 2️⃣ Deploy `apps/web` ke Vercel

Env vars di Vercel (Production):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"
# Server-side only — dipakai @clerk/nextjs untuk middleware + RSC auth.
# JANGAN pernah diberi prefix NEXT_PUBLIC_ atau diimpor di client components.
CLERK_SECRET_KEY="sk_live_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/app"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
NEXT_PUBLIC_API_URL="https://<api-domain>"
```

> CORS di `apps/web/next.config.ts` otomatis memakai `NEXT_PUBLIC_API_URL`
> untuk `connect-src` CSP — pastikan tidak ada origin lain yang diblokir.

### 3️⃣ Migrasi Database (Neon)

```bash
pnpm db:migrate:deploy   # prisma migrate deploy — bukan migrate dev
```

### 4️⃣ Clerk Dashboard (production)

1. Buat **production instance** baru (jangan pakai dev keys)
2. Aktifkan **Organizations** + roles `org:admin` / `org:member`
3. **Redirect URLs** → domain deploy web (mis. `https://<web-domain>/*`)
4. **Webhooks** → endpoint `https://<api-domain>/webhooks/clerk`, events:
   `user.created`, `user.updated`, `organizationMembership.created`,
   `organizationMembership.updated`, `organizationMembership.deleted`
5. Paste **Signing Secret** ke `CLERK_WEBHOOK_SECRET` di apps/api

### 5️⃣ Verifikasi Keamanan (post-deploy)

```bash
curl -I https://<web-domain>        # cek CSP, X-Frame-Options, X-Content-Type-Options
curl -I https://<api-domain>/health # cek header helmet + CORS hanya untuk web origin
```

Headers yang harus ada di respons API: `Content-Security-Policy`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security`, dan `Access-Control-Allow-Origin` hanya untuk
origin web Anda. Terakhir, jalankan **full demo path** (User Guide Step 14)
sekali penuh terhadap deployment live sebelum submit.

### User Guide

#### Verifikasi Section 3 (Role CRUD)

1. Login sebagai `org:admin` → `/app/roles`
2. Buat role (mis. "Kasir") → redirect ke detail, status `DRAFT`, completeness `0%`
3. `GET /api/roles` dengan Bearer token admin → daftar role org Anda saja
4. Login sebagai `org:member` → `/app/roles` harus redirect ke `/app` (bukan 200)

#### Verifikasi Section 2 (API auth + webhook)

1. `curl http://localhost:4000/health` → `{"ok":true}`
2. `curl http://localhost:4000/api/me` → `401` tanpa token
3. Dari browser (signed-in + org aktif), panggil `/api/me` dengan Bearer session token → `{ auth: { userId, orgId, orgRole } }`
4. Pasang Clerk webhook (lihat Instalasi) → buat/invite member → cek row di tabel `User` (Neon)

#### Verifikasi Section 1 (Clerk B2B)

1. **Registrasi/Login**: Buka `/sign-up` atau `/sign-in` (Clerk hosted components).
2. **Onboarding org**: Setelah sign-up, buat Organization (UMKM) di `/onboarding`, atau pilih undangan.
3. **Org switcher**: Di `/app`, ganti organisasi lewat Clerk `OrganizationSwitcher`.
4. **Undang employee**: Di Clerk Dashboard → Organizations → Members, undang user kedua sebagai `org:member`. Login sebagai member — peran di app harus `EMPLOYEE`.

#### Untuk Admin (`org:admin`)

1. **Dashboard**: `/app` menampilkan header sapaan + aksi cepat, bento grid metrik (total role, karyawan, rata-rata kuis, AI usage), tabel **Brain Readiness** (status badge, progress bar knowledge completeness, aksi edit per role) dan timeline **Recent Activity**.
2. **Roles**: buka `/app/roles` → buat role (nama + deskripsi opsional) → lihat detail di `/app/roles/[id]` (right rail berisi ring readiness + knowledge gaps).
3. **Employee Directory**: `/app/employees` — search, filter pill per role, metrik workforce/completion + kartu AI Insight, tabel progress per karyawan.
4. **Training Room**: Buka `/app/training` (halaman terpusat, bisa pilih role) atau `/app/training/[id]` untuk langsung ke role tertentu — layout 3 kolom (Roles Context / chat dengan ai-bubble & user-bubble / right rail Brain Readiness ring + Knowledge Gaps + tombol Generate Guide). Sistem mengunci sesi training untuk admin aktif, mengirim heartbeat tiap 60 detik, menyimpan pesan admin+AI, serta mengevaluasi completeness tiap 5 pesan admin. Jika admin lain memegang kunci, room terbuka dalam **mode observer** (baca-saja dengan nama pemegang kunci, plus tombol ambil alih saat kunci bebas), dan badge status/completeness diperbarui otomatis tiap 30 detik via polling cache.
5. **Generate Guide**: saat status role `READY` (completeness ≥ 75), klik **Generate Guide** → AI menyusun panduan berstruktur (chapter markdown + kuis) dari seluruh transcript training, divalidasi Zod, lalu ditulis atomik ke DB; status berubah jadi `PUBLISHED`. Maksimal 3 generasi per jam per role.
6. **Assign Karyawan**: setelah `PUBLISHED`, pilih karyawan (`org:member`) dari panel assignment di halaman detail role untuk memberi akses modul. Di halaman Karyawan (`/app/employees`), chip role di tiap baris menampilkan status assignment karyawan tersebut (baca-saja).

#### Untuk Karyawan (`org:member`)

1. **Dashboard Karyawan**: `/app` menampilkan kartu akses Learning Center.
2. **Learning Center**: Buka `/app/my/modules` — kartu modul dengan ikon per role, status pill (BELUM MULAI / SEDANG BERLANGSUNG / SELESAI), progress bar + persentase, tombol Lanjutkan/Mulai, grid sertifikasi kompetensi, dan FAB **Tanya AI Tutor**.
3. **Membaca Modul & Kuis**: Klik modul → guide reader (breadcrumb, badge "AI Verified", kategori, meta, TOC sticky + chapter progress, CTA "Kerjakan Kuis Bab") → kuis satu-soal-per-halaman ("Soal X dari Y", progress bar, Previous/Skip/Submit) dengan grading server-side, dan tandai selesai atau lulus kuis untuk mencatat progres pembelajaran.
4. **Chat AI Tutor (24/7)**: Pindah ke tab "AI TUTOR (24/7)" pada modul terkait — header dengan avatar + indikator online, AI bubble indigo (`ai-bubble`), user bubble hijau, suggestion chips, typing indicator, dan disclaimer. AI tutor di-grounded ketat pada SOP/panduan peran tersebut (tidak mengarang prosedur yang belum diajarkan).

#### Halaman Publik

- **Landing**: `/` — marketing page (hero, keunggulan, cara kerja 3 langkah, CTA).
- **Developer Docs**: `/docs` — API reference 3-pane (TOC, endpoint + param tables, dark code pane cURL/Node toggle).
- **Legal**: `/privacy` (kebijakan privasi, AI grounded, isolasi tenant) & `/terms` (syarat & ketentuan) dengan sticky outline + scroll-spy.

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:4000
Production:  https://[api-domain]
```

Auth: `Authorization: Bearer <Clerk session JWT>` (dari apps/web). `orgId` / `orgRole` diambil **hanya** dari token terverifikasi — bukan dari body/query.

### Endpoints

```http
GET  /health                 # public uptime
POST /webhooks/clerk         # Clerk → User sync (svix-verified, no session auth)
GET  /api/me                 # requireAuth — echo { userId, orgId, orgRole }
GET  /api/admin/ping         # requireAdmin — 403 unless org:admin

# Section 3 — Roles (requireAdmin; orgId dari token)
POST /api/roles              # body: { name, description? } → create DRAFT
GET  /api/roles              # list active roles in org
GET  /api/roles/:id          # single role (404 if wrong org / missing) + missingAreas (Knowledge Gaps, dari cache Redis)

# Section 4 — Training Room (requireAdmin; tenant-scoped + lock enforced)
POST   /api/roles/:id/training/lock       # atomic lock acquire (423 if held by other admin)
PATCH  /api/roles/:id/training/heartbeat  # refresh lock heartbeat (every 60s)
DELETE /api/roles/:id/training/lock       # explicit lock release on room close/unload
GET    /api/roles/:id/training/messages   # load transcript + role status
POST   /api/roles/:id/training/messages   # send admin message, get AI reply, score every 5 admin msgs

# Section 5 — Guide Generation (requireAdmin; role must be READY/PUBLISHED)
GET    /api/roles/:id/guide               # fetch generated guide + chapters + quiz questions (without answer key leak)
POST   /api/roles/:id/guide/generate      # generate/regenerate guide from full transcript (transactional write)

# Section 6 & 7 — Assignment, Employee Learning & Quizzes
GET    /api/roles/:id/assignable-users    # admin list employee candidates + assigned state
POST   /api/roles/:id/assignments         # admin assign published role to employee(s), idempotent
GET    /api/my/modules                    # employee list of assigned modules + per-module progress (chapters, completion %, best score)
GET    /api/my/modules/:roleId/chapters   # employee chapter reader payload + sanitized quizzes + attempts
POST   /api/my/chapters/:id/complete      # employee mark chapter complete (upsert)
POST   /api/my/chapters/:id/quiz/submit   # employee submit quiz answers, server-side grading (no leak)

# Section 8 — Employee AI Chat Tutor (requireAuth; rate-limited + anti-IDOR)
POST   /api/my/chat/sessions              # create chat session (rate-limited; auto-caps at 10 sessions atomically)
GET    /api/my/chat/sessions              # list chat sessions for assigned role
GET    /api/my/chat/sessions/:id/messages # fetch session transcript (ownership verified)
POST   /api/my/chat/sessions/:id/messages # send question, get grounded AI tutor answer (cooldown 2s, rate-limited)

# Section 9 — Admin Dashboard & Employee Directory (requireAdmin)
GET    /api/dashboard/summary             # counts, avg quiz score, per-role completion, AI usage 30d, recentActivity timeline
GET    /api/employees                     # per-employee aggregates (assignments, avg completion %, avg best quiz score) untuk Employee Directory
```

> **Caching (Section 6)**: guide & role-status di-cache di Upstash Redis
> (guide 10 menit, status role 30 detik, dashboard 60 detik). Cache
> di-invalidate otomatis saat guide di-generate ulang atau skor berubah.
> Semua data per-user (chat sessions, quiz attempts, progress) **tidak
> pernah** masuk cache ini.
>
> **Member Sync**: tabel `User` adalah mirror dari Clerk dan biasanya diisi
> lewat webhook. Agar member yang bergabung sebelum webhook terpasang tetap
> muncul, endpoint admin yang menampilkan daftar user (`GET /api/employees`,
> `GET /api/dashboard/summary`, `GET /api/roles/:id/assignable-users`) otomatis
> menyinkronkan membership organisasi dari Clerk ke `User` (cooldown 60 detik
> per org, best-effort, tidak pernah memblokir request).
>
> **AI Usage (AiUsageLog)**: setiap panggilan AI (training, guide
> generation, chat tutor) dicatat ke tabel `AiUsageLog` (org, user, kind,
> token in/out) — basis data untuk tampilan "Pemakaian AI" di dashboard
> admin. Rate limit tetap ditegakkan oleh Redis; tabel ini murni untuk
> audit/statistik dan tidak pernah dipakai untuk enforcement.

Training Room lock/heartbeat/messages sudah tersedia di Section 4, termasuk observer mode saat lock dipakai admin lain, server cooldown 2 detik, dan rate limit per user. Step 5 (Guide Generation) sudah aktif dengan validasi JSON ketat, retry sekali untuk output model invalid, rate limit, cooldown, dan penulisan DB atomik via transaction. Step 6, 7, dan 8 juga aktif: admin bisa assign employee dari role detail page, employee bisa membuka modul sendiri, membaca chapter, mengerjakan kuis dengan grading server-side tanpa kebocoran kunci jawaban, serta berdialog langsung dengan AI Tutor 24/7 yang di-grounded pada SOP bisnis.

### Example Request

```javascript
const token = await window.Clerk.session.getToken();
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roles`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "Kasir", description: "POS & pembayaran" }),
});
```

📖 **[Dokumentasi API Lengkap](./docs/API.md)** _(opsional)_

---

## 🧪 Testing

### Running Tests

```bash
# Type-check API
pnpm --filter @emplobo/api lint

# Type-check packages/db
pnpm --filter @emplobo/db exec tsc --noEmit

# Lint web
pnpm --filter @emplobo/web lint

# Production build web
pnpm --filter @emplobo/web build

# Runtime smoke checks
curl http://localhost:4000/health
curl http://localhost:4000/api/me                # expected 401 without token
curl http://localhost:3000/favicon.ico           # expected 200
curl http://localhost:3000/nonexistent           # expected 404
```

### Test Coverage

Belum ada suite unit/integration/e2e terpisah pada tahap ini. Validasi saat ini
berbasis lint/typecheck/build + smoke test endpoint/routing. Verifikasi fungsional
per Section tersedia di bagian [User Guide](#-penggunaan) (Step 1–12 sudah aktif:
seluruh fitur inti sampai AI Tutor grounded, polish UI/UX — design system
"Institutional Intelligence" (Forest Green/Inter/JetBrains Mono + Material
Symbols) konsisten di landing, dashboard, employee directory, training room,
guide reader, quiz, AI tutor, learning center, docs, dan halaman legal — serta
checklist keamanan Section 8 terverifikasi: tenant scoping (orgId di semua query),
scoping employee per userId, ownership ChatSession dicek ulang tiap pesan
(anti-IDOR), correctIndex tidak pernah bocor ke payload employee, sanitasi input
`<business_data>` + strip tag penutup, rate limit & cooldown di semua endpoint
AI, CORS allowlist tanpa wildcard, helmet + CSP ketat, verifikasi webhook svix,
Zod `.strict()` di semua request body, lock training atomik via `updateMany`,
guide generation dalam `$transaction`, dan rehype-sanitize tanpa rehype-raw).

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE) - lihat file LICENSE untuk detail lebih lanjut.

---

<div align="center">

  **Made with ❤️ by [Nama Tim] for ITECHNO CUP 2026**

  
</div>
