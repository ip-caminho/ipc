// Botões da biblioteca em forma de pílula, no mesmo desenho da barra inferior do app.
// A resposta ao toque é imediata: a cor muda na hora e a escala leva só 100ms.
export const pilula =
  "rounded-full font-semibold transition-transform duration-100 ease-out active:scale-[0.97] active:brightness-90 motion-reduce:transition-none motion-reduce:active:scale-100";

export const pilulaTexto = `${pilula} text-primary hover:text-primary active:bg-primary/10`;

export const pilulaDevolver = `${pilula} bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary active:bg-primary/25`;

// Verde porque abre o WhatsApp.
export const pilulaLembrar = `${pilula} bg-emerald-100 text-emerald-900 hover:bg-emerald-200 hover:text-emerald-900 active:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900 dark:hover:text-emerald-200 dark:active:bg-emerald-900`;

export const campoPilula = "h-12 rounded-full px-5 text-base md:h-12 md:text-base";
