"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/cn";
import { LICOES, licaoPorId, type Treino } from "../lib/licoes";
import st from "./mesa.module.css";

export function PassoAPasso({ treino, agora, aoRecomecar, aoPular, aoAbrir }: {
  treino: Treino;
  agora: number;
  aoRecomecar: () => void;
  aoPular: () => void;
  aoAbrir: (id: string) => void;
}) {
  const licao = licaoPorId(treino.licaoId);
  const mensagem = treino.msg ? (
    <div className={cn(st.msg, treino.msg.k === "erro" && st.erro, treino.msg.k === "ok" && st.ok)} aria-live="polite">
      {treino.msg.t}
    </div>
  ) : null;

  if (!licao.passos.length) {
    return (
      <div className={st.instr}>
        <div className={st["instr-topo"]}><span>Modo livre</span></div>
        <h2>A mesa está toda solta. Mexa à vontade.</h2>
        <p className={st.nota}>Carregue um preset, monte a banda, faça o retorno de cada músico e olhe o mapa.</p>
        {mensagem}
        <div className={st.acoes}>
          <Button variant="ghost" className={cn(st.btn, st.fant)} onClick={aoRecomecar}>Voltar a mesa ao início</Button>
        </div>
      </div>
    );
  }

  if (treino.concluida) {
    const proxima = LICOES[LICOES.indexOf(licao) + 1];
    return (
      <div className={st.instr}>
        <div className={st["instr-topo"]}><span>{licao.nome}</span></div>
        <div className={st.barra}><i style={{ width: "100%" }} /></div>
        <h2>Lição concluída.</h2>
        {mensagem}
        <div className={st.acoes}>
          {proxima && (
            <Button variant="ghost" className={cn(st.btn, st.pri)} onClick={() => aoAbrir(proxima.id)}>Próxima: {proxima.nome}</Button>
          )}
          <Button variant="ghost" className={st.btn} onClick={aoRecomecar}>Refazer</Button>
        </div>
      </div>
    );
  }

  const passo = licao.passos[treino.passo];
  const contador = passo.conta?.(treino.s, agora);
  return (
    <div className={st.instr}>
      <div className={st["instr-topo"]}>
        <span>{licao.nome}</span>
        <span>Passo {treino.passo + 1} de {licao.passos.length}</span>
      </div>
      <div className={st.barra}><i style={{ width: `${(treino.passo / licao.passos.length) * 100}%` }} /></div>
      <h2>{passo.txt}</h2>
      {passo.nota && <p className={st.nota}>{passo.nota}</p>}
      {contador && <div className={st.contador}>{contador}</div>}
      {mensagem}
      <div className={st.acoes}>
        <Button variant="ghost" className={cn(st.btn, st.fant)} onClick={aoPular}>Pular passo</Button>
        <Button variant="ghost" className={cn(st.btn, st.fant)} onClick={aoRecomecar}>Recomeçar lição</Button>
      </div>
    </div>
  );
}
