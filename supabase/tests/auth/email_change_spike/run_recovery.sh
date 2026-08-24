#!/usr/bin/env bash
# Faz E0-B — sifre sifirlama linkini SUNUCUDA uretip KENDIMIZ gonderebilir miyiz?
#
# Tasarim: auth e-postasi sentetik kalir, gercek adres profiles'ta durur.
# Kurtarma icin linki biz uretip kayitli adrese biz gondeririz.
# Bu betik, GoTrue'nun linki POSTA GONDERMEDEN uretip uretmedigini ve
# uretilen linkin gercekten calisip calismadigini olcer.
set -uo pipefail

A="http://127.0.0.1:9999"; M="http://127.0.0.1:8025"
P="Orbit2026Test"; NEWP="YeniSifre2026"
S="10429100@orbit.invalid"

SR=$(node -e 'const c=require("crypto");const s="orbit-e0-spike-secret-at-least-32-characters-long";const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const n=Math.floor(Date.now()/1000);const h=b({alg:"HS256",typ:"JWT"});const p=b({role:"service_role",aud:"authenticated",iss:"e0",sub:"a",iat:n,exp:n+3600});console.log(h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url"));')
AD=(-H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json")

hr() { printf '\n════════ %s ════════\n' "$1"; }
mailcount() { curl -s "$M/api/v1/messages" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");console.log((j.messages||[]).length);});'; }
login() { curl -s -o /dev/null -w '%{http_code}' -X POST "$A/token?grant_type=password" -H "apikey: $SR" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }

hr "KURULUM"
curl -s -X DELETE "$M/api/v1/messages" >/dev/null
for id in $(curl -s "$A/admin/users?per_page=200" "${AD[@]}" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{(JSON.parse(d||"{}").users||[]).forEach(u=>console.log(u.id));});'); do
  curl -s -X DELETE "$A/admin/users/$id" "${AD[@]}" >/dev/null
done
U=$(curl -s -X POST "$A/admin/users" "${AD[@]}" -d "{\"email\":\"$S\",\"password\":\"$P\",\"email_confirm\":true}" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).id||""));')
echo "sentetik kullanici : $S"
echo "eski sifreyle giris: HTTP $(login "$S" "$P")"
echo "posta kutusu       : $(mailcount) mesaj"

hr "1 — generate_link ile kurtarma linki uretimi"
resp=$(curl -s -X POST "$A/admin/generate_link" "${AD[@]}" \
  -d "{\"type\":\"recovery\",\"email\":\"$S\",\"redirect_to\":\"http://localhost:5173/sifre-belirle\"}")
echo "$resp" | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d||"{}");
  if (j.error || j.msg) { console.log("   HATA: "+(j.msg||j.error)); return; }
  console.log("   action_link   : "+(j.action_link?String(j.action_link).slice(0,72)+"...":"(yok)"));
  console.log("   hashed_token  : "+(j.hashed_token?String(j.hashed_token).slice(0,24)+"...":"(yok)"));
  console.log("   email_otp     : "+(j.email_otp||"(yok)"));
  console.log("   type          : "+(j.verification_type||"(yok)"));
});'
sleep 2
echo "   >>> POSTA GONDERILDI MI: $(mailcount) mesaj   (0 ise GoTrue gondermedi, link bizde)"

hr "2 — uretilen link gercekten calisiyor mu"
TOK=$(echo "$resp" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");console.log(j.hashed_token||"");});')
if [ -z "$TOK" ]; then echo "   token alinamadi, atlaniyor"; else
  # Kurtarma jetonunu oturuma cevir
  vr=$(curl -s -X POST "$A/verify" -H "apikey: $SR" -H "Content-Type: application/json" \
    -d "{\"type\":\"recovery\",\"token_hash\":\"$TOK\"}")
  AT=$(echo "$vr" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");console.log(j.access_token||"");});')
  if [ -z "$AT" ]; then
    echo "   token_hash ile dogrulama basarisiz:"; echo "$vr" | head -c 200; echo
  else
    echo "   kurtarma oturumu alindi: OK"
    up=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$A/user" \
      -H "apikey: $SR" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
      -d "{\"password\":\"$NEWP\"}")
    echo "   sifre guncelleme       : HTTP $up"
  fi
fi

hr "3 — sonuc"
echo "   YENI sifreyle giris : HTTP $(login "$S" "$NEWP")"
echo "   ESKI sifreyle giris : HTTP $(login "$S" "$P")"
echo "   toplam giden posta  : $(mailcount)"
echo
echo "   Beklenen: yeni 200, eski 400, posta 0"
echo "   Bu ciksa: auth adresi SENTETIK kalirken kurtarma calisiyor demektir."
