"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Calendar } from "@/shared/components/ui/calendar";
import { Check, X, Lock } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils/cn";

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão",
  PREGACAO: "Pregação",
  ORACAO: "Oração",
  AVISOS: "Avisos",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

export function DisponibilidadeTab() {
  // @ts-ignore Convex TS2589
  const minhasEquipes = useQuery(api.escalas.equipes.listMinhasEquipes);
  // @ts-ignore Convex TS2589
  const indisponibilidades = useQuery(api.escalas.disponibilidade.minhasIndisponibilidades, {});
  // @ts-ignore Convex TS2589
  const datasEscaladas = useQuery(api.escalas.disponibilidade.minhasDatasEscaladas);
  // @ts-ignore Convex TS2589
  const toggleIndisp = useMutation(api.escalas.disponibilidade.toggleIndisponibilidade);

  const indispDatas = new Set((indisponibilidades || []).map((i: any) => i.data));
  const escaladaDatas = new Set(datasEscaladas || []);

  const handleDayClick = async (date: Date) => {
    // Só domingos
    if (date.getDay() !== 0) return;

    const dataStr = date.toISOString().split("T")[0];

    if (escaladaDatas.has(dataStr)) {
      toast.error("Você já está escalado nesta data. Solicite ao coordenador para alterar.");
      return;
    }
    try {
      const result = await toggleIndisp({ data: dataStr });
      if (result.action === "added") {
        toast.success("Marcado como indisponível");
      } else {
        toast.success("Marcado como disponível");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (minhasEquipes === undefined || indisponibilidades === undefined || datasEscaladas === undefined) {
    return <Skeleton className="h-64" />;
  }

  // Dias indisponíveis como Date objects
  const indispDates = Array.from(indispDatas).map((d) => new Date(d + "T12:00:00"));
  const escaladoDates = Array.from(escaladaDatas).map((d: string) => new Date(d + "T12:00:00"));

  // Desabilitar todos os dias que não são domingo
  const isNotSunday = (date: Date) => date.getDay() !== 0;

  return (
    <div className="space-y-4">
      {minhasEquipes.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {minhasEquipes.map((funcao: string) => (
            <Badge key={funcao} variant="secondary" className="text-xs">
              {FUNCAO_LABELS[funcao] || funcao}
            </Badge>
          ))}
        </div>
      )}

      {minhasEquipes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Você ainda não faz parte de nenhuma equipe de escala.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Toque no domingo para alternar disponibilidade. <span className="text-green-600">Verde</span> = disponível, <span className="text-destructive">Vermelho</span> = indisponível, <span className="text-blue-600">Azul</span> = escalado.
      </p>

      <Calendar
        locale={ptBR}
        mode="multiple"
        selected={indispDates}
        onDayClick={handleDayClick}
        disabled={isNotSunday}
        fromDate={new Date()}
        toDate={new Date(new Date().getFullYear(), 11, 31)}
        className="w-full"
        classNames={{
          day: cn(
            "group/day relative aspect-square h-full w-full p-0 text-center select-none",
          ),
        }}
        modifiers={{
          indisponivel: indispDates,
          escalado: escaladoDates,
          disponivel: (date: Date) => {
            if (date.getDay() !== 0) return false;
            const dataStr = date.toISOString().split("T")[0];
            return !indispDatas.has(dataStr) && !escaladaDatas.has(dataStr);
          },
        }}
        modifiersClassNames={{
          indisponivel: "[&_button]:bg-destructive/10 [&_button]:text-destructive [&_button]:font-bold",
          escalado: "[&_button]:bg-blue-100 [&_button]:text-blue-700 [&_button]:font-bold dark:[&_button]:bg-blue-950/40 dark:[&_button]:text-blue-300",
          disponivel: "[&_button]:bg-green-50 [&_button]:text-green-700 dark:[&_button]:bg-green-950/30 dark:[&_button]:text-green-300",
        }}
      />
    </div>
  );
}
