#!/usr/bin/env bash
# Login autenticado + screenshot via agent-browser.
#
# Uso:
#   scripts/screenshot-auth.sh <rota> [saida.png] [largura] [altura]
# Ex:
#   scripts/screenshot-auth.sh /secretario-executivo tmp/rol-mobile.png 390 844
#   scripts/screenshot-auth.sh /dashboard tmp/dash-desktop.png 1280 900
#
# Credenciais vem de .env.local (gitignored) — NUNCA do repo:
#   SCREENSHOT_PHONE=11999991111
#   SCREENSHOT_PASSWORD=suaSenha
# Base padrao = prod. Para um preview de branch:
#   SCREENSHOT_BASE_URL=https://ipc-git-<branch>-cyhandre-3063s-projects.vercel.app scripts/screenshot-auth.sh ...
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROTA="${1:-/dashboard}"
SAIDA="${2:-$ROOT/tmp/shot.png}"
W="${3:-390}"
H="${4:-844}"
BASE="${SCREENSHOT_BASE_URL:-https://ipc-pi-ten.vercel.app}"

# saida absoluta: o daemon do agent-browser resolve paths no cwd DELE
case "$SAIDA" in /*) ;; *) SAIDA="$ROOT/$SAIDA";; esac
mkdir -p "$(dirname "$SAIDA")"

# le credenciais do .env.local sem despejar tudo no ambiente
ENVFILE="$ROOT/.env.local"
PHONE="$(grep -E '^SCREENSHOT_PHONE=' "$ENVFILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
PASS="$(grep -E '^SCREENSHOT_PASSWORD=' "$ENVFILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [ -z "$PHONE" ] || [ -z "$PASS" ]; then
  echo "Falta SCREENSHOT_PHONE / SCREENSHOT_PASSWORD em $ENVFILE" >&2
  exit 1
fi

agent-browser set viewport "$W" "$H" >/dev/null
agent-browser open "$BASE/signin" >/dev/null
agent-browser wait 2500 >/dev/null
agent-browser fill "#phone-s" "$PHONE" >/dev/null
agent-browser fill "#password" "$PASS" >/dev/null
agent-browser click "button[type=submit]" >/dev/null
agent-browser wait 4000 >/dev/null            # aguarda redirect pos-login
agent-browser open "$BASE$ROTA" >/dev/null
agent-browser wait 3000 >/dev/null            # aguarda render/queries Convex
agent-browser screenshot "$SAIDA" >/dev/null
agent-browser close >/dev/null
echo "Screenshot: $SAIDA"
