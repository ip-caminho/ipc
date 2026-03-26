export interface BibleBook {
  name: string;
  abbr: string;
  aliases: string[];
}

export interface BibleSection {
  name: string;
  books: BibleBook[];
}

export interface BibleTestament {
  name: string;
  key: "AT" | "NT";
  sections: BibleSection[];
}

export const BIBLE: BibleTestament[] = [
  {
    name: "Antigo Testamento",
    key: "AT",
    sections: [
      {
        name: "Pentateuco",
        books: [
          { name: "Gênesis", abbr: "Gn", aliases: ["gênesis", "genesis", "gn"] },
          { name: "Êxodo", abbr: "Êx", aliases: ["êxodo", "exodo", "êx", "ex"] },
          { name: "Levítico", abbr: "Lv", aliases: ["levítico", "levitico", "lv"] },
          { name: "Números", abbr: "Nm", aliases: ["números", "numeros", "nm"] },
          { name: "Deuteronômio", abbr: "Dt", aliases: ["deuteronômio", "deuteronomio", "dt"] },
        ],
      },
      {
        name: "Históricos",
        books: [
          { name: "Josué", abbr: "Js", aliases: ["josué", "josue", "js"] },
          { name: "Juízes", abbr: "Jz", aliases: ["juízes", "juizes", "jz"] },
          { name: "Rute", abbr: "Rt", aliases: ["rute", "rt"] },
          { name: "1 Samuel", abbr: "1Sm", aliases: ["1 samuel", "1samuel", "1sm", "1 sm", "i samuel"] },
          { name: "2 Samuel", abbr: "2Sm", aliases: ["2 samuel", "2samuel", "2sm", "2 sm", "ii samuel"] },
          { name: "1 Reis", abbr: "1Rs", aliases: ["1 reis", "1reis", "1rs", "1 rs", "i reis"] },
          { name: "2 Reis", abbr: "2Rs", aliases: ["2 reis", "2reis", "2rs", "2 rs", "ii reis"] },
          { name: "1 Crônicas", abbr: "1Cr", aliases: ["1 crônicas", "1 cronicas", "1crônicas", "1cronicas", "1cr", "1 cr", "i crônicas"] },
          { name: "2 Crônicas", abbr: "2Cr", aliases: ["2 crônicas", "2 cronicas", "2crônicas", "2cronicas", "2cr", "2 cr", "ii crônicas"] },
          { name: "Esdras", abbr: "Ed", aliases: ["esdras", "ed"] },
          { name: "Neemias", abbr: "Ne", aliases: ["neemias", "ne"] },
          { name: "Ester", abbr: "Et", aliases: ["ester", "et"] },
        ],
      },
      {
        name: "Poéticos",
        books: [
          { name: "Jó", abbr: "Jó", aliases: ["jó"] },
          { name: "Salmos", abbr: "Sl", aliases: ["salmos", "salmo", "sl"] },
          { name: "Provérbios", abbr: "Pv", aliases: ["provérbios", "proverbios", "pv"] },
          { name: "Eclesiastes", abbr: "Ec", aliases: ["eclesiastes", "ec"] },
          { name: "Cantares", abbr: "Ct", aliases: ["cantares", "cântico dos cânticos", "cântico", "cantico", "ct"] },
        ],
      },
      {
        name: "Profetas Maiores",
        books: [
          { name: "Isaías", abbr: "Is", aliases: ["isaías", "isaias", "is"] },
          { name: "Jeremias", abbr: "Jr", aliases: ["jeremias", "jr"] },
          { name: "Lamentações", abbr: "Lm", aliases: ["lamentações", "lamentacoes", "lm"] },
          { name: "Ezequiel", abbr: "Ez", aliases: ["ezequiel", "ez"] },
          { name: "Daniel", abbr: "Dn", aliases: ["daniel", "dn"] },
        ],
      },
      {
        name: "Profetas Menores",
        books: [
          { name: "Oséias", abbr: "Os", aliases: ["oséias", "oseias", "os"] },
          { name: "Joel", abbr: "Jl", aliases: ["joel", "jl"] },
          { name: "Amós", abbr: "Am", aliases: ["amós", "amos", "am"] },
          { name: "Obadias", abbr: "Ob", aliases: ["obadias", "ob", "abdias"] },
          { name: "Jonas", abbr: "Jn", aliases: ["jonas", "jn"] },
          { name: "Miquéias", abbr: "Mq", aliases: ["miquéias", "miqueias", "mq"] },
          { name: "Naum", abbr: "Na", aliases: ["naum", "na"] },
          { name: "Habacuque", abbr: "Hc", aliases: ["habacuque", "hc"] },
          { name: "Sofonias", abbr: "Sf", aliases: ["sofonias", "sf"] },
          { name: "Ageu", abbr: "Ag", aliases: ["ageu", "ag"] },
          { name: "Zacarias", abbr: "Zc", aliases: ["zacarias", "zc"] },
          { name: "Malaquias", abbr: "Ml", aliases: ["malaquias", "ml"] },
        ],
      },
    ],
  },
  {
    name: "Novo Testamento",
    key: "NT",
    sections: [
      {
        name: "Evangelhos",
        books: [
          { name: "Mateus", abbr: "Mt", aliases: ["mateus", "mt"] },
          { name: "Marcos", abbr: "Mc", aliases: ["marcos", "mc"] },
          { name: "Lucas", abbr: "Lc", aliases: ["lucas", "lc"] },
          { name: "João", abbr: "Jo", aliases: ["joão", "joao", "jo"] },
        ],
      },
      {
        name: "Histórico",
        books: [
          { name: "Atos", abbr: "At", aliases: ["atos", "atos dos apóstolos", "atos dos apostolos", "at"] },
        ],
      },
      {
        name: "Cartas Paulinas",
        books: [
          { name: "Romanos", abbr: "Rm", aliases: ["romanos", "rm"] },
          { name: "1 Coríntios", abbr: "1Co", aliases: ["1 coríntios", "1 corintios", "1coríntios", "1corintios", "1co", "1 co", "i coríntios"] },
          { name: "2 Coríntios", abbr: "2Co", aliases: ["2 coríntios", "2 corintios", "2coríntios", "2corintios", "2co", "2 co", "ii coríntios"] },
          { name: "Gálatas", abbr: "Gl", aliases: ["gálatas", "galatas", "gl"] },
          { name: "Efésios", abbr: "Ef", aliases: ["efésios", "efesios", "ef"] },
          { name: "Filipenses", abbr: "Fp", aliases: ["filipenses", "fp", "fl"] },
          { name: "Colossenses", abbr: "Cl", aliases: ["colossenses", "cl"] },
          { name: "1 Tessalonicenses", abbr: "1Ts", aliases: ["1 tessalonicenses", "1tessalonicenses", "1ts", "1 ts", "i tessalonicenses"] },
          { name: "2 Tessalonicenses", abbr: "2Ts", aliases: ["2 tessalonicenses", "2tessalonicenses", "2ts", "2 ts", "ii tessalonicenses"] },
          { name: "1 Timóteo", abbr: "1Tm", aliases: ["1 timóteo", "1 timoteo", "1timóteo", "1timoteo", "1tm", "1 tm", "i timóteo"] },
          { name: "2 Timóteo", abbr: "2Tm", aliases: ["2 timóteo", "2 timoteo", "2timóteo", "2timoteo", "2tm", "2 tm", "ii timóteo"] },
          { name: "Tito", abbr: "Tt", aliases: ["tito", "tt"] },
          { name: "Filemom", abbr: "Fm", aliases: ["filemom", "filemon", "fm"] },
        ],
      },
      {
        name: "Cartas Gerais",
        books: [
          { name: "Hebreus", abbr: "Hb", aliases: ["hebreus", "hb"] },
          { name: "Tiago", abbr: "Tg", aliases: ["tiago", "tg"] },
          { name: "1 Pedro", abbr: "1Pe", aliases: ["1 pedro", "1pedro", "1pe", "1 pe", "i pedro"] },
          { name: "2 Pedro", abbr: "2Pe", aliases: ["2 pedro", "2pedro", "2pe", "2 pe", "ii pedro"] },
          { name: "1 João", abbr: "1Jo", aliases: ["1 joão", "1 joao", "1joão", "1joao", "1jo", "1 jo", "i joão"] },
          { name: "2 João", abbr: "2Jo", aliases: ["2 joão", "2 joao", "2joão", "2joao", "2jo", "2 jo", "ii joão"] },
          { name: "3 João", abbr: "3Jo", aliases: ["3 joão", "3 joao", "3joão", "3joao", "3jo", "3 jo", "iii joão"] },
          { name: "Judas", abbr: "Jd", aliases: ["judas", "jd"] },
        ],
      },
      {
        name: "Profético",
        books: [
          { name: "Apocalipse", abbr: "Ap", aliases: ["apocalipse", "ap", "revelação", "revelacao"] },
        ],
      },
    ],
  },
];

// Flat sorted lookup table for parsing (longest alias first to avoid partial matches)
const ALIAS_LOOKUP: { alias: string; bookName: string }[] = (() => {
  const pairs: { alias: string; bookName: string }[] = [];
  for (const testament of BIBLE) {
    for (const section of testament.sections) {
      for (const book of section.books) {
        for (const alias of book.aliases) {
          pairs.push({ alias, bookName: book.name });
        }
      }
    }
  }
  return pairs.sort((a, b) => b.alias.length - a.alias.length);
})();

/**
 * Extracts the Bible book name from a textoBase string.
 * E.g. "João 3:16" → "João", "1 Coríntios 13" → "1 Coríntios", "Sl 23" → "Salmos"
 */
export function extractBookName(textoBase: string | undefined | null): string | null {
  if (!textoBase) return null;
  const normalized = textoBase.trim().toLowerCase();

  for (const { alias, bookName } of ALIAS_LOOKUP) {
    if (normalized.startsWith(alias)) {
      const next = normalized[alias.length];
      // Must be followed by space, digit, colon, semicolon, end, or punctuation
      if (!next || next === " " || /[\d:;.,]/.test(next)) {
        return bookName;
      }
    }
  }
  return null;
}

/**
 * Matches the book name and returns both the canonical name and the remaining text.
 * E.g. "1 Co 13:4-8" → { bookName: "1 Coríntios", rest: "13:4-8" }
 */
export function matchBook(textoBase: string | undefined | null): { bookName: string; rest: string } | null {
  if (!textoBase) return null;
  const trimmed = textoBase.trim();
  const normalized = trimmed.toLowerCase();

  for (const { alias, bookName } of ALIAS_LOOKUP) {
    if (normalized.startsWith(alias)) {
      const next = normalized[alias.length];
      if (!next || next === " " || /[\d:;.,]/.test(next)) {
        return { bookName, rest: trimmed.slice(alias.length).trim() };
      }
    }
  }
  return null;
}

/** Returns flat array of all books */
export function getAllBooks(): BibleBook[] {
  return BIBLE.flatMap((t) => t.sections.flatMap((s) => s.books));
}
