import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isPublicRoute = createRouteMatcher(["/signin", "/ativar/(.*)", "/convite/(.*)", "/culto", "/inscricao/(.*)", "/livro/(.*)"]);

function isLandingPage(pathname: string) {
  return pathname === "/";
}

function isLocalhost(host: string | null) {
  if (!host) return false;
  return host.includes("localhost") || host.startsWith("127.0.0.1");
}

function isMobileUA(ua: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const ua = request.headers.get("user-agent") || "";
  const host = request.headers.get("host");
  const mobile = isMobileUA(ua);
  const isLocal = isLocalhost(host);

  const desktopSeconds = 30 * 60;
  const mobileSeconds = 12 * 60 * 60;
  const durationSec = mobile ? mobileSeconds : desktopSeconds;

  const appCookieName = "__appSessionExpiry";
  const expiryStr = request.cookies.get(appCookieName)?.value ?? "";
  const now = Date.now();
  const expiry = Number.parseInt(expiryStr, 10) || 0;

  const authed = await convexAuth.isAuthenticated();
  const pathname = request.nextUrl.pathname;

  // If app-level window expired, force reauth
  if (authed && expiry && expiry < now) {
    const prefix = isLocal ? "" : "__Host-";
    const tokenName = `${prefix}__convexAuthJWT`;
    const refreshTokenName = `${prefix}__convexAuthRefreshToken`;

    const resp = nextjsMiddlewareRedirect(request, "/signin");
    resp.cookies.set(appCookieName, "", { maxAge: 0, path: "/" });
    resp.cookies.set(tokenName, "", { maxAge: 0, path: "/" });
    resp.cookies.set(refreshTokenName, "", { maxAge: 0, path: "/" });
    return resp;
  }

  // Authed user on landing or signin → redirect to dashboard
  if (authed && (isLandingPage(pathname) || isSignInPage(request))) {
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

  // Slide the window
  if (authed) {
    const resp = NextResponse.next({
      request: { headers: request.headers },
    });
    resp.cookies.set(appCookieName, String(now + durationSec * 1000), {
      maxAge: durationSec,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !isLocal,
    });
    return resp;
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
