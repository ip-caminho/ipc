"use client";

import * as React from "react";
import { differenceInYears, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils/cn";
import {
  interpretarDataColada,
  isoParaPartes,
  validarPartesData,
  type PartesData,
} from "@/shared/lib/utils/date";

// Data digitada em três caixas rotuladas, com salto automático e confirmação
// por extenso: dia e mês não têm como ser confundidos. Para datas passadas que
// a pessoa sabe de cor (nascimento, batismo). Emite ISO (yyyy-mm-dd) quando a
// data está completa e válida; "" enquanto não está.

type Props = {
  id?: string;
  value: string; // ISO yyyy-mm-dd (ou "")
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string; // ISO yyyy-mm-dd: bloqueia datas anteriores
  mostrarIdade?: boolean;
};

type Campo = keyof PartesData;

const CAMPOS: { campo: Campo; rotulo: string; digitos: number; salta: number }[] = [
  // `salta`: acima deste primeiro dígito, o valor já está definido.
  { campo: "dia", rotulo: "Dia", digitos: 2, salta: 3 },
  { campo: "mes", rotulo: "Mês", digitos: 2, salta: 1 },
  { campo: "ano", rotulo: "Ano", digitos: 4, salta: 9 },
];

function dataPorExtenso(iso: string, mostrarIdade?: boolean): string {
  const data = parseISO(iso);
  const extenso = format(data, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  if (!mostrarIdade) return extenso;
  const anos = differenceInYears(new Date(), data);
  const idade = anos === 0 ? "menos de 1 ano" : anos === 1 ? "1 ano" : `${anos} anos`;
  return `${extenso} · ${idade}`;
}

export function DateInputBR({
  id,
  value,
  onChange,
  className,
  disabled,
  min,
  mostrarIdade,
}: Props) {
  const idBase = React.useId();
  const [partes, setPartes] = React.useState(() => isoParaPartes(value));
  const [saiu, setSaiu] = React.useState(false);
  const caixas = React.useRef<Record<Campo, HTMLInputElement | null>>({
    dia: null,
    mes: null,
    ano: null,
  });

  // Sincroniza quando o valor externo muda (ex: pré-preenchimento da família),
  // sem apagar o que a pessoa ainda está digitando.
  React.useEffect(() => {
    setPartes((atuais) =>
      (validarPartesData(atuais, { min }).iso ?? "") === value ? atuais : isoParaPartes(value),
    );
  }, [value, min]);

  const resultado = validarPartesData(partes, { min });
  const erro = resultado.erro && (saiu || !resultado.incompleta) ? resultado.erro : null;
  const idMensagem = `${idBase}-mensagem`;

  function aplicar(novas: PartesData) {
    setPartes(novas);
    onChange(validarPartesData(novas, { min }).iso ?? "");
  }

  function alterar(indice: number, bruto: string) {
    const colada = interpretarDataColada(bruto);
    if (colada) {
      aplicar(colada);
      caixas.current.ano?.focus();
      return;
    }
    const { campo, digitos, salta } = CAMPOS[indice];
    const texto = bruto.replace(/\D/g, "").slice(0, digitos);
    const cresceu = texto.length > partes[campo].length;
    const novas = { ...partes, [campo]: texto };
    aplicar(novas);
    const proximo = CAMPOS[indice + 1];
    // Valor inválido (mês 13) segura o foco na caixa para corrigir ali mesmo.
    const { erro, incompleta } = validarPartesData(novas, { min });
    if (proximo && cresceu && (!erro || incompleta) && (texto.length === digitos || Number(texto) > salta)) {
      caixas.current[proximo.campo]?.focus();
    }
  }

  return (
    <div
      className="space-y-1"
      onFocus={() => setSaiu(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSaiu(true);
      }}
    >
      <div className="grid max-w-xs grid-cols-[1fr_1fr_1.5fr] gap-2">
        {CAMPOS.map(({ campo, rotulo }, indice) => {
          const idCaixa = indice === 0 && id ? id : `${idBase}-${campo}`;
          return (
            <div key={campo} className="min-w-0 space-y-0.5">
              <Label htmlFor={idCaixa} className="text-xs font-normal text-muted-foreground">
                {rotulo}
              </Label>
              <Input
                id={idCaixa}
                ref={(el) => {
                  caixas.current[campo] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={partes[campo]}
                disabled={disabled}
                className={cn("px-1 text-center", className)}
                aria-invalid={erro ? true : undefined}
                aria-describedby={idMensagem}
                onFocus={(e) => e.target.select()}
                onChange={(e) => alterar(indice, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Backspace" || partes[campo] || indice === 0) return;
                  e.preventDefault();
                  caixas.current[CAMPOS[indice - 1].campo]?.focus();
                }}
              />
            </div>
          );
        })}
      </div>
      <p id={idMensagem} aria-live="polite" className={cn("text-xs", erro ? "text-destructive" : "text-muted-foreground")}>
        {erro ?? (resultado.iso ? dataPorExtenso(resultado.iso, mostrarIdade) : null)}
      </p>
    </div>
  );
}

// Wrapper para React Hook Form: <DateInputFieldBR control={form.control} name="data" />
export function DateInputFieldBR<T extends FieldValues>({
  control,
  name,
  ...props
}: Omit<Props, "value" | "onChange"> & { control: Control<T>; name: Path<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DateInputBR {...props} value={(field.value as string) ?? ""} onChange={field.onChange} />
      )}
    />
  );
}
