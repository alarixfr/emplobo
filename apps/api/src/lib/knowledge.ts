import crypto from "node:crypto";
import path from "node:path";
import { prisma, Prisma } from "@emplobo/db";
import { fileTypeFromBuffer } from "file-type";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import * as XLSX from "xlsx";

export const KNOWLEDGE_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const KNOWLEDGE_ORG_MAX_BYTES = 100 * 1024 * 1024;
// Hard cap on unconfirmed DRAFT documents per org. Keeps the review gate
// meaningful: without it, the library can silently fill with stale files that
// never reached ACTIVE (and therefore were never usable by the AI).
export const KNOWLEDGE_DRAFT_MAX = 5;
const DEFAULT_PROMPT_CHUNK_LIMIT = 8;
const DEFAULT_PROMPT_TOKEN_BUDGET = 6000;
const CHUNK_CHAR_BUDGET = 1800;

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "tsv",
  "txt",
  "md",
  "markdown",
  "html",
  "htm",
  "json",
  "xml",
  "yaml",
  "yml",
]);

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/json",
  "application/xml",
  "text/xml",
  "application/x-yaml",
  "text/yaml",
]);

export type KnowledgeChunkPrompt = {
  documentId: string;
  documentTitle: string;
  chunkOrder: number;
  heading: string | null;
  content: string;
  sourceType: string;
  fileName: string | null;
};

export type KnowledgeDocumentSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sourceType: string;
  fileName: string | null;
  mimeType: string | null;
  sourceBytes: number;
  contentHash: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
  excerpt: string;
};

export type KnowledgeDocumentDetail = KnowledgeDocumentSummary & {
  content: string;
  chunks: Array<{
    id: string;
    order: number;
    heading: string | null;
    content: string;
    tokenEst: number;
  }>;
};

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function cleanKnowledgeText(input: string): string {
  return input
    .replace(/<\/?business_data>/gi, "")
    .replace(/<\/?knowledge_base>/gi, "")
    .replace(/```xml\s*[\s\S]*?<\/?knowledge_base>\s*```/gi, "")
    .replace(/```xml\s*[\s\S]*?<\/?business_data>\s*```/gi, "")
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function byteSize(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function fileBaseName(filename: string): string {
  return path.basename(filename).replace(/\.[^.]+$/, "").trim();
}

function extensionOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
  return ext;
}

function inferKind(filename: string, mimeType: string | undefined, buffer: Buffer): string {
  const extension = extensionOf(filename);
  const detectedMime = SUPPORTED_MIME_TYPES.has(mimeType ?? "") ? mimeType : null;

  if (detectedMime === "application/pdf" || extension === "pdf") return "pdf";
  if (
    detectedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return "docx";
  }
  if (
    detectedMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === "xlsx"
  ) {
    return "xlsx";
  }
  if (extension === "csv" || extension === "tsv") return extension;
  if (["txt", "md", "markdown", "html", "htm", "json", "xml", "yaml", "yml"].includes(extension)) {
    return extension;
  }

  if (SUPPORTED_EXTENSIONS.has(extension)) {
    return extension;
  }

  // Some browsers do not provide a useful MIME for text documents. If the
  // file is clearly text-like, treat it as plain text rather than rejecting.
  if (mimeType?.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml") {
    return "txt";
  }

  // As a last fallback, inspect the magic bytes so we can still accept a
  // few common office formats even when the filename is missing a useful
  // extension.
  void buffer;
  return "unknown";
}

async function extractTextFromBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
}): Promise<{ kind: string; text: string; normalizedFilename: string; mimeType: string | null }> {
  const normalizedFilename = path.basename(params.filename || "knowledge-file");
  const inferredMime = params.mimeType?.trim() || null;
  const kind = inferKind(normalizedFilename, inferredMime ?? undefined, params.buffer);
  const detected = await fileTypeFromBuffer(params.buffer).catch(() => undefined);

  if (detected?.mime && !SUPPORTED_MIME_TYPES.has(detected.mime)) {
    throw new Error("Unsupported file type. Use PDF, DOCX, XLSX, CSV, TXT, Markdown, HTML, JSON, XML, or YAML.");
  }

  const extension = extensionOf(normalizedFilename);
  if (kind === "unknown") {
    if (detected?.mime === "application/pdf") return extractTextFromBuffer({ ...params, mimeType: "application/pdf" });
    if (extension === "txt" || extension === "md" || extension === "markdown" || extension === "html" || extension === "htm" || extension === "json" || extension === "xml" || extension === "yaml" || extension === "yml") {
      return extractTextFromBuffer({ ...params, mimeType: "text/plain" });
    }
    throw new Error("Unsupported file type. Use PDF, DOCX, XLSX, CSV, TXT, Markdown, HTML, JSON, XML, or YAML.");
  }

  let text = "";

  if (kind === "pdf") {
    const pdfParseModule = await import("pdf-parse");
    const parsePdf = pdfParseModule as unknown as (buffer: Buffer) => Promise<{
      text: string;
    }>;
    const parsed = await parsePdf(params.buffer);
    text = parsed.text;
  } else if (kind === "docx") {
    const parsed = await mammoth.extractRawText({ buffer: params.buffer });
    text = parsed.value;
  } else if (kind === "xlsx") {
    const workbook = XLSX.read(params.buffer, { type: "buffer" });
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      const renderedRows = rows
        .map((row) =>
          row
            .map((cell) => String(cell ?? "").trim())
            .filter(Boolean)
            .join(" | "),
        )
        .filter(Boolean)
        .join("\n");
      sheets.push(`Sheet: ${sheetName}\n${renderedRows}`);
    }
    text = sheets.join("\n\n");
  } else if (kind === "csv" || kind === "tsv" || kind === "txt" || kind === "md" || kind === "markdown" || kind === "json" || kind === "xml" || kind === "yaml" || kind === "yml") {
    text = params.buffer.toString("utf8");
  } else if (kind === "html" || kind === "htm") {
    const $ = cheerio.load(params.buffer.toString("utf8"));
    $("script,style,noscript").remove();
    text = $.root().text();
  }

  return {
    kind,
    text: cleanKnowledgeText(text),
    normalizedFilename,
    mimeType: detected?.mime ?? inferredMime,
  };
}

export function chunkKnowledgeContent(content: string, title: string): Array<{
  order: number;
  heading: string | null;
  content: string;
  tokenEst: number;
}> {
  const paragraphs = cleanKnowledgeText(content)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [
      {
        order: 1,
        heading: title,
        content: "(Konten kosong)",
        tokenEst: estimateTokens("(Konten kosong)"),
      },
    ];
  }

  const chunks: Array<{ order: number; heading: string | null; content: string; tokenEst: number }> = [];
  let current: string[] = [];
  let currentHeading: string | null = title;

  function flush() {
    if (current.length === 0) return;
    const rendered = cleanKnowledgeText(current.join("\n\n"));
    if (!rendered) {
      current = [];
      return;
    }
    chunks.push({
      order: chunks.length + 1,
      heading: currentHeading,
      content: rendered,
      tokenEst: estimateTokens(rendered),
    });
    current = [];
  }

  for (const paragraph of paragraphs) {
    const headingMatch = paragraph.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2]?.trim() || title;
      continue;
    }

    const next = [...current, paragraph].join("\n\n");
    if (byteSize(next) > CHUNK_CHAR_BUDGET && current.length > 0) {
      flush();
    }

    current.push(paragraph);
  }

  flush();

  return chunks.length > 0
    ? chunks
    : [
        {
          order: 1,
          heading: title,
          content: cleanKnowledgeText(content),
          tokenEst: estimateTokens(content),
        },
      ];
}

export async function buildKnowledgeDocumentSummaries(orgId: string): Promise<KnowledgeDocumentSummary[]> {
  const documents = await prisma.knowledgeDocument.findMany({
    where: { orgId, status: { in: ["ACTIVE", "DRAFT"] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      sourceType: true,
      fileName: true,
      mimeType: true,
      sourceBytes: true,
      contentHash: true,
      version: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { chunks: true },
      },
      chunks: {
        orderBy: { order: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    description: document.description,
    status: document.status,
    sourceType: document.sourceType,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceBytes: document.sourceBytes,
    contentHash: document.contentHash,
    version: document.version,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    chunkCount: document._count.chunks,
    excerpt: cleanKnowledgeText(document.chunks[0]?.content ?? document.description ?? "").slice(0, 220),
  }));
}

export async function buildKnowledgeDocumentDetail(
  orgId: string,
  documentId: string,
): Promise<KnowledgeDocumentDetail | null> {
  const document = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, orgId, status: { in: ["ACTIVE", "DRAFT"] } },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      sourceType: true,
      fileName: true,
      mimeType: true,
      sourceBytes: true,
      contentHash: true,
      version: true,
      createdAt: true,
      updatedAt: true,
      content: true,
      _count: {
        select: { chunks: true },
      },
      chunks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          heading: true,
          content: true,
          tokenEst: true,
        },
      },
    },
  });

  if (!document) return null;

  return {
    id: document.id,
    title: document.title,
    description: document.description,
    status: document.status,
    sourceType: document.sourceType,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sourceBytes: document.sourceBytes,
    contentHash: document.contentHash,
    version: document.version,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    chunkCount: document._count.chunks,
    excerpt: cleanKnowledgeText(document.content).slice(0, 220),
    content: document.content,
    chunks: document.chunks,
  };
}

export async function getKnowledgeQuota(orgId: string): Promise<{
  usedBytes: number;
  documentCount: number;
  limitBytes: number;
  draftCount: number;
  draftLimit: number;
}> {
  const [quota, draftCount] = await Promise.all([
    prisma.knowledgeQuota.findUnique({
      where: { orgId },
      select: { usedBytes: true, documentCount: true },
    }),
    prisma.knowledgeDocument.count({
      where: { orgId, status: "DRAFT" },
    }),
  ]);

  return {
    usedBytes: quota?.usedBytes ?? 0,
    documentCount: quota?.documentCount ?? 0,
    limitBytes: KNOWLEDGE_ORG_MAX_BYTES,
    draftCount,
    draftLimit: KNOWLEDGE_DRAFT_MAX,
  };
}

export async function searchKnowledgeChunks(params: {
  orgId: string;
  query: string;
  limit?: number;
  tokenBudget?: number;
}): Promise<KnowledgeChunkPrompt[]> {
  const query = cleanKnowledgeText(params.query);
  const limit = params.limit ?? DEFAULT_PROMPT_CHUNK_LIMIT;
  const tokenBudget = params.tokenBudget ?? DEFAULT_PROMPT_TOKEN_BUDGET;

  const ranked = query
    ? await prisma.$queryRaw<
        Array<{
          documentId: string;
          documentTitle: string;
          chunkOrder: number;
          heading: string | null;
          content: string;
          sourceType: string;
          fileName: string | null;
          rank: number;
          tokenEst: number;
        }>
      >(Prisma.sql`
        SELECT
          kc."documentId" AS "documentId",
          kd."title" AS "documentTitle",
          kc."order" AS "chunkOrder",
          kc."heading" AS "heading",
          kc."content" AS "content",
          kd."sourceType" AS "sourceType",
          kd."fileName" AS "fileName",
          ts_rank(
            to_tsvector('simple', coalesce(kd."title", '') || ' ' || coalesce(kc."heading", '') || ' ' || coalesce(kc."content", '')),
            plainto_tsquery('simple', ${query})
          ) AS rank,
          kc."tokenEst" AS "tokenEst"
        FROM "KnowledgeChunk" kc
        INNER JOIN "KnowledgeDocument" kd ON kd."id" = kc."documentId"
        WHERE kc."orgId" = ${params.orgId}
          AND kd."orgId" = ${params.orgId}
          AND kd."status" = 'ACTIVE'
          AND to_tsvector('simple', coalesce(kd."title", '') || ' ' || coalesce(kc."heading", '') || ' ' || coalesce(kc."content", '')) @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC, kd."updatedAt" DESC, kc."order" ASC
        LIMIT ${limit * 3}
      `)
    : [];

  const fallback = ranked.length > 0
    ? ranked
    : await prisma.$queryRaw<
        Array<{
          documentId: string;
          documentTitle: string;
          chunkOrder: number;
          heading: string | null;
          content: string;
          sourceType: string;
          fileName: string | null;
          rank: number;
          tokenEst: number;
        }>
      >(Prisma.sql`
        SELECT
          kc."documentId" AS "documentId",
          kd."title" AS "documentTitle",
          kc."order" AS "chunkOrder",
          kc."heading" AS "heading",
          kc."content" AS "content",
          kd."sourceType" AS "sourceType",
          kd."fileName" AS "fileName",
          0 AS rank,
          kc."tokenEst" AS "tokenEst"
        FROM "KnowledgeChunk" kc
        INNER JOIN "KnowledgeDocument" kd ON kd."id" = kc."documentId"
        WHERE kc."orgId" = ${params.orgId}
          AND kd."orgId" = ${params.orgId}
          AND kd."status" = 'ACTIVE'
        ORDER BY kd."updatedAt" DESC, kc."order" ASC
        LIMIT ${limit * 3}
      `);

  const selected: KnowledgeChunkPrompt[] = [];
  let usedTokens = 0;

  for (const chunk of fallback) {
    const normalized = cleanKnowledgeText(chunk.content);
    const chunkTokens = chunk.tokenEst || estimateTokens(normalized);
    if (selected.length >= limit) break;
    if (usedTokens + chunkTokens > tokenBudget && selected.length > 0) continue;
    selected.push({
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      chunkOrder: chunk.chunkOrder,
      heading: chunk.heading,
      content: normalized,
      sourceType: chunk.sourceType,
      fileName: chunk.fileName,
    });
    usedTokens += chunkTokens;
  }

  return selected;
}

export function formatKnowledgeChunksForPrompt(chunks: KnowledgeChunkPrompt[]): string {
  if (chunks.length === 0) {
    return "(Tidak ada knowledge library yang relevan ditemukan.)";
  }

  return chunks
    .map((chunk, index) => {
      const header = [
        `[Knowledge Item ${index + 1}]`,
        `Document: ${chunk.documentTitle}`,
        `Chunk: ${chunk.chunkOrder}`,
        chunk.heading ? `Heading: ${chunk.heading}` : null,
        `Source: ${chunk.sourceType}${chunk.fileName ? ` · ${chunk.fileName}` : ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      return `${header}\n${chunk.content}`;
    })
    .join("\n\n");
}

export function buildKnowledgeBaseEnvelope(chunks: KnowledgeChunkPrompt[]): string {
  return `<knowledge_base>\n${formatKnowledgeChunksForPrompt(chunks)}\n</knowledge_base>`;
}

export async function extractKnowledgeSource(params: {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
}): Promise<{
  title: string;
  content: string;
  mimeType: string | null;
  sourceBytes: number;
  contentHash: string;
  sourceType: "UPLOAD";
}> {
  const extracted = await extractTextFromBuffer(params);
  const title = cleanKnowledgeText(fileBaseName(extracted.normalizedFilename)) || "Knowledge Document";
  const content = cleanKnowledgeText(extracted.text);
  if (!content) {
    throw new Error("File tidak memiliki konten teks yang bisa dibaca.");
  }

  return {
    title,
    content,
    mimeType: extracted.mimeType,
    sourceBytes: byteSize(content),
    contentHash: crypto.createHash("sha256").update(content).digest("hex"),
    sourceType: "UPLOAD",
  };
}

export function deriveManualKnowledgeSource(content: string): {
  sourceBytes: number;
  contentHash: string;
} {
  const normalized = cleanKnowledgeText(content);
  return {
    sourceBytes: byteSize(normalized),
    contentHash: crypto.createHash("sha256").update(normalized).digest("hex"),
  };
}