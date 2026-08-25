"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  limparExpirados,
  listarMetas,
  lerBlob,
  marcarUso,
  offlineSuportado,
  removerSermao,
  salvarSermao,
  type SermaoOfflineMeta,
} from "./db";
import { planejarDownload } from "./rangeSermao";

export type StatusOffline = "ocioso" | "baixando" | "pronto" | "erro";

export interface EstadoOffline {
  status: StatusOffline;
  /** 0-100. -1 quando o tamanho total e desconhecido (progresso indeterminado). */
  progresso: number;
}

export interface FonteOffline {
  /** object URL do blob guardado. */
  url: string;
  /** Segundo do culto onde o audio comeca. */
  offsetSegundos: number;
}

export interface ResultadoGuardar {
  ok: boolean;
  bytes?: number;
}

export interface PedidoGuardar {
  gravacaoId: string;
  url: string;
  titulo: string;
  pregadorNome?: string;
  data?: string;
  /** Inicio do trecho no culto, em segundos. */
  inicio: number | null;
  /** Fim do trecho no culto, em segundos. */
  fim: number | null;
}

interface OfflineContextType {
  suportado: boolean;
  carregando: boolean;
  metas: SermaoOfflineMeta[];
  estadoDe: (gravacaoId: string) => EstadoOffline;
  fonteDe: (gravacaoId: string) => FonteOffline | null;
  guardar: (pedido: PedidoGuardar) => Promise<ResultadoGuardar>;
  remover: (gravacaoId: string) => Promise<void>;
  /** Descarta um audio que o browser nao conseguiu tocar. */
  invalidar: (gravacaoId: string) => Promise<void>;
  /** Adia a expiracao do audio guardado. Chamar ao tocar, nao no render. */
  registrarUso: (gravacaoId: string) => void;
}

const OCIOSO: EstadoOffline = { status: "ocioso", progresso: 0 };

const OfflineContext = createContext<OfflineContextType | null>(null);

/** Intervalo minimo entre atualizacoes de progresso (evita render por chunk). */
const THROTTLE_PROGRESSO_MS = 100;

/** Descobre a duracao total do arquivo sem baixa-lo (so os metadados). */
function obterDuracao(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const encerrar = (valor: number | null) => {
      audio.removeAttribute("src");
      audio.load();
      resolve(valor);
    };
    const timer = setTimeout(() => encerrar(null), 15_000);
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      encerrar(isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      encerrar(null);
    };
    audio.src = url;
  });
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [suportado, setSuportado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [metas, setMetas] = useState<SermaoOfflineMeta[]>([]);
  const [estados, setEstados] = useState<Record<string, EstadoOffline>>({});
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const emAndamentoRef = useRef<Set<string>>(new Set());

  const registrarBlobUrl = useCallback((gravacaoId: string, blob: Blob) => {
    const anterior = blobUrlsRef.current.get(gravacaoId);
    if (anterior) URL.revokeObjectURL(anterior);
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.set(gravacaoId, url);
  }, []);

  const descartarBlobUrl = useCallback((gravacaoId: string) => {
    const url = blobUrlsRef.current.get(gravacaoId);
    if (url) URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(gravacaoId);
  }, []);

  // Carga inicial: limpa o que expirou e prepara as URLs dos que sobraram.
  useEffect(() => {
    if (!offlineSuportado()) {
      setCarregando(false);
      return;
    }
    setSuportado(true);
    let cancelado = false;

    (async () => {
      try {
        await limparExpirados();
        const lista = await listarMetas();
        if (cancelado) return;
        for (const meta of lista) {
          const blob = await lerBlob(meta.gravacaoId);
          if (cancelado) return;
          if (blob) registrarBlobUrl(meta.gravacaoId, blob);
        }
        if (cancelado) return;
        setMetas(lista);
        setEstados((prev) => {
          const proximo = { ...prev };
          for (const meta of lista) {
            proximo[meta.gravacaoId] = { status: "pronto", progresso: 100 };
          }
          return proximo;
        });
      } catch {
        // Storage indisponivel (modo privado, cota): segue sem offline.
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [registrarBlobUrl]);

  // Revoga as URLs ao desmontar o provider.
  const blobUrls = blobUrlsRef.current;
  useEffect(() => {
    return () => {
      for (const url of blobUrls.values()) URL.revokeObjectURL(url);
      blobUrls.clear();
    };
  }, [blobUrls]);

  const estadoDe = useCallback(
    (gravacaoId: string): EstadoOffline => estados[gravacaoId] ?? OCIOSO,
    [estados],
  );

  const fonteDe = useCallback(
    (gravacaoId: string): FonteOffline | null => {
      const url = blobUrlsRef.current.get(gravacaoId);
      if (!url) return null;
      const meta = metas.find((m) => m.gravacaoId === gravacaoId);
      if (!meta) return null;
      return { url, offsetSegundos: meta.offsetSegundos };
    },
    [metas],
  );

  const registrarUso = useCallback((gravacaoId: string) => {
    void marcarUso(gravacaoId);
  }, []);

  const remover = useCallback(
    async (gravacaoId: string) => {
      descartarBlobUrl(gravacaoId);
      await removerSermao(gravacaoId);
      setMetas((prev) => prev.filter((m) => m.gravacaoId !== gravacaoId));
      setEstados((prev) => ({ ...prev, [gravacaoId]: OCIOSO }));
    },
    [descartarBlobUrl],
  );

  const guardar = useCallback(
    async (pedido: PedidoGuardar): Promise<ResultadoGuardar> => {
      const { gravacaoId, url } = pedido;
      if (!offlineSuportado() || emAndamentoRef.current.has(gravacaoId)) {
        return { ok: false };
      }
      emAndamentoRef.current.add(gravacaoId);
      setEstados((prev) => ({ ...prev, [gravacaoId]: { status: "baixando", progresso: 0 } }));

      try {
        // Pede ao browser para nao evictar o storage automaticamente.
        try {
          await navigator.storage?.persist?.();
        } catch {
          // Nao suportado — segue.
        }

        // Cabecalhos do arquivo completo: tamanho e formato.
        let tamanhoTotal: number | null = null;
        let contentType: string | null = null;
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (head.ok) {
            const len = head.headers.get("content-length");
            tamanhoTotal = len ? parseInt(len, 10) : null;
            contentType = head.headers.get("content-type");
          }
        } catch {
          // Sem HEAD: cai para o arquivo inteiro.
        }

        const duracaoTotal = pedido.inicio != null ? await obterDuracao(url) : null;

        const plano = planejarDownload({
          tamanhoTotal,
          duracaoTotal,
          contentType,
          url,
          inicio: pedido.inicio,
          fim: pedido.fim,
        });

        const headers: HeadersInit = plano.range
          ? { Range: `bytes=${plano.range.inicio}-${plano.range.fim}` }
          : {};
        const resposta = await fetch(url, { headers });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        // Range pedido e ignorado pelo CDN (200 em vez de 206): o corpo e o
        // arquivo inteiro, entao o offset deixa de valer.
        const parcial = !!plano.range && resposta.status === 206;
        const offsetSegundos = parcial ? plano.offsetSegundos : 0;

        const lenResposta = resposta.headers.get("content-length");
        const total = lenResposta ? parseInt(lenResposta, 10) : 0;

        let blob: Blob;
        if (total > 0 && resposta.body) {
          const reader = resposta.body.getReader();
          const chunks: Uint8Array[] = [];
          let recebido = 0;
          let ultimoAviso = 0;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            recebido += value.length;
            const agora = Date.now();
            if (agora - ultimoAviso >= THROTTLE_PROGRESSO_MS) {
              ultimoAviso = agora;
              const pct = Math.min(99, Math.round((recebido / total) * 100));
              setEstados((prev) => ({
                ...prev,
                [gravacaoId]: { status: "baixando", progresso: pct },
              }));
            }
          }
          blob = new Blob(chunks as BlobPart[], { type: contentType ?? "audio/mpeg" });
        } else {
          // Sem Content-Length: progresso indeterminado.
          setEstados((prev) => ({
            ...prev,
            [gravacaoId]: { status: "baixando", progresso: -1 },
          }));
          blob = await resposta.blob();
        }

        const agora = Date.now();
        const meta: SermaoOfflineMeta = {
          gravacaoId,
          titulo: pedido.titulo,
          pregadorNome: pedido.pregadorNome,
          data: pedido.data,
          offsetSegundos,
          duracao: parcial ? plano.duracaoSegundos : (duracaoTotal ?? 0),
          bytes: blob.size,
          parcial,
          baixadoEm: agora,
          usadoEm: agora,
        };

        await salvarSermao(meta, blob);
        registrarBlobUrl(gravacaoId, blob);
        setMetas((prev) => [meta, ...prev.filter((m) => m.gravacaoId !== gravacaoId)]);
        setEstados((prev) => ({ ...prev, [gravacaoId]: { status: "pronto", progresso: 100 } }));
        return { ok: true, bytes: blob.size };
      } catch {
        setEstados((prev) => ({ ...prev, [gravacaoId]: { status: "erro", progresso: 0 } }));
        return { ok: false };
      } finally {
        emAndamentoRef.current.delete(gravacaoId);
      }
    },
    [registrarBlobUrl],
  );

  const invalidar = useCallback(
    async (gravacaoId: string) => {
      await remover(gravacaoId);
    },
    [remover],
  );

  return (
    <OfflineContext.Provider
      value={{ suportado, carregando, metas, estadoDe, fonteDe, guardar, remover, invalidar, registrarUso }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextType {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline precisa estar dentro de OfflineProvider");
  }
  return ctx;
}

/** Versao tolerante: fora do provider devolve null em vez de estourar. */
export function useOfflineOpcional(): OfflineContextType | null {
  return useContext(OfflineContext);
}
