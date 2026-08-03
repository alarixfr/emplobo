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

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Unggulan](#-fitur-unggulan)
- [Demo & Screenshot](#-demo--screenshot)
- [Teknologi](#-teknologi)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Instalasi & Setup](#-instalasi--setup)
- [Penggunaan](#-penggunaan)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Tim Developer](#-tim-pengembang)
- [Lisensi](#-lisensi)

---

## 👥 Tim Developer

| Nama | Peran | GitHub |
|------|-------|--------|
| **[Nama Lengkap 1]** | Project Lead & Full Stack Developer | [GitHub](https://github.com/[username1]) |
| **[Nama Lengkap 2]** | Frontend Developer | [GitHub](https://github.com/[username2]) |
| **[Nama Lengkap 3]** | Backend Developer | [GitHub](https://github.com/[username3]) |
| **[Nama Lengkap 4]** | UI/UX Designer | [GitHub](https://github.com/[username4]) |
| **[Nama Lengkap 4]** | UI/UX Designer | [@username4](https://github.com/[username4]) |

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
- **Rate limit & cooldown** - Proteksi biaya AI (Upstash Redis) di setiap endpoint AI
- **Dashboard admin** - Ringkasan completion % dan skor kuis (Section berikutnya)

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
UI Library   : Tailwind CSS + shadcn/ui
Auth UI      : Clerk B2B (Organizations)
Validation   : Zod + React Hook Form
Markdown     : react-markdown + remark-gfm + rehype-sanitize
```

#### Backend
```
Runtime      : Node.js
Framework    : Express + TypeScript (apps/api — Section 2+)
Database     : Neon PostgreSQL (pooled + direct URL)
ORM          : Prisma 6 (packages/db)
Auth         : Clerk B2B (JWT verify via @clerk/backend)
AI           : Anthropic Claude (sonnet training/guide, haiku chat)
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
| **Anthropic + Upstash** | Model sesuai beban (sonnet vs haiku); Redis untuk rate limit & cache guide |

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
flowchart LR
  Browser --> Web["apps/web<br/>Next.js 15"]
  Web -->|Clerk session JWT| API["apps/api<br/>Express"]
  Web --> Clerk["Clerk B2B"]
  API --> Clerk
  API --> DB["Neon PostgreSQL<br/>via packages/db"]
  API --> Redis["Upstash Redis"]
  API --> Anthropic["Anthropic Claude"]
```

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

1. **Dashboard**: `/app` menampilkan org aktif dan peran `ADMIN`.
2. **Roles**: buka `/app/roles` → buat role (nama + deskripsi opsional) → lihat detail di `/app/roles/[id]`.
3. **Training Room**: Section 4 (belum di-wire) — setelah Role ada, admin melatih AI di sini.

#### Untuk Karyawan (`org:member`)

1. **Modul Saya**: Section 6+ (belum di-wire).
2. Saat ini cukup verifikasi bahwa session + org role ter-resolve dengan benar di `/app` (tanpa akses `/app/roles`).

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
GET  /api/roles/:id          # single role (404 if wrong org / missing)
```

Training, guides, assignments, employee modules, chat: Section 4+.

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
berbasis lint/typecheck/build + smoke test endpoint/routing sesuai Section 0–3.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE) - lihat file LICENSE untuk detail lebih lanjut.

---

<div align="center">

  **Made with ❤️ by [Nama Tim] for ITECHNO CUP 2026**

  
</div>