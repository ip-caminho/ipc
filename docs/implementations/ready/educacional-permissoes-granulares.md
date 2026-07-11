# Educacional — permissões granulares por persona

## Escopo
Quebrar as permissões grossas do educacional em uma série por persona, criar os
conjuntos (volunteer sets) Professor e Coordenador, e migrar sem ninguém perder
acesso. `educacional:write` fica deprecado (mantido no registro para limpeza).

## Personas
- **Coordenador** — crianças (cadastro+médico), voluntários, escala, relatórios.
- **Professor/Auxiliar** — vê turma, marca presença, preenche relatório.
- **Secretaria** — cadastro das crianças + educacional (herda tudo).
- **Pastor/Presbítero** — leitura.

## Novas permissões (4)
| Permissão | Cobre |
|---|---|
| `escala_edu:manage` | montar/editar/gerar/excluir escala |
| `relatorio_edu:write` | criar/editar relatório + marcar presença |
| `relatorio_edu:delete` | excluir relatório |
| `criancas:medical` | ver observações médicas (LGPD) |

`educacional:write` → **deprecado** (mantido em ALL_PERMISSIONS relabelado; sem
uso em código; removível pelo admin). `educacional:read` segue guarda-chuva de
leitura (dashboard, agenda, escala, relatórios).

## Mapeamento educacional:write → nova permissão
| Local | Nova |
|---|---|
| `createRelatorio` | `relatorio_edu:write` |
| `createEscala`, `removeEscala`, `upsertEscalaDia`, `gerarEscalaMes`, `removeEscalaDia` | `escala_edu:manage` |
| `removeRelatorio` | `relatorio_edu:delete` |
| presença page (3 gates) + `turma/[id]` canWrite | `relatorio_edu:write` |
| page: escala (Nova/Gerar, grade edit/remove) | `escala_edu:manage` |
| page: Novo Relatório + editar no detalhe | `relatorio_edu:write` |
| page: excluir relatório no detalhe | `relatorio_edu:delete` |
| `navigation.ts` Presença | `relatorio_edu:write` |
| `files/authz.ts` educacional/fotos | `criancas:manage` (dropa educacional:write) |

## Mapeamento criancas:manage → médico
| Local | Mudança |
|---|---|
| `getCrianca`/`listCriancas` (retorno de observacoesMedicas) | gate por `criancas:medical` |
| `CriancaForm` campo obs. médicas | visível só com `criancas:medical` |
| demais (`criancas:manage`: CRUD, ovelhinhas, Nova Criança) | inalterado |
| `updateCrianca` | já faz patch defensivo (não apaga médico se omitido) — sem mudança |

## Conjuntos (VOLUNTEER_PERMISSION_SETS)
- `voluntario_educacional` → relabel **"Coordenador Educacional"**: criancas:read/manage/medical, educacional:read, escala_edu:manage, relatorio_edu:write, relatorio_edu:delete, voluntarios_edu:read/manage.
- **novo** `professor_educacional` **"Professor Educacional"**: criancas:read, educacional:read, relatorio_edu:write.

## Roles (rbacHelpers INITIAL_ROLE_PERMISSIONS)
- `secretaria`: troca `educacional:write` por escala_edu:manage + relatorio_edu:write + relatorio_edu:delete + criancas:medical.
- pastor/presbítero: inalterados (só leitura).

## Migração (internalMutation, padrão addVoluntariosEduPermissions)
`addEducacionalGranularPermissions`: para snapshots de roles e de membros —
quem tem `educacional:write` ganha escala_edu:manage + relatorio_edu:write +
relatorio_edu:delete; quem tem `criancas:manage` ganha `criancas:medical`.
Idempotente. Rodar após deploy (`convex run`).

## Arquivos
| Arquivo | Ação |
|---|---|
| `types/auth.ts` | +4 literais de Permission |
| `convex/preferencias/rbac.ts` | ALL_PERMISSIONS +4; label/module/description; migração |
| `convex/preferencias/rbacHelpers.ts` | secretaria; volunteer sets (Coordenador + Professor) |
| `convex/educacional/mutations.ts` | trocar requirePermission (7 pontos) |
| `convex/educacional/queries.ts` | médico por criancas:medical (2 pontos) |
| `convex/files/authz.ts` | educacional/fotos |
| `app/(ready)/educacional/page.tsx` | split canWriteEdu; gates |
| `app/(ready)/educacional/presenca/page.tsx` | 3 gates |
| `app/(ready)/educacional/turma/[id]/page.tsx` | canWrite |
| `features/educacional/components/CriancaForm.tsx` | campo médico por criancas:medical |
| `features/educacional/components/RelatorioDetalhe.tsx` | canEdit/canDelete separados |
| `shared/constants/navigation.ts` | Presença |
| `shared/components/layout/DevContext.tsx` | notas |

## Verificação
tsc, lint, `rbacHelpers.test.ts` + `rbac.integration.test.ts`, build. Deploy
Convex + rodar migração.
