// Calculo do trecho a baixar para ouvir offline.
//
// O audio guardado no CDN e o culto inteiro; o sermao e um trecho dele
// (inicioConteudo/fimConteudo). Como o pipeline gera MP3 CBR (mono 64k, ou
// 32k acima de 1h — useAudioCompressor.ts), a posicao em bytes de um segundo
// e linear: bytesPorSegundo = tamanhoTotal / duracaoTotal. Isso permite pedir
// so o trecho com um header `Range`, sem corte no servidor nem ffmpeg.
//
// MP3 tolera comecar no meio: o decoder acha o proximo sync word e perde no
// maximo um frame (~26 ms). A margem abaixo cobre isso e o erro do ID3 no
// inicio do arquivo.
//
// Fora do MP3 CBR (importacao do YouTube sobe AAC/webm sem recompressao)
// nao ha essa linearidade — nesses casos baixa o arquivo inteiro.

/** Segundos extras baixados antes e depois do trecho. */
export const MARGEM_SEGUNDOS = 2;

export interface PlanoDownload {
  /** Faixa de bytes a pedir, ou null para baixar o arquivo inteiro. */
  range: { inicio: number; fim: number } | null;
  /** Segundo do culto onde o audio baixado comeca. */
  offsetSegundos: number;
  /** Duracao esperada do audio baixado. */
  duracaoSegundos: number;
}

export interface EntradaPlano {
  /** Tamanho do arquivo completo, em bytes (Content-Length do HEAD). */
  tamanhoTotal: number | null;
  /** Duracao do arquivo completo, em segundos. */
  duracaoTotal: number | null;
  /** Content-Type devolvido pelo CDN. */
  contentType?: string | null;
  /** URL — usada so para checar a extensao quando o Content-Type nao ajuda. */
  url?: string;
  /** Inicio do trecho no culto, em segundos (null = sem recorte). */
  inicio: number | null;
  /** Fim do trecho no culto, em segundos (null = ate o fim). */
  fim: number | null;
}

function ehMp3(contentType?: string | null, url?: string): boolean {
  if (contentType) {
    const t = contentType.toLowerCase();
    if (t.includes("mpeg") || t.includes("mp3")) return true;
    // Content-Type explicito de outro formato: nao arriscar o corte por bytes.
    if (t.startsWith("audio/") || t.startsWith("video/")) return false;
  }
  return !!url && /\.mp3(\?|$)/i.test(url);
}

export function planejarDownload(e: EntradaPlano): PlanoDownload {
  const inteiro: PlanoDownload = {
    range: null,
    offsetSegundos: 0,
    duracaoSegundos: e.duracaoTotal ?? 0,
  };

  if (!e.tamanhoTotal || !e.duracaoTotal || e.duracaoTotal <= 0) return inteiro;
  if (!ehMp3(e.contentType, e.url)) return inteiro;
  if (e.inicio == null) return inteiro;

  const fim = e.fim ?? e.duracaoTotal;
  if (fim <= e.inicio) return inteiro;

  const iniSeg = Math.max(0, e.inicio - MARGEM_SEGUNDOS);
  const fimSeg = Math.min(e.duracaoTotal, fim + MARGEM_SEGUNDOS);

  // Nao vale a pena pedir Range para economizar pouco: mais chance de erro
  // que ganho. Abaixo de 15% de economia, baixa inteiro.
  if ((fimSeg - iniSeg) / e.duracaoTotal > 0.85) return inteiro;

  const bytesPorSegundo = e.tamanhoTotal / e.duracaoTotal;
  const iniByte = Math.max(0, Math.floor(iniSeg * bytesPorSegundo));
  const fimByte = Math.min(e.tamanhoTotal - 1, Math.ceil(fimSeg * bytesPorSegundo));

  if (fimByte <= iniByte) return inteiro;

  return {
    range: { inicio: iniByte, fim: fimByte },
    offsetSegundos: iniSeg,
    duracaoSegundos: fimSeg - iniSeg,
  };
}
