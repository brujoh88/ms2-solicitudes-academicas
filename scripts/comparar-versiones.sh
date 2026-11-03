#!/usr/bin/env bash
# Corre los MISMOS tests de caracterizacion contra la version inicial y la actual.
# Si los dos dan verde, el refactoring no cambio el comportamiento externo.
#
# Uso: scripts/comparar-versiones.sh [ref-antes] [ref-despues]
set -euo pipefail

raiz="$(git rev-parse --show-toplevel)"
antes="${1:-estado-inicial}"
despues="${2:-HEAD}"
tests="test/caracterizacion.e2e.spec.ts"
trabajo="$(mktemp -d)"
trap 'git -C "$raiz" worktree remove --force "$trabajo/antes" >/dev/null 2>&1 || true;
      git -C "$raiz" worktree remove --force "$trabajo/despues" >/dev/null 2>&1 || true;
      rm -rf "$trabajo"' EXIT

correr() {
  local nombre="$1" ref="$2" dir="$trabajo/$1"
  git -C "$raiz" worktree add --detach --quiet "$dir" "$ref"
  mkdir -p "$dir/test"
  cp "$raiz/$tests" "$dir/$tests"
  ln -s "$raiz/node_modules" "$dir/node_modules"
  echo "== $nombre: $ref ($(git -C "$raiz" rev-parse --short "$ref"))"
  (cd "$dir" && npx jest --runInBand "$tests" 2>&1 | grep -E "^(Tests|Test Suites):")
}

correr antes "$antes"
correr despues "$despues"
