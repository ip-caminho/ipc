"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Church,
  Clock,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Landmark,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";

function formatWhatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatDateShort(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

const DIA_LABELS: Record<string, string> = {
  DOMINGO: "Domingo",
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};

const DIA_SEMANA_TO_INDEX: Record<string, number> = {
  DOMINGO: 0,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SABADO: 6,
};

// Calcula as datas previstas dos encontros entre dataInicio e dataFim no diaSemana
function calcularEncontros(dataInicio: string, dataFim?: string, diaSemana?: string): string[] {
  if (!diaSemana || !dataFim) return [];
  const targetDay = DIA_SEMANA_TO_INDEX[diaSemana];
  if (targetDay === undefined) return [];

  const inicio = new Date(dataInicio + "T12:00:00");
  const fim = new Date(dataFim + "T12:00:00");
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return [];

  // Avancar ate o primeiro diaSemana >= inicio
  const primeiro = new Date(inicio);
  while (primeiro.getDay() !== targetDay) {
    primeiro.setDate(primeiro.getDate() + 1);
  }

  const datas: string[] = [];
  const atual = new Date(primeiro);
  while (atual <= fim) {
    datas.push(atual.toISOString().split("T")[0]);
    atual.setDate(atual.getDate() + 7);
  }
  return datas;
}

export default function LandingPage() {
  // @ts-ignore Convex TS2589
  const info = useQuery(api.preferencias.queries.getIgrejaInfo);
  // @ts-ignore Convex TS2589
  const turmas = useQuery(api.turmas.queries.listTurmasAbertas);

  if (info === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const nome = info?.nome || "Igreja Presbiteriana";
  const descricao = info?.descricao || "";
  const foto = info?.foto;
  const horarios = info?.horarios || [];
  const educacional = info?.educacional || [];
  const endereco = info?.endereco || "";
  const googleMapsEmbed = info?.googleMapsEmbed || "";
  const whatsapp = info?.whatsapp || "";
  const telefone = info?.telefone || "";
  const email = info?.email || "";
  const banco = info?.banco || "";
  const agencia = info?.agencia || "";
  const conta = info?.conta || "";
  const pix = info?.pix || "";

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5" />
            <span className="font-medium text-sm">{nome}</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/signin">Area do membro</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          {foto ? (
            <img
              src={foto}
              alt={nome}
              className="w-full max-h-80 object-cover rounded-xl border border-border"
            />
          ) : (
            <div className="w-full h-48 bg-muted rounded-xl border border-border flex items-center justify-center">
              <Church className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-medium text-foreground">{nome}</h1>
          {descricao && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{descricao}</p>
          )}
        </section>

        {/* Boletim dominical — apenas aos domingos */}
        {new Date().getDay() === 0 && (
          <section className="text-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/culto">
                <Church className="h-4 w-4" />
                Boletim do Culto Dominical
              </Link>
            </Button>
          </section>
        )}

        {/* Horários dos cultos */}
        {horarios.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Horários dos cultos</h2>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Dia</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Horario</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Culto</th>
                  </tr>
                </thead>
                <tbody>
                  {horarios.map((h, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-sm">{h.dia}</td>
                      <td className="px-4 py-2.5 text-sm font-medium">{h.horario}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{h.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Departamento Educacional */}
        {educacional.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Departamento Educacional</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {educacional.map((e, i) => (
                <div key={i} className="border border-border rounded-xl p-4">
                  <p className="text-sm font-medium">{e.turma}</p>
                  <p className="text-xs text-muted-foreground mt-1">{e.responsavel}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Turmas e cursos abertos */}
        {turmas && turmas.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Cursos abertos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {turmas.map((t: any) => {
                const encontros = calcularEncontros(t.dataInicio, t.dataFim, t.diaSemana);
                return (
                  <div key={t._id} className="border border-border rounded-xl p-5 space-y-4 flex flex-col">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-base font-medium">{t.nome}</h3>
                        {t.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground">Início:</span>{" "}
                              {formatDate(t.dataInicio)}
                              {t.dataFim && ` · Fim: ${formatDate(t.dataFim)}`}
                            </div>
                            {t.diaSemana && (
                              <div>
                                {DIA_LABELS[t.diaSemana]}{t.horario && `s às ${t.horario}`}
                              </div>
                            )}
                          </div>
                        </div>

                        {t.local && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>{t.local}</span>
                          </div>
                        )}

                        {t.instrutorNome && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-4 w-4 shrink-0" />
                            <span>{t.instrutorNome}</span>
                          </div>
                        )}

                        {t.vagasRestantes !== null && t.vagasRestantes > 0 && t.vagasRestantes < 5 && (
                          <div className="text-yellow-600 dark:text-yellow-500 font-medium text-xs">
                            ⚠ Apenas {t.vagasRestantes} vagas restantes
                          </div>
                        )}
                      </div>

                      {encontros.length > 0 && (
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Encontros previstos ({encontros.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {encontros.map((data) => (
                              <span
                                key={data}
                                className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                              >
                                {formatDateShort(data)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {t.token && (
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/inscricao/${t.token}`}>Inscreva-se</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Endereço + Google Maps */}
        {endereco && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Endereço</h2>
            </div>
            <p className="text-sm text-muted-foreground">{endereco}</p>
            {googleMapsEmbed && (
              <div className="border border-border rounded-xl overflow-hidden">
                <iframe
                  src={googleMapsEmbed}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localizacao da igreja"
                />
              </div>
            )}
          </section>
        )}

        {/* Contato */}
        {(whatsapp || telefone || email) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Contato</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {whatsapp && (
                <a
                  href={formatWhatsappLink(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border border-border rounded-xl p-4 hover:bg-muted transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-medium">{whatsapp}</p>
                  </div>
                </a>
              )}
              {telefone && (
                <a
                  href={`tel:${telefone.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 border border-border rounded-xl p-4 hover:bg-muted transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{telefone}</p>
                  </div>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 border border-border rounded-xl p-4 hover:bg-muted transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{email}</p>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Dados bancarios */}
        {(banco || pix) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Dados bancarios</h2>
            </div>
            <div className="border border-border rounded-xl p-4 space-y-2">
              {banco && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="font-medium">{banco}</span>
                </div>
              )}
              {agencia && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agencia</span>
                  <span className="font-medium">{agencia}</span>
                </div>
              )}
              {conta && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conta</span>
                  <span className="font-medium">{conta}</span>
                </div>
              )}
              {pix && (
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground">PIX</span>
                  <span className="font-medium">{pix}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} {nome}
          </p>
          <Link
            href="/signin"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Area do membro
          </Link>
        </div>
      </footer>
    </div>
  );
}
