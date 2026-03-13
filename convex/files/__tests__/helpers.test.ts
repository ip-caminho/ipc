import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicUrl, generateObjectKey, extractKeyFromUrl, getBucketName } from "../helpers";

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
    it("gera URL publica correta para B2", () => {
      const url = getPublicUrl("gravacoes-audio/abc_123.mp3");
      expect(url).toBe("https://f005.backblazeb2.com/file/ipc-files/gravacoes-audio/abc_123.mp3");
    });

    it("extrai numero da regiao do endpoint", () => {
      vi.stubEnv("BACKBLAZE_ENDPOINT", "s3.us-west-001.backblazeb2.com");
      const url = getPublicUrl("test/file.jpg");
      expect(url).toBe("https://f001.backblazeb2.com/file/ipc-files/test/file.jpg");
    });

    it("usa 005 como fallback se regiao nao reconhecida", () => {
      vi.stubEnv("BACKBLAZE_ENDPOINT", "custom-endpoint.example.com");
      const url = getPublicUrl("test/file.jpg");
      expect(url).toBe("https://f005.backblazeb2.com/file/ipc-files/test/file.jpg");
    });
  });

  describe("generateObjectKey", () => {
    it("gera chave com folder/entityId_timestamp.ext", () => {
      const before = Date.now();
      const key = generateObjectKey("gravacoes-audio", "entity123", "mp3");
      const after = Date.now();

      expect(key).toMatch(/^gravacoes-audio\/entity123_\d+\.mp3$/);

      // Verifica que o timestamp esta no range correto
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
