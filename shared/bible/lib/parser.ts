import { matchBook } from "../data/books";

export interface BibleReference {
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  /** Para ranges cross-chapter como "Rm 8:28-9:3" */
  chapterEnd?: number;
}

/**
 * Parses a Bible reference string into a structured object.
 * Accepts both ":" and "." as chapter:verse separator.
 *
 * Supported formats:
 * - "João 3"          → chapter only
 * - "João 3:16"       → single verse
 * - "João 3.16"       → single verse (dot)
 * - "João 3:16-18"    → verse range (same chapter)
 * - "Rm 8:28-9:3"     → cross-chapter range
 * - "Rm 8.28-9.3"     → cross-chapter range (dots)
 * - "Sl 23"           → abbreviation + chapter
 * - "1 Co 13:4-8"     → numbered book
 */
export function parseReference(input: string): BibleReference | null {
  if (!input || !input.trim()) return null;

  const match = matchBook(input);
  if (!match) return null;

  // Regex accepts both "." and ":" as separator
  // Groups: 1=chapter, 2=verseStart, 3=chapterEnd(cross), 4=verseEnd(cross), 5=verseEnd(same)
  const m = match.rest.match(
    /^(\d+)(?:[.:](\d+)(?:\s*[-–]\s*(?:(\d+)[.:](\d+)|(\d+)))?)?$/,
  );

  if (!m) return null;

  const chapter = parseInt(m[1], 10);
  const verseStart = m[2] ? parseInt(m[2], 10) : undefined;

  let chapterEnd: number | undefined;
  let verseEnd: number | undefined;

  if (m[3] && m[4]) {
    // Cross-chapter: "8:28-9:3"
    chapterEnd = parseInt(m[3], 10);
    verseEnd = parseInt(m[4], 10);
  } else if (m[5]) {
    // Same chapter: "3:16-18"
    verseEnd = parseInt(m[5], 10);
  }

  if (chapter < 1) return null;
  if (verseStart !== undefined && verseStart < 1) return null;
  if (chapterEnd !== undefined && chapterEnd < chapter) return null;
  if (verseEnd !== undefined && verseEnd < 1) return null;

  return { bookName: match.bookName, chapter, verseStart, verseEnd, chapterEnd };
}

/**
 * Parses multiple references separated by ";".
 * E.g. "João 3:16; Rm 8:28" → [ref1, ref2]
 */
export function parseReferences(input: string): BibleReference[] {
  if (!input || !input.trim()) return [];
  return input
    .split(";")
    .map((s) => parseReference(s.trim()))
    .filter((r): r is BibleReference => r !== null);
}

/**
 * Formats a BibleReference back into a human-readable string.
 * Always uses ":" as separator (normalizes from ".").
 */
export function formatReference(ref: BibleReference): string {
  let result = `${ref.bookName} ${ref.chapter}`;
  if (ref.verseStart !== undefined) {
    result += `:${ref.verseStart}`;
    if (ref.chapterEnd !== undefined && ref.verseEnd !== undefined) {
      result += `-${ref.chapterEnd}:${ref.verseEnd}`;
    } else if (ref.verseEnd !== undefined && ref.verseEnd !== ref.verseStart) {
      result += `-${ref.verseEnd}`;
    }
  }
  return result;
}
