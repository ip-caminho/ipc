export type BibleData = Record<string, Record<string, Record<string, string>>>;

let cachedData: BibleData | null = null;
let pendingPromise: Promise<BibleData> | null = null;

/**
 * Lazy-loads the Bible JSON data from /bible/naa.json.
 * Caches in memory after first load. Deduplicates concurrent requests.
 */
export async function loadBibleData(): Promise<BibleData> {
  if (cachedData) return cachedData;
  if (pendingPromise) return pendingPromise;

  pendingPromise = fetch("/bible/naa.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Erro ao carregar dados da Biblia: ${res.status}`);
      return res.json() as Promise<BibleData>;
    })
    .then((data) => {
      cachedData = data;
      pendingPromise = null;
      return data;
    })
    .catch((err) => {
      pendingPromise = null;
      throw err;
    });

  return pendingPromise;
}
