# Plano: Correção do Status de Pedidos de Oração

## Problema
Quando um pedido de oração é atualizado como `TESTEMUNHO`, o status vai automaticamente para `RESPONDIDO`. Porém, quando o usuário adiciona uma nova atualização do tipo `ATUALIZACAO` ou `REFORCO` (indicando que o pedido continua precisando de oração), o status permanece como `RESPONDIDO` ao invés de voltar para `ATIVO`.

## Arquivo a ser modificado
- `convex/pedidosOracao/mutations.ts` - mutation `addUpdate` (linhas 272-318)

## Mudança necessária
Na mutation `addUpdate`, modificar a lógica de atualização do status:

**Atual:**
```typescript
if (tipo === "TESTEMUNHO") {
  patch.status = "RESPONDIDO";
}
```

**Novo:**
```typescript
if (tipo === "TESTEMUNHO") {
  patch.status = "RESPONDIDO";
} else if (tipo === "ATUALIZACAO" || tipo === "REFORCO") {
  // Se o pedido estava respondido mas continua precisando de oracao,
  // volta para ativo
  patch.status = "ATIVO";
}
```

## Comportamento esperado após a correção
- `TESTEMUNHO` → status = `RESPONDIDO`
- `ATUALIZACAO` ou `REFORCO` → status = `ATIVO` (independente do status atual)

Isso garante que quando um usuário indica que o pedido continua (`ATUALIZACAO`/`REFORCO`), ele volte a aparecer como ativo no mural.
