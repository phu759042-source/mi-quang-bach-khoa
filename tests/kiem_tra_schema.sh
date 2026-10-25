#!/usr/bin/env bash
# Dựng một Postgres trống tạm thời, giả lập phần Supabase có sẵn (tests/supabase_gia.sql),
# chạy supabase/schema.sql rồi thử các luật server (tests/kiem_tra_schema.sql).
# Dùng: bash tests/kiem_tra_schema.sh      (cần Postgres 15+ cài trên máy)
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(pg_config --bindir 2>/dev/null || ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
TMP=$(mktemp -d); PORT=54329
RUN=(); if [ "$(id -u)" = 0 ]; then id pgtest >/dev/null 2>&1 || useradd -M pgtest; chown pgtest "$TMP"; RUN=(runuser -u pgtest --); fi
cleanup(){ "${RUN[@]}" "$BIN/pg_ctl" -D "$TMP/db" stop -m fast >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"${RUN[@]}" "$BIN/initdb" -D "$TMP/db" -U postgres -A trust >/dev/null
"${RUN[@]}" "$BIN/pg_ctl" -D "$TMP/db" -o "-p $PORT -k $TMP -c wal_level=logical" -l "$TMP/log" start >/dev/null
PSQL=("$BIN/psql" -h "$TMP" -p $PORT -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f tests/supabase_gia.sql
# pg_net là extension riêng của Supabase; bản giả lập đã tạo sẵn net.http_post
grep -v '^create extension if not exists pg_net' supabase/schema.sql | "${PSQL[@]}"
echo "Đã dựng xong database từ supabase/schema.sql"
"${PSQL[@]}" -f tests/kiem_tra_schema.sql 2>&1 | sed 's/^psql:[^:]*:[0-9]*: NOTICE: */  /'
# --md5: in mã băm từng hàm/view để so với server (câu lệnh so sánh ở supabase/README.md)
if [ "${1:-}" = "--md5" ]; then
  "${PSQL[@]}" -At -c "select json_object_agg(k, h order by k) from (
    select 'f:'||p.proname k, md5(btrim(regexp_replace(pg_get_functiondef(p.oid), '\\s+', ' ', 'g'))) h
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    union all select 'v:'||c.relname, md5(btrim(regexp_replace(pg_get_viewdef(c.oid,true), '\\s+', ' ', 'g')))
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v') x"
fi
