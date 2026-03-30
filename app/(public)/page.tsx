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

const cursosMockados = [
  {
    titulo: "Curso de Membros",
    descricao: "Conheca a historia, doutrina e governo da Igreja Presbiteriana.",
  },
  {
    titulo: "Escola de Lideres",
    descricao: "Formacao para obreiros e lideres de ministerios.",
  },
  {
    titulo: "Aconselhamento Biblico",
    descricao: "Principios biblicos aplicados ao cuidado pastoral.",
  },
];

export default function LandingPage() {
  // @ts-ignore Convex TS2589
  const info = useQuery(api.preferencias.queries.getIgrejaInfo);

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

        {/* Inscricoes para cursos */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">Cursos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {cursosMockados.map((curso, i) => (
              <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">{curso.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{curso.descricao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled className="text-xs">
                    Inscreva-se
                  </Button>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Em breve
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

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
