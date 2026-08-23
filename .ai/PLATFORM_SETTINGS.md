# PLATFORM_SETTINGS.md — ORBIT

> Kod dışında, sağlayıcı panellerinden yönetilen ayarların kaydı.
> Bu dosya `PROJECT_ARCHITECT.md` §01 ortak hafıza sisteminin parçasıdır.

---

## 1. Bu dosya neden var

Projede aynı hata beş kez tekrarlandı: **repo bir şey söyledi, production başka şey yaptı.**

| #   | Repo ne diyordu                                              | Production ne yapıyordu                             | Nerede yakalandı   |
| --- | ------------------------------------------------------------ | --------------------------------------------------- | ------------------ |
| 1   | Migration fonksiyon yetkilerini `from public` ile kaldırıyor | `anon` ve `authenticated` EXECUTE yetkisi duruyordu | Issue #18          |
| 2   | `config.toml` → `enable_signup = false`                      | Yeni kayıt açıktı                                   | Issue #16 denetimi |
| 3   | `config.toml` → `minimum_password_length = 8`                | Minimum 6 idi                                       | Issue #16 denetimi |
| 4   | `WORK_LOG` → "Vercel Marketplace kurulumu yapılmadı"         | 16 sunucu değişkeni aktarılmıştı                    | Issue #16 denetimi |
| 5   | `config.toml` → `secure_password_change = true`              | Kapalıydı                                           | Issue #20 denetimi |

Kök neden tek ve basit:

> **`supabase/config.toml` yalnızca yerel geliştirme ortamını yönetir.**
> Supabase GitHub entegrasyonu production'a **sadece `supabase/migrations/` altındaki dosyaları** uygular. Auth ayarlarını, Edge Function secret'larını ve URL yapılandırmasını **uygulamaz**.

`90cd9a9` commit'i (PR #13) tam olarak bu yüzden başarısız oldu: `config.toml` içindeki `site_url` production adresine çevrildi, hiçbir etkisi olmadı, geri alındı — ve asıl sorun çözülmemiş kaldı. Site URL sonunda Issue #20 kapsamında panelden düzeltildi.

---

## 2. Hangi ayar nerede yaşar

| Alan                               | Kaynak                 | `config.toml` etkiler mi? | Repo'dan deploy edilir mi?    |
| ---------------------------------- | ---------------------- | ------------------------- | ----------------------------- |
| Tablo, fonksiyon, RLS, yetkiler    | `supabase/migrations/` | Yerelde evet              | ✅ `main`e merge ile otomatik |
| Edge Function kodu                 | `supabase/functions/`  | —                         | ✅                            |
| Edge Function secret'ları          | Supabase paneli        | ❌                        | ❌ Elle                       |
| Auth sağlayıcı ve şifre politikası | Supabase paneli        | ❌                        | ❌ Elle                       |
| Site URL ve Redirect URL listesi   | Supabase paneli        | ❌                        | ❌ Elle                       |
| Oturum ömrü, rate limit            | Supabase paneli        | ❌                        | ❌ Elle                       |
| Uygulama ortam değişkenleri        | Vercel paneli          | ❌                        | ❌ Elle                       |
| Deployment koruması, domainler     | Vercel paneli          | ❌                        | ❌ Elle                       |
| Repo görünürlüğü, review kuralları | GitHub paneli          | ❌                        | ❌ Elle                       |

**Kural:** Yukarıdaki tabloda "Elle" yazan bir ayarı değiştiren kişi, aynı PR'da bu dosyayı da günceller. Ayar değişikliği kod değişikliği içermiyorsa yalnızca bu dosyayı değiştiren bir PR açılır.

---

## 3. Production envanteri

Supabase projesi `orbit-dershane` (`xyxnyiadidjyalcphhfj`), organizasyon `ORBIT Platform`.
Son doğrulama: **2026-08-23**, Issue #20.

### 3.1 Supabase — Authentication

| Ayar                      | Değer                              | Doğrulama                                                 |
| ------------------------- | ---------------------------------- | --------------------------------------------------------- |
| Email sağlayıcı           | Açık                               | Panel                                                     |
| Yeni kayıt (signup)       | **Kapalı**                         | API: `email_provider_disabled`                            |
| Minimum şifre uzunluğu    | **8**                              | API: `"Password should be at least 8 characters"`         |
| Şifre karmaşıklığı        | Küçük + büyük harf + rakam         | Panel                                                     |
| Secure email change       | Açık                               | Panel                                                     |
| Email OTP ömrü / uzunluğu | 3600 sn / 8 hane                   | Panel                                                     |
| Captcha koruması          | Kapalı                             | Panel                                                     |
| Sızmış şifre koruması     | Kapalı — **Pro plan gerektiriyor** | Panel (bkz. bölüm 5)                                      |
| Oturum zaman aşımı        | Yapılandırılmadı                   | `auth.sessions.not_after` boş, oturum süresiz yenileniyor |

### 3.2 Supabase — URL yapılandırması

- **Site URL:** `https://orbit-v3-topaz.vercel.app`
- **Redirect URL listesi (7):**
  ```
  https://orbit-v3-topaz.vercel.app          + /**
  http://localhost:5173                       + /**
  http://127.0.0.1:5173                       + /**
  https://orbit-v3-*-orb-i-t.vercel.app/**
  ```

> ⚠️ Site URL **`orbit-v3-orb-i-t.vercel.app` olmamalıdır.** O adres Vercel SSO girişine 302 yönlendirir; auth e-postalarındaki bağlantılar kullanıcıyı Vercel login ekranına götürür ve şifre sıfırlama akışı kırılır. Çalışan public adres `orbit-v3-topaz.vercel.app`'tir (HTTP 200).
>
> `/**` ekleri gereklidir: eksiz kayıt yalnızca tam eşleşen adresi kabul eder, `.../reset-password` gibi bir yol eklenince eşleşme başarısız olur.
>
> Preview wildcard'ı `orbit-v3-*-orb-i-t` biçimindedir. `orbit-*-v3-orb-i-t` yazımı hiçbir preview adresiyle eşleşmez.

### 3.3 Supabase — Edge Functions

| Öğe                      | Değer                               | Doğrulama                                  |
| ------------------------ | ----------------------------------- | ------------------------------------------ |
| `bootstrap-organization` | ACTIVE, `verify_jwt = true`         | API                                        |
| `ALLOWED_ORIGINS` secret | `https://orbit-v3-topaz.vercel.app` | Origin sondası: yalnızca bu origin geçiyor |

> `ALLOWED_ORIGINS` bir güvenlik sınırı **değildir**, yalnızca CORS hijyenidir. Fonksiyon kodundaki kontrol `if (origin && ...)` biçiminde olduğu için `Origin` başlığı göndermeyen istemcilerde (curl, sunucu tarafı script) tamamen atlanır. Gerçek kapı operatör kontrolü ve `verify_jwt`'dir.
>
> Yerelde panel geliştirilirken (v1.1.2) bu değerin geçici olarak genişletilmesi gerekebilir.

### 3.4 Supabase — entegrasyonlar

| Entegrasyon | Durum                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| GitHub      | Açık — `Hamzabyrk/orbit_v3`, repo kökü, `main` production branch. **Merge sonrası migration'lar otomatik uygulanır.** |
| Vercel      | **Bağlantı yok (0 project connection).** Bilinçli — bkz. bölüm 3.5.                                                   |

### 3.5 Vercel

Proje `orbit-v3`, Hamza'nın sahibi olduğu `ORBİT` Hobby takımında.

| Ayar                          | Değer                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Ortam değişkenleri            | Yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (Production, Preview, Development) |
| Public production adresi      | `https://orbit-v3-topaz.vercel.app`                                                         |
| `orbit-v3-orb-i-t.vercel.app` | Vercel SSO korumalı, auth akışlarında **kullanılmaz**                                       |
| Preview deployment koruması   | Kapalı — bilinçli, bkz. bölüm 5                                                             |

> Supabase→Vercel env senkronizasyonu **kapalı tutulmalıdır.** Açıkken projeye `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD` dahil 16 sunucu değişkeni basılmıştı. Uygulama bir Vite SPA'dır; bunların hiçbirini okumaz. Değerler istemci bundle'ına sızmamıştı (Vite yalnızca `VITE_` önekli değişkenleri açar), ancak build ortamına erişilebilir durumdaydılar.
>
> Yalnızca `VITE_` önekli değişkenler tarayıcıya ulaşır ve bu nedenle **`VITE_` önekli hiçbir değişkene gizli bir değer konulamaz.**

### 3.6 GitHub

| Ayar                      | Değer                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| Görünürlük                | **Public** (2026-08-23, bkz. `DECISION_LOG.md`)                      |
| `main` review zorunluluğu | **Uygulanıyor** — repo public olduğu için Free planda da zorlanıyor  |
| `CODEOWNERS`              | `* @ardabulent @Hamzabyrk` — her PR'da otomatik review isteği        |
| Arda'nın repo izni        | `WRITE` (Admin değil) — ayarları değiştiremez, merge kuralını aşamaz |

---

## 4. ⛔ Bilinçli olarak KAPALI bırakılan ayarlar — açmadan önce oku

Aşağıdaki ayarlar "eksik" görünür ama **kapalı olmaları kasıtlıdır.** Şartı sağlanmadan açılırsa **ekibin tamamı sistemden kilitlenir.**

**Ortak gerekçe:** Kurucu yöneticinin e-posta/şifre girişi çalışmıyor (gizli sekme testiyle doğrulandı). Erişimi, süresi dolmayan tek bir davet oturumuna bağlı. UI'da şifre belirleme veya sıfırlama ekranı yok ve ikinci bir kullanıcı hesabı bulunmuyor.

| Ayar                                      | Neden kapalı                                                                         | Açılma şartı                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `Require current password when updating`  | Şifre kurtarma akışını, mevcut şifresi olmayan kullanıcı için **tamamen kilitler**   | Şart A                                              |
| `Secure password change`                  | Şifre değiştirmek için "son 24 saat içinde giriş" şartı koyar; mevcut oturum sınırda | Şart A                                              |
| Oturum zaman aşımı (inactivity / timebox) | Tek çalışan oturumu anında düşürür                                                   | Şart A                                              |
| JWT secret rotasyonu                      | Tüm oturumları geçersiz kılar                                                        | Şart A                                              |
| `service_role` anahtarı rotasyonu         | Edge Function ve yönetim erişimini kırar; sıra gerektirir                            | Şart A + Edge Function secret'larının güncellenmesi |

**Şart A:** v1.1.2 kapsamındaki şifre belirleme/sıfırlama akışı production'da çalışır durumda olmalı **ve** her iki ekip üyesinin de e-posta/şifre ile giriş yapabildiği doğrulanmış olmalıdır.

Şart sağlandığında bu bölüm güncellenir ve ayarlar bölüm 3'e taşınır.

---

## 5. Kabul edilmiş açıklar

Bilinen, kapatılmayan ve **bilinçli olarak kabul edilen** durumlar. Her denetimde yeniden tartışılmasın diye kayıtlıdır.

| Açık                                                       | Neden kapatılmıyor                                                                                                                                                                                                                         | Yeniden değerlendirme tetikleyicisi                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Sızmış şifre koruması kapalı                               | Supabase Pro plan gerektiriyor; sıfır bütçe hedefiyle çelişiyor. Supabase advisor bunu kalıcı olarak WARN'lar.                                                                                                                             | Pro plana geçiş                                     |
| `current_user_has_membership` `authenticated` rolüne açık  | RLS policy'lerinin tamamı bu fonksiyonu çağırıyor; yetki kaldırılırsa tenant okuma akışı kırılır. Fonksiyon içeride `auth.uid()` kullandığı için çağıran yalnızca kendi üyeliğini sorgulayabilir. Advisor bunu kalıcı olarak WARN'lar.     | — (tasarım gereği)                                  |
| `workspace_documents` RLS açık, policy yok                 | "Belgeler" özelliği production'da işlevsiz. Güvenli ama bozuk. Tablo yetkileri de kaldırıldığı için çift korumalı.                                                                                                                         | Özelliğin yeniden ele alınması (v1.6)               |
| Preview deployment koruması kapalı                         | Açılırsa preview'lar yalnızca Vercel takım üyelerine görünür; Arda takımda değil ve preview'ları göremez hale gelir. Preview build'leri demo modundadır ve demo modunda uygulama Supabase'e hiç bağlanmaz — görünen tek şey sahte veridir. | Preview'ların gerçek veri taşımaya başlaması (v1.3) |
| `main` branch protection'ın bypass'ı yok, Arda Admin değil | Her merge için ikinci kişi gerekiyor. Şu an bir güvenlik özelliği olarak değerlendiriliyor.                                                                                                                                                | Ekip üyelerinden biri uzun süre erişilemez olursa   |

---

## 6. Doğrulama komutları

Envanterin hâlâ geçerli olduğunu sınamak için. `<ANON_KEY>` yerine public publishable anahtar konur.

```bash
URL=https://xyxnyiadidjyalcphhfj.supabase.co

# Yeni kayıt kapalı olmalı -> email_provider_disabled
curl -s -X POST "$URL/auth/v1/signup" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"Xk9mQw2zPl"}'

# Sifre politikasi 8 karakter olmali -> weak_password / "at least 8 characters"
curl -s -X POST "$URL/auth/v1/signup" -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"abc"}'

# anon ayricalikli RPC'yi cagiramamali -> 42501
curl -s -X POST "$URL/rest/v1/rpc/internal_bootstrap_organization" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"organization_name":"a","organization_slug":"a","branch_name":"a","admin_user_id":"00000000-0000-0000-0000-000000000000","actor_user_id":"00000000-0000-0000-0000-000000000000"}'

# anon tenant tablolarini okuyamamali -> 42501
curl -s "$URL/rest/v1/organizations?select=id" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

# ALLOWED_ORIGINS yalnizca production adresini kabul etmeli
# topaz -> forbidden (origin gecti, operator kontrolune takildi)
# digerleri -> origin_not_allowed
for o in "https://orbit-v3-topaz.vercel.app" "http://localhost:5173"; do
  curl -s -X POST "$URL/functions/v1/bootstrap-organization" \
    -H "Origin: $o" -H "Authorization: Bearer <ANON_KEY>" \
    -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" -d '{}'
done
```

Ayrıca Supabase security advisor düzenli olarak kontrol edilmelidir. Beklenen kalıcı uyarılar: `workspace_documents` policy yokluğu (INFO), `current_user_has_membership` (WARN), sızmış şifre koruması (WARN). **Bunların dışında bir uyarı çıkarsa incelenmelidir.**
