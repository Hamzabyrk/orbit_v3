#!/usr/bin/env bash
# Faz E0 — minimal Auth ortami: sade Postgres + GoTrue + Mailpit.
# supabase/postgres imajini beklemeden yalnizca GoTrue davranisini olcmek icin.
set -uo pipefail

DOCKER="/c/Program Files/Docker/Docker/resources/bin/docker.exe"
# docker-credential-desktop.exe ayni dizinde; PATH'te olmazsa `docker pull`
# "error getting credentials" ile basarisiz oluyor.
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
NET=e0-net
SECRET="orbit-e0-spike-secret-at-least-32-characters-long"

echo "== temizlik =="
"$DOCKER" rm -f e0-db e0-mail e0-auth >/dev/null 2>&1
"$DOCKER" network rm "$NET" >/dev/null 2>&1
"$DOCKER" network create "$NET" >/dev/null

echo "== postgres imaji =="
"$DOCKER" pull postgres:15-alpine 2>&1 | tail -2

echo "== postgres =="
"$DOCKER" run -d --name e0-db --network "$NET" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres \
  postgres:15-alpine >/dev/null

for i in $(seq 1 60); do
  if "$DOCKER" exec e0-db pg_isready -U postgres >/dev/null 2>&1; then echo "postgres hazir (${i}s)"; break; fi
  sleep 1
done

# GoTrue'nun ilk migration'i `auth` semasinin ve Supabase rollerinin ONCEDEN
# var olmasini bekliyor; supabase/postgres imaji bunlari hazir getiriyor, sade
# postgres imaji getirmiyor. Elle kuruluyor.
echo "== auth semasi ve roller =="
"$DOCKER" exec -i e0-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
create schema if not exists auth;
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin noinherit createrole login password 'postgres';
  end if;
end
$$;
grant all on schema auth to postgres, supabase_auth_admin;

-- GoTrue calisma zamaninda tablolari `auth.` oneki olmadan sorguluyor ve
-- search_path'e guveniyor. Supabase bunu supabase_auth_admin rolu icin
-- ayarliyor. Bu satir GoTrue HIC BASLAMADAN once uygulanmali; sonradan
-- degistirilirse migration'lar yarim kalmis bir semada yeniden kosuyor ve
-- veritabani tutarsiz hale geliyor.
alter role postgres set search_path = auth, public;
SQL
echo "auth semasi kuruldu"

echo "== mailpit =="
"$DOCKER" run -d --name e0-mail --network "$NET" -p 8025:8025 \
  public.ecr.aws/supabase/mailpit:v1.30.2 >/dev/null

echo "== gotrue =="
"$DOCKER" run -d --name e0-auth --network "$NET" -p 9999:9999 \
  -e GOTRUE_API_HOST=0.0.0.0 \
  -e PORT=9999 \
  -e API_EXTERNAL_URL=http://localhost:9999 \
  -e GOTRUE_DB_DRIVER=postgres \
  -e "DATABASE_URL=postgres://postgres:postgres@e0-db:5432/postgres?sslmode=disable" \
  -e GOTRUE_DB_NAMESPACE=auth \
  -e GOTRUE_SITE_URL=http://localhost:5173 \
  -e "GOTRUE_URI_ALLOW_LIST=*" \
  -e GOTRUE_DISABLE_SIGNUP=true \
  -e GOTRUE_JWT_SECRET="$SECRET" \
  -e GOTRUE_JWT_EXP=3600 \
  -e GOTRUE_JWT_AUD=authenticated \
  -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
  -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true \
  -e GOTRUE_MAILER_AUTOCONFIRM=false \
  -e GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true \
  -e GOTRUE_SMTP_HOST=e0-mail \
  -e GOTRUE_SMTP_PORT=1025 \
  -e GOTRUE_SMTP_USER=fake \
  -e GOTRUE_SMTP_PASS=fake \
  -e GOTRUE_SMTP_ADMIN_EMAIL=admin@orbit.test \
  -e GOTRUE_SMTP_SENDER_NAME=ORBIT \
  -e GOTRUE_SMTP_MAX_FREQUENCY=1s \
  -e GOTRUE_PASSWORD_MIN_LENGTH=8 \
  -e GOTRUE_LOG_LEVEL=info \
  public.ecr.aws/supabase/gotrue:v2.195.0 >/dev/null

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9999/health 2>/dev/null)
  if [ "$code" = "200" ]; then echo "gotrue hazir (${i}s)"; break; fi
  sleep 1
done

echo "== durum =="
"$DOCKER" ps --format '{{.Names}}  {{.Status}}' | grep e0-
echo "health: $(curl -s http://127.0.0.1:9999/health)"
