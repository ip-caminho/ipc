"use client";

// Cache + agrupamento das assinaturas de leitura.
//
// Cada componente pede a URL da sua imagem sem saber dos outros; os pedidos
// feitos no mesmo tick viram UMA chamada de action. Sem isso, uma lista de 30
// avatares dispararia 30 chamadas ao backend.

type Resolver = (args: { urls: string[] }) => Promise<(string | null)[]>;

// Quanto da validade da assinatura usamos antes de pedir outra. Renovar um
// pouco antes evita entregar URL que expira no meio do uso.
const FRACAO_DA_VALIDADE = 0.9;
// Se a URL nao disser a validade (CDN, host externo), nao ha o que renovar.
const TTL_PADRAO_MS = 50 * 60 * 1000;
// Falha (sem permissao, rede) fica pouco tempo em cache, so para nao repetir
// a chamada em loop a cada render.
const TTL_ERRO_MS = 30 * 1000;

/**
 * Validade real da assinatura, lida do proprio link (`X-Amz-Expires`). Assim o
 * cache acompanha o TTL que o backend escolheu para aquela pasta — hoje 24h
 * para foto e 1h para documento — sem um segundo campo no contrato.
 */
function validadeDaUrl(url: string | null): number {
  if (!url) return TTL_ERRO_MS;
  const m = url.match(/[?&]X-Amz-Expires=(\d+)/);
  if (!m) return TTL_PADRAO_MS;
  return Number(m[1]) * 1000 * FRACAO_DA_VALIDADE;
}
// Espelha o limite validado em files/upload.ts (getReadUrls).
const MAX_POR_CHAMADA = 200;

const cache = new Map<string, { valor: string | null; expira: number }>();
const aguardando = new Map<string, Array<(v: string | null) => void>>();
let flushAgendado = false;

/**
 * Só URL de bucket nosso precisa passar pelo backend. CDN e host externo
 * (foto ainda no Tally) sao usados direto, sem gastar chamada.
 */
export function precisaResolver(url: string): boolean {
  return url.includes("backblazeb2.com");
}

export function doCache(url: string): string | null | undefined {
  const hit = cache.get(url);
  if (!hit) return undefined;
  if (hit.expira <= Date.now()) {
    cache.delete(url);
    return undefined;
  }
  return hit.valor;
}

function guardar(url: string, valor: string | null) {
  cache.set(url, { valor, expira: Date.now() + validadeDaUrl(valor) });
}

function entregar(url: string, valor: string | null) {
  guardar(url, valor);
  const espera = aguardando.get(url);
  aguardando.delete(url);
  espera?.forEach((fn) => fn(valor));
}

async function flush(resolver: Resolver) {
  flushAgendado = false;
  const urls = [...aguardando.keys()];
  if (urls.length === 0) return;

  for (let i = 0; i < urls.length; i += MAX_POR_CHAMADA) {
    const lote = urls.slice(i, i + MAX_POR_CHAMADA);
    try {
      const assinadas = await resolver({ urls: lote });
      lote.forEach((url, idx) => entregar(url, assinadas[idx] ?? null));
    } catch {
      // Sem permissao de leitura na pasta, ou rede caiu: a imagem fica no
      // fallback em vez de quebrar a tela.
      lote.forEach((url) => entregar(url, null));
    }
  }
}

export function resolverUrl(url: string, resolver: Resolver): Promise<string | null> {
  const emCache = doCache(url);
  if (emCache !== undefined) return Promise.resolve(emCache);

  return new Promise((resolve) => {
    const fila = aguardando.get(url);
    if (fila) {
      fila.push(resolve);
    } else {
      aguardando.set(url, [resolve]);
    }
    if (!flushAgendado) {
      flushAgendado = true;
      // Microtask: junta tudo que a arvore pedir durante este render.
      queueMicrotask(() => void flush(resolver));
    }
  });
}
