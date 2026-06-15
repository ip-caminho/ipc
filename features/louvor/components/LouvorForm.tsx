"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { louvorFormSchema, type LouvorFormValues } from "../lib/validations";
import { TOM_OPTIONS, TAG_SUGGESTIONS, ESTRUTURA_SECOES } from "../lib/constants";
import { detectFormat } from "../lib/chordpro";
import { ChordSheet } from "./ChordSheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from "@/shared/components/ui/responsive-dialog";

interface LouvorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LouvorFormValues) => Promise<void>;
  defaultValues?: Partial<LouvorFormValues>;
  isEditing?: boolean;
}

export function LouvorForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: LouvorFormProps) {
  const [loading, setLoading] = useState(false);
  const [conteudo, setConteudo] = useState(defaultValues?.conteudo || "");
  const [estrutura, setEstrutura] = useState(defaultValues?.estrutura || "");

  const defaults = {
    titulo: "",
    artista: "",
    tom: "",
    tomHomem: "",
    tomMulher: "",
    bpm: "" as any,
    tags: "",
    conteudo: "",
    youtubeUrl: "",
    spotifyUrl: "",
    observacoes: "",
    estrutura: "",
    ...defaultValues,
  };

  const form = useForm<LouvorFormValues>({
    // cast: zod v4 coerce faz input/output divergirem do tipo do form
    resolver: zodResolver(louvorFormSchema) as Resolver<LouvorFormValues>,
    defaultValues: defaults,
  });

  // Reset form + conteudo local quando abre
  useEffect(() => {
    if (open) {
      form.reset(defaults);
      setConteudo(defaults.conteudo || "");
      setEstrutura(defaults.estrutura || "");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const formato = useMemo(() => conteudo ? detectFormat(conteudo) : null, [conteudo]);

  const handleSubmit = async (data: LouvorFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="md:max-w-[90vw]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? "Editar" : "Nova"} Musica</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form
          id="louvor-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="contents"
        >
        <ResponsiveDialogBody className="space-y-4">
          {/* Titulo + Artista */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input id="titulo" {...form.register("titulo")} />
              {form.formState.errors.titulo && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.titulo.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="artista">Artista</Label>
              <Input id="artista" placeholder="Ex: Diante do Trono" {...form.register("artista")} />
            </div>
          </div>

          {/* Tom, Tom Homem, Tom Mulher, BPM */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Tom original</Label>
              <Select
                value={form.watch("tom") || ""}
                onValueChange={(val) => form.setValue("tom", val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {TOM_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tom homem</Label>
              <Select
                value={form.watch("tomHomem") || ""}
                onValueChange={(val) => form.setValue("tomHomem", val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {TOM_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tom mulher</Label>
              <Select
                value={form.watch("tomMulher") || ""}
                onValueChange={(val) => form.setValue("tomMulher", val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {TOM_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bpm">BPM</Label>
              <Input id="bpm" type="number" placeholder="120" {...form.register("bpm")} />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label htmlFor="tags">Tags (separadas por virgula)</Label>
            <Input
              id="tags"
              placeholder="adoracao, louvor, contemporaneo"
              {...form.register("tags")}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => {
                    const current = form.getValues("tags") || "";
                    const existing = current.split(",").map((t) => t.trim()).filter(Boolean);
                    if (!existing.includes(tag)) {
                      form.setValue("tags", [...existing, tag].join(", "));
                    }
                  }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Conteudo + Preview lado a lado */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="conteudo">Conteudo (cifra/letra)</Label>
              {formato && (
                <Badge variant="outline" className="text-xs">
                  {formato === "chordpro" ? "ChordPro" : "Texto com cifras"}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea
                id="conteudo"
                className="font-mono text-sm min-h-[40vh] !field-sizing-fixed resize-none"
                placeholder={`Cole aqui a cifra do Cifra Club ou ChordPro.\n\nExemplo Cifra Club:\n   G          C\nAmazing grace how sweet\n\nExemplo ChordPro:\n[G]Amazing grace [C]how sweet`}
                value={conteudo}
                onChange={(e) => {
                  setConteudo(e.target.value);
                  form.setValue("conteudo", e.target.value, { shouldDirty: true });
                }}
              />
              <div className="border rounded-md p-4 overflow-x-auto overflow-y-auto min-h-[40vh] max-h-[40vh] bg-muted/30">
                {conteudo ? (
                  <ChordSheet conteudo={conteudo} showChords={true} fontSize={14} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Preview aparece aqui...</p>
                )}
              </div>
            </div>
          </div>

          {/* YouTube + Spotify */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input id="youtubeUrl" placeholder="https://youtube.com/watch?v=..." {...form.register("youtubeUrl")} />
              {form.formState.errors.youtubeUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.youtubeUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="spotifyUrl">Spotify URL</Label>
              <Input id="spotifyUrl" placeholder="https://open.spotify.com/track/..." {...form.register("spotifyUrl")} />
              {form.formState.errors.spotifyUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.spotifyUrl.message}
                </p>
              )}
            </div>
          </div>

          {/* Observacoes */}
          <div className="space-y-1">
            <Label htmlFor="observacoes">Observacoes</Label>
            <Textarea id="observacoes" {...form.register("observacoes")} />
          </div>

          {/* Estrutura (ordem das secoes) */}
          <div className="space-y-1">
            <Label htmlFor="estrutura">Estrutura</Label>
            <Input
              id="estrutura"
              className="font-mono"
              placeholder="Ex: i v1 pc r v2 pc r p r"
              value={estrutura}
              onChange={(e) => {
                setEstrutura(e.target.value);
                form.setValue("estrutura", e.target.value, { shouldDirty: true });
              }}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {ESTRUTURA_SECOES.map(({ abbr, label }) => (
                <button
                  key={abbr}
                  type="button"
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
                  onClick={() => {
                    const next = estrutura ? `${estrutura} ${abbr}` : abbr;
                    setEstrutura(next);
                    form.setValue("estrutura", next, { shouldDirty: true });
                  }}
                >
                  {abbr}
                </button>
              ))}
              {estrutura && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                  onClick={() => {
                    setEstrutura("");
                    form.setValue("estrutura", "", { shouldDirty: true });
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {ESTRUTURA_SECOES.map(({ abbr, label }) => `${abbr} = ${label}`).join(" · ")}
            </p>
          </div>

        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
