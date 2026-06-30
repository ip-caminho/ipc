import Link from "next/link";
import { getIgrejaInfoPublic } from "../lib/data";
import { IGREJA_DEFAULTS } from "../lib/igreja";

// Footer público compartilhado (identidade da landing, .site-v2). Lê os dados da
// igreja de getIgrejaInfo (editável em /admin/site-publico/informacoes), com
// fallback para IGREJA_DEFAULTS caso o banco esteja vazio.
export async function SiteFooter() {
  const i = await getIgrejaInfoPublic();
  const endereco = i.endereco || IGREJA_DEFAULTS.endereco;
  const email = i.email || IGREJA_DEFAULTS.email;
  const nome = i.nome || IGREJA_DEFAULTS.nome;
  const banco = i.banco || IGREJA_DEFAULTS.banco;
  const agencia = i.agencia || IGREJA_DEFAULTS.agencia;
  const conta = i.conta || IGREJA_DEFAULTS.conta;
  const pix = i.pix || IGREJA_DEFAULTS.pix;

  return (
    <div className="site-v2">
      <footer className="site">
        <div className="foot-wrap">
          <div className="foot-cols">
            <div className="foot-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="IPC" />
              <p className="tag">
                Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.
              </p>
            </div>
            <div className="foot-contato">
              <div>
                <h4>Contato</h4>
                <p>{endereco}</p>
                <p style={{ marginTop: "var(--space-3)" }}>
                  <a href={`mailto:${email}`} className="foot-link">
                    {email}
                  </a>
                </p>
                <p>
                  <a
                    href={IGREJA_DEFAULTS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foot-link"
                  >
                    @ip.docaminho
                  </a>
                </p>
              </div>
              <div>
                <h4>Tradição</h4>
                <p>Presbiteriana reformada. Alinhados à Confissão de Fé de Westminster (1647).</p>
                <p style={{ marginTop: "var(--space-3)" }}>
                  Denominação: Igreja Presbiteriana do Brasil.
                </p>
              </div>
              <div>
                <h4>Dízimos e ofertas</h4>
                <p>{banco}</p>
                <p>Agência {agencia}</p>
                <p>Conta {conta}</p>
                <p style={{ marginTop: "var(--space-3)" }}>{nome}</p>
                <p>CNPJ {pix}</p>
              </div>
            </div>
          </div>

          <div className="foot-bottom">
            <Link href="/privacidade" className="foot-link">
              Política de privacidade
            </Link>
            <Link href="/dashboard" className="foot-link">
              Área de membros →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
