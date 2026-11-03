#!/usr/bin/env bash
# Corre los MISMOS tests de caracterizacion contra la version inicial y la
# refactorizada. Si las dos dan verde, el refactoring no cambio el
# comportamiento externo.
#
# Los tests se toman del tag etapa-diagnostico: es el contrato que se fijo antes
# de refactorizar. Despues, la revision de codigo cambio a proposito los codigos
# HTTP de error (CR1), asi que la version actual ya no cumple ese contrato, y
# esta bien que no lo cumpla.
#
# Uso: scripts/comparar-versiones.sh [ref-antes] [ref-despues] [ref-tests]
set -euo pipefail

raiz="$(git rev-parse --show-toplevel)"
antes="${1:-estado-inicial}"
despues="${2:-etapa-refactoring}"
contrato="${3:-etapa-diagnostico}"
tests="test/caracterizacion.e2e.spec.ts"
trabajo="$(mktemp -d)"
trap 'git -C "$raiz" worktree remove --force "$trabajo/antes" >/dev/null 2>&1 || true;
      git -C "$raiz" worktree remove --force "$trabajo/despues" >/dev/null 2>&1 || true;
      rm -rf "$trabajo"' EXIT

correr() {
  local nombre="$1" ref="$2" dir="$trabajo/$1"
  git -C "$raiz" worktree add --detach --quiet "$dir" "$ref"
  mkdir -p "$dir/test"
  git -C "$raiz" show "$contrato:$tests" > "$dir/$tests"
  ln -s "$raiz/node_modules" "$dir/node_modules"
  echo "== $nombre: $ref ($(git -C "$raiz" rev-parse --short "$ref"))"
  (cd "$dir" && npx jest --runInBand "$tests" 2>&1 | grep -E "^(Tests|Test Suites):")
}

echo "Tests de caracterizacion tomados de: $contrato"
correr antes "$antes"
correr despues "$despues"
