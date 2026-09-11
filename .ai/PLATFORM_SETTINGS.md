# PLATFORM_SETTINGS.md — ORBIT

> Kod dışında, sağlayıcı panellerinden elle yönetilen ayarların kaydı. `supabase/config.toml` production'ı **yönetmez** — bkz. bölüm 1.

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

| Alan                               | Kaynak                 | `config.toml` etkiler mi? | Repo'dan deploy edilir mi?                                        |
| ---------------------------------- | ---------------------- | ------------------------- | ----------------------------------------------------------------- |
| Tablo, fonksiyon, RLS, yetkiler    | `supabase/migrations/` | Yerelde evet              | ✅ `main`e merge ile otomatik                                     |
| Edge Function kodu                 | `supabase/functions/`  | —                         | ⚠️ Yalnızca `config.toml`'da kayıtlı olanlar (aşağıdaki nota bak) |
| Edge Function secret'ları          | Supabase paneli        | ❌                        | ❌ Elle                                                           |
| Auth sağlayıcı ve şifre politikası | Supabase paneli        | ❌                        | ❌ Elle                                                           |
| Site URL ve Redirect URL listesi   | Supabase paneli        | ❌                        | ❌ Elle                                                           |
| Oturum ömrü, rate limit            | Supabase paneli        | ❌                        | ❌ Elle                                                           |
| Uygulama ortam değişkenleri        | Vercel paneli          | ❌                        | ❌ Elle                                                           |
| Deployment koruması, domainler     | Vercel paneli          | ❌                        | ❌ Elle                                                           |
| Repo görünürlüğü, review kuralları | GitHub paneli          | ❌                        | ❌ Elle                                                           |

> ⚠️ **Yeni bir Edge Function eklemek için `supabase/functions/` altına dizin açmak YETMEZ.**
>
> Supabase GitHub entegrasyonu yalnızca `supabase/config.toml` içinde `[functions.<ad>]` bölümü bulunan fonksiyonları deploy eder. Mevcut fonksiyonlar her merge'de güncellenir, ancak kayıtlı olmayan yeni bir dizin **sessizce yok sayılır**.
>
> **Altıncı drift vakası (2026-08-24):** `reset-admin-password` merge edildi, CI yeşil geçti, `bootstrap-organization` v26'ya güncellendi — ve yeni fonksiyon hiç oluşturulmadı. İstemci çağırdığında Supabase genel bir hata döndürdü ve panelde "Kurum oluşturulamadı" yazdı; hata mesajı bile alakasızdı çünkü kod tanınmayan bir koda düşüyordu.
>
> **Kural:** Yeni Edge Function ekleyen PR, aynı commit'te `config.toml`'a da satır ekler. `list_edge_functions` ile merge sonrası doğrulanır.

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

| Öğe                      | Değer                               | Doğrulama                                                    |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------ |
| `bootstrap-organization` | ACTIVE, `verify_jwt = true`         | API (2026-08-23)                                             |
| `reset-admin-password`   | ACTIVE, `verify_jwt = true`         | Issue #61 — `config.toml`'a kaydedildikten sonra deploy oldu |
| `delete-organization`    | ACTIVE, `verify_jwt = true`         | Issue #63                                                    |
| `ALLOWED_ORIGINS` secret | `https://orbit-v3-topaz.vercel.app` | Origin sondası: yalnızca bu origin geçiyor                   |

> **Sonradan düzeltme (2026-08-25):** Bu tablo uzun süre yalnızca `bootstrap-organization`'ı listeledi; diğer iki fonksiyon 2026-08-24'te canlıya çıktı ve tabloya işlenmedi. Yani bu dosya, tam olarak önlemek için var olduğu hatayı kendisi yaptı — bkz. bölüm 1. Issue #77 belge denetiminde yakalandı.
>
> **Bekleyen:** Bölüm 3'ün tamamı en son 2026-08-23'te canlı sistemden doğrulandı. O tarihten sonra Faz E1–E3 girdi, kurum oluşturuldu ve silindi, üç fonksiyon güncellendi. **Yeni bir uçtan uca doğrulama turu gerekiyor**; bölüm 6'daki komutlar bunun içindir.

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
| Ortam değişkenleri                           | Yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (All Environments). İkisi de **elle** eklenmiş (2026-08-21) ve entegrasyon tarafından yönetilmiyor — panelde doğrulandı. `VITE_SUPABASE_ANON_KEY` **2026-09-04'te yeni biçime çekildi** (#151); bkz. bölüm 4               |
| Public production adresi                     | `https://orbit-v3-topaz.vercel.app`                                                                                                                                                                                                                                                 |
| `orbit-v3-orb-i-t.vercel.app`                | Vercel SSO korumalı, auth akışlarında **kullanılmaz**                                                                                                                                                                                                                               |
| Preview deployment koruması                  | **Etkin** — preview adresleri Vercel SSO gerektiriyor (2026-08-23'te doğrulandı, bkz. bölüm 5)                                                                                                                                                                                      |
| Preview derlemeleri **demo modunda** çalışır | `VERCEL_ENV=preview` → `runtime.ts` `isDemoMode = deploymentEnvironment !== "production"`. Preview'da Supabase'e **hiç istek gitmez**; giriş ekranı rol seçtirir, şifre `demo123`, kimlik sahtedir. Sonuç: **auth, RLS ve platform paneli preview'da doğrulanamaz** (bkz. bölüm 5). |
| Güvenlik başlıkları                          | `vercel.json` ile repodan yönetilir — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. HSTS'i Vercel kendisi ekler.                                                                                                                               |
| SPA rewrite                                  | `vercel.json` — **bilinen rotalar tek tek yazılı**, catch-all değil (#146). Catch-all her yola `HTTP 200` döndürüyordu, `/olmayan-sayfa` ve `/robots.txt` dahil. Bedeli: rota listesi `App.tsx` ile ikizlenir; iki tarafta da karşılıklı yorum var                                  |

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

**Advanced Security (2026-09-07'de açıldı — Hamza).** Uzun süre beşi de kapalıydı; bölüm 5'teki 🔴 kayıt buydu ve artık kapandı.

| Özellik                           | Durum      | Nasıl doğrulandı                                                                                                                              |
| --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dependency graph`                | ✅ Açık    | `dependency-graph/sbom` okunuyor — 447 kayıt (npm + 6 GitHub Action)                                                                          |
| `Dependabot alerts`               | ✅ Açık    | `dependabot/alerts` → `200` + boş liste (kapalıyken `403` döner)                                                                              |
| `Dependabot security updates`     | ✅ Açık    | Ekran görüntüsü — uç nokta `admin` istiyor, API'den okunamıyor                                                                                |
| `Grouped security updates`        | ✅ Açık    | Ekran görüntüsü — aynı sebeple API'den okunamıyor                                                                                             |
| `Private vulnerability reporting` | ✅ Açık    | `private-vulnerability-reporting` → `{"enabled":true}`                                                                                        |
| `Secret Protection`               | ✅ Açık    | Ekran görüntüsü                                                                                                                               |
| `Push protection`                 | ✅ Açık    | Ekran görüntüsü — gizli anahtar içeren commit **push anında** durur                                                                           |
| `CodeQL` (advanced setup)         | ✅ Koşuyor | `codeql.yml` (v1.2-20); son üç koşum `success`                                                                                                |
| `Copilot Autofix`                 | ✅ Açık    | Ekran görüntüsü — CodeQL uyarılarına düzeltme **önerir**, PR açmaz                                                                            |
| `Automatic dependency submission` | ⬜ Kapalı  | **Kasıtlı.** Derleme anında çözülen ekosistemler (Gradle/Maven) için; bizde `pnpm-lock.yaml` var ve graph onu zaten okuyor                    |
| `AI findings` (Preview)           | ⬜ Kapalı  | **Zaten çalışamaz** — CodeQL'in _default_ kurulumunu şart koşuyor, bizde _advanced_ var                                                       |
| `Dependabot malware alerts`       | ✅ Açık    | **Hamza açtı (2026-09-07).** API'den okunamıyor — `security_and_analysis` alanı `admin` istiyor ve boş dönüyor; doğrulama Hamza'nın eyleminde |

> ⚠️ **Sayfadaki butonlar durumu değil, tıklayınca olacak eylemi yazar.** `Disable` yazan satır **açık** demektir. Bu okuma hatası bir kez yapıldı; tabloyu güncelleyen kişi butona değil bu sütuna baksın.

---

### 3.7 Dağıtım mimarisi — bugünkü ve hedef

⚠️ **İkisi karıştırılmamalı.** `vps.docx` ve onun etrafındaki tartışma **hedef** mimariyi anlatıyor; aşağıdaki ilk sütun **bugün çalışan** sistemdir.

|                                          | **Bugünkü (çalışıyor)**                        | **Hedef (karara bağlı)**                   |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Frontend                                 | **Vercel** — statik Vite SPA                   | **Hetzner** + Docker + Caddy — yine statik |
| Veritabanı, Auth, RLS, Realtime, Storage | **Supabase Cloud** (Frankfurt, `eu-central-1`) | **Değişmiyor** — Supabase Cloud            |
| Edge Function                            | Supabase (Deno)                                | Değişmiyor                                 |
| Arka plan işçisi                         | **Yok**                                        | Hetzner — bildirim/hatırlatma geldiğinde   |

**Backend sunucumuz yok ve Hetzner'a geçmek bir backend doğurmaz.** Repoda `server/` klasörü, `start` script'i ve hiçbir sunucu çatısı (Express/Fastify/Nest/Koa) yoktur — ölçüldü. Hetzner'ın işi Vercel'in bugün yaptığı işin aynısıdır: statik dosya sunmak.

Backend'i doğuracak olan barındırma değil, **kimse ekranın başında değilken çalışması gereken iş** — yani bildirim ve hatırlatma. Bkz. `ROADMAP.md` §4.7, kontrol noktası **v1.5-01**.

Taşınma kararı ve tetikleyicisi için: `DECISION_LOG.md` — "Sistem taşınabilir kurulur; sağlayıcı bir tercih, bağımlılık değildir".

#### "Kendi sunucumuza geçelim" iki farklı şeydir

⚠️ **Bu ayrım karıştırılırsa karar da yanlış verilir.** İkisinin kod maliyeti arasında dağlar kadar fark var ve fark ölçüldü (2026-09-10).

|                       | Frontend | Veritabanı + Auth                                | **Kod değişikliği** |
| --------------------- | -------- | ------------------------------------------------ | ------------------- |
| **A · Bugün**         | Vercel   | Supabase Cloud                                   | —                   |
| **B · Hedef**         | Hetzner  | Supabase Cloud                                   | **Yok**             |
| **C · Her şey bizde** | Hetzner  | **Hetzner'da self-hosted Supabase** (Docker)     | **Yok**             |
| **D · Supabase'siz**  | Hetzner  | Hetzner'da **düz Postgres + kendi backend'imiz** | **Çok büyük**       |

**C kodu değiştirmiyor.** Supabase açık kaynaktır ve Docker ile kendi sunucumuzda ayağa kalkar: Postgres, GoTrue (Auth), PostgREST, Realtime, Storage, Kong. Uygulamanın gördüğü arayüz **birebir aynıdır**; değişen tek şey `client/src/lib/supabaseClient.ts`'teki adrestir. Zaten CI'da her PR'da bu yığın `supabase start` ile Docker'da ayağa kalkıyor ve pgTAP testleri orada koşuyor — yani self-hosted Supabase'i günde defalarca çalıştırıyoruz.

C'nin bedeli **kod değil sorumluluktur**: yedekleme ve **test edilmiş** geri yükleme, PITR, Postgres/GoTrue/PostgREST yamaları, bağlantı havuzu, izleme ve nöbet. Bkz. `DECISION_LOG` — "Sistem taşınabilir kurulur", "Bedeli — açıkça kabul ediliyor" paragrafı.

**D bir taşınma değil, backend yazma projesidir.** Ölçülen yüzey:

| Supabase parçası   | Bizdeki kullanım (2026-09-10)                                                         | D'de karşılığı                                                                     |
| ------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **PostgREST**      | **46 tablo sorgusu + 9 RPC = 55 çağrı yeri** (test dışı)                              | 55 çağrı yerinin tamamı yeniden yazılır **ve** onları karşılayacak bir API yazılır |
| **GoTrue (Auth)**  | 16 çağrı / 7 metot · **21 migration** `auth` şemasına dokunuyor · 3 admin API çağrısı | Kimlik doğrulama sistemi sıfırdan yazılır                                          |
| **Realtime**       | 1 kanal                                                                               | Kendi WebSocket sunucumuz                                                          |
| **Edge Functions** | 5 fonksiyon, 5 çağrı yeri                                                             | Kendi API sunucumuza taşınır                                                       |
| **Storage**        | **0** — yalnız ölü `documents.ts` (#148)                                              | Kayıp yok                                                                          |

`auth.users` şemanın içine gömülüdür: `students.auth_user_id` ve `guardians.auth_user_id` ona yabancı anahtarla bağlıdır ve öğrenci/veli RLS zincirinin tamamı bu bağa dayanır. **Kimlik sistemini değiştirmek şemanın yarısını ilgilendirir.**

> **Sonuç:** "her şey bizde olsun" isteğinin karşılığı **C**'dir, D değil. D'nin maliyeti ise zamanla **büyür** — çağrı yeri sayısı her CRUD dilimiyle artar (v1.4 on dört dilim getiriyor) ve kesinti bütçesi kurum sayısı arttıkça daralır. C'nin maliyeti ise sabittir: bugün de üç yıl sonra da sıfır kod değişikliği, yalnız kesinti penceresi daralır.
>
> Yani beklemek bizi D'ye mahkûm etmiyor; **C her zaman açık kalıyor.**

#### Taşınma günü kırılacaklar

Bu liste bir plan değil, **bugün ölçülmüş bağımlılıklardır**. Taşınma gündeme geldiğinde tek tek karşılanmalıdır; unutulan her satır sessizce değil, **görünür biçimde** kırar — ama yanlış yerde aranır.

| Ne                                    | Bugünkü değer                                                                                                         | Taşınırsa                                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ALLOWED_ORIGINS` secret              | `https://orbit-v3-topaz.vercel.app` (tek origin)                                                                      | Güncellenmezse **üye ekleme, kurum kurma ve şifre sıfırlama Edge Function'ları CORS'ta durur**                                 |
| `isAllowedOrigin` (`_shared/http.ts`) | Tam eşleşmeli `Set` — **joker yok**                                                                                   | Kurum başına alt alan adı seçilirse desen desteği gerekir. ⛔ Naif `endsWith` kontrolü `kotu-orbit.com.tr` adresini kabul eder |
| Supabase Auth **Site URL**            | `https://orbit-v3-topaz.vercel.app`                                                                                   | Güncellenmezse **şifre sıfırlama ve davet e-postalarındaki bağlantılar eski adrese gider**                                     |
| Auth redirect allowlist               | `*.vercel.app` desenleri                                                                                              | Yeniden yazılmalı                                                                                                              |
| Güvenlik başlıkları                   | `vercel.json` — CSP + 4 başlık                                                                                        | **Caddy yapılandırmasına taşınmalı**; HSTS'i bugün Vercel ekliyor, o da elle gelir                                             |
| SPA rewrite                           | `vercel.json` — **yalnız dört yol** (`sifre-sifirla`, `sifre-belirle`, `platform`, `404`), catch-all **değil** (#146) | Caddy'de birebir aynısı gerekir. ⛔ Alışıldık genel `try_files` yazmak #146'yı geri getirir: her yola `HTTP 200`               |
| Otomatik yayın                        | `main`'e push → Vercel                                                                                                | GitHub Actions + SSH ile kendimiz                                                                                              |
| PR başına preview                     | Vercel otomatik                                                                                                       | Kendimiz kurmalıyız — bkz. bölüm 5, preview açığı                                                                              |
| Migration'ların uygulanması           | GitHub → Supabase entegrasyonu                                                                                        | Supabase Cloud'da kalırsa **değişmez**                                                                                         |

> **Veri yerleşimi bununla çözülmez.** Hetzner'in veri merkezleri Almanya, Finlandiya, ABD ve Singapur'dadır; **Türkiye yoktur.** Frankfurt'tan Falkenstein'a geçmek KVKK açısından yatay bir harekettir. Bkz. bölüm 5, "Kişisel veri Frankfurt'ta".
>
> Yine de bir şey değişir ve bu KVKK envanterini (v1.5-02) ilgilendirir: bugün veriye erişimi olan zincirde **Supabase Inc. (ABD şirketi)** vardır. Self-host edilirse zincirde yalnız donanımı sağlayan Hetzner (Alman şirketi) kalır ve onun veriye erişimi yoktur. Konum değişmez, **veri işleyen zinciri kısalır**.

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

**Anahtar biçimi şartı (2026-09-04): sağlandı.** JWT ve `service_role` rotasyonunun önündeki koşul _"önce Vercel'deki `VITE_SUPABASE_ANON_KEY` yeni format `sb_publishable_` anahtarıyla değiştirilmeli ve deploy doğrulanmalı"\_ idi. Yapıldı (#151):

- Değişken Vercel'de `sb_publishable__JuT64…` ile değiştirildi ve Production yeniden deploy edildi.
- Canlı paket tarandı: yeni anahtar **1 kez var**, eski `eyJhbGciOiJIUzI1NiI` **0 kez** — eski anahtar production'dan tamamen çıktı.
- Gerçek hesapla giriş ve panel erişimi doğrulandı.

**Bu iki rotasyonu artık bloke eden bir şart yok**, ancak ikisi de hâlâ **karar** gerektiriyor: rotasyon açık oturumları düşürür ve `service_role` anahtarını okuyan Edge Function ortamı da yeniden yapılandırılmalıdır. Ayrıca **legacy `anon` anahtarı bilinçli olarak aktif bırakıldı** — geri dönüş yolu olarak. Devre dışı bırakmak ayrı ve geri alınması pahalı bir adımdır.

> **Ayrışma nasıl oluştu (kayda geçiyor, çünkü tekrarlanabilir bir kalıp):** legacy anon JWT proje kurulurken üretildi (`iat` = 2026-08-16), Vercel değişkeni 2026-08-21'de o günkü değerle eklendi ve bir daha dokunulmadı; yerel `.env` sonradan, Supabase panelinin artık yeni biçimi gösterdiği bir dönemde kuruldu. Aynı olgu iki yerde tutuldu, biri güncellendi, ikizi bırakıldı — `AGENT_WORKFLOW.md` **K-06**.

**Şart A:** v1.1.2 kapsamındaki şifre belirleme/sıfırlama akışı production'da çalışır durumda olmalı **ve** her iki ekip üyesinin de e-posta/şifre ile giriş yapabildiği doğrulanmış olmalıdır.

**Şart A durumu (2026-08-25): sağlandı.** Şifre sıfırlama akışı production'da uçtan uca çalıştı, kurucu yönetici kendi şifresiyle giriş yaptı ve ikinci ekip üyesinin (Arda Bülent) hesabı da açıldı — aşağıdaki operatör tablosuna bakın, iki operatör de aktif. İki hesap gerektirdiği için bekleyen `Require current password` testinin önündeki engel kalktı.

> **Sonradan düzeltme (2026-08-25):** Bu satır 2026-08-24'te _"İkinci ekip üyesinin hâlâ hesabı yoktur"_ diyordu ve aynı gün hesap açıldığında güncellenmedi; altı satır aşağıdaki operatör tablosuyla açıkça çelişir hâle geldi. Issue #77 belge denetiminde yakalandı.
>
> **Bu nedenle bölüm 4'teki beş ertelenmiş ayar artık şarta değil, karara bağlıdır.** Açılmadan önce her biri tek tek gözden geçirilmelidir; özellikle JWT secret ve `service_role` rotasyonu açık oturumları düşürür.

> Yukarıdaki tablonun "Ortak gerekçe" paragrafı, kurucu yöneticinin girişinin çalışmadığı döneme aittir. **Sonradan düzeltme (2026-08-24):** o sorun çözüldü; şifre belirleme ve sıfırlama ekranları production'da mevcut ve çalışıyor. Ayarların kapalı kalma sebebi artık "giriş kırık" değil, **ikinci hesabın bulunmaması**.

### Ek envanter — platform operatörleri (2026-08-24)

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

| Açık                                                               | Neden kapatılmıyor                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Yeniden değerlendirme tetikleyicisi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sızmış şifre koruması kapalı                                       | Supabase Pro plan gerektiriyor; sıfır bütçe hedefiyle çelişiyor. Supabase advisor bunu kalıcı olarak WARN'lar.                                                                                                                                                                                                                                                                                                                                                         | Pro plana geçiş                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `current_user_has_membership` `authenticated` rolüne açık          | RLS policy'lerinin tamamı bu fonksiyonu çağırıyor; yetki kaldırılırsa tenant okuma akışı kırılır. Fonksiyon içeride `auth.uid()` kullandığı için çağıran yalnızca kendi üyeliğini sorgulayabilir. Advisor bunu kalıcı olarak WARN'lar.                                                                                                                                                                                                                                 | — (tasarım gereği)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `workspace_documents` RLS açık, policy yok                         | "Belgeler" özelliği production'da işlevsiz. Güvenli ama bozuk. Tablo yetkileri de kaldırıldığı için çift korumalı.                                                                                                                                                                                                                                                                                                                                                     | Özelliğin yeniden ele alınması (v1.6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Preview adresleri Vercel SSO arkasında                             | Bir açık değil, mevcut durumun kaydıdır. Önceki denetimde "preview koruması kapalı, adresi bilen herkes demo şifresiyle girebilir" değerlendirmesi yapılmıştı; bu **yanlıştı**. 2026-08-23'te doğrulandı: preview adresleri `302` ile Vercel SSO'ya yönlendiriyor. Demo şifresiyle dışarıdan erişim riski yok. Bedeli, preview'ı incelemek için o Vercel takımına ait bir oturum gerekmesi.                                                                            | Ekip dışı bir gözden geçirene preview göstermek gerekirse                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `main` merge'ü ikinci kişiye bağlı — **artık kuralın kendisinden** | 2026-09-05'te `required_approving_review_count` **0'dan 1'e** çekildi (Hamza). Kural artık doğrudan bir onay istiyor; dolaylı bir parametreye dayanmıyor. Repoda iki işbirlikçi var ve GitHub kimsenin kendi PR'ını onaylamasına izin vermiyor, dolayısıyla her merge fiilen **diğer kişinin** onayını gerektiriyor.                                                                                                                                                   | **Ekip üyelerinden biri uzun süre erişilemez olursa** — o durumda `DECISION_LOG.md`'deki "Stabilizasyon fazında tek kişilik merge'e sınırlı izin" kaydı gözden geçirilir                                                                                                                                                                                                                                                                                                                                                                                |
| Auth, RLS ve platform paneli preview'da doğrulanamıyor             | Preview derlemeleri demo modunda çalışıyor (bkz. bölüm 3.5); Supabase'e hiç istek gitmediği için giriş, yetki ve panel davranışı preview'da denenemiyor. Bunun bedeli somut: **bu tür değişikliklerin tek doğrulama yeri production.** CSP hatası 2026-08-23'te tam olarak preview'da yakalanmıştı; auth tarafında o ağ yok. Bugün kabul ediliyor çünkü demo modu satış sunumunun temeli ve preview'ı gerçek moda almak, preview'ı gerçek veritabanına bağlamak demek. | ⚠️ **Tetikleyici 2026-09-10'da ateşlendi ve yeniden kuruldu.** v1.4-00 açılışında değerlendirildi: v1.3 boyunca bu açığın ölçülen maliyeti **sıfır** oldu — doğrulama canlı probe (`begin; … rollback;`), pgTAP ve tarayıcıda gerçek oturumla yapılıyor ve üçü de preview'a ihtiyaç duymuyor. **Açık kapatılmadı, doldurulmadı da.** Yeni tetikleyici: **v1.4 kapanışı** — o sürüm ilk kez yazma yolları getiriyor ve geri alınamaz bir hatanın maliyeti okumadakinden farklıdır. Bkz. `DECISION_LOG` — "Preview'da doğrulanamayan yüzeyler açık kalır" |

| Auth e-postaları Supabase'in paylaşımlı SMTP'siyle gönderiliyor | Davet, şifre sıfırlama ve e-posta doğrulama mailleri Supabase'in yerleşik servisinden çıkıyor. Supabase bu servisi **production için uygun olmadığını açıkça belirterek** sunuyor: saatlik gönderim limiti çok düşük ve teslimat garantisi yok, spam klasörüne düşmesi olağan. İki kişilik ekip testleri için yeterli. | **Pilot kuruma açılmadan önce.** Kurum yöneticilerine gönderilen davet ve sıfırlama maillerinin ulaşmaması, ilk müşteride öğrenilecek bir hata olmamalı. Seçenekler bölüm 7'de. |
| Oturum zaman aşımı yapılandırılamıyor | Supabase'de `inactivity timeout` ve `time-box` ayarları Pro plan gerektiriyor; ücretsiz katmanda oturumlar süresiz yenilenmeye devam ediyor. Gerçek tehdit modelimiz dershanenin ortak bilgisayarında açık bırakılan tarayıcıdır; buna karşı istemci tarafında hareketsizlik sayacı etkilidir ve bedavadır. Dürüst sınırı: bu gerçek bir güvenlik kontrolü değildir — token'ı ele geçirmiş bir saldırgan istemci kodunu yok sayar. Açık bırakılmış tarayıcıya karşı ise işe yarar. | **Sayaç yazıldı (#128 · #143), açık daraldı ama kapanmadı.** Ücretsiz karşılığı artık production'da çalışıyor; kalan boşluk sunucu tarafında oturumların hâlâ süresiz yenilenmesidir. Pro plana geçilirse sunucu tarafı ayar tercih edilmelidir |
| Kişisel veri Frankfurt'ta (eu-central-1) tutuluyor | KVKK'da kişisel verinin yurt dışına aktarılması ayrı bir rejime tabidir. Bu teknik bir hata değil, **kayda geçmemiş bir karardır**. Bir dershaneye satış yapılırken "verilerim nerede tutuluyor" sorusu kesinlikle gelecektir ve ürün **çocuk verisi** işlediği için ağırlığı yüksektir. Bugün gerçek müşteri verisi bulunmadığı için acil değildir. | **Şart:** ilk gerçek kurum verisi girmeden önce. **Kontrol noktası:** v1.5 KVKK envanteri açılışı — orada çözülmezse pilot açılamaz. **Sahibi:** Arda. Seçenekler aşağıda. |
| Google Fonts, Google'ın sunucularından yükleniyor | `client/src/index.css:2` fontları `fonts.googleapis.com` üzerinden çekiyor. Bu, siteyi açan **her ziyaretçinin IP adresinin Google'a gitmesi** demektir. GDPR kapsamında Alman mahkemeleri bunu ihlal saymıştı; KVKK GDPR'ı model aldığı ve ürün çocuk verisi işlediği için aynı değerlendirme muhtemeldir. Bugün kapatılmadı çünkü fontları kendi sunucumuzda barındırmak ayrı bir iştir ve CSP düzeltmesiyle karıştırılmamalıdır. | Pilot kuruma açılmadan önce; fontlar `client/public/` altına indirilip `@import` kaldırılmalı, ardından CSP'den `fonts.googleapis.com` ve `fonts.gstatic.com` çıkarılmalı |
| **Advisor 35 "indekssiz foreign key" (INFO) diyor — altısı gerçekti, kapandı** | 2026-09-06'da **karşılaştırılarak** ölçüldü. Advisor, FK'nin sütun listesiyle **birebir başlayan** bir indeks arıyor; v1.2'nin tenant sınırını tutan bileşik FK'lerinin (`(session_id, organization_id)` gibi) hepsini bu yüzden işaretliyor. Oysa o FK'lerin **öncü sütununda zaten indeks var** (`attendance_records_session_idx`, `class_enrollments_class_idx`, …) ve FK denetiminin yaptığı arama için bu fazlasıyla yeterli — bir oturumun otuz kaydı, bir sınıfın otuz öğrencisi vardır. **29'u eklemek gereksiz indeks yaratacaktı:** her yazmada bakım maliyeti taşır ve advisor'da bu kez `unused_index` olarak geri dönerdi. Gerçekten indekssiz olan **altı** arama v1.2-18'de kapandı ve hiçbiri v1.2 iş tablosu değildi — hepsi v1.1 ve platform ekseninden kalmaydı. | **Kapandı (v1.2-18).** Advisor sayaci **35'te kalmaya devam edecek** ve bu beklenen sonuçtur; sayının düşmesi değil, **öncü sütun indeksinin korunması** izlenmeli. Yeni bir bileşik FK eklenirse öncü sütununda indeks olup olmadığı sorulur |
| **16 × `multiple_permissive_policies` (WARN) — taban ölçüsü** | Tasarımın doğrudan sonucu: politikalar **rol başına** ayrı yazılıyor (`_select_admin`, `_select_teacher`, `_select_student`, `_select_guardian`) ve Postgres aynı tablo/rol/işlem üçlüsündeki izin veren politikaların **hepsini her satır için** değerlendiriyor; her biri de bir `security definer` yardımcı çağırıyor (**15 yardımcı, satır başına**). Politikaları tek bir `or` zincirinde birleştirmek uyarıyı kaldırırdı ama her tabloda kimin neyi neden gördüğünü okunamaz hale getirirdi — v1.2 boyunca en çok işe yarayan şey bu ayrımn kendisiydi. **Tablolar bugün boş, dolayısıyla yük testi anlamsız**; bu sayılar gerçek veri geldiğinde karşılaştırılacak **tabandır**, kapatılacak bir açık değil. | **Gerçek veri girdikten sonra ölçülür** (v1.5-01 kabul testi). O gün sorgu planları bakılır; yavaşlık ölçülürse çözüm politika birleştirmek değil, yardımcıları `stable` önbelleğinden daha iyi yararlanacak biçimde yeniden yazmaktır |
| **`khroma@2.1.0` lisans beyan etmiyor** | v1.2-20'nin lisans envanteri ölçtü: üretim bağımlılıkları arasında **bir paketin `package.json`'ında lisans alanı yok** (`pnpm licenses list` çıktısında `Unknown`). Lisanssız bir paket hukuken **en riskli türdür** — lisans yoksa hiç izin verilmemiş demektir. Paket bir renk yardımcısı ve `mermaid` üzerinden dolaylı geliyor. CI kontrolü bunun üzerine **düşmüyor**: bugün kapatmak bütün işi durdurur ve bu bir **karar**, mekanik bir düzeltme değil. Uyarı her CI koşumunda görünür kalıyor. | **v1.5-02** (KVKK ve hukuki hazırlık). Seçenekler: yukarı akışta lisans sorulur, paket değiştirilir, veya bilinçli olarak kabul edilip buraya yazılır |
| ✅ **GitHub gelişmiş güvenlik özellikleri — AÇILDI (2026-09-07)** | **Kapandı.** Beş anahtarın beşi de Hamza tarafından açıldı ve doğru sırayla: `Dependency graph` → `alerts` → `security updates` → `grouped` → `private vulnerability reporting`. Üçü API'den, ikisi ekran görüntüsünden doğrulandı; envanter **bölüm 3.6**'da. Yanında beklenmedik üç kazanç çıktı: `Secret Protection`, `Push protection` ve `CodeQL` de açıkmış. Push protection özellikle değerli — depo public olduğu için "yanlışlıkla anahtar commit'lemek" en pahalı hata sınıfımızdı, artık push **anında** duruyor. **Ölçüm anı önemliydi:** anahtarlar araç zinciri sıfır açığa indikten _sonra_ açıldı, dolayısıyla ilk koşum sessiz geçti ve bundan sonra gelen her uyarı gerçekten yeni sinyal. Ters sırada açılsaydı on altı açık için bir yığın PR dökülürdü — **K-20**'nin Dependabot'ta öğrettiği dersin aynısı. | **Bekleyen yok.** Son eksik olan `Dependabot malware alerts` de aynı gün açıldı. Kapsadığı boşluk gerçekti: normal alerts _"paketinde bilinen açık var"_ der, bu ise _"kullandığın sürüm kötü niyetli çıktı"_ der — npm'de meşru bir paketin ele geçirilip içine zararlı kod konması. Ortada CVE olmadığı için `pnpm audit`'in sıfır demesi o durumda hiçbir şey ifade etmez, dolayısıyla bu ayrı bir sinyal. **Durumu API'den okunamıyor** (`security_and_analysis`, `admin` alanı); bir sonraki denetim bunu ölçmeye çalışıp 404'e takılmasın diye yazıldı — doğrulama yolu ekran görüntüsüdür |
| **Geliştirme araç zincirinde 16 bilinen açık** | 2026-09-07'de `pnpm audit` ile ölçüldü: **üretim bağımlılıklarında sıfır**, geliştirme bağımlılıklarında **16** (1 kritik, 6 yüksek, 8 orta, 1 düşük). Hepsi derleme ve geliştirme sunucusu araçlarında: `vite` dev sunucusunun `server.fs.deny` atlatmaları, `vitest` UI sunucusu (kullanmıyoruz), `rollup`, `esbuild`, `picomatch`, `@babel/core`. **Kullanıcıya giden pakette hiçbiri yok** — maruziyet, `pnpm dev` çalışırken bir geliştirici makinesinden dosya okunabilmesi. Düzeltme haritası ölçüldü: `vite ≥ 7.3.5` hepsini kapatıyor (**7.x içinde minör**), `vitest ≥ 3.2.6` ise **major** ve 163 testi etkiliyor. | ✅ **Kapandı (v1.2-23, 2026-09-07): 16 → 0.** Üç ölçülmüş adımda: `vite 7.1.9 → 7.3.6` (16→8), `pnpm.overrides` ile `rollup ≥ 4.59.0` ve `@babel/core ≥ 7.29.6` (8→6), `vitest 2.1.9 → 3.2.6` (6→0). **Tahminim yanlış çıktı ve kayda geçiyor:** vitest major'ını "163 testi etkiler, ayrı karar" diye ayırmıştım; ölçüldüğünde yerine geçen bir yükseltme oldu — 163/163 test değişmeden geçti, süre 7s → 2.2s. Üretim bağımlılıkları öncesinde de sonrasında da sıfırdı. Bu açıkların **elle arayarak** bulunmuş olması, `Dependabot alerts` anahtarının somut karşılığıydı; anahtar artık açık |
| **`internal_function_calls` kurum silmede temizlenmiyor** | v1.2-17'de eklenen kapı defteri `organization_id` **taşımıyor** — çünkü kavramsal olarak tenant kaydı değil, çağıran başına bir çağrı günlüğü (platform operatörünün çağrısının kurumu yoktur). Sonucu: `internal_delete_organization` onu **görmüyor**, dolayısıyla silinen bir kurumun üyelerine ait satırlar kalıyor ve `outcome` alanında **giriş numarası** taşıyorlar. 2026-09-07'de ölçüldü: tablo **boş** (0 satır), yani bugün somut bir kalıntı yok. Giriş numarası bir kimlik belirteci, kimlik bilgisi değil — şifre asla saklanmıyor. | ✅ **Kapandı (v1.4-00, #261).** İkinci seçenek uygulandı: giriş numarası üç fonksiyonun özetinden de çıkarıldı (`create-member`, `reset-member-password`, `reset-admin-password`), geriye `member_created` / `password_reset` bayrakları kaldı. Temizlik adımı **reddedildi** — kurum taşımayan bir tabloyu silme fonksiyonuna tanıtmak tablonun kavramını bozardı. Kayıp yok: giriş numarası = kurum kodu + `person_code`, ikisi de yöneticiye açık; kalıcı kayıt zaten `audit_events` ve `platform_audit_events`'te ve ikisi de kurumla birlikte gidiyor. **Yerel yığında gerçek zincirle ölçüldü:** çağrıdan sonra defterdeki satır `{"member_created": true}`. Kural artık kapı: `supabase/tests/deployment/functionCallLedger.test.ts` her Edge Function'ın özet argümanını okuyup kimlik belirteci arıyor (**K-19** — yorum kapı değildir) |
| **eslint-plugin-react-hooks v7'nin bulduğu on sinyal** | Yükseltme (#196) denendi ve `quality-gate`'i kırdı. Sebep yapılandırma değil: v7 **üç yeni kural** getiriyor ve mevcut kod on yerde ihlal ediyor — `set-state-in-effect` (8), `refs` (1), `purity` (1). İhlaller **hata değil**: kod çalışıyor, kural fazladan render ve türetilebilir state gibi kalıpları işaret ediyor. Ama düzeltmesi satır değil **efekt yeniden yazımı** ve ikisi kimlik katmanında (`AuthProvider`, `useIdleTimeout`). | **Kontrol noktası v1.3-02.** Sebep çift işten kaçınmak: v1.3-01 `educationData.ts`'i gerçek servislere çeviriyor, v1.3-02 yükleme/hata durumlarını ekliyor — yani bu efektlerin çoğu **zaten yeniden yazılacak**. Şimdi düzeltip v1.3'te bir daha dokunmak aynı işi iki kez yapmak olur. #196 o güne kadar **açık bırakılıyor**; efektler yeni kurallara göre yazıldıktan sonra yükseltme tek seferde geçer |
| **CodeQL zorunlu kontrol DEĞİL** | Ruleset'in zorunlu kontrolleri: `quality-gate`, `Yıkıcı Migration Kontrolü`, `Tenant RLS`. CodeQL her push'ta koşuyor ve Security sekmesine yazıyor ama **merge'ü engellemiyor** — sayfadaki "Security alert severity level: High or higher" eşiği de bu yüzden bugün işlevsiz, o eşik ancak CodeQL zorunlu kontrol olursa devreye girer. **Bilinçli:** aracın bugüne kadarki tüm bulgusu iki taneydi ve **ikisi de yanlış alarmdı** (aşağıdaki satır). Zorunlu olsaydı #204'ü gerçek bir sebep olmadan kilitlerdi. Sık sık haksız kilitleyen bir kapı, insanlara kapıyı baypas etmeyi öğretir ve `quality-gate`'in anlamını da aşındırır. | **Yanlış alarm oranı düşünce yeniden konuşulur.** Somut ölçüt: art arda gelen bulguların çoğunluğu gerçek çıkmaya başlarsa. Değişiklik ruleset'te olduğu için **Hamza'da** |
| **İki CodeQL `high` uyarısı — kaynağında kapatıldı** | `js/insecure-randomness`, iki dosyada: `MemberCreateDialog.tsx` ve `SettingsMembersSection.tsx`. `Math.random()` bir `temporaryPassword` alanına akıyordu. **Uyarı doğruydu, sömürülebilir değildi** ve bu ayrım ölçülerek kuruldu: satırlar `demoMode` dalında, üretim derlemesi alındı ve pakette bayrağın `Ob=!1` olarak sabitlendiği, `demoMode:Ob` ile context'e o değerin girdiği görüldü — dal pakette **var ama ulaşılamaz**. (Rollup dalı eleyemiyor çünkü değer React context'inden geçiyor; `__ORBIT_DEMO_MODE__` sabiti yalnızca `runtime.ts`'te katlanıyor.) Yine de "false positive" diye **susturulmadı**, kaynağı silindi: rastgeleliğin hiçbir faydası yoktu — değer ekrana basılıp atılıyor, hiçbir şeyin kimliğini doğrulamıyor. Ortak sabit `DEMO_TEMPORARY_PASSWORD` (**K-06**). Gerçek şifre sunucuda, `crypto.getRandomValues` ile üretiliyor. | **Kapandı (v1.2-24).** Bir sonraki denetim aynı yolu baştan yürümesin diye sabitin başına gerekçe yazıldı. ⚙️ Yan bulgu: pakette `Math.random`'lu 56 karakterlik bir üreteç daha var — **bizim değil**, Supabase auth istemcisinin PKCE yedeği ve yalnız `crypto` hiç yoksa devreye giriyor; CodeQL de onu işaretlememiş |
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

### GitHub güvenlik anahtarları — `admin` olmadan doğrulama (2026-09-07)

Uzun süre "doğrulanamadı" yazıyordu ve sebebi yanlış uç noktaydı. `vulnerability-alerts`
**açıkken de kapalıyken de `404`** döndürür eğer çağıran `admin` değilse; yani hiçbir
şey ayırt etmez. Aşağıdakiler `push` yetkisiyle çalışır ve **durumu gerçekten söyler.**

```bash
R=Hamzabyrk/orbit_v3

# 1) Dependabot alerts ACIK mi?  200 + liste = acik.  403 = kapali.
gh api "repos/$R/dependabot/alerts?state=all&per_page=1"

# 2) Dependency graph ACIK mi?  Paket sayisi donuyorsa acik.
gh api "repos/$R/dependency-graph/sbom" -q '.sbom.packages | length'

# 3) Private vulnerability reporting
gh api "repos/$R/private-vulnerability-reporting"        # {"enabled":true}

# 4) CodeQL bulgulari (Security sekmesindekilerle ayni)
gh api "repos/$R/code-scanning/alerts?state=open" \
  -q '.[] | "\(.rule.security_severity_level) \(.rule.id) \(.most_recent_instance.location.path)"'

# 5) main uzerinde ZORUNLU olan kontroller gercekte hangileri?
gh api "repos/$R/rulesets" -q '.[] | "\(.id) \(.name)"'
gh api "repos/$R/rulesets/<ID>" \
  -q '.rules[] | select(.type=="required_status_checks")
      | .parameters.required_status_checks[].context'

# 6) Kendi yetkimiz (404'lerin sebebini ayirt etmek icin)
gh api "repos/$R" -q '.permissions'
```

> `security updates`, `grouped security updates` ve `secret-scanning/alerts`
> **`admin` gerektirir**; bunlar bu komutlarla ölçülemez, ekran görüntüsüyle
> doğrulanır. Hangi satırın nasıl doğrulandığı **bölüm 3.6** tablosunda yazılı.

### `main` korumasının gerçekte neye dayandığı (2026-09-05'te ölçüldü)

> ✅ **Sonradan düzeltme (2026-09-05): bu bölümün ürettiği sonuç doğruydu, ama açıklaması YANLIŞTI — ve şart bu arada sağlandı.**
>
> **Şart sağlandı.** `required_approving_review_count` **0'dan 1'e** çekildi (Hamza, 2026-09-05 02:43 +03). Koruma artık dolaylı bir parametreye değil doğrudan kuralın kendisine dayanıyor. Aşağıdaki "kırılganlık" maddesi **tarihseldir**; bugün geçerli değil.
>
> **Açıklama yanlıştı.** Aşağıda, iki kişilik merge kuralının `require_extra_approval_for_unattributed_changes` sayesinde işlediği yazıyor. **Ölçüm bunu çürüttü.** PR #171, `Co-Authored-By: Claude` taşıyan commit'lerle, ayar değişiminden **84 saniye sonra** (23:44:54Z; ayar 23:43:30Z) ve **tam bir onayla** merge edildi. Parametre bizim PR'larımıza uygulansaydı gereken onay 1 + 1 = 2 olurdu ve repoda yalnızca iki işbirlikçi olduğu için merge **imkânsız** olurdu. GitHub belgesindeki ifade harfiyen doğruymuş: parametre, **Copilot'ın açtığı** PR'ları kapsıyor; commit'lerinde yapay zekâ ortak-yazarı bulunan PR'ları değil.
>
> **Peki 2026-09-04'te Arda neden merge edemiyordu?** Bilinmiyor ve ölçülmedi. Doğru cevap "şu sebeptendi" değil, **"ölçmedik"**. Üçüncü bir teori üretmek, ilk ikisini üreten hatanın aynısı olurdu. Artık önemi de yok: kural açıkça yazıldığı için sebep ne olursa olsun sonuç garanti.
>
> **Bu bölümün asıl dersi bu satırlarla birlikte tamamlanıyor.** Aynı soruda iki kez yanıldım: önce tek bir alana bakıp "kural yok" dedim, sonra düzeltirken **başka bir tek alana** bakıp yanlış bir mekanizma uydurdum. İkisinin ortak hatası aynı: bir sistemin nasıl davrandığını **davranışını ölçmeden**, yapılandırmasını okuyarak açıklamak. Doğru kanıt, ayarın değeri değil, ayar değiştikten sonra gerçekleşen merge'ün kaç onayla gerçekleştiğiydi.

Bu bölüm bir ayarı tarif etmiyor, bir **kırılganlığı** kayda geçiriyor.

`gh api repos/Hamzabyrk/orbit_v3/rulesets/21804350` çıktısı:

| Parametre                                         | Değer                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `required_approving_review_count`                 | **1** _(2026-09-05'te 0'dan çekildi; 2026-09-07'de yeniden ölçüldü)_ |
| `require_extra_approval_for_unattributed_changes` | **true**                                                             |
| `required_status_checks`                          | `quality-gate`, `Yıkıcı Migration Kontrolü`, `Tenant RLS`            |
| `bypass_actors`                                   | **yok** — kural Hamza'ya da aynen uygulanıyor                        |

Klasik `branches/main/protection` uç noktası **404** döner; bu repoda koruma bir **ruleset**'tir ve o uç nokta ruleset'leri görmez. Koruma yok sanmak buradan doğar.

**Kural neden yine de işliyor:** ikinci parametre, kişiye atfedilmemiş değişiklik içeren PR'larda gereken onay sayısını yapılandırılanın **bir üstüne** çıkarır. 0 + 1 = 1. Commit'lerimiz `Co-Authored-By: Claude Opus 5` satırı taşıdığı için her PR'ımız o sınıfa giriyor. Nitekim son PR'ların hepsinde `reviewDecision: APPROVED` görünüyor — yani bir onay gerçekten aranmış ve alınmış.

⚠️ **Kırılganlık ve sahibi (K-12).** Koruma, commit mesajlarımızın **tesadüfi bir özelliğine** dayanıyor. `Co-Authored-By` satırı bir gün düşerse — attribution ayarı değişir, biri elle commit atar, araç sürümü değişir — ek onay şartı da düşer ve **temel sayı 0 olduğu için tek kişi kendi PR'ını merge edebilir hâle gelir.** Hiçbir hata görünmez; kural sessizce gevşer. Ve bu repoda `main`'e merge, migration'ları **production veritabanına** uygular.

- **Şart:** commit'ler `Co-Authored-By` taşımayı bırakırsa **veya** iki kişilik merge kuralının açıkça garanti edilmesi istenirse.
- **Kontrol noktası:** `required_approving_review_count` **1** yapılır. Bu, kuralı parametreye değil doğrudan kuralın kendisine bağlar. Değişikliği yalnızca repo admini (Hamza) yapabilir; Arda'nın `admin` yetkisi yok.
- **Bedeli — bilinerek yazılıyor:** sayı 1 olduğunda kural **simetrik** hâle gelir. GitHub bir kişinin kendi PR'ını onaylamasına izin vermediği için, iki kişilik ekipte bu "biri yoksa hiçbir şey merge edilemez" demektir. Bugün Arda için zaten böyle; değişecek olan, **Hamza'nın da kendi PR'ını tek başına merge edememesi.** Karşılığı `DECISION_LOG.md` — "Stabilizasyon fazında tek kişilik merge'e sınırlı izin" kaydıyla birlikte değerlendirilmeli.

**Neden bu satır yazıldı:** 2026-09-04'te `required_approving_review_count: 0` görülüp "iki kişi kuralı fiilen yok" sonucuna varıldı ve bu **yanlıştı** — kural işliyordu, sadece başka bir parametreden. Tek bir alana bakıp bitmiş saymanın maliyeti buydu. Doğru sonuç ölçümle değil, kuralı günlük olarak yaşayan kişinin itirazıyla ortaya çıktı.

### Onay tazeliği — iki ayar kapalı (2026-09-07'de ölçüldü)

`gh api repos/Hamzabyrk/orbit_v3/rulesets/21804350` çıktısından, yukarıdaki tablonun sormadığı iki parametre:

| Parametre                              | Değer     | Ne demek                                                 |
| -------------------------------------- | --------- | -------------------------------------------------------- |
| `dismiss_stale_reviews_on_push`        | **false** | Onay alındıktan sonra atılan commit'ler onayı düşürmüyor |
| `require_last_push_approval`           | **false** | Son push'un ayrıca onaylanması gerekmiyor                |
| `strict_required_status_checks_policy` | **false** | PR, merge'den önce `main` ile güncel olmak zorunda değil |

**Pratikte:** küçük bir değişiklik için onay alınır, sonra aynı PR'a başka commit'ler eklenir ve **eski onayla** merge edilir. Kimse kural ihlal etmez; kural bunu zaten kabul ediyor.

Bu repoda ağırlığı normalden fazla, çünkü `main`'e merge yalnızca kod yayımlamıyor: Supabase entegrasyonu **migration'ları production veritabanına uyguluyor.** Onaylanan diff ile uygulanan diff aynı olmak zorunda değil.

- **Şart:** iki kişilik gözden geçirmenin _onaylanan şeyi_ garanti etmesi istenirse.
- **Kontrol noktası:** `dismiss_stale_reviews_on_push` ve `require_last_push_approval` **true** yapılır. Yalnızca repo admini (Hamza) yapabilir.
- **Bedeli — bilinerek yazılıyor:** onay sonrası her düzeltme yeni bir onay turu demek. İki kişilik ekipte bu gecikme üretir; küçük bir yazım düzeltmesi bile karşı tarafı bekletir. Bugünkü hız ile teslim kapısının (`ROADMAP.md` §6) verdiği söz arasında bir tercih; şimdilik **hız seçilmiş durumda ve bu kayıt onu bilinçli hale getiriyor** (**K-12**).
- **`strict_required_status_checks_policy` ayrı değerlendirilir:** açılması her PR'ı merge öncesi rebase'e zorlar ve Dependabot PR'larında bu sürekli yeniden koşum demektir. Bugünkü akışta bedeli faydasından büyük görünüyor; ölçülmedi.

Kaynak: 2026-09-07 otomasyon turu, `ROADMAP.md` §4.9.

### Yurt dışına aktarım — bugünkü mekanizmalar (2026-09-04'te güncellendi)

Yukarıdaki tablodaki "açık rıza, taahhütname veya yeterlilik kararı" ifadesi **eksiktir**: 6698 sayılı Kanun'un 9. maddesi 12.03.2024'te değişti ve **01.06.2024'te yürürlüğe girdi**. Rejim GDPR'a yaklaştı; artık dört yol var:

| Yol                        | Ne gerekiyor                                                                   | Bize uygunluğu                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Yeterlilik kararı          | Kurul ilgili ülke/sektör için karar vermiş olmalı                              | Bugün pratikte dayanılabilir bir karar yok                                                           |
| **Standart sözleşme**      | Kurul'un yayımladığı şablon imzalanır, **5 iş günü içinde** Kurul'a bildirilir | **En uygulanabilir yol** — Kurul izni beklenmez. Bize uyan model: _Veri Sorumlusundan Veri İşleyene_ |
| Bağlayıcı şirket kuralları | Şirketler topluluğu için, Kurul onaylı                                         | İki kişilik ekibe uygun değil                                                                        |
| Taahhütname                | Kurul **izni** gerekiyor                                                       | Uzun sürer                                                                                           |

**Doğrulanmamış varsayım — pilot öncesi test edilmeli:** Supabase'in (veya taşınırsak Hetzner'in) Kurul'un Türkçe standart sözleşme şablonunu imzalayıp imzalamayacağı **bilinmiyor**. İkisi de yabancı sağlayıcı; kendi DPA'ları var ama KVKK şablonu ayrı bir belgedir. Bu, avukatla değil **sağlayıcıyla** çözülecek bir sorudur ve cevabı hayır ise geriye Türkiye'de barındırma kalır.

**Hetzner bu satırı çözmez.** Hetzner'in veri merkezleri Nürnberg ve Falkenstein (Almanya), Helsinki (Finlandiya), Ashburn ve Hillsboro (ABD) ve Singapur'dadır; **Türkiye yoktur.** Frankfurt'tan Falkenstein'a geçmek hukuken yatay bir harekettir. Taşınabilirlik ile veri yerleşimi **iki ayrı konudur** ve birbirinin yerine geçmez; bkz. `DECISION_LOG.md` — "Sistem taşınabilir kurulur; sağlayıcı bir tercih, bağımlılık değildir".

**Hukuki metinlerin kendisi bu belgeye kopyalanmıyor** (K-06): kaynak Kurul'un yayınıdır ve mevzuat değişir. Buradaki tablo yalnızca hangi yolun bize uyduğunu söyler.

Ayrıca Supabase security advisor düzenli olarak kontrol edilmelidir. **2026-09-04'te ölçülen taban: 8 uyarı**, hepsi beklenen:

| Uyarı                                | Seviye | Neden kalıcı                                                                                                                   |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `workspace_documents` policy yokluğu | INFO   | Özellik ölü; tablo yetkisi de yok, çift korumalı (#148 → v1.6-01)                                                              |
| `current_user_administers_person`    | WARN   | Aşağıdaki altı satırın hepsi aynı lint: `0029`, "`authenticated` bu `SECURITY DEFINER` fonksiyonu çağırabiliyor"               |
| `current_user_has_membership`        | WARN   | RLS politikalarının tamamı çağırıyor; içeride `auth.uid()` kullandığı için çağıran yalnızca kendi üyeliğini sorgulayabilir     |
| `current_user_has_recovery_channel`  | WARN   | Yalnızca çağıranın kendi durumunu döndürür                                                                                     |
| `current_user_is_platform_operator`  | WARN   | Yalnızca çağıranın kendi durumunu döndürür                                                                                     |
| `current_user_must_change_password`  | WARN   | Yalnızca çağıranın kendi durumunu döndürür; okunamadığında `true` döner (fail-closed)                                          |
| `platform_organization_stats`        | WARN   | Operatör olmayan çağırana veri değil `null` döner                                                                              |
| `current_user_teaches_class`         | WARN   | v1.2-02'de eklendi. Yalnızca çağıranın kendi kapsamını döndürür: "ben bu sınıfa giriyor muyum"                                 |
| `current_user_attends_class`         | WARN   | v1.2-02'de eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_teaches_student`       | WARN   | v1.2-02'de eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_guards_student`        | WARN   | v1.2-03'te eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_guards_class`          | WARN   | v1.2-03'te eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_owns_student_record`   | WARN   | v1.2-04'te eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_can_record_attendance` | WARN   | v1.2-04'te eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `exam_ranking`                       | WARN   | v1.2-05'te eklendi. Yetkiyi içeride çözer; yetkisiz çağırana boş küme, yetkisiz satırlarda maskelenmiş kimlik döner            |
| `current_user_can_see_payment_plan`  | WARN   | v1.2-06'da eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                |
| `current_user_owns_membership`       | WARN   | v1.2-09'da eklendi. Kişisel kayıtların sahiplik kapısı; yalnızca çağıranın kendi kapsamını döndürür                            |
| `current_user_teaches_guardian`      | WARN   | v1.3'te eklendi. Yalnızca çağıranın kendi kapsamını döndürür                                                                   |
| `class_staff_names`                  | WARN   | v1.3'te eklendi. Yetkiyi içeride çözer; kapsamı olmayan çağırana boş küme döner                                                |
| `exam_participant_count`             | WARN   | v1.3'te eklendi. Sınavın kendi sayısını döndürür, okuyanın gördüğü satırların değil                                            |
| `link_student_account`               | WARN   | v1.4-00'da eklendi (#261). Çağıranın kurum/şube yöneticisi olduğunu içeride sınar; değilse `42501`                             |
| `unlink_student_account`             | WARN   | v1.4-00'da eklendi (#261). Aynı kapı                                                                                           |
| `link_guardian_account`              | WARN   | v1.4-00'da eklendi (#261). Aynı kapı                                                                                           |
| `unlink_guardian_account`            | WARN   | v1.4-00'da eklendi (#261). Aynı kapı                                                                                           |
| `record_attendance`                  | WARN   | v1.4-03'te eklendi (#268). Yetkiyi içeride sorar (`current_user_can_record_attendance` + şifre kilidi); değilse `42501`        |
| `record_exam_results`                | WARN   | v1.4-04'te eklendi (#270). Yetkiyi içeride sorar (kurum yöneticisi **veya** sınavın sınıfını okutan öğretmen); değilse `42501` |
| Sızmış şifre koruması kapalı         | WARN   | Pro plan gerektiriyor                                                                                                          |

**Bu listenin dışında bir uyarı çıkarsa incelenmelidir.**

> ⚠️ **Taban 2026-09-10'da yeniden ölçüldü ve belgedeki sayı sapmıştı: 19 değil 22.** Dağılım — **19** × `0029`, 1 × sızmış şifre koruması, 2 × `rls_enabled_no_policy`. Sapmanın sebebi bulundu: v1.3 üç yeni `SECURITY DEFINER` fonksiyonu `authenticated`'a açtı (`current_user_teaches_guardian`, `class_staff_names`, `exam_participant_count`) ve hiçbiri bu tabloya işlenmedi. Aşağıdaki "ders" tam olarak bunu söylüyordu ve **ikinci kez** atlandı; üçü de yukarıdaki tabloya eklendi.
>
> ✅ **Merge sonrası ölçüldü (2026-09-11, PR #269): 27 — tahminin aynısı, ikinci kez.** Dağılım: **24** × `0029` + 1 × sızmış şifre + 2 × `rls_enabled_no_policy`. Artan tek satır `record_attendance`; v1.4-02'nin `audit_row_change`'i **çıkmadı** ve bu beklenendi — tetikleyici fonksiyonu, `authenticated`'a `execute` verilmedi. Aynı turda `20260911010000` migration'ının üretimde uygulandığı da doğrulandı.
>
> ✅ **Merge sonrası ölçüldü (2026-09-11, PR #271): 28 — tahminin aynısı, üçüncü kez.** Dağılım: **25** × `0029` + 1 × sızmış şifre + 2 × `rls_enabled_no_policy`. `record_exam_results` listede çıktı; `enforce_exam_score_within_max` **çıkmadı** — `revoke all` tuttu, tıpkı v1.4-00'daki `membership_may_be_linked` gibi. Üç kez üst üste tutan bir tahmin, bu sayının artık kör bir sayaç değil **bileşimi bilinen bir taban** olduğunu söylüyor.
>
> ⛔ **Aşağıdaki tahmin gerçekleşti; kayıt geçmiş olarak bırakıldı (K-11).**
>
> 📌 **v1.4-04 için tahmin: 28.** `record_exam_results` `authenticated`'a açık ve listede **çıkmalı** (yetki kontrolü fonksiyonun içinde, `42501` ile); `enforce_exam_score_within_max` **çıkmamalı** — `revoke all` uygulandı ve tetikleyici fonksiyonu. **Bu bir tahmindir, ölçüm değil** (**K-03**). Sahibi: denetleyen. Kontrol noktası: **#270 merge edildikten sonra** (**K-12**).
>
> ✅ **Merge sonrası ölçüldü (2026-09-10, PR #262): 26 — tahminin aynısı.** Dağılım: **23** × `0029` + 1 × sızmış şifre + 2 × `rls_enabled_no_policy`. Dört yeni fonksiyon (`link_/unlink_student_account`, `link_/unlink_guardian_account`) listede çıktı ve bu bilinçli — yetki kontrolü fonksiyonun içinde, `42501` ile. Beşincisi `membership_may_be_linked` **çıkmadı**: `revoke all` tuttu. Tahminin doğrulanması ayrıca şunu söylüyor: bu sayı artık kör bir sayaç değil, bileşimi bilinen bir taban.
>
> 📌 **v1.4-05 için tahmin: değişmez.** Dilim yeni bir `SECURITY DEFINER` fonksiyon açmıyor; `homework_assignments`'a yalnız denetim ve yayın tetikleyicileri takıyor. Tetikleyici fonksiyonları (`audit_row_change`, `broadcast_organization_change`) `authenticated`'a açık değil ve zaten listede yoklar. **Tahmindir, ölçüm değil** (**K-03**). Sahibi: denetleyen. Kontrol noktası: **#273 merge edildikten sonra** (**K-12**).
>
> ✅ **Önceki taban 2026-09-07'de ölçülmüştü: 19.** Dağılım — 16 × `0029` (yukarıdaki `SECURITY DEFINER` listesi), 1 × sızmış şifre koruması (Pro plan, §5'te kabul edilmiş), 2 × `rls_enabled_no_policy`.
>
> Sayı v1.2 boyunca **18** idi ve v1.2-17'de **19** oldu. Artan şey `internal_function_calls`: RLS açık, politika **yok** — ve bu bilinçli. O tabloyu yalnızca `service_role` okuyup yazıyor; RLS açık + politika yok = `authenticated` ve `anon` için kapalı. İkinci `rls_enabled_no_policy` öteden beri `workspace_documents` (§5'te kabul edilmiş ölü tablo).
>
> ⚠️ **Ders:** v1.2-17 tabanı bir artırdı ve kayıt güncellenmedi; fark v1.2-22 kapanış denetiminde yakalandı. `SECURITY DEFINER` bir fonksiyon veya politikasız bir tablo ekleyen dilim, bu sayıyı da günceller.
>
> ✅ **17 sayısı doğrulandı (2026-09-05, v1.2-06/07/08 merge edildikten sonra).** `current_user_can_see_payment_plan` listede çıktı; v1.2-07 ve v1.2-08 yeni `authenticated` fonksiyonu eklemedi, beklendiği gibi. Ayrıca ölçüldü: `authenticated`'a açık **sıfır** trigger fonksiyonu var — `set_attendance_recorder` ve `set_homework_assigner` üzerindeki revoke'lar tutuyor.
>
> ✅ **16 sayısı da doğrulanmıştı (v1.2-05 merge edildikten sonra).**
>
> ✅ **15 sayısı da doğrulanmıştı (v1.2-04 merge edildikten sonra).** İki yeni yoklama yardımcısı listede çıktı; `set_attendance_recorder` **çıkmadı** — trigger fonksiyonu olduğu için `authenticated`'a hiç açılmamıştı ve revoke'un tuttuğunu bu doğruluyor. **v1.2-05 ile beklenen sayı 16** (`exam_ranking`) — **henüz doğrulanmadı**, merge sonrası advisor yeniden çalıştırılmalı.
>
> ✅ **13 sayısı da doğrulanmıştı (v1.2-03 merge edildikten sonra).** İki yeni veli yardımcısı listede çıktı, beklenmeyen uyarı yok. **v1.2-04 ile beklenen sayı 15** (iki yeni yoklama yardımcısı) — **henüz doğrulanmadı**, merge sonrası advisor yeniden çalıştırılmalı.
>
> ✅ **11 sayısı da doğrulanmıştı (v1.2-02 merge edildikten sonra).** Advisor çalıştırıldı; üç yeni yardımcının üçü de listede çıktı ve beklenmeyen tek bir uyarı yok. **v1.2-03 ile beklenen sayı 13** (iki yeni veli yardımcısı) — bu sayı **henüz doğrulanmadı**, merge sonrası advisor yeniden çalıştırılmalı.
>
> ⚠️ **Sayı önce 8'den 11'e çıkmıştı (v1.2-02).** RLS politikalarının çağırdığı her `SECURITY DEFINER` yardımcı bu uyarıyı üretiyor; üç yeni kapsam yardımcısı da üretecek. **Üç satır beklentidir, ölçüm değil** — merge sonrası advisor çalıştırılarak doğrulanmalıdır. Yardımcıların `authenticated`'a açık olması zorunlu: RLS politikası onları çağıranın yetkisiyle değerlendiriyor, yetki kaldırılırsa kapsam çözümü kırılır (`current_user_has_membership` satırındaki gerekçenin aynısı).

**Sonradan düzeltme (2026-09-04):** Bu liste önceden **üç** uyarı sayıyordu ve yanlıştı — advisor sekiz döndürüyordu. Sebep bizim bir değişikliğimiz değil: Supabase'in `0029` lint'i genişledi ve artık `authenticated` tarafından çağrılabilen **her** `SECURITY DEFINER` fonksiyonunu işaretliyor, yalnızca `current_user_has_membership`'i değil. Altısı da tek tek okundu; hepsi tasarım gereği. Eski liste yerinde bırakılmadı çünkü bir envanter değil **kontrol listesiydi**: "listede olmayan uyarı çıkarsa incele" kuralı, listenin eksik olduğu her gün işlemez hâle geliyordu.

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

### Tavsiye (2026-08-26) — henüz karar değil

**Şimdi kurulmasın.** E4'ün maddelerinin çoğu maili beklemiyor ve mailsiz yarısı zaten yapıldı (#95 · #96 · #97 · #98). Sağlayıcı yalnızca **doğrulama ve kurtarma linkinin gönderimi** için gerekli.

Vakti geldiğinde **B (Brevo/Mailjet, alan adsız)**, A'ya (kişisel Gmail) tercih edilmeli. A'nın tek avantajı on dakikalık kurulum; karşılığında Supabase ayarlarına kişisel bir Gmail uygulama şifresi konur ve sızarsa **o kişi adına mail gönderilebilir**. B ücretsiz katmanda bounce yönetimi ve DKIM veriyor, kişisel hesabı riske atmıyor.

**Ama asıl mesele gönderen adresi ve bu, şifre sıfırlama maili için sıradan bir marka sorunu değil.** Dershane yöneticisi "şifrenizi sıfırlayın" bağlantısını kişisel bir Gmail adresinden alırsa, ona **oltalama e-postasına güvenmeyi öğretmiş oluruz**. Pilot gerçekleştiğinde C'ye (kendi alan adı) geçilmesinin asıl gerekçesi budur; marka görünümü ikincildir.
