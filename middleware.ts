import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isPublicRoute = createRouteMatcher(["/signin", "/esqueci-senha", "/ativar/(.*)", "/convite/(.*)", "/culto", "/inscricao/(.*)", "/livro/(.*)", "/acervo", "/treinamento/mesa-de-som", "/convidado/(.*)", "/api/convidado-acesso", "/g/(.*)", "/subir-audio", "/quem-somos", "/trajetoria", "/agenda", "/visite", "/inscricoes", "/inscricoes/(.*)", "/privacidade", "/api/inscricoes/(.*)", "/retiro/(.*)", "/api/retiro/(.*)", "/comprovante/(.*)", "/opengraph-image(.*)", "/api/site-publico/revalidate-diario"]);

function isLandingPage(pathname: string) {
  return pathname === "/";
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  const pathname = request.nextUrl.pathname;

  // Authed user on landing or signin → redirect to dashboard
  // (exceto ?site=1 — links "Ver o site" de dentro do sistema)
  const verSite = request.nextUrl.searchParams.has("site");
  if (authed && ((isLandingPage(pathname) && !verSite) || isSignInPage(request))) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  // /culto só acessível aos domingos
  if (pathname === "/culto" && new Date().getDay() !== 0) {
    return nextjsMiddlewareRedirect(request, "/");
  }

  // Landing page is public — allow without auth
  if (isLandingPage(pathname)) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // Standard redirects
  if (!isPublicRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}, {
  cookieConfig: { maxAge: 12 * 60 * 60 },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
