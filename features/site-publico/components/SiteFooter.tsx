import Link from "next/link";

// Footer público compartilhado (identidade da landing, .site-v2). Dados fixos
// e corretos da igreja (o banco ainda tem dados antigos de teste — ver landing).
export function SiteFooter() {
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
                <p>Rua Pedra Azul, 674A — Vila Mariana, São Paulo, SP</p>
                <p style={{ marginTop: "var(--space-3)" }}>
                  <a href="mailto:ipdocaminho@gmail.com" className="foot-link">
                    ipdocaminho@gmail.com
                  </a>
                </p>
                <p>
                  <a
                    href="https://instagram.com/ip.docaminho"
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
                <p>Santander (033)</p>
                <p>Agência 0108</p>
                <p>Conta 13007643-7</p>
                <p style={{ marginTop: "var(--space-3)" }}>Igreja Presbiteriana do Caminho</p>
                <p>CNPJ 48.792.102/0001-13</p>
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
