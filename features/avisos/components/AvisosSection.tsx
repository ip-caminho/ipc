"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Plus, Trash2, X, Megaphone, Pencil, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

function AvisoForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial?: { titulo: string; descricao: string; dataInicio: string; dataFim: string };
  onSave: (data: { titulo: string; descricao?: string; dataInicio: string; dataFim?: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio || "");
  const [dataFim, setDataFim] = useState(initial?.dataFim || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!titulo.trim() || !dataInicio) return;
    setSaving(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        dataInicio,
        dataFim: dataFim || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <Input
        placeholder="Titulo do aviso"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="text-sm"
        autoFocus
      />
      <Textarea
        placeholder="Descricao (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="text-sm min-h-[60px]"
      />
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data</label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-40 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Até (opcional)</label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-40 text-sm"
            min={dataInicio}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={!titulo.trim() || !dataInicio || saving}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function AvisoCard({
  aviso,
  canEdit,
  canDelete,
}: {
  aviso: any;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const updateAviso = useMutation(api.avisos.mutations.update);
  const removeAviso = useMutation(api.avisos.mutations.remove);
  const [editing, setEditing] = useState(false);

  const formatData = (inicio: string, fim?: string) => {
    const i = format(parseISO(inicio), "dd/MM", { locale: ptBR });
    if (!fim || fim === inicio) return i;
    const f = format(parseISO(fim), "dd/MM", { locale: ptBR });
    return `${i} — ${f}`;
  };

  const handleUpdate = async (data: { titulo: string; descricao?: string; dataInicio: string; dataFim?: string }) => {
    try {
      await updateAviso({ id: aviso._id, ...data });
      setEditing(false);
      toast.success("Aviso atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async () => {
    if (!confirm("Excluir este aviso?")) return;
    try {
      await removeAviso({ id: aviso._id });
      toast.success("Aviso excluido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (editing) {
    return (
      <AvisoForm
        initial={{
          titulo: aviso.titulo,
          descricao: aviso.descricao || "",
          dataInicio: aviso.dataInicio,
          dataFim: aviso.dataFim || "",
        }}
        onSave={handleUpdate}
        onCancel={() => setEditing(false)}
        submitLabel="Salvar"
      />
    );
  }

  return (
    <div className="flex items-start gap-3 border rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{aviso.titulo}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatData(aviso.dataInicio, aviso.dataFim)}
          </span>
        </div>
        {aviso.descricao && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {aviso.descricao}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/50 mt-1">
          {aviso.criadoPorNome && `por ${aviso.criadoPorNome}`}
          {aviso.criadoEm && `${aviso.criadoPorNome ? " · " : ""}criado ${format(new Date(aviso.criadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
          {aviso.atualizadoEm && ` · editado ${format(new Date(aviso.atualizadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-tap"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
            aria-label="Editar aviso"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-tap"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
            aria-label="Excluir aviso"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AvisosSection({ showForm, setShowForm }: { showForm: boolean; setShowForm: (v: boolean) => void }) {
  const { can } = useAuth();
  const avisos = useQuery(api.avisos.queries.list, {});
  const createAviso = useMutation(api.avisos.mutations.create);

  const canEdit = can("escalas:update");
  const canDelete = can("escalas:delete");

  const handleCreate = async (data: { titulo: string; descricao?: string; dataInicio: string; dataFim?: string }) => {
    try {
      await createAviso(data);
      setShowForm(false);
      toast.success("Aviso criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const ativos = (avisos || []).filter((a) => {
    const fim = a.dataFim || a.dataInicio;
    return fim >= today;
  });
  const expirados = (avisos || []).filter((a) => {
    const fim = a.dataFim || a.dataInicio;
    return fim < today;
  });

  return (
    <div className="space-y-3">
      {showForm && (
        <AvisoForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          submitLabel="Criar aviso"
        />
      )}

      {ativos.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum aviso ativo</p>
      ) : (
        <div className="space-y-2">
          {ativos.map((aviso) => (
            <AvisoCard
              key={aviso._id}
              aviso={aviso}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {expirados.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            {expirados.length} aviso{expirados.length > 1 ? "s" : ""} expirado{expirados.length > 1 ? "s" : ""}
          </summary>
          <div className="space-y-2 mt-2 opacity-50">
            {expirados.map((aviso) => (
              <AvisoCard
                key={aviso._id}
                aviso={aviso}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
