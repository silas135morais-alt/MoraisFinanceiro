#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL antes de executar o backup}"

backup_dir="${BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$backup_dir/morais-financeiro-$timestamp.sql.gz"

if [[ -e "$output" ]]; then
  echo "Arquivo de backup já existe: $output" >&2
  exit 1
fi

command -v pg_dump >/dev/null 2>&1 || {
  echo "pg_dump não está instalado neste ambiente." >&2
  exit 1
}

umask 077
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$output"

if [[ ! -s "$output" ]]; then
  rm -f "$output"
  echo "O backup foi gerado vazio; arquivo removido." >&2
  exit 1
fi

sha256sum "$output" > "$output.sha256"
printf 'Backup concluído: %s\nChecksum: %s\n' "$output" "$output.sha256"
