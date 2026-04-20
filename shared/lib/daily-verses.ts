export interface DailyVerse {
  text: string;
  reference: string;
}

export const DAILY_VERSES: DailyVerse[] = [
  { text: "Entregai todas as vossas ansiedades a Ele, porque Ele tem cuidado de vós.", reference: "1 Pedro 5:7" },
  { text: "Não andeis ansiosos por coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças.", reference: "Filipenses 4:6" },
  { text: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.", reference: "Mateus 11:28" },
  { text: "Orai sem cessar.", reference: "1 Tessalonicenses 5:17" },
  { text: "E tudo quanto pedirdes em meu nome, isso farei, para que o Pai seja glorificado no Filho.", reference: "João 14:13" },
  { text: "Pedi, e dar-se-vos-á; buscai, e encontrareis; batei, e abrir-se-vos-á.", reference: "Mateus 7:7" },
  { text: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1" },
  { text: "Em Deus está a minha salvação e a minha glória; a rocha da minha fortaleza e o meu refúgio estão em Deus.", reference: "Salmos 62:7" },
  { text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", reference: "Provérbios 3:5" },
  { text: "Buscai, pois, em primeiro lugar, o seu reino e a sua justiça, e todas estas coisas vos serão acrescentadas.", reference: "Mateus 6:33" },
  { text: "O Senhor é o meu refúgio e a minha fortaleza, o meu Deus, em quem confio.", reference: "Salmos 91:2" },
  { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
  { text: "Vigiai e orai, para que não entreis em tentação; o espírito, na verdade, está pronto, mas a carne é fraca.", reference: "Mateus 26:41" },
  { text: "Se algum de vós necessita de sabedoria, peça-a a Deus, que a todos dá liberalmente, e nada lhes impropera; e ser-lhe-á dada.", reference: "Tiago 1:5" },
  { text: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como a dá o mundo.", reference: "João 14:27" },
  { text: "Chegai-vos, pois, com intrepidez, junto ao trono da graça, a fim de recebermos misericórdia e achar-mos graça para socorro em ocasião oportuna.", reference: "Hebreus 4:16" },
  { text: "Clama a mim, e responder-te-ei e anunciar-te-ei coisas grandes e firmes, que não sabes.", reference: "Jeremias 33:3" },
  { text: "Porque, onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles.", reference: "Mateus 18:20" },
  { text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.", reference: "Romanos 12:12" },
  { text: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga ao seu santo nome.", reference: "Salmos 103:1" },
  { text: "O sacrifício aceitável a Deus é o espírito quebrantado; coração compungido e contrito, não o desprezarás, ó Deus.", reference: "Salmos 51:17" },
  { text: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.", reference: "Jeremias 29:11" },
  { text: "O Senhor está perto de todos os que o invocam, de todos os que o invocam em verdade.", reference: "Salmos 145:18" },
  { text: "Buscai ao Senhor enquanto se pode achar, invocai-o enquanto está perto.", reference: "Isaías 55:6" },
  { text: "Seja qual for a tribulação, clamar-lhe-ás, e ele te livrará.", reference: "Salmos 50:15" },
  { text: "Ora, a fé é a certeza de coisas que se esperam, a convicção de fatos que se não veem.", reference: "Hebreus 11:1" },
  { text: "Aquietai-vos e sabei que eu sou Deus.", reference: "Salmos 46:10" },
  { text: "O Senhor pelejará por vós, e vós vos calareis.", reference: "Êxodo 14:14" },
  { text: "Sede fortes e corajosos; não temais, nem vos atemorizeis diante deles, porque o Senhor, vosso Deus, é quem vai convosco.", reference: "Deuteronômio 31:6" },
  { text: "Quando eu temer, hei de confiar em ti.", reference: "Salmos 56:3" },
];

export function getDailyVerse(): DailyVerse {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}
