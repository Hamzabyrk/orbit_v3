# Eşzamanlılık ölçüm takımı (k6)

`seed_olcum.sql` bir dershane-yılı **veri** üretir; bu klasör o verinin üzerine bir dershane-saati **yük** bindirir. İkisi birlikte `ROADMAP` §4.23'ün eşzamanlılık sayılarını yeniden üretir.

> 🔴 **Yalnız yerel yığında koşar. Üretime yük basılmaz.** Üretim paylaşımlı bir Supabase örneğidir ve yük üretmek başka projeleri etkiler. Üretim kapasitesi ancak (a) Pro plana geçilip bir branch üzerinde ya da (b) planlı bir bakım penceresinde ölçülür; ikisi de ayrı bir karardır.

---

## Neden bir "hesap fabrikası" var

Her sanal kullanıcının **kendi JWT'sini** taşıması gerekiyor, çünkü ölçülen şey yetki katmanı ve her rol farklı bir yol koşuyor. Ama `seed_olcum.sql` giriş yapabilen hesap üretmiyor: satırları `auth.users`'a doğrudan yazıyor ve şifre alanı geçerli bir hash değil.

Şifreyle 683 jeton almak da olmuyor — yerel GoTrue `sign_in_sign_ups` sınırı **30 istek / 5 dakika / IP**, yani ısınma yarım saati aşardı ve ölçülen şey Auth olurdu.

Çözüm: jetonlar **testin dışında**, yerel `JWT_SECRET` ile basılıyor (`jeton_bas.mjs`). Basılan jeton GoTrue'nun ürettiğiyle aynı imzayı taşıdığı için PostgREST ve RLS onu normal bir kullanıcı gibi görür. **Üretimde bu yol yoktur** — `JWT_SECRET` bilinmez ve zaten üretime yük basılmaz.

---

## Koşum

```bash
# 0. Yerel yığın ayakta ve tohum yüklü olmalı
supabase start
docker exec -i supabase_db_orbit_v3 psql -U postgres -v ON_ERROR_STOP=1 \
  < supabase/perf/seed_olcum.sql

# 1. Ortam ve jetonlar
supabase status -o env > /tmp/orbit_env.sh
docker exec -i supabase_db_orbit_v3 psql -U postgres -At \
  < supabase/perf/k6/kullanicilari_cikar.sql > /tmp/kullanicilar.json
node supabase/perf/k6/jeton_bas.mjs /tmp/orbit_env.sh /tmp/kullanicilar.json \
  supabase/perf/k6/jetonlar.json

# 2. Koş (k6 tek ikili dosya, kurulum gerektirmez)
cd supabase/perf/k6
MODE=mix API_URL=http://127.0.0.1:54321 ANON_KEY=<anon> ORG_ID=<kurum> k6 run senaryo.js
```

`jetonlar.json` **git'e girmez** (`.gitignore`); her koşumda yeniden basılır ve üç saat sonra geçersiz olur.

### Değişkenler

| Değişken                  | Anlamı                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MODE`                    | `mix` (gerçekçi rol karması) · `admin` (yalnız yönetici) · `contention` (aynı yoklamaya yazma) · `refused` (yanlış kurum kimlikleriyle istek yağmuru) |
| `VUS` + `DUR`             | Sabit basamak — dirsek aramak için (`VUS=25 DUR=40s`). Verilmezse rampa koşar                                                                         |
| `SHORT=1`                 | Rampayı kısaltır (10 → 50 → 100), tam rampa 10 → 200                                                                                                  |
| `SESSION_ID` / `CLASS_ID` | `contention` modu için; aynı oturuma yazılacak yoklama ve sınıfı                                                                                      |
| `OTHER_ORG_ID`            | `refused` modu için; **başka** bir kurumun kimliği                                                                                                    |

---

## 🔴 Sayılar okunmadan önce — yorumlanabilirlik sınırı

Ölçüm bu makinenin Docker'ında koşuyor ve **yerel PostgREST havuzu 10 bağlantı** (`PGRST_DB_POOL` ayarsız, varsayılan), havuz alma zaman aşımı 10 saniye. 2026-09-19 turunda görülen bütün "10 s" duvarları budur — veritabanı değil, havuzun önündeki kuyruk.

| Taşınabilir                                    | Taşınabilir değil             |
| ---------------------------------------------- | ----------------------------- |
| Dirseğin **şekli** (nerede kuyruk başlıyor)    | Mutlak milisaniye             |
| **Hata tipi** (5xx mi, 403 mü, zaman aşımı mı) | Dirseğin kaçıncı VU'da olduğu |
| Roller arası **oran**                          | İstek/saniye tavanı           |
| En pahalı sorgunun **kimliği**                 | O sorgunun süresi             |

_"N kullanıcı kaldırır"_ cümlesi bu klasörden çıkmaz. Üretimin havuz büyüklüğü **Supabase → Settings → Database → Connection pooling**'den okunmadan kapasite sorusu cevaplanamaz.

---

## 2026-09-19 turunda ölçülenler

Ayrıntı `ROADMAP` §4.23. Özet: dirsek **25 VU** civarında (istek/sn 25'ten sonra artmıyor, gecikme doğrusal büyüyor — saf kuyruk); `statement_timeout` **hiç** devreye girmedi; veritabanı süresinin **~%85'i** öğrenci/veli ödev listesinin satır başına yetki hesabında (`v1.5-24`); yazma çekişmesinde **0 kilit beklemesi**; reddedilen okuma **458 istek/sn** ve hatasız.

📌 **Bir sonraki tur `pg_stat_statements`'ı koşumdan önce sıfırlasın** (`select pg_stat_statements_reset();`), yoksa tohum yüklemenin sorguları listeyi kirletir ve "en pahalı sorgu" yanlış çıkar.
