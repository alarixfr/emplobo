/**
 * Deterministic guide change summaries. Used by:
 *  - AI regeneration (roles.ts): draft vs current live guide
 *  - Manual editor save (content.ts): submitted vs current live guide
 *
 * Computed from chapter titles + content (no LLM call — accurate, free, and
 * never hallucinated) and stored verbatim as the GuideVersion changelog.
 */

export type FlatChapter = { title: string; content: string };

export type ChangeCounts = {
  added: string[];
  updated: string[];
  removed: string[];
  unchangedCount: number;
};

export type ChangeSummary = ChangeCounts & {
  text: string;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  hasChanges: boolean;
};

export function chapterKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatChangesText(changes: ChangeCounts): string {
  const lines: string[] = [];
  if (changes.added.length > 0) {
    lines.push(`• Bab baru: ${changes.added.join(", ")}`);
  }
  if (changes.updated.length > 0) {
    lines.push(`• Bab diperbarui: ${changes.updated.join(", ")}`);
  }
  if (changes.removed.length > 0) {
    lines.push(`• Bab dihapus: ${changes.removed.join(", ")}`);
  }
  if (changes.unchangedCount > 0) {
    lines.push(`• ${changes.unchangedCount} bab tetap sama (progres karyawan dipertahankan).`);
  }
  if (lines.length === 0) {
    lines.push("• Tidak ada perubahan pada isi panduan.");
  }
  return lines.join("\n");
}

/**
 * Title-based diff (used by AI regeneration, where chapters arrive without
 * stable ids). A chapter in both lists with identical content counts as
 * unchanged; the row is then kept so employee ChapterProgress survives.
 */
export function buildChangeSummary(
  existing: FlatChapter[],
  next: FlatChapter[],
): ChangeSummary {
  const nextByKey = new Map<string, FlatChapter>();
  for (const c of next) {
    nextByKey.set(chapterKey(c.title), c);
  }
  const presentInNext = new Set<string>();

  const changed: string[] = [];
  const removed: string[] = [];
  let unchangedCount = 0;

  for (const chapter of existing) {
    const key = chapterKey(chapter.title);
    const candidate = nextByKey.get(key);
    if (!candidate) {
      removed.push(chapter.title);
      continue;
    }
    presentInNext.add(key);
    if (candidate.content.trim() === chapter.content.trim()) {
      unchangedCount += 1;
    } else {
      changed.push(chapter.title);
    }
  }

  const added = next
    .filter((c) => !presentInNext.has(chapterKey(c.title)))
    .map((c) => c.title);

  const counts: ChangeCounts = { added, updated: changed, removed, unchangedCount };
  return {
    ...counts,
    text: formatChangesText(counts),
    addedCount: added.length,
    updatedCount: changed.length,
    removedCount: removed.length,
    hasChanges: added.length + changed.length + removed.length > 0,
  };
}