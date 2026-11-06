import * as THREE from "three";
import type { LivroCatalogo } from "@convex/public/acervo";
import { capaParaTextura, posicaoInicial, type Fileira } from "./acervo";

// Fileiras 3D do acervo público. Só existem na cena os livros perto da tela, e só
// desenha enquanto algo se move, para poupar memória e bateria no celular.

export type CenaFileira = {
  irPara: (indice: number) => void;
  destruir: () => void;
};

type Opcoes = {
  livros: LivroCatalogo[];
  fileiras: Fileira[];
  abertura: number;
  aoMudar: (indice: number) => void;
  aoExpandir: (indice: number) => void;
};

type Medida = { hs: number; h: number; w: number; d: number; s: number };

type LivroVivo = {
  i: number;
  g: THREE.Group;
  geos: THREE.BoxGeometry[];
  edge: THREE.MeshStandardMaterial;
  cover: THREE.MeshStandardMaterial;
  spine: THREE.MeshStandardMaterial;
  sombra: THREE.Mesh;
  lombada?: THREE.Mesh;
  tp: THREE.Vector3;
  tq: THREE.Quaternion;
  ts: number;
  placed: boolean;
  gone: boolean;
};

type FileiraViva = Fileira & { pos: number; label: THREE.Mesh };

const FUNDO = 0xf5f7fb;
const PALETA = [
  ["#1f3f7a", "#10244a"],
  ["#27606b", "#123840"],
  ["#4a3f78", "#2a2350"],
  ["#3a4a63", "#1e2a3f"],
  ["#5f6f8f", "#34405a"],
  ["#7a2f4a", "#4a1a2c"],
];
// Lente fechada: lombadas chapadas e capa do meio reta, sem efeito de fuga.
const FOV = 20;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const ALTURA = 1.35;
const QUARTO = Math.PI / 2;
const ESPACO = 0.11;
const FOLGA_FOCO = 0.16;
const ZOOM = 0.22;
const ESCALA_LADO = 0.68;
const ENTRE_FILEIRAS = 1.72;
const TITULO_L = 2.4;
const TITULO_A = 0.3;
const PROPORCAO_PADRAO = 0.69;
// Parte da textura da sombra ocupada pelo livro; o resto é o esfumado em volta.
const MIOLO_SOMBRA = 80 / 128;
const ALTURA_SOMBRA = 0.14;

const suave = (x: number) => x * x * (3 - 2 * x);
const hash = (s: string) => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};
const larguraLivro = (h: number, proporcao: number) => Math.min(0.82, Math.max(0.6, h * proporcao));
const novoCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > max && atual) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function criarFileira(host: HTMLElement, opcoes: Opcoes): Promise<CenaFileira> {
  const { livros, fileiras: entrada, abertura, aoMudar, aoExpandir } = opcoes;
  const estilo = getComputedStyle(host);
  const serif = `${estilo.getPropertyValue("--font-display") || "Spectral"}, Georgia, serif`;
  const sans = `${estilo.getPropertyValue("--font-inter") || "Inter"}, system-ui, sans-serif`;
  await Promise.all([document.fonts.load(`600 40px ${serif}`), document.fonts.load(`500 24px ${sans}`)]).catch(() => undefined);

  // Sem WebGL lança aqui, e a tela cai na lista.
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Fileiras de livros em 3D por categoria. A lista oferece o mesmo conteúdo em texto.");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FUNDO);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 60);
  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x1a2a4c, 3));
  const luz = new THREE.DirectionalLight(0xffffff, 2.35);
  luz.position.set(1.5, 4, 7);
  scene.add(luz);

  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const comoTextura = <T extends THREE.Texture>(t: T) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  function gerarCapa(l: LivroCatalogo, hs: number) {
    const c = novoCanvas(360, 520);
    const g = c.getContext("2d")!;
    const [de, ate] = PALETA[hs % PALETA.length];
    const grad = g.createLinearGradient(0, 0, 0, 520);
    grad.addColorStop(0, de);
    grad.addColorStop(1, ate);
    g.fillStyle = grad;
    g.fillRect(0, 0, 360, 520);
    g.strokeStyle = "rgba(255,255,255,.28)";
    g.lineWidth = 2;
    g.strokeRect(20, 20, 320, 480);
    g.fillStyle = "#fff";
    g.textBaseline = "top";
    let size = 42;
    let linhas: string[];
    do {
      g.font = `600 ${size}px ${serif}`;
      linhas = quebrarLinhas(g, l.titulo, 280);
      size -= 3;
    } while (linhas.length * size * 1.25 > 270 && size > 20);
    size += 3;
    linhas.forEach((t, i) => g.fillText(t, 40, 56 + i * size * 1.22));
    g.font = `500 22px ${sans}`;
    g.fillStyle = "rgba(255,255,255,.8)";
    quebrarLinhas(g, l.autores.join(", "), 280).slice(0, 2).forEach((t, i) => g.fillText(t, 40, 420 + i * 30));
    return c;
  }

  function gerarLombada(l: LivroCatalogo, base: string) {
    const c = novoCanvas(96, 768);
    const g = c.getContext("2d")!;
    g.fillStyle = base;
    g.fillRect(0, 0, 96, 768);
    const cor = new THREE.Color(base);
    const lum = 0.2126 * cor.r + 0.7152 * cor.g + 0.0722 * cor.b;
    g.save();
    g.translate(48, 40);
    g.rotate(QUARTO);
    g.textBaseline = "middle";
    g.fillStyle = lum > 0.5 ? "#0d1830" : "#ffffff";
    let size = 46;
    do {
      g.font = `600 ${size}px ${serif}`;
      size -= 2;
    } while (g.measureText(l.titulo).width > 690 && size > 26);
    let titulo = l.titulo;
    if (g.measureText(titulo).width > 690) {
      while (g.measureText(`${titulo}…`).width > 690) titulo = titulo.slice(0, -1);
      titulo += "…";
    }
    g.fillText(titulo, 0, 0);
    g.restore();
    return c;
  }

  const texturaPaginas = (() => {
    const c = novoCanvas(64, 64);
    const g = c.getContext("2d")!;
    g.fillStyle = "#e9e4d6";
    g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 2) {
      g.fillStyle = `rgba(90,85,70,${0.08 + (y % 6 === 0 ? 0.14 : 0)})`;
      g.fillRect(0, y, 64, 1);
    }
    return comoTextura(new THREE.CanvasTexture(c));
  })();
  const matPaginas = new THREE.MeshStandardMaterial({ map: texturaPaginas, roughness: 0.95 });

  const texturaSombra = (() => {
    const c = novoCanvas(128, 128);
    const g = c.getContext("2d")!;
    g.shadowColor = "#0f1b33";
    g.shadowBlur = 22;
    // O retângulo fica fora do canvas: só a sombra dele aparece.
    g.shadowOffsetX = 256;
    g.fillRect(24 - 256, 24, 80, 80);
    return comoTextura(new THREE.CanvasTexture(c));
  })();
  const geoSombra = new THREE.PlaneGeometry(1, 1);
  // Mistura própria e sem profundidade: desenha antes dos livros, atrás de todos eles.
  const matSombra = new THREE.MeshBasicMaterial({
    map: texturaSombra,
    opacity: 0.6,
    transparent: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    depthTest: false,
    depthWrite: false,
  });

  const medidas: Medida[] = livros.map((l) => {
    const hs = hash(l.titulo);
    const h = 0.98 + ((hs % 13) - 6) / 90;
    return { hs, h, w: larguraLivro(h, PROPORCAO_PADRAO), d: 0.15 + ((hs >> 4) % 12) / 100, s: ALTURA / h };
  });

  // Título de cada categoria, preso na margem esquerda.
  const fileiras: FileiraViva[] = entrada.map((f) => {
    const c = novoCanvas(1024, 128);
    const g = c.getContext("2d")!;
    g.textBaseline = "middle";
    g.fillStyle = "#0f1b33";
    g.font = `600 50px ${serif}`;
    g.fillText(f.nome, 0, 66);
    const w = g.measureText(f.nome).width;
    g.fillStyle = "#55647a";
    g.font = `500 32px ${sans}`;
    g.fillText(String(f.indices.length), w + 18, 68);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(TITULO_L, TITULO_A),
      new THREE.MeshBasicMaterial({ map: comoTextura(new THREE.CanvasTexture(c)), transparent: true, depthWrite: false }),
    );
    label.visible = false;
    scene.add(label);
    const naAbertura = f.indices.indexOf(abertura);
    return { ...f, pos: naAbertura >= 0 ? naAbertura : posicaoInicial(livros, f.indices), label };
  });
  const fileiraDe = new Map<number, number>();
  fileiras.forEach((f, r) => f.indices.forEach((i) => fileiraDe.set(i, r)));

  const vivos = new Map<number, LivroVivo>();

  // Estado: rowPos desce pelas categorias; pos anda dentro de cada uma.
  let rowPos = 0;
  let vRow = 0;
  let rowGoal: number | null = null;
  let vPos = 0;
  let posGoal: number | null = null;
  let zoom = 0;
  let arrastando = false;
  let sujo = true;
  let aspecto = 1;
  let palcoL = 1;
  let palcoA = 1;
  let viewW = 1;
  let atual = -1;
  let destruido = false;
  const CIMA = new THREE.Vector3(0, 1, 0);
  const camAlvo = new THREE.Vector3(0, 0, 10);
  const qTmp = new THREE.Quaternion();
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fileiraAtiva = () => Math.max(0, Math.min(fileiras.length - 1, Math.round(rowPos)));
  const limitar = (f: FileiraViva, x: number) => Math.max(0, Math.min(f.indices.length - 1, x));

  function montarMalhas(it: LivroVivo) {
    it.g.clear();
    it.geos.forEach((g) => g.dispose());
    const { w, h, d } = medidas[it.i];
    const t = 0.014;
    it.geos = [
      new THREE.BoxGeometry(w - 0.03, h - 0.03, d - 2 * t),
      new THREE.BoxGeometry(w, h, t),
      // Lombada entre as capas: se encostar no plano da capa, as duas disputam os pixels e pisca.
      new THREE.BoxGeometry(t, h, d - 2 * t),
    ];
    const { edge, cover, spine } = it;
    const paginas = new THREE.Mesh(it.geos[0], matPaginas);
    paginas.position.x = 0.012;
    const frente = new THREE.Mesh(it.geos[1], [edge, edge, edge, edge, cover, edge]);
    frente.position.z = d / 2 - t / 2;
    const verso = new THREE.Mesh(it.geos[1], edge);
    verso.position.z = -d / 2 + t / 2;
    const lombada = new THREE.Mesh(it.geos[2], [edge, spine, edge, edge, edge, edge]);
    lombada.position.x = -w / 2 + t / 2;
    it.lombada = lombada;
    [paginas, frente, verso, lombada].forEach((m) => {
      m.userData.i = it.i;
      it.g.add(m);
    });
  }

  /** Sombra de contato na base do livro, como ele está na tela; a capa de frente pousa mais longe. */
  function ajustarSombra(it: LivroVivo) {
    const D = medidas[it.i];
    const s = it.g.scale.x;
    const th = 2 * Math.atan2(it.g.quaternion.y, it.g.quaternion.w);
    const frente = Math.abs(Math.cos(th));
    const largura = s * (D.w * frente + D.d * Math.abs(Math.sin(th)));
    it.sombra.scale.set(largura / MIOLO_SOMBRA, (ALTURA_SOMBRA * s) / MIOLO_SOMBRA, 1);
    it.sombra.position.set(it.g.position.x, it.g.position.y - s * (D.h / 2 + 0.012 + 0.03 * frente), 0);
    it.sombra.visible = it.g.visible;
    // De frente a lombada nem aparece, e a aresta dela chegava a vazar sobre a capa.
    if (it.lombada) it.lombada.visible = Math.abs(th) > 0.05;
  }

  function aplicarLombada(it: LivroVivo, base: string) {
    if (it.gone) return;
    it.spine.map?.dispose();
    it.spine.map = comoTextura(new THREE.CanvasTexture(gerarLombada(livros[it.i], base)));
    it.spine.color.set(0xffffff);
    it.spine.needsUpdate = true;
    it.edge.color.set(base);
    sujo = true;
  }

  function capaGerada(it: LivroVivo, base: string) {
    if (it.gone) return;
    it.cover.map = comoTextura(new THREE.CanvasTexture(gerarCapa(livros[it.i], medidas[it.i].hs)));
    it.cover.color.set(0xffffff);
    it.cover.needsUpdate = true;
    aplicarLombada(it, base);
  }

  function criar(i: number): LivroVivo {
    const D = medidas[i];
    const base = PALETA[D.hs % PALETA.length][1];
    const src = capaParaTextura(livros[i].capaUrl);
    const it: LivroVivo = {
      i,
      g: new THREE.Group(),
      geos: [],
      edge: new THREE.MeshStandardMaterial({ color: base, roughness: 0.7 }),
      cover: new THREE.MeshStandardMaterial({ color: base, roughness: 0.62 }),
      spine: new THREE.MeshStandardMaterial({ color: base, roughness: 0.66 }),
      sombra: new THREE.Mesh(geoSombra, matSombra),
      tp: new THREE.Vector3(),
      tq: new THREE.Quaternion(),
      ts: 0,
      placed: false,
      gone: false,
    };
    montarMalhas(it);
    it.g.scale.setScalar(0.001);
    it.sombra.renderOrder = -1;
    scene.add(it.g, it.sombra);
    vivos.set(i, it);
    if (!src) {
      capaGerada(it, base);
      return it;
    }
    const img = new Image();
    img.onerror = () => capaGerada(it, base);
    img.onload = () => {
      if (it.gone) return;
      const amostra = novoCanvas(1, 1).getContext("2d", { willReadFrequently: true })!;
      amostra.drawImage(img, 0, 0, 1, 1);
      const p = amostra.getImageData(0, 0, 1, 1).data;
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      it.cover.map = comoTextura(tex);
      it.cover.color.set(0xffffff);
      it.cover.needsUpdate = true;
      aplicarLombada(it, `rgb(${p[0]},${p[1]},${p[2]})`);
      // O formato real da capa só se sabe agora.
      D.w = larguraLivro(D.h, img.naturalWidth / img.naturalHeight);
      montarMalhas(it);
      ajustarSombra(it);
      calcular();
    };
    img.src = src;
    return it;
  }

  function remover(it: LivroVivo) {
    it.gone = true;
    scene.remove(it.g, it.sombra);
    it.geos.forEach((g) => g.dispose());
    [it.cover, it.spine].forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    it.edge.dispose();
    vivos.delete(it.i);
  }

  function calcular() {
    const visH = Math.max(3.1, 1.92 / aspecto);
    viewW = visH * aspecto;
    camAlvo.set(0, -rowPos * ENTRE_FILEIRAS, visH / (2 * TAN));
    const margem = (16 / palcoL) * viewW;
    const queridos = new Set<number>();
    fileiras.forEach((f, r) => {
      const dist = Math.abs(r - rowPos);
      const a = suave(1 - Math.min(1, dist));
      const S = ESCALA_LADO + (1 - ESCALA_LADO) * a;
      const y = -r * ENTRE_FILEIRAS;
      f.label.visible = dist < 1.6;
      if (f.label.visible) {
        const metade = (ALTURA * S * (1 + ZOOM * zoom * a)) / 2;
        f.label.position.set(-viewW / 2 + margem + TITULO_L / 2, y + metade + 0.03 + TITULO_A / 2, 0.3);
      }
      if (dist > 1.7) return;
      const c = limitar(f, f.pos);
      const lo = Math.floor(c);
      const hi = Math.min(f.indices.length - 1, lo + 1);
      const fr = c - lo;
      let x = 0;
      let xLo = 0;
      let xHi = 0;
      const lugares = f.indices.map((i, n) => {
        const D = medidas[i];
        const foco = a * (1 - suave(Math.min(1, Math.abs(n - f.pos))));
        const th = QUARTO * (1 - foco);
        const s = D.s * S * (1 + ZOOM * zoom * foco);
        const ocupa = s * (D.w * Math.cos(th) + D.d * Math.sin(th)) + FOLGA_FOCO * foco;
        x += ocupa / 2;
        const cx = x;
        if (n === lo) xLo = cx;
        if (n === hi) xHi = cx;
        x += ocupa / 2 + ESPACO * S;
        return { i, D, th, s, foco, cx };
      });
      // O livro escolhido fica exatamente no centro da tela.
      const desloc = -(xLo * (1 - fr) + xHi * fr);
      lugares.forEach(({ i, D, th, s, foco, cx }) => {
        const px = cx + desloc;
        if (Math.abs(px) > viewW * 0.72) return;
        queridos.add(i);
        const it = vivos.get(i) ?? criar(i);
        it.tp.set(px, y, -s * ((D.w / 2) * Math.sin(th) + (D.d / 2) * Math.cos(th)) + 0.12 * foco);
        it.tq.setFromAxisAngle(CIMA, th);
        it.ts = s;
      });
    });
    vivos.forEach((it) => {
      if (!queridos.has(it.i)) it.ts = 0;
    });
    sujo = true;
  }

  function avisarAtual() {
    const f = fileiras[fileiraAtiva()];
    const i = f.indices[Math.round(limitar(f, f.pos))];
    if (i !== atual) {
      atual = i;
      aoMudar(i);
    }
  }

  function irPara(i: number) {
    const r = fileiraDe.get(i);
    if (r === undefined) return;
    const n = fileiras[r].indices.indexOf(i);
    vPos = 0;
    vRow = 0;
    if (r === fileiraAtiva()) posGoal = n;
    else {
      fileiras[r].pos = n;
      rowGoal = r;
    }
    calcular();
  }

  function redimensionar() {
    const r = host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    palcoL = r.width;
    palcoA = r.height;
    aspecto = palcoL / palcoA;
    renderer.setSize(palcoL, palcoA, false);
    camera.aspect = aspecto;
    camera.updateProjectionMatrix();
    calcular();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(host);

  // Gestos: o primeiro movimento decide o eixo.
  const raio = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let sx = 0;
  let sy = 0;
  let lx = 0;
  let ly = 0;
  let lt = 0;
  let eixo: "h" | "v" | null = null;
  let pid: number | null = null;

  function aoDescer(e: PointerEvent) {
    pid = e.pointerId;
    canvas.setPointerCapture(pid);
    sx = lx = e.clientX;
    sy = ly = e.clientY;
    lt = performance.now();
    eixo = null;
    arrastando = true;
    vPos = 0;
    vRow = 0;
    posGoal = null;
    rowGoal = null;
  }
  function aoMover(e: PointerEvent) {
    if (e.pointerId !== pid || !arrastando) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    const agora = performance.now();
    const dtm = Math.max(1, agora - lt);
    if (!eixo && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
      eixo = Math.abs(e.clientX - sx) >= Math.abs(e.clientY - sy) ? "h" : "v";
      const f = fileiras[fileiraAtiva()];
      if (eixo === "v") f.pos = limitar(f, Math.round(f.pos));
    }
    lx = e.clientX;
    ly = e.clientY;
    lt = agora;
    if (eixo === "h") {
      const f = fileiras[fileiraAtiva()];
      const d = -dx / (palcoL * 0.2);
      f.pos = Math.max(-0.5, Math.min(f.indices.length - 0.5, f.pos + d));
      vPos = vPos * 0.6 + (d / dtm) * 1000 * 0.4;
    } else if (eixo === "v") {
      const d = -dy / (palcoA * 0.42);
      rowPos = Math.max(-0.4, Math.min(fileiras.length - 0.6, rowPos + d));
      vRow = vRow * 0.6 + (d / dtm) * 1000 * 0.4;
    } else return;
    avisarAtual();
    calcular();
  }
  function aoSubir(e: PointerEvent) {
    if (e.pointerId !== pid) return;
    arrastando = false;
    pid = null;
    if (performance.now() - lt > 90) {
      vPos = 0;
      vRow = 0;
    }
    if (eixo) return;
    vPos = 0;
    vRow = 0;
    const r = canvas.getBoundingClientRect();
    ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ponteiro, camera);
    const alvos = [...vivos.values()].filter((it) => it.g.visible).map((it) => it.g);
    const achou = raio.intersectObjects(alvos, true)[0];
    if (!achou) return;
    const i = achou.object.userData.i as number;
    // Tocar no livro do meio expande as informações; em outro, leva até ele.
    if (i === atual && posGoal === null && rowGoal === null) aoExpandir(i);
    else irPara(i);
  }
  function aoTeclar(e: KeyboardEvent) {
    const alvo = e.target as HTMLElement | null;
    if (alvo?.tagName === "INPUT" || alvo?.closest("[role=dialog]")) return;
    const f = fileiras[fileiraAtiva()];
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      posGoal = limitar(f, Math.round(f.pos) + (e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      rowGoal = Math.max(0, Math.min(fileiras.length - 1, fileiraAtiva() + (e.key === "ArrowUp" ? -1 : 1)));
    } else return;
    calcular();
  }
  canvas.addEventListener("pointerdown", aoDescer);
  canvas.addEventListener("pointermove", aoMover);
  canvas.addEventListener("pointerup", aoSubir);
  canvas.addEventListener("pointercancel", aoSubir);
  window.addEventListener("keydown", aoTeclar);

  let ultimo = performance.now();
  let raf = 0;
  function quadro(agora: number) {
    if (destruido) return;
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    if (document.hidden) return;
    const direto = reduzido.matches;
    const seguir = direto ? 1 : 1 - Math.exp(-dt * 12);
    const assentar = direto ? 1 : 1 - Math.exp(-dt * 8);
    let mudou = false;

    if (!arrastando) {
      if (rowGoal !== null) {
        const dl = rowGoal - rowPos;
        rowPos += dl * assentar;
        if (Math.abs(dl) < 0.0015) {
          rowPos = rowGoal;
          rowGoal = null;
        }
        mudou = true;
      } else if (Math.abs(vRow) > 0.01) {
        rowPos += vRow * dt;
        vRow *= Math.exp(-dt * 5);
        if (Math.abs(vRow) < 0.5 || rowPos < 0 || rowPos > fileiras.length - 1) {
          vRow = 0;
          rowGoal = fileiraAtiva();
        }
        mudou = true;
      } else if (rowPos !== Math.round(rowPos) || rowPos < 0 || rowPos > fileiras.length - 1) {
        rowGoal = fileiraAtiva();
      }
      const f = fileiras[fileiraAtiva()];
      if (posGoal !== null) {
        const dl = posGoal - f.pos;
        f.pos += dl * assentar;
        if (Math.abs(dl) < 0.0015) {
          f.pos = posGoal;
          posGoal = null;
        }
        mudou = true;
      } else if (Math.abs(vPos) > 0.01) {
        f.pos += vPos * dt;
        vPos *= Math.exp(-dt * 4);
        if (Math.abs(vPos) < 0.9 || f.pos < 0 || f.pos > f.indices.length - 1) {
          vPos = 0;
          posGoal = limitar(f, Math.round(f.pos));
        }
        mudou = true;
      } else if (f.pos !== Math.round(f.pos)) {
        // Nunca para entre dois livros.
        posGoal = limitar(f, Math.round(f.pos));
      }
    }

    // Zoom lento no livro escolhido depois que tudo para; recua rápido ao mover.
    const parado = !arrastando && rowGoal === null && posGoal === null && vPos === 0 && vRow === 0;
    const zoomAlvo = parado ? 1 : 0;
    if (zoom !== zoomAlvo) {
      zoom += (zoomAlvo - zoom) * (direto ? 1 : 1 - Math.exp(-dt * (parado ? 1.1 : 10)));
      if (Math.abs(zoomAlvo - zoom) < 0.002) zoom = zoomAlvo;
      mudou = true;
    }
    if (mudou) {
      avisarAtual();
      calcular();
    }

    let mover = sujo;
    sujo = false;
    vivos.forEach((it) => {
      if (!it.placed) {
        it.g.position.copy(it.tp);
        it.g.quaternion.copy(it.tq);
        it.placed = true;
        mover = true;
      }
      const dp = it.g.position.distanceToSquared(it.tp);
      const ds = Math.abs(it.g.scale.x - it.ts);
      qTmp.copy(it.g.quaternion);
      const dq = 1 - Math.abs(qTmp.dot(it.tq));
      if (dp < 1e-7 && ds < 1e-3 && dq < 1e-7) {
        if (it.ts === 0) remover(it);
        return;
      }
      it.g.position.lerp(it.tp, seguir);
      it.g.quaternion.slerp(it.tq, seguir);
      it.g.scale.setScalar(it.g.scale.x + (it.ts - it.g.scale.x) * seguir);
      it.g.visible = it.g.scale.x > 0.015;
      ajustarSombra(it);
      mover = true;
    });
    if (camera.position.distanceToSquared(camAlvo) > 1e-6) {
      camera.position.lerp(camAlvo, seguir);
      mover = true;
    }
    if (!mover) return;
    // Olha sempre reto, para a capa do meio não entortar.
    camera.lookAt(0, camera.position.y, 0);
    renderer.render(scene, camera);
  }

  redimensionar();
  avisarAtual();
  camera.position.copy(camAlvo);
  raf = requestAnimationFrame(quadro);

  return {
    irPara,
    destruir() {
      destruido = true;
      cancelAnimationFrame(raf);
      observador.disconnect();
      canvas.removeEventListener("pointerdown", aoDescer);
      canvas.removeEventListener("pointermove", aoMover);
      canvas.removeEventListener("pointerup", aoSubir);
      canvas.removeEventListener("pointercancel", aoSubir);
      window.removeEventListener("keydown", aoTeclar);
      [...vivos.values()].forEach(remover);
      fileiras.forEach((f) => {
        f.label.geometry.dispose();
        const m = f.label.material as THREE.MeshBasicMaterial;
        m.map?.dispose();
        m.dispose();
      });
      texturaPaginas.dispose();
      matPaginas.dispose();
      texturaSombra.dispose();
      geoSombra.dispose();
      matSombra.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
