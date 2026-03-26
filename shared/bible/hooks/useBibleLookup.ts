"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { parseReferences } from "../lib/parser";
import { loadBibleData } from "../lib/loader";
import { lookupVerses, type BibleVerseResult } from "../lib/lookup";

interface UseBibleLookupReturn {
  loading: boolean;
  results: BibleVerseResult[];
  error: string | null;
}

export function useBibleLookup(input: string): UseBibleLookupReturn {
  const debouncedInput = useDebounce(input, 400);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BibleVerseResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedInput.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const refs = parseReferences(trimmed);
    if (refs.length === 0) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++abortRef.current;
    setLoading(true);
    setError(null);

    loadBibleData()
      .then((data) => {
        if (abortRef.current !== requestId) return;
        const found = refs
          .map((ref) => lookupVerses(data, ref))
          .filter((r): r is BibleVerseResult => r !== null);
        if (found.length > 0) {
          setResults(found);
          setError(null);
        } else {
          setResults([]);
          setError("Referência não encontrada");
        }
      })
      .catch((err) => {
        if (abortRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        setResults([]);
      })
      .finally(() => {
        if (abortRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [debouncedInput]);

  return { loading, results, error };
}
