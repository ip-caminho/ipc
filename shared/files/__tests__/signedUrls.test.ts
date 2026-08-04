import { describe, it, expect, vi } from "vitest";
import { precisaResolver, resolverUrl, doCache } from "../lib/signedUrls";

const ENDPOINT = "https://s3.us-east-005.backblazeb2.com";

describe("signedUrls", () => {
  describe("precisaResolver", () => {
    it("resolve URL de bucket nosso", () => {
      expect(precisaResolver(`${ENDPOINT}/ipc-privado/membros/fotos/m_1.jpg`)).toBe(true);
    });

    it("nao gasta chamada com CDN nem host externo", () => {
      expect(precisaResolver("https://cdn.yhc.com.br/gravacoes-audio/a.mp3")).toBe(false);
      expect(precisaResolver("https://storage.tally.so/private/foto.jpg")).toBe(false);
    });
  });

  describe("agrupamento", () => {
    it("junta pedidos do mesmo tick numa unica chamada", async () => {
      const urls = Array.from({ length: 5 }, (_, i) => `${ENDPOINT}/ipc-privado/lote/${i}.jpg`);
      const resolver = vi.fn(async ({ urls: u }: { urls: string[] }) =>
        u.map((x) => `${x}?assinada`),
      );

      const resultados = await Promise.all(urls.map((u) => resolverUrl(u, resolver)));

      expect(resolver).toHaveBeenCalledTimes(1);
      expect(resolver.mock.calls[0][0].urls).toHaveLength(5);
      expect(resultados[0]).toBe(`${urls[0]}?assinada`);
    });

    it("pede a mesma URL uma vez so, mesmo com varios componentes", async () => {
      const url = `${ENDPOINT}/ipc-privado/repetida/x.jpg`;
      const resolver = vi.fn(async ({ urls: u }: { urls: string[] }) => u.map((x) => `${x}?sig`));

      const [a, b, c] = await Promise.all([
        resolverUrl(url, resolver),
        resolverUrl(url, resolver),
        resolverUrl(url, resolver),
      ]);

      expect(resolver.mock.calls[0][0].urls).toEqual([url]);
      expect([a, b, c]).toEqual([`${url}?sig`, `${url}?sig`, `${url}?sig`]);
    });

    it("reaproveita o cache em vez de chamar de novo", async () => {
      const url = `${ENDPOINT}/ipc-privado/cacheada/y.jpg`;
      const resolver = vi.fn(async ({ urls: u }: { urls: string[] }) => u.map((x) => `${x}?sig`));

      await resolverUrl(url, resolver);
      expect(doCache(url)).toBe(`${url}?sig`);
      await resolverUrl(url, resolver);

      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it("falha do backend vira null, sem derrubar a tela", async () => {
      const url = `${ENDPOINT}/ipc-privado/negada/z.jpg`;
      const resolver = vi.fn(async () => {
        throw new Error("sem permissao");
      });

      await expect(resolverUrl(url, resolver)).resolves.toBeNull();
    });

    it("fatia lotes acima do limite aceito pelo backend", async () => {
      const urls = Array.from({ length: 250 }, (_, i) => `${ENDPOINT}/ipc-privado/big/${i}.jpg`);
      const resolver = vi.fn(async ({ urls: u }: { urls: string[] }) => u.map((x) => `${x}?sig`));

      await Promise.all(urls.map((u) => resolverUrl(u, resolver)));

      expect(resolver).toHaveBeenCalledTimes(2);
      expect(resolver.mock.calls[0][0].urls).toHaveLength(200);
      expect(resolver.mock.calls[1][0].urls).toHaveLength(50);
    });
  });
});

describe("cache acompanha a validade da assinatura", () => {
  const ENDPOINT_URL = "https://s3.us-east-005.backblazeb2.com/ipc-privado";

  it("foto (24h) fica em cache muito mais que documento (1h)", async () => {
    const foto = `${ENDPOINT_URL}/membros/fotos/f_1.jpg`;
    const doc = `${ENDPOINT_URL}/retiro-comprovantes/c_1.pdf`;
    const resolver = vi.fn(async ({ urls: u }: { urls: string[] }) =>
      u.map((x) =>
        x.includes("membros/fotos")
          ? `${x}?X-Amz-Expires=86400&X-Amz-Signature=a`
          : `${x}?X-Amz-Expires=3600&X-Amz-Signature=b`,
      ),
    );

    await Promise.all([resolverUrl(foto, resolver), resolverUrl(doc, resolver)]);

    // Ambas em cache agora; a diferenca esta em quanto tempo sobrevivem.
    expect(doCache(foto)).toContain("X-Amz-Expires=86400");
    expect(doCache(doc)).toContain("X-Amz-Expires=3600");

    // Passadas 2h: a do documento expirou, a da foto continua valendo.
    const agora = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(agora + 2 * 60 * 60 * 1000);
    expect(doCache(doc)).toBeUndefined();
    expect(doCache(foto)).toContain("X-Amz-Expires=86400");
    vi.mocked(Date.now).mockRestore();
  });
});
