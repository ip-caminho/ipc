import type { Metadata } from "next";
import Link from "next/link";
import { Spectral, Source_Sans_3 } from "next/font/google";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { RiseObserver } from "./RiseObserver";
import "./landing.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Igreja Presbiteriana do Caminho — São Paulo",
  description:
    "Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo. Presbiteriana, em São Paulo, desde 2024.",
};

// Dados da igreja mudam raramente — revalida a cada 5 minutos
export const revalidate = 300;

type Turma = {
  _id: string;
  nome: string;
  descricao?: string;
  dataInicio: string;
  dataFim?: string;
  diaSemana?: string;
  horario?: string;
  local?: string;
  instrutorNome?: string;
  vagasRestantes?: number | null;
  token?: string;
};

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

async function getTurmas(): Promise<Turma[]> {
  try {
    const turmas = (await fetchQuery(api.turmas.queries.listTurmasAbertas)) as Turma[];
    return turmas ?? [];
  } catch {
    // Convex indisponivel (ex.: build sem env) — renderiza so o conteudo estatico
    return [];
  }
}

const EIXOS = [
  {
    num: "01",
    key: "Comunidade",
    body: "Não somos um público que assiste a um culto, nem uma plataforma. Somos pessoas conhecidas pelo nome, compartilhando a mesa, o tempo e a vida ao longo dos anos.",
    bref: "Atos 2.42",
  },
  {
    num: "02",
    key: "Bíblica",
    body: "A Escritura lê a gente antes de a gente ler a Escritura. Ela molda como vemos a cidade, o trabalho, a família — e não o contrário.",
    bref: "2 Timóteo 3.16–17",
  },
  {
    num: "03",
    key: "De discipulado",
    body: "Caminhamos atrás de Jesus juntos, aprendendo devagar a pensar, sentir e viver como Ele. Isso leva uma vida inteira, e tudo bem.",
    bref: "Mateus 28.19–20",
  },
  {
    num: "04",
    key: "Participando da missão de Deus",
    body: "A missão é de Deus, não nossa. Entramos nela onde já estamos — na segunda-feira, no bairro, no trabalho — enquanto esperamos o mundo que há de vir.",
    bref: "Jeremias 29.7",
  },
];

const CREMOS = [
  {
    roman: "I.",
    thesis: "O evangelho é o centro.",
    body: "Não um dos temas, não o ponto de partida pra temas melhores — o centro. Que Deus, em Cristo, reconcilia consigo um povo que não tinha como se reconciliar. Tudo que fazemos como igreja deriva disso, ou é decoração.",
  },
  {
    roman: "II.",
    thesis: "A Escritura é a voz mais clara disponível.",
    body: "Existem outras vozes — tradição, experiência, cultura — e todas importam. Mas só a Bíblia fala com autoridade final sobre quem Deus é, quem somos e pra onde as coisas vão. Ler bem, juntos e devagar, é o trabalho de uma vida.",
  },
  {
    roman: "III.",
    thesis: "A igreja é povo, não lugar.",
    body: "A igreja não é o prédio onde nos encontramos, nem o horário do culto, nem a denominação no papel. É um povo chamado por Deus, reunido por Ele, enviado por Ele. O prédio serve; o povo é que é.",
  },
  {
    roman: "IV.",
    thesis: "A história tem um destino.",
    body: "O mundo não está em colapso aleatório nem em progresso inevitável. Vai em direção a um momento concreto: a volta de Cristo, céus novos e terra nova. Isso muda como a gente trabalha, chora, descansa e espera — hoje.",
  },
];

const VIVEMOS = [
  {
    label: "No culto, aos domingos",
    body: "Nos reunimos pra ouvir a Palavra pregada, cantar juntos, orar juntos, confessar juntos, comer juntos ao redor da mesa do Senhor. É o centro da semana, não um apêndice dela. O culto não existe pra nos entreter; existe pra nos formar.",
  },
  {
    label: "Nos Pequenos Grupos, durante a semana",
    body: "O culto nos reúne; o Pequeno Grupo nos conhece. Em casas, em mesas, em grupos de oito a doze pessoas, conversamos sobre o texto bíblico, sobre a semana real, sobre os tropeços e as alegrias concretas. É onde a teologia deixa de ser abstrata.",
  },
  {
    label: "À mesa, sempre que possível",
    body: "Comer junto é um ato teológico. Abrimos a casa, dividimos o pão, ouvimos as histórias uns dos outros. Boa parte do discipulado da comunidade acontece entre o prato e o cafezinho, sem pauta, sem liturgia — só com tempo.",
  },
  {
    label: "Em casa, onde tudo se prova",
    body: "A fé que não toca a cozinha, o quarto do filho, a planilha do mês, o argumento com o vizinho — essa fé ainda não chegou. A casa é o laboratório onde o que cremos vira o que somos.",
  },
];

const EDUCACIONAL = [
  { faixa: "03 a 06 anos", nome: "Nicole van Eijk" },
  { faixa: "07 a 08 anos", nome: "Annes Son" },
  { faixa: "09 a 10 anos", nome: "Karina Di Carlo" },
  { faixa: "11 a 16 anos", nome: "Davi Jung" },
  { faixa: "17 a 22 anos", nome: "Ian Kim" },
];

const MUNDO = [
  {
    label: "A segunda-feira é o maior campo missionário",
    body: "A maior parte da vida cristã não acontece no culto — acontece no trabalho, no trânsito, na reunião das 10h, na conversa com o colega de mesa. Formamos uns aos outros pra pensar vocacionalmente sobre o expediente: o ofício é adoração.",
  },
  {
    label: "Antes da cidade, o prédio",
    body: "Queremos amar a cidade, mas começamos pelo quarteirão. Pelo porteiro, pela padaria da esquina, pelos vizinhos de elevador. A missão global passa pelo nome do síndico.",
  },
  {
    label: "São Paulo é nosso endereço",
    body: "Não somos uma igreja genérica que poderia estar em qualquer cidade. Estamos aqui, neste fuso, neste trânsito, nesta densidade, nesta desigualdade. A cidade não é pano de fundo — é o lugar concreto pra onde fomos enviados.",
  },
];

export default async function LandingPage() {
  const turmas = await getTurmas();

  // Informações fixas da igreja (o banco ainda tem dados antigos de teste)
  const endereco = "Rua Pedra Azul, 674A (esquina com Rua Ximbó) — Vila Mariana, São Paulo, SP";
  const email = "ipdocaminho@gmail.com";
  const mapsQuery = "Rua Pedra Azul, 674, Vila Mariana, São Paulo, SP";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(mapsQuery)}&navigate=yes`;
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`;

  return (
    <div className={`site-v2 ${spectral.variable} ${sourceSans.variable}`}>
      <RiseObserver />

      {/* =========================== HEADER =========================== */}
      <header className="site">
        <div className="site-inner">
          <a href="#top" className="brand" aria-label="Igreja Presbiteriana do Caminho">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="IPC" />
            <span className="bar" />
            <span className="name">
              <span className="l1">Igreja Presbiteriana</span>
              <span className="l2">do Caminho</span>
            </span>
          </a>
          <nav className="primary" aria-label="Principal">
            <a href="#cremos">Cremos</a>
            <a href="#vivemos">Vivemos</a>
            <a href="#mundo">Mundo</a>
            <a href="#visite">Visite</a>
          </nav>
          <div className="header-cta">
            <Link href="/signin" className="btn btn-outline">
              Área de Membros&nbsp;→
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* =========================== HERO =========================== */}
        <section className="hero">
          {/* TROCAR por foto real da igreja (public/landing/hero.jpg) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-bg" src="/landing/hero.jpg" alt="" aria-hidden="true" />
          <div className="hero-overlay" />
          <div className="wrap-wide">
            <p className="eyebrow">São Paulo · Comunidade Presbiteriana</p>
            <h1>
              <span className="ln">Uma comunidade bíblica de discipulado,</span>
              <span className="ln">participando da missão de Deus neste mundo.</span>
            </h1>
            <div className="cta-row">
              <a href="#visite" className="btn btn-primary">
                Venha visitar
              </a>
              <a href="#eixos" className="link-quiet">
                Conheça nossa comunidade
              </a>
            </div>
          </div>
        </section>

        {/* =========================== EIXOS =========================== */}
        <section id="eixos">
          <div className="wrap-wide">
            <div className="section-head" data-rise>
              <p className="eyebrow">O que nos define em quatro palavras</p>
              <h2>Cada palavra tem peso.</h2>
              <span className="title-rule" />
            </div>
            <div className="eixos">
              {EIXOS.map((e, i) => (
                <div key={e.num} className="eixo" data-rise style={{ "--i": i } as React.CSSProperties}>
                  <div className="num">{e.num}</div>
                  <div className="key">{e.key}</div>
                  <div className="body">
                    <p>{e.body}</p>
                    <span className="bref">{e.bref}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================== CONTRASTE =========================== */}
        <section className="inverse" id="contraste">
          <div className="wrap">
            <div className="section-head" data-rise>
              <p className="eyebrow">Antes de qualquer outra conversa</p>
              <h2>O que você não vai encontrar aqui.</h2>
              <span className="title-rule" />
            </div>
            <div className="negatives">
              <p data-rise style={{ "--i": 0 } as React.CSSProperties}>
                Não somos uma igreja performática. Não temos iluminação cênica, fumaça, palco, banda
                buscando viralizar.
              </p>
              <p data-rise style={{ "--i": 1 } as React.CSSProperties}>
                Não somos descolados, não estamos competindo por atenção com o algoritmo, não estamos
                preocupados em parecer relevantes pra uma geração específica.
              </p>
              <p data-rise style={{ "--i": 2 } as React.CSSProperties}>
                Não somos influentes — nem queremos ser. Não temos pastor-celebridade, programa de TV,
                linha de produtos, nem estratégia de marca.
              </p>
              <p data-rise style={{ "--i": 3 } as React.CSSProperties}>
                Não somos um evento dominical produzido pra você consumir, e depois voltar pra casa.
              </p>
            </div>
          </div>
        </section>
        <div className="contraste-solo">
          <p className="emphasis" data-rise>
            Somos uma comunidade aprendendo, junto, a se parecer com <span className="hl">Cristo</span>.
          </p>
        </div>

        {/* =========================== FAIXA DE FOTO =========================== */}
        {/* TROCAR por foto real da igreja (public/landing/comunidade.jpg) */}
        <div className="photo-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/comunidade.jpg" alt="Comunidade reunida" />
          <div className="cap">
            <p>Gente conhecida pelo nome, ao longo dos anos.</p>
          </div>
        </div>

        {/* =========================== CREMOS =========================== */}
        <section id="cremos">
          <div className="wrap">
            <div className="section-head" data-rise>
              <p className="eyebrow">O que cremos — e por quê</p>
              <h2>O que cremos.</h2>
              <span className="title-rule" />
            </div>
            {/* TROCAR por foto real da igreja (public/landing/culto.jpg) */}
            <div className="figure" data-rise>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/culto.jpg" alt="Comunidade no culto" />
            </div>
            <div className="creed">
              {CREMOS.map((c) => (
                <div key={c.roman} className="article" data-rise>
                  <div className="roman">{c.roman}</div>
                  <p className="thesis">{c.thesis}</p>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================== VIVEMOS =========================== */}
        <section id="vivemos">
          <div className="wrap-wide">
            <div className="section-head" data-rise>
              <p className="eyebrow">Como isso vira semana</p>
              <h2>Como vivemos em comunidade.</h2>
              <span className="title-rule" />
            </div>
            {/* TROCAR por foto real da igreja (public/landing/grupos.jpg) */}
            <div className="figure" data-rise>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/grupos.jpg" alt="Encontro de pequeno grupo" />
            </div>
            <div className="practice">
              {VIVEMOS.map((v) => (
                <div key={v.label} className="row" data-rise>
                  <div className="label">{v.label}</div>
                  <p className="body">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================== MUNDO =========================== */}
        <section id="mundo">
          <div className="wrap-wide">
            <div className="section-head" data-rise>
              <p className="eyebrow">A cidade, o prédio, a mesa</p>
              <h2>O que fazemos no mundo.</h2>
              <span className="title-rule" />
            </div>
            <div className="practice">
              {MUNDO.map((m) => (
                <div key={m.label} className="row" data-rise>
                  <div className="label">{m.label}</div>
                  <p className="body">{m.body}</p>
                </div>
              ))}
            </div>
            <p className="closing" data-rise>
              Tudo isso com os olhos no horizonte: um dia o Rei volta, enxuga toda lágrima, e a cidade
              inteira — não só a igreja — é feita nova. Trabalhamos, esperamos e descansamos dentro
              dessa promessa.
            </p>
          </div>
        </section>

        {/* =========================== EDUCACIONAL =========================== */}
        <section id="formacao">
          <div className="wrap-wide">
            <div className="section-head" data-rise>
              <p className="eyebrow">Ministério educacional</p>
              <h2>Formação por idade.</h2>
              <span className="title-rule" />
            </div>
            <div className="practice">
              {EDUCACIONAL.map((e) => (
                <div key={e.faixa} className="row" data-rise>
                  <div className="label">{e.faixa}</div>
                  <p className="body">
                    Fale com <strong>{e.nome}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================== CURSOS ABERTOS =========================== */}
        {turmas.length > 0 && (
          <section id="cursos">
            <div className="wrap-wide">
              <div className="section-head" data-rise>
                <p className="eyebrow">Inscrições abertas</p>
                <h2>Cursos e turmas.</h2>
                <span className="title-rule" />
              </div>
              <div className="cursos-grid">
                {turmas.map((t) => {
                  const encontros = calcularEncontros(t.dataInicio, t.dataFim, t.diaSemana);
                  return (
                    <div key={t._id} className="curso-card" data-rise>
                      <div>
                        <h3>{t.nome}</h3>
                        {t.descricao && <p className="desc">{t.descricao}</p>}
                      </div>
                      <p className="meta">
                        <strong>Início:</strong> {formatDate(t.dataInicio)}
                        {t.dataFim && (
                          <>
                            {" "}
                            · <strong>Fim:</strong> {formatDate(t.dataFim)}
                          </>
                        )}
                        {t.diaSemana && (
                          <>
                            <br />
                            {DIA_LABELS[t.diaSemana]}
                            {t.horario && `s às ${t.horario}`}
                          </>
                        )}
                        {t.local && (
                          <>
                            <br />
                            {t.local}
                          </>
                        )}
                        {t.instrutorNome && (
                          <>
                            <br />
                            Com {t.instrutorNome}
                          </>
                        )}
                      </p>
                      {t.vagasRestantes !== null &&
                        t.vagasRestantes !== undefined &&
                        t.vagasRestantes > 0 &&
                        t.vagasRestantes < 5 && (
                          <p className="vagas">Apenas {t.vagasRestantes} vagas restantes</p>
                        )}
                      {encontros.length > 0 && (
                        <div>
                          <p className="chips-label">Encontros previstos ({encontros.length})</p>
                          <div className="chips">
                            {encontros.map((data) => (
                              <span key={data}>{formatDateShort(data)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {t.token && (
                        <div className="cta">
                          <Link href={`/inscricao/${t.token}`} className="btn btn-primary">
                            Inscreva-se
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* =========================== VISITE =========================== */}
        <section id="visite" className="visite">
          <div className="wrap">
            <div className="section-head" data-rise>
              <p className="eyebrow">Porta aberta, domingo de manhã</p>
              <h2>Venha visitar.</h2>
              <span className="title-rule" />
            </div>
            {/* TROCAR por foto real da igreja (public/landing/adoracao.jpg) */}
            <div className="figure" data-rise>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/adoracao.jpg" alt="Culto de adoração" />
            </div>
            <p className="lead" data-rise>
              Sem cadastro, sem formulário, sem crachá de visitante. A porta está aberta no domingo de
              manhã. Chega, senta onde quiser, fica o tempo que precisar. Se quiser conversar, a gente
              conversa; se preferir só observar, tudo bem também.
            </p>

            <div className="first-sunday" data-rise>
              <h3>No seu primeiro domingo</h3>
              <p>
                O culto dura cerca de 90 minutos. Cantamos, lemos a Bíblia em voz alta, oramos, ouvimos
                um sermão expositivo — normalmente entre 35 e 45 minutos sobre um texto específico — e
                terminamos com uma oração final. Não há passagem de pauta, não há momento constrangedor
                pra visitantes se identificarem, não há pressão pra participar de nada.
              </p>
              <p>
                Vista-se como estiver confortável. Calça jeans, camisa, vestido, tênis — todas as opções
                estão certas. A gente se importa que você esteja ali; o resto é detalhe.
              </p>
              <p>
                Crianças são bem-vindas no culto inteiro. Se o bebê chorar, a mãe chora junto, a igreja
                ri junto, e o sermão continua. Há um espaço tranquilo pra amamentação e troca, se
                precisar.
              </p>
              <p>Depois do culto, tem café. Fique, se quiser. Se não puder, a gente te vê no próximo domingo.</p>
            </div>

            <p className="ceia" data-rise>
              Celebramos a Ceia do Senhor todos os domingos, e a mesa é do Senhor — não da IPC. Se você
              é cristão batizado e em comunhão com alguma igreja, você é bem-vindo a participar. Se não
              é, escute, observe, pense — e converse com um dos presbíteros depois, se quiser.
            </p>

            <p className="visite-wait" data-rise>
              Estamos esperando você.
            </p>

            <dl className="visite-meta" data-rise>
              <dt>Quando</dt>
              <dd>
                <p className="big">Domingos, 10h</p>
                <p className="tipo">Culto dominical</p>
              </dd>

              <dt>Onde</dt>
              <dd className="place">{endereco}</dd>

              <div className="map-row">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  Ver no Google Maps
                </a>
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  Ver no Waze
                </a>
              </div>
            </dl>

            <div className="map-embed" data-rise>
              <iframe
                src={mapEmbed}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização da igreja"
              />
            </div>
          </div>
        </section>

      </main>

      {/* =========================== FOOTER =========================== */}
      <footer className="site">
        <div className="foot-wrap">
          <div className="foot-cols">
            <div className="foot-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="IPC" />
              <p className="tag">
                Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.
              </p>
            </div>
            <div className="foot-contato">
              <div>
                <h4>Contato</h4>
                <p>{endereco}</p>
                <p style={{ marginTop: "var(--space-3)" }}>
                  <a href={`mailto:${email}`} className="foot-link">
                    {email}
                  </a>
                </p>
                <p>
                  <a href="https://instagram.com/ip.docaminho" target="_blank" rel="noopener noreferrer" className="foot-link">
                    @ip.docaminho
                  </a>
                </p>
                <p>
                  <a href="https://facebook.com/ip.docaminho" target="_blank" rel="noopener noreferrer" className="foot-link">
                    facebook.com/ip.docaminho
                  </a>
                </p>
              </div>
              <div>
                <h4>Tradição</h4>
                <p>Presbiteriana reformada. Alinhados à Confissão de Fé de Westminster (1647).</p>
                <p style={{ marginTop: "var(--space-3)" }}>
                  Denominação: Igreja Presbiteriana do Brasil.
                </p>
              </div>
              <div>
                <h4>Dízimos e ofertas</h4>
                <p>Santander (033)</p>
                <p>Agência 0108</p>
                <p>Conta 13007643-7</p>
                <p style={{ marginTop: "var(--space-3)" }}>Igreja Presbiteriana do Caminho</p>
                <p>CNPJ 48.792.102/0001-13</p>
              </div>
            </div>
          </div>

          <div className="foot-bottom">
            <Link href="/signin" className="members-link">
              Área de Membros →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
