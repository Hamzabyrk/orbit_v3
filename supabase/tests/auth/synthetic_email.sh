#!/usr/bin/env bash
#
# Issue #35 — Sentetik e-posta ile hesap oluşturma ve giriş kanıtı.
#
# `DECISION_LOG.md` — "Kimlik ve Giriş Bilgisi Mimarisi" kararının tamamı şu
# varsayıma dayanıyor: Supabase, teslim edilemez bir alan adına ait e-postayla
# (`<numara>@orbit.invalid`) kullanıcı oluşturmayı kabul eder ve bu kullanıcı
# e-posta/şifre ile giriş yapabilir.
#
# Varsayım yanlışsa mimari değişir: giriş için `service_role` yetkili bir Edge
# Function gerekir ve kullanıcı şifresi sunucu kodumuzdan geçmeye başlar. Bu,
# ADR'de bilinçli olarak reddedilen tasarımdır.
#
# Bu test SQL ile yapılamaz. `admin.createUser` bir GoTrue API çağrısıdır;
# `auth.users` tablosuna doğrudan INSERT yapmak GoTrue'nun doğrulamasını atlar
# ve hiçbir şey kanıtlamaz. Bu nedenle yerel Auth API'sine gerçek HTTP
# istekleri yapılır. Yerel GoTrue, production ile aynı kod tabanıdır.
#
# Tek seferlik bir kanıt değil, kalıcı bir regresyon testidir: Supabase bu
# davranışı ileride değiştirirse bunu bir müşteri değil CI bildirir.

set -uo pipefail

fail() {
  echo "HATA: $*" >&2
  exit 1
}

eval "$(supabase status -o env)" 2>/dev/null || fail "supabase status okunamadı"

: "${API_URL:?API_URL alınamadı}"
: "${ANON_KEY:?ANON_KEY alınamadı}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY alınamadı}"

# Yerel config minimum 8 karakter ve küçük+büyük harf+rakam istiyor.
readonly PASSWORD="Orbit2026Test"
readonly LOGIN_NUMBER="10421137"
readonly SYNTHETIC_EMAIL="${LOGIN_NUMBER}@orbit.invalid"

echo "API_URL: ${API_URL}"
echo "Sınanan adres: ${SYNTHETIC_EMAIL}"
echo

# --- 1) Sentetik adresle kullanıcı oluşturulabiliyor mu? ---------------------

create_response=$(curl -s -o /tmp/create_body -w '%{http_code}' \
  -X POST "${API_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SYNTHETIC_EMAIL}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true}")

if [ "$create_response" != "200" ] && [ "$create_response" != "201" ]; then
  echo "--- yanıt ---"
  cat /tmp/create_body
  echo
  fail "sentetik adresle kullanıcı oluşturulamadı (HTTP ${create_response}).
Supabase teslim edilemez alan adlarını reddediyorsa ADR'deki kimlik mimarisi
geçersizdir ve giriş için Edge Function'lı tasarıma dönülmelidir."
fi

user_id=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/create_body','utf8')).id||'')")
[ -n "$user_id" ] || fail "kullanıcı oluşturuldu ama id dönmedi"

echo "1/4 kullanıcı oluşturuldu (HTTP ${create_response}, id ${user_id})"

# --- 2) Bu kullanıcı e-posta/şifre ile giriş yapabiliyor mu? -----------------

signin_response=$(curl -s -o /tmp/signin_body -w '%{http_code}' \
  -X POST "${API_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SYNTHETIC_EMAIL}\",\"password\":\"${PASSWORD}\"}")

if [ "$signin_response" != "200" ]; then
  echo "--- yanıt ---"
  cat /tmp/signin_body
  echo
  fail "sentetik adresle giriş yapılamadı (HTTP ${signin_response})"
fi

access_token=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/signin_body','utf8')).access_token||'')")
[ -n "$access_token" ] || fail "giriş başarılı görünüyor ama access_token dönmedi"

echo "2/4 giriş başarılı, geçerli oturum alındı"

# --- 3) Profil trigger'ı sentetik kullanıcı için de çalışıyor mu? ------------
#
# handle_new_auth_user, auth.users insert'inde profil satırı oluşturur.
# Sentetik adresli kullanıcı bu akışın dışında kalırsa kimlik çözümlemesi
# sessizce kırılırdı.

profile_count=$(psql "${DB_URL}" -tAc \
  "select count(*) from public.profiles where id = '${user_id}'::uuid" 2>/dev/null)

[ "$profile_count" = "1" ] ||
  fail "sentetik kullanıcı için profil oluşmadı (bulunan: ${profile_count:-yok})"

echo "3/4 profil kaydı oluştu"

# --- 4) Yanlış şifre reddediliyor mu? ---------------------------------------
#
# Kontrol testi: ilk üç adım, giriş her koşulda başarılı olsaydı da geçerdi.

wrong_response=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${API_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SYNTHETIC_EMAIL}\",\"password\":\"YanlisSifre123\"}")

[ "$wrong_response" = "400" ] ||
  fail "yanlış şifre reddedilmedi (HTTP ${wrong_response})"

echo "4/4 yanlış şifre reddedildi"
echo
echo "Sentetik e-posta mimarisi doğrulandı."
