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

| Ayar                      | Değer                                        | Doğrulama                                                  |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Email sağlayıcı           | **Açık**                                     | API: giriş denemesi `invalid_credentials` döner            |
| Yeni kayıt (signup)       | **Kapalı**                                   | API: `signup_disabled`                                     |
| Minimum şifre uzunluğu    | **8**                                        | Panel — anonim sonda ile doğrulanamaz (aşağıdaki nota bak) |
| Şifre karmaşıklığı        | Küçük + büyük harf + rakam                   | Panel                                                      |
| Secure email change       | **Açık — açık kalacak** (bkz. aşağıdaki not) | Panel                                                      |
| Email OTP ömrü / uzunluğu | 3600 sn / 8 hane                             | Panel                                                      |
| Captcha koruması          | Kapalı                                       | Panel                                                      |
| Sızmış şifre koruması     | Kapalı — **Pro plan gerektiriyor**           | Panel (bkz. bölüm 5)                                       |
| Oturum zaman aşımı        | Yapılandırılamıyor — Pro plan gerektiriyor   | Panel; `auth.sessions.not_after` boş                       |

> ℹ️ **`Secure email change` bilinçli olarak AÇIK kalır — kapatma önerisi ölçüm sonrası reddedildi.**
>
> Faz E0'da bu ayarın kapatılması önerilmişti: açıkken sentetik `@orbit.invalid` adresinden gerçek adrese geçiş imkânsız (eski kutuya da onay maili gidiyor, tek onay yetmiyor).
>
> Ancak ölçüm ikinci bir sonuç daha verdi: **ayar kapatılıp e-posta değiştirildiğinde sentetik adresle giriş `HTTP 400` dönüyor** — yani kişinin giriş numarası ölüyor. Kâğıda yazılıp dağıtılmış numara geçersizleşir.
>
> Bu yüzden tasarım değişti: **auth e-postası hiç değişmiyor.** Gerçek adres `profiles` içinde iletişim bilgisi olarak duruyor, kurtarma linkini `admin/generate_link` ile biz üretip biz gönderiyoruz. Ayar bizim yolumuza hiç girmediği için açık kalabiliyor ve hiçbir güvenlik ayarı zayıflatılmıyor.
>
> Bedeli, aşağıdaki bölüm 7'deki e-posta gönderim sağlayıcısının artık **isteğe bağlı değil zorunlu** olmasıdır. Ayrıntı: `DECISION_LOG.md` — "Auth e-postası hiç değişmez; kurtarma linkini biz üretir, biz göndeririz".

> ⚠️ **`Enable email provider` ile `Allow new users to sign up` ayrı ayarlardır ve karıştırılmamalıdır.**
>
> Birincisi `Auth Providers → Email` altındadır ve e-posta/şifre ile **giriş yapmayı** yönetir. İkincisi aynı sayfanın üstündeki `User Signups` bölümündedir ve yalnızca **yeni kayıt** açmayı yönetir.
>
> 2026-08-23'te kayıt kapatılmak istenirken sağlayıcı kapatıldı. Sonuç: hiç kimse şifreyle giriş yapamaz hâle geldi ve şifre sıfırlama akışı da çalışmadı. Kurucu yöneticinin erişimi yalnızca mevcut oturumu sayesinde sürdü.
>
> **Değiştirme sırası:** önce kayıt kapatılır, sonra sağlayıcı açılır. Ters sırada kısa süreli bir açık kayıt penceresi oluşur.
>
> **Eski doğrulama yöntemi yanıltıcıydı.** `email_provider_disabled` hata kodu hem sağlayıcı kapalıyken hem kayıt kapalıyken dönüyordu; ikisini ayırt edemiyordu. Doğru ayrım bölüm 6'daki güncel komutlardadır.
>
> Şifre politikası (minimum uzunluk, karmaşıklık) kayıt kapalıyken anonim olarak sondalanamaz; kayıt denemesi politika kontrolüne varmadan `signup_disabled` ile reddedilir. Politika ancak panelden veya gerçek bir şifre belirleme sırasında doğrulanabilir.

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

| Entegrasyon                    | Durum                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| GitHub                         | Açık — `Hamzabyrk/orbit_v3`, repo kökü, `main` production branch. **Merge sonrası migration'lar otomatik uygulanır.**         |
| Vercel                         | **Bağlantı yok (0 project connection).** Bilinçli — bkz. bölüm 3.5.                                                           |
| Branching (preview veritabanı) | **Kullanılamıyor — Pro plan gerektiriyor.** Biz kapatmadık; organizasyon planı `free` olduğu için Supabase her PR'da atlıyor. |

> **"Supabase Preview — skipping" her PR'da görünür ve bir arıza değildir.** GitHub entegrasyonu bağlı, ancak Branching ücretli planda. Doğrulama: `list_branches` yalnızca production `main` kaydını döndürüyor, hiç preview branch'i yok; organizasyon planı `free`.
>
> **Kaybımız:** PR'lar migration'ları geçici bir kopya veritabanında denemiyor.
>
> **Yerine koyduğumuz:** CI'daki `Tenant RLS` işi (`.github/workflows/supabase-ci.yml`) her PR'da `supabase start` ile sıfırdan bir veritabanı kuruyor, tüm migration'ları uyguluyor ve pgTAP testlerini çalıştırıyor. Ayrıca `Yıkıcı Migration Kontrolü` değişen migration dosyalarını tarıyor. Aynı korumayı ücretsiz sağlıyorlar.

### 3.5 Vercel

Proje `orbit-v3`, Hamza'nın sahibi olduğu `ORBİT` Hobby takımında.

| Ayar                                         | Değer                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ortam değişkenleri                           | Yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (Production, Preview, Development)                                                                                                                                                                                         |
| Public production adresi                     | `https://orbit-v3-topaz.vercel.app`                                                                                                                                                                                                                                                 |
| `orbit-v3-orb-i-t.vercel.app`                | Vercel SSO korumalı, auth akışlarında **kullanılmaz**                                                                                                                                                                                                                               |
| Preview deployment koruması                  | **Etkin** — preview adresleri Vercel SSO gerektiriyor (2026-08-23'te doğrulandı, bkz. bölüm 5)                                                                                                                                                                                      |
| Preview derlemeleri **demo modunda** çalışır | `VERCEL_ENV=preview` → `runtime.ts` `isDemoMode = deploymentEnvironment !== "production"`. Preview'da Supabase'e **hiç istek gitmez**; giriş ekranı rol seçtirir, şifre `demo123`, kimlik sahtedir. Sonuç: **auth, RLS ve platform paneli preview'da doğrulanamaz** (bkz. bölüm 5). |
| Güvenlik başlıkları                          | `vercel.json` ile repodan yönetilir — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. HSTS'i Vercel kendisi ekler.                                                                                                                               |
| SPA rewrite                                  | `vercel.json` — istemci rotalarının doğrudan açılabilmesi için zorunlu                                                                                                                                                                                                              |

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

| Ayar                                      | Neden kapalı                                                                                                                                                                                                                                 | Açılma şartı                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Require current password when updating`  | **Hâlâ kapalı.** Şifre kurtarma akışıyla etkileşimi denenmedi: kurtarmada kullanıcının oturumu vardır ama eski şifresini bilmez. Yanlışsa tek kurtarma mekanizması kırılır.                                                                  | İkinci ekip üyesinin hesabı açıldıktan sonra, iki hesapla test edilerek                                                                                          |
| `Secure password change`                  | **2026-08-23'te açıldı.**                                                                                                                                                                                                                    | —                                                                                                                                                                |
| Oturum zaman aşımı (inactivity / timebox) | **Supabase Pro plan gerektiriyor**, ücretsiz katmanda açılamıyor. Bkz. bölüm 5.                                                                                                                                                              | Pro plana geçiş veya istemci tarafı hareketsizlik sayacı                                                                                                         |
| JWT secret rotasyonu                      | **Şart A yetmez.** Production'daki anon anahtarı JWT secret ile imzalanmış eski format bir JWT'dir; secret döndürülürse o anahtar geçersiz olur ve uygulama, Vercel değişkeni güncellenip yeniden deploy edilene kadar **tamamen çalışmaz**. | Önce Vercel'deki `VITE_SUPABASE_ANON_KEY` yeni format `sb_publishable_` anahtarıyla değiştirilmeli ve deploy doğrulanmalı; rotasyon ancak ondan sonra güvenlidir |
| `service_role` anahtarı rotasyonu         | Eski format anahtarlar JWT secret'a bağlı olduğu için yukarıdaki kesinti riskini paylaşır.                                                                                                                                                   | JWT rotasyonu için gereken hazırlık tamamlandıktan sonra                                                                                                         |

**Şart A:** v1.1.2 kapsamındaki şifre belirleme/sıfırlama akışı production'da çalışır durumda olmalı **ve** her iki ekip üyesinin de e-posta/şifre ile giriş yapabildiği doğrulanmış olmalıdır.

**Şart A durumu (2026-08-24):** Hâlâ yarısı. Şifre sıfırlama akışı production'da uçtan uca çalıştı ve kurucu yönetici kendi şifresiyle giriş yaptı. **İkinci ekip üyesinin (Arda Bülent) hâlâ hesabı yoktur** — `auth.users` tablosunda 2026-08-24 itibarıyla tek kayıt vardır. `Require current password` testi iki hesap gerektirdiği için beklemeye devam ediyor.

> Yukarıdaki tablonun "Ortak gerekçe" paragrafı, kurucu yöneticinin girişinin çalışmadığı döneme aittir. **Sonradan düzeltme (2026-08-24):** o sorun çözüldü; şifre belirleme ve sıfırlama ekranları production'da mevcut ve çalışıyor. Ayarların kapalı kalma sebebi artık "giriş kırık" değil, **ikinci hesabın bulunmaması**.

### 3.7'ye ek — platform operatörleri (2026-08-24)

| Bilgi                 | Değer                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aktif operatör sayısı | **2** — Hamza Bayrak (`owner`) ve Arda Bülent (`owner`), ikisi de 2026-08-24'te eklendi                                                                                                               |
| Nasıl eklendi         | Supabase `service_role` ile elle `insert`. Panelde operatör ekleme yolu **yoktur** ve olmayacaktır; ilk kayıt için operatör ekleyecek operatör bulunmadığından bu bir defalık istisnadır (Issue #43). |
| Denetim kaydı         | `platform_audit_events` id=1, `platform.operator_added`. `actor_user_id` **NULL** — işlemi yapan bir oturum yoktu; gerçeği `metadata.method = manual_service_role` alanı taşıyor.                     |
| Bekleyen              | Yok. Kurucu ekibin ikisi de operatör; sonraki eklemeler yine `service_role` ile ve denetim kaydıyla yapılır                                                                                           |

Şart sağlandığında bu bölüm güncellenir ve ayarlar bölüm 3'e taşınır.

---

## 5. Kabul edilmiş açıklar

Bilinen, kapatılmayan ve **bilinçli olarak kabul edilen** durumlar. Her denetimde yeniden tartışılmasın diye kayıtlıdır.

| Açık                                                       | Neden kapatılmıyor                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Yeniden değerlendirme tetikleyicisi                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sızmış şifre koruması kapalı                               | Supabase Pro plan gerektiriyor; sıfır bütçe hedefiyle çelişiyor. Supabase advisor bunu kalıcı olarak WARN'lar.                                                                                                                                                                                                                                                                                                                                                         | Pro plana geçiş                                                                                                                                              |
| `current_user_has_membership` `authenticated` rolüne açık  | RLS policy'lerinin tamamı bu fonksiyonu çağırıyor; yetki kaldırılırsa tenant okuma akışı kırılır. Fonksiyon içeride `auth.uid()` kullandığı için çağıran yalnızca kendi üyeliğini sorgulayabilir. Advisor bunu kalıcı olarak WARN'lar.                                                                                                                                                                                                                                 | — (tasarım gereği)                                                                                                                                           |
| `workspace_documents` RLS açık, policy yok                 | "Belgeler" özelliği production'da işlevsiz. Güvenli ama bozuk. Tablo yetkileri de kaldırıldığı için çift korumalı.                                                                                                                                                                                                                                                                                                                                                     | Özelliğin yeniden ele alınması (v1.6)                                                                                                                        |
| Preview adresleri Vercel SSO arkasında                     | Bir açık değil, mevcut durumun kaydıdır. Önceki denetimde "preview koruması kapalı, adresi bilen herkes demo şifresiyle girebilir" değerlendirmesi yapılmıştı; bu **yanlıştı**. 2026-08-23'te doğrulandı: preview adresleri `302` ile Vercel SSO'ya yönlendiriyor. Demo şifresiyle dışarıdan erişim riski yok. Bedeli, preview'ı incelemek için o Vercel takımına ait bir oturum gerekmesi.                                                                            | Ekip dışı bir gözden geçirene preview göstermek gerekirse                                                                                                    |
| `main` branch protection'ın bypass'ı yok, Arda Admin değil | Her merge için ikinci kişi gerekiyor. Şu an bir güvenlik özelliği olarak değerlendiriliyor.                                                                                                                                                                                                                                                                                                                                                                            | Ekip üyelerinden biri uzun süre erişilemez olursa                                                                                                            |
| Auth, RLS ve platform paneli preview'da doğrulanamıyor     | Preview derlemeleri demo modunda çalışıyor (bkz. bölüm 3.5); Supabase'e hiç istek gitmediği için giriş, yetki ve panel davranışı preview'da denenemiyor. Bunun bedeli somut: **bu tür değişikliklerin tek doğrulama yeri production.** CSP hatası 2026-08-23'te tam olarak preview'da yakalanmıştı; auth tarafında o ağ yok. Bugün kabul ediliyor çünkü demo modu satış sunumunun temeli ve preview'ı gerçek moda almak, preview'ı gerçek veritabanına bağlamak demek. | Panel gerçek kurum verisi yönetmeye başladığında; o noktada ayrı bir Supabase "staging" projesi ve preview'a ona bakan bir ortam değişkeni değerlendirilmeli |

| Auth e-postaları Supabase'in paylaşımlı SMTP'siyle gönderiliyor | Davet, şifre sıfırlama ve e-posta doğrulama mailleri Supabase'in yerleşik servisinden çıkıyor. Supabase bu servisi **production için uygun olmadığını açıkça belirterek** sunuyor: saatlik gönderim limiti çok düşük ve teslimat garantisi yok, spam klasörüne düşmesi olağan. İki kişilik ekip testleri için yeterli. | **Pilot kuruma açılmadan önce.** Kurum yöneticilerine gönderilen davet ve sıfırlama maillerinin ulaşmaması, ilk müşteride öğrenilecek bir hata olmamalı. Seçenekler bölüm 7'de. |
| Oturum zaman aşımı yapılandırılamıyor | Supabase'de `inactivity timeout` ve `time-box` ayarları Pro plan gerektiriyor; ücretsiz katmanda oturumlar süresiz yenilenmeye devam ediyor. Gerçek tehdit modelimiz dershanenin ortak bilgisayarında açık bırakılan tarayıcıdır; buna karşı istemci tarafında hareketsizlik sayacı etkilidir ve bedavadır. Dürüst sınırı: bu gerçek bir güvenlik kontrolü değildir — token'ı ele geçirmiş bir saldırgan istemci kodunu yok sayar. Açık bırakılmış tarayıcıya karşı ise işe yarar. | İstemci tarafı hareketsizlik sayacı v1.3'e alındı; Pro plana geçilirse sunucu tarafı ayar tercih edilmelidir |
| Kişisel veri Frankfurt'ta (eu-central-1) tutuluyor | KVKK'da kişisel verinin yurt dışına aktarılması ayrı bir rejime tabidir; açık rıza, taahhütname veya yeterlilik kararı gerektirir. Bu teknik bir hata değil, **kayda geçmemiş bir karardır**. Bir dershaneye satış yapılırken "verilerim nerede tutuluyor" sorusu kesinlikle gelecektir. Bugün gerçek müşteri verisi bulunmadığı için acil değildir. | **İlk gerçek kurum verisi girmeden önce.** Seçenekler: Supabase'i Türkiye'ye yakın/uygun bir bölgeye taşımak, taahhütname yoluna gitmek, veya aydınlatma metni ve açık rızada açıkça belirtmek. |
| Google Fonts, Google'ın sunucularından yükleniyor | `client/src/index.css:2` fontları `fonts.googleapis.com` üzerinden çekiyor. Bu, siteyi açan **her ziyaretçinin IP adresinin Google'a gitmesi** demektir. GDPR kapsamında Alman mahkemeleri bunu ihlal saymıştı; KVKK GDPR'ı model aldığı ve ürün çocuk verisi işlediği için aynı değerlendirme muhtemeldir. Bugün kapatılmadı çünkü fontları kendi sunucumuzda barındırmak ayrı bir iştir ve CSP düzeltmesiyle karıştırılmamalıdır. | Pilot kuruma açılmadan önce; fontlar `client/public/` altına indirilip `@import` kaldırılmalı, ardından CSP'den `fonts.googleapis.com` ve `fonts.gstatic.com` çıkarılmalı |
| Altı indekssiz foreign key (INFO) | Tablolar şu an boş. İndeks eklemek advisor çıktısını "unindexed FK"den "unused index"e çevirmekten başka işe yaramaz; iki uyarı da bugün eylem gerektirmiyor. | v1.2 iş tabloları ve gerçek veri geldiğinde indeksleme topluca ele alınacak |
| `set_updated_at` `anon`'a açık | SECURITY DEFINER değil ve `trigger` tipi döndürdüğü için trigger bağlamı dışında çağrılamıyor; risk oluşturmuyor. Acil bir güvenlik düzeltmesinde gereksiz yüzey değiştirmemek için Issue #18 kapsamı dışında bırakıldı. | — |

---

## 6. Doğrulama komutları

Envanterin hâlâ geçerli olduğunu sınamak için. `<ANON_KEY>` yerine public publishable anahtar konur.

```bash
URL=https://xyxnyiadidjyalcphhfj.supabase.co
KEY=<PUBLIC_PUBLISHABLE_KEY>

# 1) E-posta saglayicisi ACIK olmali.
#    Beklenen: invalid_credentials
#    Sorunluysa: email_provider_disabled  -> saglayici kapali, kimse giris yapamaz
curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY"   -H "Content-Type: application/json"   -d '{"email":"kontrol@example.com","password":"YanlisSifre123"}'

# 2) Yeni kayit KAPALI olmali.
#    Beklenen: signup_disabled
#    email_provider_disabled donuyorsa saglayici da kapali demektir; 1. komutla ayirt edin.
curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $KEY"   -H "Content-Type: application/json"   -d '{"email":"kontrol@example.com","password":"Xk9mQw2zPl"}'

# 3) Sifre sifirlama CALISMALI. Beklenen: HTTP 200
#    Var olmayan bir adres kullanilir; e-posta gonderilmez ve hesap varligi sizdirilmaz.
curl -s -o /dev/null -w "%{http_code}
" -X POST   "$URL/auth/v1/recover?redirect_to=https%3A%2F%2Forbit-v3-topaz.vercel.app%2Fsifre-belirle"   -H "apikey: $KEY" -H "Content-Type: application/json"   -d '{"email":"bulunmayan-adres-kontrol@example.com"}'

# 4) anon ayricalikli RPC'leri cagiramamali -> 42501
curl -s -X POST "$URL/rest/v1/rpc/internal_bootstrap_organization"   -H "apikey: $KEY" -H "Authorization: Bearer $KEY"   -H "Content-Type: application/json"   -d '{"organization_name":"a","organization_slug":"a","branch_name":"a","admin_user_id":"00000000-0000-0000-0000-000000000000","actor_user_id":"00000000-0000-0000-0000-000000000000"}'

curl -s -X POST "$URL/rest/v1/rpc/current_user_is_platform_operator"   -H "apikey: $KEY" -H "Authorization: Bearer $KEY"   -H "Content-Type: application/json" -d '{}'

# 5) anon hicbir tabloyu okuyamamali -> 42501
for t in organizations branches organization_memberships profiles audit_events          platform_operators platform_audit_events workspace_documents; do
  printf "%-26s " "$t"
  curl -s "$URL/rest/v1/$t?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | head -c 60
  echo
done

# 6) Guvenlik basliklari yerinde olmali
curl -s -D - -o /dev/null https://orbit-v3-topaz.vercel.app/   | grep -iE "content-security-policy|x-frame-options|x-content-type-options|referrer-policy|strict-transport"

# 7) SPA rotalari dogrudan acilabilmeli -> hepsi 200
for p in / /sifre-sifirla /sifre-belirle; do
  printf "%-16s %s
" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://orbit-v3-topaz.vercel.app$p)"
done
```

Ayrıca Supabase security advisor düzenli olarak kontrol edilmelidir. Beklenen kalıcı uyarılar: `workspace_documents` policy yokluğu (INFO), `current_user_has_membership` (WARN), sızmış şifre koruması (WARN). **Bunların dışında bir uyarı çıkarsa incelenmelidir.**

---

## 7. Auth e-posta gönderimi — seçenekler ve kısıtlar

Şu an Supabase'in paylaşımlı SMTP'si kullanılıyor. Aşağıdaki üç yol değerlendirildi; **karar henüz verilmedi**, verildiğinde `DECISION_LOG.md`'ye ADR olarak yazılacaktır.

### A. Kişisel Gmail hesabı (SMTP)

Supabase paneline `smtp.gmail.com:587` ve bir **Gmail Uygulama Şifresi** girilir. Hesap şifresi değil; Uygulama Şifresi ayrı üretilir ve iki adımlı doğrulama açık olmalıdır.

- ✅ Bugün kurulabilir, ek maliyet yok, Gmail'in SPF/DKIM kayıtları teslimatı makul tutar
- ✅ Supabase'in saatlik limiti devreden çıkar; limit artık Gmail'inki olur (günlük birkaç yüz mail)
- ⚠️ **Gönderen adresi kişisel olur.** Dershane yöneticisi "ORBIT şifre sıfırlama" mailini bir şahsın Gmail adresinden alır; kurumsal görünmez ve spam ihtimalini artırır.
- ⚠️ Uygulama Şifresi Supabase ayarlarında saklanır. Sızarsa o hesap adına **mail gönderilebilir** (okunamaz — Uygulama Şifresi yalnızca SMTP kapsamındadır).
- ⚠️ Google, otomatik/toplu gönderimi kendi kullanım şartlarında teşvik etmiyor; hesap kısıtlanabilir.

### B. İşlemsel e-posta sağlayıcısı, alan adı olmadan

Brevo veya Mailjet gibi servisler, alan adı sahibi olmadan **doğrulanmış bir gönderen e-posta adresi** ile gönderime izin verir (ücretsiz katmanlarda günlük birkaç yüz mail).

- ✅ Gerçek işlemsel altyapı: teslimat raporu, bounce yönetimi, DKIM
- ✅ Kişisel Gmail hesabı riske girmez
- ⚠️ Gönderen adresi yine kişisel bir adres olur; kurumsal görünüm sağlamaz

### C. Kendi alan adı + işlemsel sağlayıcı

`orbit.app` benzeri bir alan adı alınır, DNS'e SPF/DKIM kayıtları eklenir, Resend/SendGrid/Brevo üzerinden `destek@...` adresinden gönderilir.

- ✅ Tek profesyonel çözüm; teslimat, güven ve marka açısından doğru olan bu
- ⚠️ Alan adı yıllık ücret gerektirir (sıfır bütçe hedefiyle çelişen tek madde)

### Değerlendirme

A ve B, pilot öncesi geçici çözümlerdir; ikisi de gönderen adresi sorununu çözmez. C, ticarileşme kapısıyla (`ROADMAP.md` v2.0) birlikte ele alınmalıdır.

**Hangisi seçilirse seçilsin, Supabase'in yerleşik SMTP'si ilk gerçek kurum davetinden önce terk edilmelidir.**
