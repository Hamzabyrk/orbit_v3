// Faz 4 hesap fabrikası: ölçüm tohumundaki (seed_olcum) kullanıcılar için YEREL JWT_SECRET ile HS256 jeton basar.
// Gerekçe: GoTrue yerel sınırı sign_in_sign_ups=30/5dk/IP; 200 jetonu şifreyle almak ~35 dk sürerdi (plan 04 §4 adım 5).
// Yalnız yerel yığın için geçerlidir; üretimde JWT_SECRET bilinmez ve bu yol yoktur.
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(process.argv[2], "utf8")
    .split("\n")
    .filter(Boolean)
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);
const users = JSON.parse(readFileSync(process.argv[3], "utf8")); // [{id,email,role}]
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const out = users.map(u => {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    aud: "authenticated",
    role: "authenticated",
    sub: u.id,
    email: u.email,
    iss: env.API_URL + "/auth/v1",
    iat: now,
    exp: now + 3 * 3600,
    session_id: "00000000-0000-0000-0000-000000000000",
    is_anonymous: false,
  });
  const sig = createHmac("sha256", env.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return {
    role: u.role,
    orbitRole: u.orbitRole,
    org: u.org,
    membership: u.membership,
    token: `${header}.${payload}.${sig}`,
  };
});
writeFileSync(process.argv[4], JSON.stringify(out));
console.log(`yazıldı: ${out.length} jeton -> ${process.argv[4]}`);
