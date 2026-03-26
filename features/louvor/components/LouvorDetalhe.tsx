"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ArrowLeft, Pencil, Trash2, Minus, Plus, AArrowUp, AArrowDown } from "lucide-react";
import { toast } from "sonner";
import { ChordSheet } from "./ChordSheet";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { LouvorForm } from "./LouvorForm";
import { semitonesBetween, TOM_OPTIONS } from "../lib/constants";
import type { LouvorFormValues } from "../lib/validations";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface LouvorDetalheProps {
  louvorId: Id<"louvores">;
  onBack?: () => void;
}

type TomMode = "original" | "homem" | "mulher" | "custom";

export function LouvorDetalhe({ louvorId, onBack }: LouvorDetalheProps) {
  const router = useRouter();
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const louvor = useQuery(api.louvor.queries.getById, { id: louvorId });
  const updateLouvor = useMutation(api.louvor.mutations.update);
  const removeLouvor = useMutation(api.louvor.mutations.remove);

  const [showChords, setShowChords] = useState(false);
  const [tomMode, setTomMode] = useState<TomMode>("original");
  const [customSemitones, setCustomSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [editOpen, setEditOpen] = useState(false);

  const transposeSemitones = useMemo(() => {
    if (!louvor?.tom) return 0;
    if (tomMode === "original") return 0;
    if (tomMode === "custom") return customSemitones;
    if (tomMode === "homem" && louvor.tomHomem) {
      return semitonesBetween(louvor.tom, louvor.tomHomem);
    }
    if (tomMode === "mulher" && louvor.tomMulher) {
      return semitonesBetween(louvor.tom, louvor.tomMulher);
    }
    return 0;
  }, [louvor, tomMode, customSemitones]);

  if (louvor === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!louvor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => onBack ? onBack() : router.push("/louvor")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Musica nao encontrada.</p>
      </div>
    );
  }

  const handleUpdate = async (data: LouvorFormValues) => {
    try {
      const updateData: Record<string, any> = {
        titulo: data.titulo,
        artista: data.artista || undefined,
        tom: data.tom || undefined,
        tomHomem: data.tomHomem || undefined,
        tomMulher: data.tomMulher || undefined,
        bpm: data.bpm && data.bpm !== "" ? Number(data.bpm) : undefined,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        conteudo: data.conteudo || undefined,
        youtubeUrl: data.youtubeUrl || undefined,
        spotifyUrl: data.spotifyUrl || undefined,
        observacoes: data.observacoes || undefined,
        estrutura: data.estrutura || undefined,
      };
      await updateLouvor({ id: louvorId, data: updateData });
      toast.success("Musica atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Excluir esta musica?")) return;
    try {
      await removeLouvor({ id: louvorId });
      toast.success("Musica excluida");
      onBack ? onBack() : router.push("/louvor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  const editDefaults: Partial<LouvorFormValues> = {
    titulo: louvor.titulo,
    artista: louvor.artista || "",
    tom: louvor.tom || "",
    tomHomem: louvor.tomHomem || "",
    tomMulher: louvor.tomMulher || "",
    bpm: louvor.bpm ? String(louvor.bpm) as any : "",
    tags: (louvor.tags || []).join(", "),
    conteudo: louvor.conteudo || "",
    youtubeUrl: louvor.youtubeUrl || "",
    spotifyUrl: louvor.spotifyUrl || "",
    observacoes: louvor.observacoes || "",
    estrutura: louvor.estrutura || "",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onBack ? onBack() : router.push("/louvor")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-medium">{louvor.titulo}</h1>
          </div>
          <div className="flex items-center gap-2 ml-10">
            {louvor.artista && (
              <span className="text-muted-foreground">{louvor.artista}</span>
            )}
            {louvor.tom && <Badge variant="secondary">{louvor.tom}</Badge>}
            {louvor.bpm && (
              <Badge variant="outline">{louvor.bpm} BPM</Badge>
            )}
          </div>
          {louvor.tags && louvor.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-10">
              {louvor.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {louvor.estrutura && (
            <p className="text-xs text-muted-foreground font-mono ml-10">
              {louvor.estrutura}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {can("louvor:update") && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
          {can("louvor:delete") && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Controls: tom selector + chord toggle */}
      {louvor.conteudo && (
        <div className="flex items-center gap-4 flex-wrap border rounded-lg p-3 bg-muted/30">
          {/* Tom selector */}
          {louvor.tom && (
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Tom:</Label>
              <Select value={tomMode} onValueChange={(v) => setTomMode(v as TomMode)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original ({louvor.tom})</SelectItem>
                  {louvor.tomHomem && (
                    <SelectItem value="homem">Homem ({louvor.tomHomem})</SelectItem>
                  )}
                  {louvor.tomMulher && (
                    <SelectItem value="mulher">Mulher ({louvor.tomMulher})</SelectItem>
                  )}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom transpose controls */}
          {tomMode === "custom" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCustomSemitones((s) => s - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-mono w-8 text-center">
                {customSemitones > 0 ? `+${customSemitones}` : customSemitones}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCustomSemitones((s) => s + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Font size + cifras toggle */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFontSize((s) => Math.max(12, s - 2))}
              >
                <AArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              >
                <AArrowUp className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-chords" className="text-sm">Cifras</Label>
              <Switch
                id="show-chords"
                checked={showChords}
                onCheckedChange={setShowChords}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chord sheet */}
      <ChordSheet
        conteudo={louvor.conteudo || ""}
        showChords={showChords}
        transposeSemitones={transposeSemitones}
        fontSize={fontSize}
      />

      {/* YouTube embed */}
      {louvor.youtubeUrl && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Video</h3>
          <YouTubeEmbed url={louvor.youtubeUrl} />
        </div>
      )}

      {/* Observacoes */}
      {louvor.observacoes && can("louvor:update") && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Observacoes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{louvor.observacoes}</p>
        </div>
      )}

      {/* Edit dialog */}
      {can("louvor:update") && (
        <LouvorForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleUpdate}
          defaultValues={editDefaults}
          isEditing
        />
      )}
    </div>
  );
}
