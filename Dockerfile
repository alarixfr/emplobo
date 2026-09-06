# Emplobo API — production image
# Built at the repo root so the pnpm workspace (packages/db) resolves correctly.
# Requires Node >= 22.18: the API's compiled output imports @emplobo/db whose
# entry is a .ts file, which Node 22.18+ runs natively via type-stripping.
FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install all workspace dependencies (frozen against pnpm-lock.yaml).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

# Generate the Prisma client, then build the API.
COPY packages/db/prisma packages/db/prisma
COPY packages/db/src packages/db/src
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
RUN pnpm --filter @emplobo/db generate
RUN pnpm --filter @emplobo/api build

EXPOSE 4000
ENV NODE_ENV=production

# Migrations run on every boot (idempotent) so a fresh Neon DB is auto-set-up.
CMD ["sh", "-c", "pnpm --filter @emplobo/db exec prisma migrate deploy && node -r dotenv/config apps/api/dist/index.js"]