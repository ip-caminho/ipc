import type { BibleData } from "./loader";
import type { BibleReference } from "./parser";
import { formatReference } from "./parser";

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleVerseResult {
  reference: string;
  verses: BibleVerse[];
  bookName: string;
  chapter: number;
  /** Aviso quando o range foi clampado (versiculos pedidos > existentes) */
  clamped?: string;
  /** Indica que o resultado abrange multiplos capitulos */
  chapters?: { chapter: number; verses: BibleVerse[] }[];
}

function getChapterVerses(chapterData: Record<string, string>): { numbers: number[]; max: number } {
  const numbers = Object.keys(chapterData).map(Number).sort((a, b) => a - b);
  return { numbers, max: numbers[numbers.length - 1] ?? 0 };
}

/**
 * Looks up verses in the Bible data based on a parsed reference.
 * Supports single chapter, verse ranges, and cross-chapter ranges.
 * Clamps ranges to existing verses.
 */
export function lookupVerses(
  data: BibleData,
  ref: BibleReference,
): BibleVerseResult | null {
  const bookData = data[ref.bookName];
  if (!bookData) return null;

  // Cross-chapter range (e.g. Rm 8:28-9:3)
  if (ref.chapterEnd !== undefined && ref.verseStart !== undefined && ref.verseEnd !== undefined) {
    return lookupCrossChapter(bookData, ref);
  }

  // Single chapter
  const chapterData = bookData[String(ref.chapter)];
  if (!chapterData) return null;

  const { numbers: allVerseNumbers, max: maxVerse } = getChapterVerses(chapterData);
  if (allVerseNumbers.length === 0) return null;

  const verses: BibleVerse[] = [];
  let clamped: string | undefined;

  if (ref.verseStart === undefined) {
    for (const num of allVerseNumbers) {
      verses.push({ number: num, text: chapterData[String(num)] });
    }
  } else {
    const start = ref.verseStart;
    const requestedEnd = ref.verseEnd ?? ref.verseStart;
    const end = Math.min(requestedEnd, maxVerse);

    for (let v = start; v <= end; v++) {
      const text = chapterData[String(v)];
      if (text) {
        verses.push({ number: v, text });
      }
    }

    if (requestedEnd > maxVerse || start > maxVerse) {
      clamped = `Capítulo possui versículos 1-${maxVerse}`;
    }
  }

  if (verses.length === 0) return null;

  const clampedRef: BibleReference = {
    ...ref,
    verseEnd:
      ref.verseEnd !== undefined
        ? Math.min(ref.verseEnd, maxVerse)
        : ref.verseEnd,
  };

  return {
    reference: formatReference(clampedRef),
    verses,
    bookName: ref.bookName,
    chapter: ref.chapter,
    clamped,
  };
}

function lookupCrossChapter(
  bookData: Record<string, Record<string, string>>,
  ref: BibleReference,
): BibleVerseResult | null {
  const chapterStart = ref.chapter;
  const chapterEnd = ref.chapterEnd!;
  const verseStart = ref.verseStart!;
  const verseEnd = ref.verseEnd!;

  const allVerses: BibleVerse[] = [];
  const chapters: { chapter: number; verses: BibleVerse[] }[] = [];

  for (let ch = chapterStart; ch <= chapterEnd; ch++) {
    const chapterData = bookData[String(ch)];
    if (!chapterData) continue;

    const { max: maxVerse } = getChapterVerses(chapterData);
    const chVerses: BibleVerse[] = [];

    let start = 1;
    let end = maxVerse;

    if (ch === chapterStart) {
      start = verseStart;
    }
    if (ch === chapterEnd) {
      end = Math.min(verseEnd, maxVerse);
    }

    for (let v = start; v <= end; v++) {
      const text = chapterData[String(v)];
      if (text) {
        const verse = { number: v, text };
        chVerses.push(verse);
        allVerses.push(verse);
      }
    }

    if (chVerses.length > 0) {
      chapters.push({ chapter: ch, verses: chVerses });
    }
  }

  if (allVerses.length === 0) return null;

  return {
    reference: formatReference(ref),
    verses: allVerses,
    bookName: ref.bookName,
    chapter: ref.chapter,
    chapters,
  };
}
