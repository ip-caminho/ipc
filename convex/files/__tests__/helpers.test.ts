import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicUrl, generateObjectKey, extractKeyFromUrl, getBucketName, toCdnUrl } from "../helpers";

describe("helpers (B2/S3)", () => {
  beforeEach(() => {
    vi.stubEnv("BACKBLAZE_BUCKET_NAME", "ipc-files");
    vi.stubEnv("BACKBLAZE_ENDPOINT", "s3.us-east-005.backblazeb2.com");
  });

  describe("getBucketName", () => {
    it("retorna nome do bucket da env", () => {
      expect(getBucketName()).toBe("ipc-files");
    });
  });

  describe("getPublicUrl", () => {
    it("gera URL via CDN", () => {
      const url = getPublicUrl("gravacoes-audio/abc_123.mp3");
      expect(url).toBe("https://cdn.yhc.com.br/gravacoes-audio/abc_123.mp3");
    });

    it("funciona com subpaths", () => {
      const url = getPublicUrl("membros/fotos/m123_456.jpg");
      expect(url).toBe("https://cdn.yhc.com.br/membros/fotos/m123_456.jpg");
    });
  });

  describe("toCdnUrl", () => {
    it("converte URL legada do B2 para CDN", () => {
      const legacy = "https://f005.backblazeb2.com/file/ipc-files/gravacoes-audio/abc_123.mp3";
      expect(toCdnUrl(legacy)).toBe("https://cdn.yhc.com.br/gravacoes-audio/abc_123.mp3");
    });

    it("mantem URL que ja é CDN", () => {
      const cdn = "https://cdn.yhc.com.br/gravacoes-audio/abc_123.mp3";
      expect(toCdnUrl(cdn)).toBe(cdn);
    });

    it("retorna original se nao reconhecer o formato", () => {
      expect(toCdnUrl("https://example.com/file.mp3")).toBe("https://example.com/file.mp3");
    });
  });

  describe("generateObjectKey", () => {
    it("gera chave com folder/entityId_timestamp.ext", () => {
      const before = Date.now();
      const key = generateObjectKey("gravacoes-audio", "entity123", "mp3");
      const after = Date.now();

      expect(key).toMatch(/^gravacoes-audio\/entity123_\d+\.mp3$/);

      const timestamp = parseInt(key.split("_")[1].split(".")[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("aceita diferentes extensoes e folders", () => {
      const key = generateObjectKey("membros/fotos", "m123", "jpg");
      expect(key).toMatch(/^membros\/fotos\/m123_\d+\.jpg$/);
    });
  });

  describe("extractKeyFromUrl", () => {
    it("extrai chave de URL publica B2", () => {
      const url = "https://f005.backblazeb2.com/file/ipc-files/gravacoes-audio/abc_123.mp3";
      expect(extractKeyFromUrl(url)).toBe("gravacoes-audio/abc_123.mp3");
    });

    it("extrai chave de URL com path complexo", () => {
      const url = "https://f005.backblazeb2.com/file/ipc-files/membros/fotos/m123_456.jpg";
      expect(extractKeyFromUrl(url)).toBe("membros/fotos/m123_456.jpg");
    });

    it("retorna null para URL sem pattern do bucket", () => {
      expect(extractKeyFromUrl("https://example.com/file.mp3")).toBeNull();
      expect(extractKeyFromUrl("")).toBeNull();
    });

    it("retorna null para URL de outro bucket", () => {
      expect(extractKeyFromUrl("https://f005.backblazeb2.com/file/outro-bucket/file.mp3")).toBeNull();
    });
  });
});
