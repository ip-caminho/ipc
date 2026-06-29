import type { IgrejaInfo } from "@features/site-publico/lib/nav";

const ano = new Date().getFullYear();

// Rodapé público escuro. Contato vem de `preferencias.getIgrejaInfo`;
// liderança é [PREENCHER] até existir fonte no chrMS.
export function FooterPublico({ igreja }: { igreja: IgrejaInfo }) {
  const nome = igreja.nome ?? "Igreja Presbiteriana do Caminho";

  return (
    <footer className="bg-[#0A0A0A] text-[#E8E4D8]">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-14 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <span className="inline-block border-[1.5px] border-[#E8E4D8] px-3 py-1.5 font-[family-name:var(--font-spectral)] text-[18px] leading-none">
              ipc
            </span>
            <p className="mt-4 max-w-[280px] font-[family-name:var(--font-spectral)] text-[14px] leading-relaxed text-[#E8E4D8]/85">
              {igreja.descricao ??
                "Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo."}
            </p>
          </div>

          <FooterCol titulo="Liderança">
            <FooterLinha rotulo="Pastor" valor="[PREENCHER]" />
            <FooterLinha rotulo="Conselho" valor="[PREENCHER]" />
            <FooterLinha rotulo="Diaconia" valor="[PREENCHER]" />
          </FooterCol>

          <FooterCol titulo="Contato">
            {igreja.endereco && <p className="text-[12px] leading-relaxed text-[#E8E4D8]/85">{igreja.endereco}</p>}
            {igreja.email && (
              <a
                href={`mailto:${igreja.email}`}
                className="mt-1 inline-block text-[12px] text-[#E8E4D8]/85 underline-offset-2 hover:underline"
              >
                {igreja.email}
              </a>
            )}
          </FooterCol>

          <FooterCol titulo="Tradição">
            <p className="text-[12px] leading-relaxed text-[#E8E4D8]/85">
              Presbiteriana reformada.
              <br />
              Westminster, 1647.
            </p>
            <a
              href="/privacidade"
              className="mt-2 inline-block text-[12px] text-[#E8E4D8]/85 underline-offset-2 hover:underline"
            >
              Privacidade
            </a>
          </FooterCol>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6 font-[family-name:var(--font-source-sans)] text-[11px] text-[#8A8A8A]">
          <span>
            © {ano} {nome}
          </span>
          <a href="#topo" className="hover:text-[#E8E4D8]">
            Voltar ao topo ↑
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="font-[family-name:var(--font-source-sans)]">
      <h3 className="mb-3 text-[11px] uppercase tracking-[0.1em] text-[#8A8A8A]">{titulo}</h3>
      {children}
    </div>
  );
}

function FooterLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="text-[12px] leading-relaxed text-[#E8E4D8]/85">
      <span className="text-[#8A8A8A]">{rotulo}: </span>
      {valor}
    </p>
  );
}
