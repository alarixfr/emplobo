import Busboy from "busboy";
import { prisma, Prisma } from "@emplobo/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import {
KNOWLEDGE_DRAFT_MAX,
  KNOWLEDGE_FILE_MAX_BYTES,
  KNOWLEDGE_ORG_MAX_BYTES,
  buildKnowledgeDocumentDetail,
  buildKnowledgeDocumentSummaries,
  byteSize,
  chunkKnowledgeContent,
  cleanKnowledgeText,
  deriveManualKnowledgeSource,
  estimateTokens,
  extractKnowledgeSource,
  formatKnowledgeChunksForPrompt,
  getKnowledgeQuota,
  searchKnowledgeChunks,
} from "../lib/knowledge.js";

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

type KnowledgeSummary = Awaited<ReturnType<typeof buildKnowledgeDocumentSummaries>>[number];

const createManualKnowledgeSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional(),
    content: z.string().trim().min(1).max(400_000),
  })
  .strict();

const updateKnowledgeSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).nullable().optional(),
    content: z.string().trim().min(1).max(400_000),
  })
  .strict();

const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

type MultipartUpload = {
  fields: Record<string, string>;
  file: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
};

type SerializableTx = Prisma.TransactionClient;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before knowledge handlers");
  }
  return req.auth;
}

function toKnowledgeResponseQuota(quota: Awaited<ReturnType<typeof getKnowledgeQuota>>) {
  return {
    ...quota,
    remainingBytes: Math.max(0, quota.limitBytes - quota.usedBytes),
    usedPct:
      quota.limitBytes > 0 ? Math.min(100, Math.round((quota.usedBytes / quota.limitBytes) * 100)) : 0,
  };
}

// Surface the DRAFT review-gate cap as a 409 with a usable message instead of
// falling through to the generic 500 handler.
function respondDraftLimitError(err: unknown, res: Response): boolean {
  if (err instanceof Error && /draft limit reached/i.test(err.message)) {
    res.status(409).json({
      error:
        `Maksimal ${KNOWLEDGE_DRAFT_MAX} file DRAFT dapat menunggu konfirmasi. ` +
        `Konfirmasi atau hapus file DRAFT yang ada terlebih dahulu.`,
    });
    return true;
  }
  return false;
}

function asSummary(document: KnowledgeSummary) {
  return document;
}

function parseMultipartUpload(req: Request): Promise<MultipartUpload> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType?.includes("multipart/form-data")) {
      reject(new Error("invalid content type"));
      return;
    }

    const fields: Record<string, string> = {};
    let fileSeen = false;
    let fileTooLarge = false;
    let resolvedFile: MultipartUpload["file"] | null = null;
    const fileChunks: Buffer[] = [];

    const bb = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: KNOWLEDGE_FILE_MAX_BYTES,
        fields: 4,
        parts: 6,
      },
    });

    bb.on("field", (name, value) => {
      fields[name] = cleanKnowledgeText(String(value)).slice(0, 2000);
    });

    bb.on("file", (name, file, info) => {
      if (name !== "file") {
        file.resume();
        return;
      }

      if (fileSeen) {
        file.resume();
        reject(new Error("only one file can be uploaded per request"));
        return;
      }

      fileSeen = true;
      resolvedFile = {
        buffer: Buffer.alloc(0),
        filename: info.filename || "knowledge-file",
        mimeType: info.mimeType || "application/octet-stream",
      };

      file.on("data", (chunk: Buffer) => {
        fileChunks.push(chunk);
      });

      file.on("limit", () => {
        fileTooLarge = true;
        file.resume();
      });

      file.on("error", reject);
    });

    bb.on("error", reject);

    bb.on("finish", () => {
      if (!fileSeen || !resolvedFile) {
        reject(new Error("file field is required"));
        return;
      }

      if (fileTooLarge) {
        reject(new Error("file exceeds 10 MB limit"));
        return;
      }

      resolve({
        fields,
        file: {
          buffer: Buffer.concat(fileChunks),
          filename: resolvedFile.filename,
          mimeType: resolvedFile.mimeType,
        },
      });
    });

    req.pipe(bb);
  });
}

async function runSerializableTransaction<T>(fn: (tx: SerializableTx) => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034" &&
        attempt < maxAttempts - 1
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("failed to complete transaction");
}

async function ensureQuotaRow(tx: SerializableTx, orgId: string) {
  await tx.knowledgeQuota.upsert({
    where: { orgId },
    create: {
      orgId,
      usedBytes: 0,
      documentCount: 0,
    },
    update: {},
  });
}

async function adjustQuota(
  tx: SerializableTx,
  orgId: string,
  bytesDelta: number,
  documentDelta: number,
) {
  await ensureQuotaRow(tx, orgId);

  if (bytesDelta > KNOWLEDGE_ORG_MAX_BYTES) {
    throw new Error("knowledge library exceeds the 100 MB organization limit");
  }

  if (bytesDelta > 0) {
    const updated = await tx.knowledgeQuota.updateMany({
      where: {
        orgId,
        usedBytes: { lte: KNOWLEDGE_ORG_MAX_BYTES - bytesDelta },
      },
      data: {
        usedBytes: { increment: bytesDelta },
        documentCount: { increment: documentDelta },
      },
    });

    if (updated.count === 0) {
      throw new Error("organization knowledge quota exceeded");
    }
    return;
  }

  await tx.knowledgeQuota.updateMany({
    where: { orgId },
    data: {
      usedBytes: { increment: bytesDelta },
      documentCount: { increment: documentDelta },
    },
  });
}

async function persistDocument(params: {
  tx: SerializableTx;
  orgId: string;
  userId: string;
  title: string;
  description?: string | null;
  content: string;
  sourceType?: "UPLOAD" | "MANUAL";
  fileName?: string | null;
  mimeType?: string | null;
  existingId?: string;
}) {
  const normalizedContent = cleanKnowledgeText(params.content);
  if (!normalizedContent) {
    throw new Error("knowledge content cannot be empty");
  }

  const sourceBytes = byteSize(normalizedContent);
  const chunks = chunkKnowledgeContent(normalizedContent, params.title);
  const contentHash = deriveManualKnowledgeSource(normalizedContent).contentHash;

  if (params.existingId) {
    const existing = await params.tx.knowledgeDocument.findFirst({
      where: { id: params.existingId, orgId: params.orgId },
      select: {
        id: true,
        sourceBytes: true,
        fileName: true,
        mimeType: true,
        sourceType: true,
      },
    });

    if (!existing) {
      throw new Error("knowledge document not found");
    }

    const deltaBytes = sourceBytes - existing.sourceBytes;
    await adjustQuota(params.tx, params.orgId, deltaBytes, 0);

    const document = await params.tx.knowledgeDocument.update({
      where: { id: existing.id },
      data: {
        title: params.title,
        description: params.description ?? null,
        content: normalizedContent,
        fileName: params.fileName ?? existing.fileName,
        mimeType: params.mimeType ?? existing.mimeType,
        sourceType: params.sourceType ?? existing.sourceType,
        sourceBytes,
        contentHash,
        version: { increment: 1 },
        updatedBy: params.userId,
      },
      select: { id: true },
    });

    await params.tx.knowledgeChunk.deleteMany({
      where: { documentId: document.id, orgId: params.orgId },
    });

    await params.tx.knowledgeChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId: document.id,
        orgId: params.orgId,
        order: chunk.order,
        heading: chunk.heading,
        content: chunk.content,
        tokenEst: chunk.tokenEst,
      })),
    });

    return document.id;
  }

  // New documents always land in DRAFT — enforce the review-gate cap before
  // touching the quota, inside the same serializable transaction, so a
  // concurrent upload flood can't exceed the limit (check-then-write race).
  const draftCount = await params.tx.knowledgeDocument.count({
    where: { orgId: params.orgId, status: "DRAFT" },
  });
  if (draftCount >= KNOWLEDGE_DRAFT_MAX) {
    throw new Error(
      `knowledge draft limit reached (${KNOWLEDGE_DRAFT_MAX}): konfirmasi atau hapus file DRAFT yang ada`,
    );
  }

  await adjustQuota(params.tx, params.orgId, sourceBytes, 1);

  const document = await params.tx.knowledgeDocument.create({
    data: {
      orgId: params.orgId,
      title: params.title,
      description: params.description ?? null,
      // New knowledge is a DRAFT until an admin confirms it (Training Room /
      // Knowledge page). searchKnowledgeChunks only ever reads ACTIVE rows, so
      // a draft is never injected into an AI prompt.
      status: "DRAFT",
      sourceType: params.sourceType ?? "MANUAL",
      fileName: params.fileName ?? null,
      mimeType: params.mimeType ?? null,
      sourceBytes,
      contentHash,
      content: normalizedContent,
      createdBy: params.userId,
      updatedBy: params.userId,
    },
    select: { id: true },
  });

  await params.tx.knowledgeChunk.createMany({
    data: chunks.map((chunk) => ({
      documentId: document.id,
      orgId: params.orgId,
      order: chunk.order,
      heading: chunk.heading,
      content: chunk.content,
      tokenEst: chunk.tokenEst,
    })),
  });

  return document.id;
}

export function createKnowledgeRouter(requireAdmin: AuthMiddleware, env: Env): Router {
  const router = Router();
  const writeLimiter = createRateLimiter(env, {
    limit: 20,
    windowSeconds: 10 * 60,
    prefix: "rl:knowledge-writes",
  });
  const uploadLimiter = createRateLimiter(env, {
    limit: 10,
    windowSeconds: 10 * 60,
    prefix: "rl:knowledge-uploads",
  });

  router.use(requireAdmin);

  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const [documents, quota] = await Promise.all([
        buildKnowledgeDocumentSummaries(auth.orgId),
        getKnowledgeQuota(auth.orgId),
      ]);

      res.json({
        quota: toKnowledgeResponseQuota(quota),
        documents: documents.map(asSummary),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/search", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const parsed = searchSchema.safeParse({ q: req.query.q });
      if (!parsed.success) {
        res.status(400).json({ error: "invalid query", details: parsed.error.flatten() });
        return;
      }

      const chunks = await searchKnowledgeChunks({
        orgId: auth.orgId,
        query: parsed.data.q,
        limit: 12,
        tokenBudget: 5000,
      });

      res.json({
        query: parsed.data.q,
        knowledgeBase: formatKnowledgeChunksForPrompt(chunks),
        chunks,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/documents", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const rate = await writeLimiter(auth.userId);
      if (!rate.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rate.retryAfter });
        return;
      }

      const parsed = createManualKnowledgeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }

      const title = cleanKnowledgeText(parsed.data.title);
      const description = parsed.data.description ? cleanKnowledgeText(parsed.data.description) : null;
      const content = cleanKnowledgeText(parsed.data.content);

      const documentId = await runSerializableTransaction((tx) =>
        persistDocument({
          tx,
          orgId: auth.orgId,
          userId: auth.userId,
          title,
          description,
          content,
          sourceType: "MANUAL",
        }),
      );

      const document = await buildKnowledgeDocumentDetail(auth.orgId, documentId);
      if (!document) {
        res.status(500).json({ error: "failed to load created document" });
        return;
      }

      res.status(201).json({ document });
    } catch (err) {
      if (respondDraftLimitError(err, res)) {
        return;
      }
      next(err);
    }
  });

  router.post("/upload", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const rate = await uploadLimiter(auth.userId);
      if (!rate.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rate.retryAfter });
        return;
      }

      const uploaded = await parseMultipartUpload(req);
      const titleInput = cleanKnowledgeText(uploaded.fields.title || "");
      const descriptionInput = uploaded.fields.description ? cleanKnowledgeText(uploaded.fields.description) : null;

      const extracted = await extractKnowledgeSource({
        buffer: uploaded.file.buffer,
        filename: uploaded.file.filename,
        mimeType: uploaded.file.mimeType,
      });

      if (uploaded.file.buffer.byteLength > KNOWLEDGE_FILE_MAX_BYTES) {
        res.status(413).json({ error: "file exceeds 10 MB limit" });
        return;
      }

      const title = titleInput || extracted.title;

      const documentId = await runSerializableTransaction((tx) =>
        persistDocument({
          tx,
          orgId: auth.orgId,
          userId: auth.userId,
          title,
          description: descriptionInput,
          content: extracted.content,
          sourceType: "UPLOAD",
          fileName: uploaded.file.filename,
          mimeType: uploaded.file.mimeType,
        }),
      );

      const document = await buildKnowledgeDocumentDetail(auth.orgId, documentId);
      if (!document) {
        res.status(500).json({ error: "failed to load created document" });
        return;
      }

      res.status(201).json({ document });
    } catch (err) {
      if (err instanceof Error && /10 mb limit/i.test(err.message)) {
        res.status(413).json({ error: err.message });
        return;
      }
      if (respondDraftLimitError(err, res)) {
        return;
      }
      next(err);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid document id" });
        return;
      }

      const document = await buildKnowledgeDocumentDetail(auth.orgId, id.data);
      if (!document) {
        res.status(404).json({ error: "knowledge document not found" });
        return;
      }

      res.json({ document });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/knowledge/:id/approve — promote a DRAFT so the AI training /
  // tutor / guide flows may start using it. Idempotent for ACTIVE documents.
  router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid document id" });
        return;
      }

      const existing = await prisma.knowledgeDocument.findFirst({
        where: { id: id.data, orgId: auth.orgId },
        select: { id: true, status: true },
      });
      if (!existing) {
        res.status(404).json({ error: "knowledge document not found" });
        return;
      }
      if (existing.status === "ARCHIVED") {
        res.status(409).json({ error: "archived documents cannot be approved" });
        return;
      }

      if (existing.status !== "ACTIVE") {
        await prisma.knowledgeDocument.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", updatedBy: auth.userId },
        });
      }

      const document = await buildKnowledgeDocumentDetail(auth.orgId, existing.id);
      if (!document) {
        res.status(500).json({ error: "failed to load approved document" });
        return;
      }
      res.json({ document });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const rate = await writeLimiter(auth.userId);
      if (!rate.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rate.retryAfter });
        return;
      }

      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid document id" });
        return;
      }

      const parsed = updateKnowledgeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }

      const documentId = await runSerializableTransaction((tx) =>
        persistDocument({
          tx,
          orgId: auth.orgId,
          userId: auth.userId,
          title: cleanKnowledgeText(parsed.data.title),
          description: parsed.data.description ? cleanKnowledgeText(parsed.data.description) : null,
          content: cleanKnowledgeText(parsed.data.content),
          existingId: id.data,
        }),
      );

      const document = await buildKnowledgeDocumentDetail(auth.orgId, documentId);
      if (!document) {
        res.status(500).json({ error: "failed to load updated document" });
        return;
      }

      res.json({ document });
    } catch (err) {
      if (err instanceof Error && /quota exceeded/i.test(err.message)) {
        res.status(409).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const rate = await writeLimiter(auth.userId);
      if (!rate.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rate.retryAfter });
        return;
      }

      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid document id" });
        return;
      }

      const deleted = await runSerializableTransaction(async (tx) => {
        const document = await tx.knowledgeDocument.findFirst({
          where: { id: id.data, orgId: auth.orgId },
          select: { id: true, sourceBytes: true },
        });

        if (!document) {
          return false;
        }

        await tx.knowledgeDocument.delete({ where: { id: document.id } });
        await adjustQuota(tx, auth.orgId, -document.sourceBytes, -1);
        return true;
      });

      if (!deleted) {
        res.status(404).json({ error: "knowledge document not found" });
        return;
      }

      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}