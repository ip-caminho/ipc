import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FOLDER_BUCKET,
  bucketForKey,
  folderFromKey,
  generateObjectKey,
  getStorageUrl,
  parseFileUrl,
  toCdnUrl,
} from "../urls";
import { FOLDER_PERMISSIONS, readPermissionsForKey } from "../authz";

const ENDPOINT = "s3.us-east-005.backblazeb2.com";

describe("files/urls", () => {
  beforeEach(() => {
    vi.stubEnv("BACKBLAZE_ENDPOINT", ENDPOINT);
    vi.stubEnv("BACKBLAZE_BUCKET_PUBLICO", "ipc-files");
    vi.stubEnv("BACKBLAZE_BUCKET_PRIVADO", "ipc-privado");
  });

  describe("folderFromKey", () => {
    it("casa pasta de um nivel", () => {
      expect(folderFromKey("gravacoes-audio/abc_123.mp3")).toBe("gravacoes-audio");
    });

    it("casa a pasta mais longa quando ha aninhamento", () => {
      expect(folderFromKey("membros/fotos/m1_2.jpg")).toBe("membros/fotos");
      expect(folderFromKey("membros/cartas-transferencia/m1_2.pdf")).toBe(
        "membros/cartas-transferencia",
      );
    });

    it("retorna null para pasta desconhecida", () => {
      expect(folderFromKey("qualquer-coisa/x.png")).toBeNull();
      expect(folderFromKey("semPasta.png")).toBeNull();
    });
  });

  describe("bucketForKey (fail-closed)", () => {
    it("manda audio e capas para o bucket aberto", () => {
      expect(bucketForKey("gravacoes-audio/a_1.mp3")).toBe("publico");
      expect(bucketForKey("biblioteca-capas/l_1.jpg")).toBe("publico");
    });

    it("manda dado pessoal para o bucket fechado", () => {
      expect(bucketForKey("membros/fotos/m_1.jpg")).toBe("privado");
      expect(bucketForKey("membros/cartas-transferencia/m_1.pdf")).toBe("privado");
      expect(bucketForKey("educacional/fotos/c_1.jpg")).toBe("privado");
      expect(bucketForKey("educacional/certificados-cac/v_1.pdf")).toBe("privado");
      expect(bucketForKey("retiro-comprovantes/i_1.pdf")).toBe("privado");
    });

    it("lanca para pasta nao registrada, em vez de escolher um bucket", () => {
      expect(() => bucketForKey("pasta-nova/x.png")).toThrow(/nao registrada/i);
    });
  });

  describe("getStorageUrl", () => {
    it("usa o CDN no bucket aberto", () => {
      expect(getStorageUrl("gravacoes-audio/a_1.mp3")).toBe(
        "https://cdn.yhc.com.br/gravacoes-audio/a_1.mp3",
      );
    });

    it("usa a canonica do endpoint no bucket fechado", () => {
      expect(getStorageUrl("membros/fotos/m_1.jpg")).toBe(
        `https://${ENDPOINT}/ipc-privado/membros/fotos/m_1.jpg`,
      );
    });

    // Deployar o backend antes de provisionar o bucket fechado nao pode mudar
    // o comportamento atual: sem a env, tudo continua saindo pelo CDN.
    it("cai no CDN enquanto o bucket fechado nao existir", () => {
      vi.stubEnv("BACKBLAZE_BUCKET_PRIVADO", "");
      expect(getStorageUrl("membros/fotos/m_1.jpg")).toBe(
        "https://cdn.yhc.com.br/membros/fotos/m_1.jpg",
      );
      expect(getStorageUrl("gravacoes-audio/a_1.mp3")).toBe(
        "https://cdn.yhc.com.br/gravacoes-audio/a_1.mp3",
      );
    });
  });

  describe("parseFileUrl", () => {
    it("le URL do CDN como bucket aberto", () => {
      expect(parseFileUrl("https://cdn.yhc.com.br/gravacoes-audio/a_1.mp3")).toEqual({
        bucketKey: "publico",
        key: "gravacoes-audio/a_1.mp3",
      });
    });

    it("le canonica path-style do bucket fechado", () => {
      expect(parseFileUrl(`https://${ENDPOINT}/ipc-privado/membros/fotos/m_1.jpg`)).toEqual({
        bucketKey: "privado",
        key: "membros/fotos/m_1.jpg",
      });
    });

    it("le canonica path-style do bucket aberto", () => {
      expect(parseFileUrl(`https://${ENDPOINT}/ipc-files/gravacoes-audio/a_1.mp3`)).toEqual({
        bucketKey: "publico",
        key: "gravacoes-audio/a_1.mp3",
      });
    });

    it("le URL legada do B2", () => {
      expect(
        parseFileUrl("https://f005.backblazeb2.com/file/ipc-files/membros/fotos/m_1.jpg"),
      ).toEqual({ bucketKey: "publico", key: "membros/fotos/m_1.jpg" });
    });

    it("retorna null para bucket de terceiro", () => {
      expect(
        parseFileUrl("https://f005.backblazeb2.com/file/outro-bucket/x.mp3"),
      ).toBeNull();
      expect(parseFileUrl(`https://${ENDPOINT}/outro-bucket/x.mp3`)).toBeNull();
    });

    it("retorna null para host externo (foto ainda no Tally)", () => {
      expect(parseFileUrl("https://storage.tally.so/private/foto.jpg?sig=x")).toBeNull();
      expect(parseFileUrl("https://example.com/file.mp3")).toBeNull();
    });

    it("retorna null para virtual-hosted (nunca geramos: forcePathStyle)", () => {
      expect(parseFileUrl(`https://ipc-privado.${ENDPOINT}/membros/fotos/m_1.jpg`)).toBeNull();
    });

    it("retorna null para entrada vazia ou invalida", () => {
      expect(parseFileUrl("")).toBeNull();
      expect(parseFileUrl("nao-e-url")).toBeNull();
    });
  });

  describe("toCdnUrl", () => {
    it("converte URL legada do bucket aberto para o CDN", () => {
      expect(
        toCdnUrl("https://f005.backblazeb2.com/file/ipc-files/gravacoes-audio/a_1.mp3"),
      ).toBe("https://cdn.yhc.com.br/gravacoes-audio/a_1.mp3");
    });

    it("mantem URL que ja e do CDN", () => {
      const cdn = "https://cdn.yhc.com.br/gravacoes-audio/a_1.mp3";
      expect(toCdnUrl(cdn)).toBe(cdn);
    });

    it("nao mexe em URL do bucket fechado nem em host externo", () => {
      const privada = `https://${ENDPOINT}/ipc-privado/membros/fotos/m_1.jpg`;
      expect(toCdnUrl(privada)).toBe(privada);
      expect(toCdnUrl("https://example.com/f.mp3")).toBe("https://example.com/f.mp3");
    });
  });

  describe("generateObjectKey", () => {
    it("gera pasta/entidade_timestamp.ext", () => {
      const before = Date.now();
      const key = generateObjectKey("gravacoes-audio", "entity123", "mp3");
      const after = Date.now();

      expect(key).toMatch(/^gravacoes-audio\/entity123_\d+\.mp3$/);
      const timestamp = parseInt(key.split("_")[1].split(".")[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("gera chave que resolve para a pasta de origem", () => {
      const key = generateObjectKey("membros/fotos", "m123", "jpg");
      expect(folderFromKey(key)).toBe("membros/fotos");
      expect(bucketForKey(key)).toBe("privado");
    });
  });

  describe("cobertura do mapa", () => {
    it("toda pasta registrada resolve para um bucket valido", () => {
      for (const [folder, bucket] of Object.entries(FOLDER_BUCKET)) {
        expect(["publico", "privado"]).toContain(bucket);
        expect(bucketForKey(`${folder}/x_1.bin`)).toBe(bucket);
      }
    });

    // Os dois mapas precisam andar juntos: pasta com permissao de upload mas
    // sem bucket quebraria o upload; bucket sem permissao deixaria a pasta
    // inacessivel. Este teste falha se alguem registrar so um dos lados.
    it("FOLDER_BUCKET e FOLDER_PERMISSIONS cobrem as mesmas pastas", () => {
      expect(Object.keys(FOLDER_BUCKET).sort()).toEqual(
        Object.keys(FOLDER_PERMISSIONS).sort(),
      );
    });

    it("toda pasta tem regra de leitura explicita", () => {
      for (const folder of Object.keys(FOLDER_BUCKET)) {
        const perms = readPermissionsForKey(`${folder}/x_1.bin`);
        // null aqui significaria pasta sem regra — leitura negada por engano.
        expect(perms, `pasta "${folder}" sem regra de leitura`).not.toBeNull();
        expect(perms === "autenticado" || (Array.isArray(perms) && perms.length > 0)).toBe(
          true,
        );
      }
    });

    it("pasta desconhecida nega leitura (fail-closed)", () => {
      expect(readPermissionsForKey("pasta-inventada/x.bin")).toBeNull();
      expect(readPermissionsForKey("semPasta.bin")).toBeNull();
    });
  });
});
