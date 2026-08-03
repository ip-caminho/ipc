import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePresignedUploadUrl } from "../helpers";

// O Cache-Control assinado no PUT precisa bater exatamente com o header que o
// cliente envia, senao o B2 responde 403. Como o backend vai para producao
// ANTES do frontend novo, subir com "private" enquanto o frontend ainda manda
// o valor antigo hardcoded quebraria todo upload de foto e documento.
const VALOR_ANTIGO_DO_FRONTEND = "public, max-age=31536000";

describe("Cache-Control do upload", () => {
  beforeEach(() => {
    vi.stubEnv("BACKBLAZE_ENDPOINT", "s3.us-east-005.backblazeb2.com");
    vi.stubEnv("BACKBLAZE_BUCKET_PUBLICO", "ipc-files");
    vi.stubEnv("AWS_REGION", "us-east-005");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "chave-de-teste");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "segredo-de-teste");
  });

  it("sem bucket fechado, mantem o valor que o frontend antigo envia", async () => {
    vi.stubEnv("BACKBLAZE_BUCKET_PRIVADO", "");
    const r = await generatePresignedUploadUrl("membros/fotos/m_1.jpg", "image/jpeg");
    expect(r.cacheControl).toBe(VALOR_ANTIGO_DO_FRONTEND);
  });

  it("com bucket fechado, arquivo privado nao pode ser cacheado como publico", async () => {
    vi.stubEnv("BACKBLAZE_BUCKET_PRIVADO", "ipc-privado");
    const r = await generatePresignedUploadUrl("membros/fotos/m_1.jpg", "image/jpeg");
    expect(r.cacheControl).toContain("private");
    expect(r.cacheControl).not.toContain("public");
  });

  it("arquivo do bucket aberto segue cacheavel por muito tempo", async () => {
    vi.stubEnv("BACKBLAZE_BUCKET_PRIVADO", "ipc-privado");
    const r = await generatePresignedUploadUrl("gravacoes-audio/a_1.mp3", "audio/mpeg");
    expect(r.cacheControl).toBe(VALOR_ANTIGO_DO_FRONTEND);
  });
});
