#!/usr/bin/env bash
# ViroQuest — One-Command / Double-Click Launcher (macOS & Linux)

echo ""
echo "  ======================================================"
echo "   🧬 ViroQuest — Virology & Vaccine Design Interactive"
echo "   College Open Day Edition (100% Offline)"
echo "  ======================================================"
echo ""

cd "$(dirname "$0")" || exit 1

PORT=8000
# Pick a free port if 8000 is already in use
if command -v lsof &>/dev/null && lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    PORT=8088
fi

open_url() {
    local target="$1"
    if command -v open &>/dev/null; then
        open "$target"
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$target"
    fi
}

# 1. Preferred: Python 3 built-in HTTP server
if command -v python3 &>/dev/null; then
    echo "  [OK] Starting local server at http://localhost:${PORT}"
    echo "  [TIP] Open Day Exhibition Mode: http://localhost:${PORT}?demo=true"
    echo "  Press Ctrl+C to stop the server when the exhibition ends."
    echo ""
    (sleep 0.8 && open_url "http://localhost:${PORT}") &
    python3 -m http.server "${PORT}"
    exit 0
fi

# 2. Fallback: Node npx serve (offline if node_modules present)
if [ -x "./node_modules/.bin/serve" ]; then
    echo "  [OK] Starting local server via bundled serve at http://localhost:${PORT}"
    (sleep 1 && open_url "http://localhost:${PORT}") &
    ./node_modules/.bin/serve -l "${PORT}" .
    exit 0
fi

# 3. Zero-Server Direct Launch (Works offline in Chrome, Safari, Edge & Firefox!)
echo "  [OK] Opening index.html directly in your browser (100% offline)..."
open_url "index.html"
