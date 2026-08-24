#!/usr/bin/env bash
# Faz E0 — sentetik adresten gercek adrese gecis olculuyor.
set -uo pipefail

AUTH="http://127.0.0.1:9999"
MAIL="http://127.0.0.1:8025"
SECRET="orbit-e0-spike-secret-at-least-32-characters-long"
PASSWORD="Orbit2026Test"
SYNTH="10429001@orbit.invalid"
REAL="gercek-adres@example.test"

SR=$(node -e '
const c=require("crypto");
const s=process.argv[1];
const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const n=Math.floor(Date.now()/1000);
const h=b({alg:"HS256",typ:"JWT"});
const p=b({role:"service_role",aud:"authenticated",iss:"e0",sub:"e0-admin",iat:n,exp:n+3600});
console.log(h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url"));
' "$SECRET")

AD=(-H "apikey: ${SR}" -H "Authorization: Bearer ${SR}" -H "Content-Type: application/json")
AN=(-H "apikey: ${SR}" -H "Content-Type: application/json")

hr() { printf '\n════════ %s ════════\n' "$1"; }
clearmail() { curl -s -X DELETE "${MAIL}/api/v1/messages" >/dev/null; }

mails() {
  curl -s "${MAIL}/api/v1/messages" | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d||"{}");
  const m=j.messages||[];
  console.log("   posta sayisi: "+m.length);
  m.forEach(x=>console.log("   -> "+(x.To||[]).map(t=>t.Address).join(", ")+"   ["+x.Subject+"]"));
});'
}

state() {
  curl -s "${AUTH}/admin/users/${1}" "${AD[@]}" | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const u=JSON.parse(d||"{}");
  console.log("   email             : "+u.email);
  console.log("   new_email         : "+(u.new_email||"(yok)"));
  console.log("   email_confirmed_at: "+(u.email_confirmed_at?"var":"YOK"));
});'
}

login() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "${AUTH}/token?grant_type=password" \
    "${AN[@]}" -d "{\"email\":\"$1\",\"password\":\"${PASSWORD}\"}"
}

# ---------------------------------------------------------------- kurulum ---
hr "KURULUM"
for id in $(curl -s "${AUTH}/admin/users?per_page=200" "${AD[@]}" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");(j.users||[]).forEach(u=>console.log(u.id));});'); do
  curl -s -X DELETE "${AUTH}/admin/users/${id}" "${AD[@]}" >/dev/null
done
clearmail

created=$(curl -s -X POST "${AUTH}/admin/users" "${AD[@]}" \
  -d "{\"email\":\"${SYNTH}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true}")
UID_=$(echo "$created" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const u=JSON.parse(d||"{}");console.log(u.id||"");});')
[ -n "$UID_" ] || { echo "kullanici olusturulamadi:"; echo "$created" | head -c 300; exit 1; }
echo "sentetik kullanici: ${SYNTH}"
echo "id                : ${UID_}"

TOKEN=$(curl -s -X POST "${AUTH}/token?grant_type=password" "${AN[@]}" \
  -d "{\"email\":\"${SYNTH}\",\"password\":\"${PASSWORD}\"}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");console.log(j.access_token||"");});')
[ -n "$TOKEN" ] || { echo "giris yapilamadi"; exit 1; }
echo "sentetik adresle giris: OK"

# ------------------------------------------------------------- SENARYO A ---
hr "A — kullanici kendi degistiriyor (secure email change ACIK)"
clearmail
code=$(curl -s -o /tmp/e0a -w '%{http_code}' -X PUT "${AUTH}/user" \
  -H "apikey: ${SR}" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${REAL}\"}")
echo "HTTP ${code}"
sleep 3
mails
state "$UID_"
echo "   --- degisim sonrasi giris ---"
echo "   gercek adres  : HTTP $(login "$REAL")"
echo "   sentetik adres: HTTP $(login "$SYNTH")"

# --------------------------------- yalnizca YENI adresin token'i ile onay ---
hr "A2 — yalnizca YENI adrese gelen baglanti ile onay denemesi"
NEWTOK=$(curl -s "${MAIL}/api/v1/messages" | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d||"{}");
  const m=(j.messages||[]).find(x=>(x.To||[]).some(t=>t.Address.includes("gercek-adres")));
  console.log(m?m.ID:"");
});')
if [ -n "$NEWTOK" ]; then
  body=$(curl -s "${MAIL}/api/v1/message/${NEWTOK}")
  link=$(echo "$body" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");const t=(j.Text||"")+" "+(j.HTML||"");const m=t.match(/token=[A-Za-z0-9_-]+[^"\s<]*/);console.log(m?m[0]:"");});')
  echo "   yeni adrese gelen token: ${link:0:60}..."
  vcode=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH}/verify?${link}&type=email_change")
  echo "   verify HTTP ${vcode}"
  sleep 1
  state "$UID_"
  echo "   --- onay sonrasi giris ---"
  echo "   gercek adres  : HTTP $(login "$REAL")"
  echo "   sentetik adres: HTTP $(login "$SYNTH")"
else
  echo "   yeni adrese posta GELMEDI"
fi

# ------------------------------------------------------------- SENARYO B ---
hr "B — service_role ile admin API (email_confirm = true)"
clearmail
code=$(curl -s -o /tmp/e0b -w '%{http_code}' -X PUT "${AUTH}/admin/users/${UID_}" \
  "${AD[@]}" -d "{\"email\":\"${REAL}\",\"email_confirm\":true}")
echo "HTTP ${code}"
head -c 200 /tmp/e0b; echo
sleep 2
mails
state "$UID_"
echo "   --- sonrasi giris ---"
echo "   gercek adres  : HTTP $(login "$REAL")"
echo "   sentetik adres: HTTP $(login "$SYNTH")"

hr "BITTI"
