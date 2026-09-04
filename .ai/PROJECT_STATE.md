# PROJECT_STATE.md — ORBIT

> Ürün tanımı, roller, teknoloji yığını ve klasör yapısı burada yaşar. Giriş noktası ve hangi soru için hangi dosyanın okunacağı: kökteki `AGENTS.md`.
>
> **Durum:** ONAYLI MVP MİMARİSİ (Keşif Mülakatı Tamamlandı).

---

## 1. Ürün Tanımı & MVP Kapsamı

**ORBIT** — Devlet kısıtlılıkları gerektirmeyen özel eğitim kurumları (LGS/YKS kurs merkezleri, butik etüt merkezleri, özel dil kursları) için tasarlanmış; müşteri görüşmeleri ve saha doğrulaması için optimize edilmiş yalın CRM, sınıf ve öğrenci yönetim platformu.

### 🎯 MVP (Faz 1) Kapsamı:

1. **Sınıf & Grup Yönetimi:** Sınıf adı, program türü, mentor öğretmen, öğrenci kapasitesi ve derslik organizasyonu.
2. **Öğrenci Yönetimi:** Ad-Soyad, Öğrenci No, Sınıf, Telefon, Veli Adı, Veli Telefonu.
3. **Müşteri Doğrulama Odaklı Rol Arayüzü:** Auth bariyeri olmadan 4 farklı rol (Admin, Öğretmen, Öğrenci, Veli) arasında tek tıkla geçiş yapılabilen, saha testine ve demo sunumlarına uygun arayüz.
4. **İzole Mock Veri Katmanı:** Müşteriye sunum yaparken kurumun dolu gözükmesini sağlayan, `isMock: true` olarak bayraklanmış ve istendiğinde tek tıkla sıfırlanabilen gerçekçi örnek veriler.

### 🚫 Faz 1 Kapsam Dışı (Non-Goals):

- Karmaşık Auth / Şifreleme (Müşteri görüşmeleri aşamasında gereksiz sürtünmeyi önlemek için)
- n8n / Zapier webhook entegrasyonları
- Otomatik SMS / WhatsApp / E-posta gönderim API'leri
- Online ödeme ağ geçitleri (Iyzico, Stripe vb.)

---

## 2. Ekip Dinamiği & Geliştirme Kültürü

- **Ekip:** 2 Kişi (Arda & Hamza) — Uçtan uca Full-Stack / Vibe Coding.
- **Kullanılan YZ Araçları:** Claude Code, Codex, Antigravity.
- **Hedef Takvim:** Birkaç gün içinde Vercel üzerinde yayına çıkacak MVP.
- **Bütçe:** 0₺ (Tamamen ücretsiz katmanlar).
- **Çalışma Prensibi:** Tek doğruluk kaynağı (`.ai/`), atomik commit'ler, branch bazlı PR ve karşılıklı onay süreci. Kurallar: `CONTRIBUTING.md` ve `AGENTS.md`.
- **Karar Alma İlkesi (Graph-First):** Herhangi bir kod yazılmadan önce problem 6 Boyutlu Graf Haritası (Teknik Tipler/State/DB, Ticari Bütçe, Hata/Fallback, KVKK/Gizlilik, Pik Yük/Darboğaz, Güvenlik) olarak analiz edilir; risk varsa proaktif itiraz (pushback) yapılır.

---

## 3. Kullanıcı Rolleri & Erişim Modeli (RBAC)

1. **Kurum Yöneticisi (admin):** Kurum genel görünümü, tüm sınıflar, tüm öğrenciler, yoklama ve operasyon ayarları.
2. **Öğretmen (teacher):** Kendi sınıfları, ders programı, yoklama alma, öğrenci listeleri.
3. **Öğrenci (student):** Kendi sınıfı, kişisel ders programı, sınav ve ödev görünümü.
4. **Veli (parent):** Bağlı öğrencinin devam durumu, ders programı ve kurum duyuruları.

---

## 4. Teknoloji Yığını (Stack)

- **Frontend:** Vite 7.1 + React 19.2 + TypeScript 5.9
- **Yönlendirme:** `wouter` (pnpm patch: `patches/wouter@3.7.1.patch`)
- **UI & Stil:** Radix UI + Tailwind CSS v4 + shadcn/ui (`components.json`) + Lucide Icons + Sonner Toast
- **Form / Doğrulama:** `react-hook-form` + `zod`
- **Sunucu State:** `@tanstack/react-query` v5
- **Veri Saklama:** React State + Yerel Kalıcılık (Local Persistence) & bağlı Supabase projesi (Faz 1'de deny-by-default RLS; gerçek veri kullanımı Faz 3'te)
- **Test:** Vitest 2.1 (RBAC yetki testleri)
- **Kod Kalitesi:** ESLint 9 (flat config) + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh
- **CI/CD & Dağıtım:** GitHub Actions + Vercel (`https://orbit-v3-topaz.vercel.app`)
- **Paket Yöneticisi:** pnpm (v10.4.1)

---

## 5. Klasör Yapısı

```
client/src/
├── components/
│   ├── ui/                 # 53 adet Radix/shadcn UI bileşeni
│   ├── education/          # ORBIT Eğitim Çekirdek Ekranları (rol/sayfa bazlı bölünmüş)
│   │   ├── types.ts          # Student/ClassGroup/ScheduleItem/Automation/PaymentRow (isMock: true)
│   │   ├── mockData.ts       # Tüm mock veri + roleMeta/roleEmail/allNav
│   │   ├── shared.tsx        # Badge, StatCard, PageHeader vb. paylaşılan UI parçaları
│   │   ├── LoginScreen.tsx   # EducationLoginScreen
│   │   ├── StudentDetail.tsx # Öğrenci profil çekmecesi
│   │   ├── EducationPlatform.tsx # Kompozisyon kökü (state + localStorage demo kalıcılığı)
│   │   ├── dashboards/       # AdminDashboard, TeacherDashboard, StudentDashboard, ParentDashboard
│   │   └── pages/            # StudentsPage, ClassesPage, AttendancePage, ... SettingsPage vb.
│   │                         #   SettingsMembersSection + MemberCreateDialog: üye tablosu ve ekleme
│   ├── credentials/        # Giriş fişi: bir kez göster, yazdır. Operatör ve kurum
│   │                       #   yöneticisi aynı bileşeni kullanır; ikinci kopya yok
│   ├── auth/               # AuthShell + SetPasswordScreen, ForgotPasswordScreen,
│   │                       #   ForcePasswordChangeScreen (ilk giriş kilidi)
│   ├── educationAccess.ts  # Rol bazlı yetki matrisi (RBAC)
│   ├── educationAccess.test.ts # Vitest yetki testleri
│   ├── OrbitMark.tsx       # Logo / Marka bileşeni
│   └── ErrorBoundary.tsx   # React Hata Yakalayıcı
├── auth/                   # Kimlik katmanı — servis modülleri, bileşen değil
│   ├── AuthProvider.tsx    # Oturum, şifre kurtarma ayrıştırması, demo kimliği
│   ├── AuthContext.ts / useAuth.ts  # Context tanımı ve tüketici hook'u
│   ├── authService.ts      # loadMembershipIdentity / loadPlatformOperatorIdentity
│   ├── types.ts            # AuthIdentity — üyelik ve platform operatörlüğü iki bağımsız eksen
│   ├── loginIdentifier.ts  # Giriş numarası ↔ sentetik adres; giriş ekranına bağlı (E3)
│   ├── passwordPolicy.ts   # Şifre kuralları, Türkçe harflerle uyumlu
│   ├── idleTimeout.ts / useIdleTimeout.ts  # 30 dk hareketsizlik sayacı
│   └── runtime.ts          # isDemoMode — preview derlemeleri demo modundadır
├── organization/           # Dershane tarafının veri katmanı — kurum yöneticisinin gördüğü
│   └── memberService.ts    # Kurum üyeleri: listeleme, şifre sıfırlama, üye oluşturma, şubeler.
│                           #   Giriş numarası kurulumu ve sıralama saf fonksiyonlarda
├── platform/               # Platform operatörü paneli — dershane ağacından ayrı
│   ├── PlatformShell.tsx   # Kabuk, sekmeler, boş durum
│   ├── tabs.ts             # Sekme tanımları
│   ├── platformService.ts  # Panelin veri katmanı; service_role KULLANMAZ
│   ├── organizationSlug.ts # Kurum adından slug (Türkçe harf çevirisi)
│   ├── PlatformOrganizations.tsx / OrganizationCreateDialog.tsx
│   ├── OrganizationProfileDialog.tsx # Kurum profili ve şifre sıfırlama
│   └── PlatformOperators.tsx / PlatformAuditLog.tsx
├── contexts/               # ThemeProvider
├── hooks/                  # useMobile, useComposition
├── lib/                    # supabaseClient, utils, demoStorage (+ test), documents (ÖLÜ KOD)
└── pages/
    ├── Home.tsx            # Giriş yönlendirici; önce kilit, sonra operatör → /platform
    ├── Platform.tsx        # Platform paneli rotası
    ├── ForgotPassword.tsx  # /sifre-sifirla
    ├── SetPassword.tsx     # /sifre-belirle — Supabase kurtarma bağlantısının hedefi
    └── NotFound.tsx        # 404 sayfası
```

**Bağlayıcı kural — taşınabilirlik:** `components/` ve `pages/` altındaki dosyalar Supabase istemcisini **doğrudan import edemez**; veri erişimi yukarıdaki servis modüllerinden geçer. Kural ESLint ile zorlanır (`eslint.config.js`). Gerekçe: `DECISION_LOG.md` — "Taşınabilirlik sınırı".

**Edge Function'ların ortak katmanı:** `supabase/functions/_shared/` — `http.ts` (origin listesi, CORS, JSON yanıtı), `temporaryPassword.ts` (ömür sabiti ve üretici), `syntheticEmail.ts` (giriş adresi alan adı). Alt çizgiyle başladığı için ayrı bir fonksiyon olarak deploy edilmez. `syntheticEmail.ts`'in istemci tarafında derleyicinin göremediği bir ikizi var: `client/src/auth/loginIdentifier.ts` giriş numarasını bu adresten çözer, dolayısıyla ikisi birlikte değişir.

**`lib/documents.ts` ölü koddur** — hiçbir yerden çağrılmıyor ve dayandığı `workspace_documents` tablosunda hiç policy yok. "Belgeler" özelliği v1.6'da yeniden ele alınana kadar bu şekilde kalır; bkz. `PLATFORM_SETTINGS.md` kabul edilmiş açıklar.

---

## 6. Sıradaki Uygulama Adımları

> **Sonradan düzeltme (2026-08-24):** Bu bölüm v1.0 döneminden kalmıştı ve mock veriye bağlı arayüz işlerini sıralıyordu; o işlerin bir kısmı artık v1.4'e, bir kısmı Faz E5'e ait. Tek doğruluk kaynağı `ROADMAP.md` bölüm 0 (durum tablosu) ve bölüm 4.5 (Faz E) hâline gelmiştir. Aşağıdaki liste oraya işaret eder, kendi sırasını tutmaz.

Güncel sıra **`ROADMAP.md` bölüm 4.5 — Faz E**'dedir:

1. **E0** — Supabase e-posta değişimi spike'ı (kod değil, bulgu teslim edilir).
2. **E1** — Kurum kurma makinesi: `person_code`, `admin.createUser` + geçici şifre, operatörün panele düşmesi.
3. **E2** — Test kurumunun kaldırılması.
4. **E3** — İlk giriş kilidi ve numarayla giriş.
5. **E4** — İletişim bilgisi, e-posta doğrulama ve kurtarma zinciri.
6. **E5** — Mock verinin kaldırılması (eski v1.3'ün tamamı).
7. **E6** — Kurum yöneticisinin kullanıcı ekleme ekranı.
8. **E7** — Uçtan uca doğrulama.

Eski listedeki "sınıf/öğrenci CRUD" ve "yoklama güncellemeleri" maddeleri v1.4'te, `isMock` temizliği E5'te ele alınır.

**Güncelleme (2026-08-29):** Faz E'nin sekiz adımının sekizi de kapandı. Güncel sıra artık `ROADMAP.md` **bölüm 4.6 — Dilimler ve dayandıkları varsayımlar**'dadır. Sıradaki iş **v1.2-01**'dir.

---

## 6.1 Sistem denetimi — 2026-08-29

> Faz E kapanışında, kayıt ile gerçeğin karşılaştırıldığı beş aşamalı bir denetim yapıldı: 82 PR ve 60 issue okundu, canlı şema ve Edge Function'lar envanterlendi, bağlantı matrisi çıkarıldı, güvenlik canlı istekle sınandı, dört rolle production turu koşuldu.
>
> Bu bölüm **o denetimin cevabıdır**: ne inşa edildi, ne eksik, nereden devam edilecek.

### Ne inşa edildi

**Kimlik zinciri uçtan uca çalışıyor.** Platform operatörü kurum açar → varsayılan şube oluşur → kurum yöneticisi giriş numarası ve geçici şifreyle açılır → girer, şifresini değiştirir → kendi öğretmen/öğrenci/velisini açar → hepsi kendi numarasıyla girer → şifre satırdan sıfırlanabilir → her adım denetim kaydı yazar. **Zincirin hiçbir halkasında elle veritabanı müdahalesi gerekmiyor** ve bu production'da doğrulandı (kurum 1003).

**Güvenlik mimarisi sağlam ve tutarlı.** Canlı sisteme istek atılarak ölçüldü:

| Kontrol                    | Sonuç                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `anon` → 8 tablonun tamamı | `401 / 42501` — yetki düzeyinde red, RLS'e sıra gelmiyor                                      |
| `anon` → RPC               | `current_user_*` 401 · `internal_*` **404, keşfedilemiyor**                                   |
| Kayıt olma (signup)        | `422 signup_disabled`                                                                         |
| Edge Function ×5           | Kimliksiz çağrıda 401                                                                         |
| Güvenlik başlıkları        | Altısı da yerinde (CSP, HSTS 2 yıl + preload, `X-Frame-Options: DENY`, …)                     |
| Sütun yetkileri            | `recovery_email`, `must_change_password`, `password_expires_at` → kullanıcı **okur, yazamaz** |
| Sır taraması               | Depo, git geçmişi ve **canlı paket** temiz                                                    |
| pgTAP                      | 13 dosya, **135 iddia**, beşi kurumlar arası negatif test                                     |
| Depo ↔ production         | 18/18 migration, 5/5 fonksiyon — **sıfır ayrışma**                                            |

**Sızma, ihlal veya yetki yükseltme yolu bulunmadı.** v1.1.1 denetiminde tespit edilen yükseltme yolu iki bacağından da ölü.

**Yazma mimarisi bilinçli ve tek biçimli:** 11 RLS politikasının 10'u SELECT; tek yazma politikası `profiles_update_self`. Diğer bütün yazmalar `service_role` üzerinden Edge Function ve `internal_*` RPC'lerle geçiyor, yetki kararları SQL'de yaşıyor ve pgTAP ile sabitleniyor.

### Ne eksik

**Eğitim alanı bir kabuk.** Ölçüm net:

```
40 eğitim bileşeni      →  3'ü veritabanına ulaşıyor
educationData.ts        →  Supabase import sayısı: 0
İş tabloları            →  students, classes, attendance, exams, payments,
                           student_guardians, homework, schedule → HİÇBİRİ YOK
```

Üretimde eğitim paneli veritabanına **boş dönmüyor — hiç sormuyor.** Her ihraç `isDemoMode ? demo… : boş` kalıbında sabitlenmiş.

**Sonradan düzeltme (2026-09-04):** Yukarıdaki "İş tabloları → HİÇBİRİ YOK" satırı ve aşağıdaki bağlantı matrisinin son satırı, denetim gününün doğru fotoğrafıdır ama **artık güncel değildir.** v1.2-01 `students` ve `guardians` tablolarını ekledi: Öğrenci satırının "Tablo" sütunu ✅, "Yazma" sütunu ✅ oldu; Servis ve Ekran ❌ olarak duruyor — dilimin sınırı bilinçli olarak tablo + RLS + test'ti. Diğer varlıklar (Sınıf, Program, Yoklama, Sınav, Ödev, Ödeme, Mesaj, Gün planı, Otomasyon) satırı olduğu gibi geçerli.

Aynı düzeltme "**Yazma mimarisi bilinçli ve tek biçimli**" paragrafını da kapsıyor: `authenticated` rolü artık iki tabloya yazabiliyor ve toplam politika sayısı 11'den 19'a çıktı. Yetki kararı hâlâ SQL'de yaşıyor — değişen, isteğin oraya hangi yoldan gittiği. Gerekçe: `DECISION_LOG.md` — "İş verisi RLS ile yazılır, kimlik işlemleri Edge Function'da kalır".

**Bağlantı matrisi** — hangi varlığın hangi katmanı var:

| Varlık                                                                                     | Tablo  | Servis | Ekran |    Yazma     |
| ------------------------------------------------------------------------------------------ | :----: | :----: | :---: | :----------: |
| Kurum · Şube · Üyelik · Profil · Operatör · Platform denetimi                              |   ✅   |   ✅   |  ✅   |  ✅ / kısmi  |
| Kurum denetim kaydı                                                                        |   ✅   |   ❌   |  ❌   | ✅ yazılıyor |
| Öğrenci · Sınıf · Program · Yoklama · Sınav · Ödev · Ödeme · Mesaj · Gün planı · Otomasyon |   ❌   |   ❌   |  ✅   |      ❌      |
| Öğretmen–sınıf ataması · Veli–öğrenci bağı                                                 |   ❌   |   ❌   |  ❌   |      ❌      |
| Belge (`workspace_documents`)                                                              | ☠️ ölü | ☠️ ölü |  ❌   |      ❌      |

Son iki satır yalnızca eksik veri değil: **kapsamın kendisi** onlardan gelir. E7.2-B2'de yedi filtrenin üretimde boş küme dönmesinin sebebi budur.

### Yapısal borçlar

Denetimin ortaya çıkardığı, tek bir issue'ya sığmayan üç kalıp:

1. **Koşullu kararların sahibi yok.** PR #81 bunu adıyla tarif etmiş ama mekanizma kurulmamıştı; üç canlı örnek bulundu (KVKK/Frankfurt, SMTP terki, dal koruması). → **K-12**
2. **Kararların zemini sessizce kayıyor.** Hesap geçişi kararı `localStorage` dünyasında yazıldı, E7.2-A zemini değiştirdi, karar bunu bilmiyordu. → **K-11**
3. **Dilimler doğrulanmamış varsayımlarla başlıyor.** `create-member` deploy edilmiş sanılarak arayüz yazıldı; kapsam iki dosyada sanılırken yedi çıktı. → **K-10**

Üçü de `AGENT_WORKFLOW.md`'ye birikimli kural olarak yazıldı; `ROADMAP.md` bölüm 4.6 bunları dilim başına varsayım beyanına bağlar.

### Nereden devam edilecek

**Açık issue'lar:** #118 (kurtarma, sağlayıcı bekliyor) · #144–#151 (denetim bulguları).

**Sıra:** #143 (zaman aşımı yenilemeyle aşılıyor) **2026-08-29'da kapandı** — çalışmayan bir koruma, korumasızlıktan kötüdür. Sıradaki kapı **#150**: dolu kurumun silinmesi engellenmeden `ROADMAP.md` 4.6'daki **v1.2-01** açılmaz.

**Pilot öncesi kapatılması zorunlu, koda bağlı olmayan iki kapı:** KVKK/Frankfurt kararı ve e-posta sağlayıcısı. İkisi de **bugün sahipsiz** ve ikisi de "ilk gerçek kurum" şartına bağlı — yani tetiklenmelerine az kaldı.

---

## 7. v1.1 Auth ve Tenant Temeli (Issue #8)

**Durum: tamamlandı (2026-08-25).** PR #9 merge edildi; migration ve `bootstrap-organization` Edge Function production Supabase'e deploy edildi. İlk tenant Edge Function akışıyla değil, kontrol düzleminden doğrudan RPC ile oluşturulmuştu; onboarding mekanizması uzun süre doğrulanmadan kaldı. Faz E1 mekanizmayı yeniden yazdı ve panel üzerinden kurum kurma production'da çalıştı; E2'de o ilk tenant silindi. Kalan işler v1.1.1, v1.1.2 ve Faz E'ye dağıtıldı (bkz. `ROADMAP.md` §0).

> **Sonradan düzeltme (2026-08-25):** Bu bölüm aynı gün `ROADMAP.md` §0'da v1.1 ✅ yapılırken güncellenmedi ve iki dosya birbiriyle çelişir hâlde kaldı. Codex'in A1 analizinde bulundu (Issue #80, B10). Ders kayda geçti: **durum iki yerde tutuluyorsa biri mutlaka eskir** — bu yüzden tek durum kaynağı `ROADMAP.md` §0'dır ve bu bölüm yalnızca oraya bakar.

> **Sonradan düzeltme (2026-08-24):** Bu paragraf önceden _"kurucu yöneticinin e-posta/şifre girişi çalışmıyor ve UI'da şifre belirleme ekranı yok"_ diyordu. **İkisi de çözüldü:** şifre belirleme/sıfırlama ekranları production'da (`/sifre-sifirla`, `/sifre-belirle`, Issue #25) ve kurucu yönetici kendi şifresiyle giriş yapıyor. Giriş çalışmamasının kök nedeni Auth panelinde e-posta sağlayıcısının kapalı olmasıydı; Issue #29'da bulunup açıldı.
>
> Gate'in o gün kapanmamış olmasının sebebi farklıydı: kurum yöneticisi hesabının **davetle** açılması öngörülüyordu ve `type=invite` istemcide hiç ele alınmıyordu. **Faz E1 bu yolu tamamen kaldırdı ve gate kapandı** — hesaplar artık giriş numarası ve geçici şifreyle açılıyor.

- Kimlik doğrulama production'da Supabase Auth e-posta/şifre oturumuyla çalışır. Rol istemciden alınmaz; aktif `organization_memberships` kaydından çözülür.
- Local geliştirme ve Vercel Preview derlemeleri demo modundadır. Vercel Production derlemesinde rol geçişi gizlenir ve demo şifresi kabul edilmez.
- Tenant çekirdeği `profiles`, `organizations`, `branches`, `organization_memberships` ve `audit_events` tablolarından oluşur.
- Organizasyon yöneticisi org-wide üyelik taşır; aktif ekran bağlamı varsayılan şubeden başlar. Şube sınırlı üyelikler yalnızca kendi şubesini görür.
- İlk kurum, varsayılan şube ve kurum yöneticisi `bootstrap-organization` Edge Function üzerinden hazırlanır. Operatör kontrolü **`platform_operators` tablosuna taşındı** (Issue #37, production'da v17 olarak canlı); `app_metadata.platform_admin` bayrağı artık kullanılmıyor. Aktif bir operatör kaydı bulunduğu için fonksiyon çağrılabilir durumdadır. **Faz E1'de davet yerine `admin.createUser` + geçici şifre kullanacak biçimde değiştirildi**; `inviteUserByEmail` yolu kaldırıldı.
- Tarayıcıya yalnızca anon key verilir. `service_role` yalnızca Supabase Edge Function sunucu ortamında kullanılır.
- RLS istemci yazılarını deny-by-default bırakır; üyeler yalnızca kendi tenant kapsamlarını, adminler ise yetkili audit kapsamını okuyabilir.
- İlk tenant için `orbitdershane` / `orbit123` kararı verildi. İlk denemede `yonetici@orbit.edu.tr` adresi `email_address_invalid` ile reddedildi ve yarım kayıt oluşmadı; ardından kurum kurucu ekip üyesinin hesabıyla kuruldu. Bu kayıt **test verisi** sayılıyordu. **Sonradan düzeltme (2026-08-25):** Faz E2'de silindi; kurum, şubesi, üyeliği ve denetim kayıtları artık yok. Silme sırasında bir tasarım hatası da ortaya çıktı — kurum silmek, o kurumun tek üyesi olan kişinin platform operatörlüğünü de düşürüyordu. Düzeltildi (Issue #63): bir kimlik, başka bir yer onu sahiplenmiyorsa silinir. Bkz. `DECISION_LOG.md`.
- v1.2 iş tabloları ve v1.3 mock temizliği bu dalın bilinçli kapsamı dışındadır.

### Şifre belirleme ve sıfırlama akışı (Issue #25)

- Giriş ekranındaki "Şifremi unuttum" bağlantısı `/sifre-sifirla` adresine gider; oradan Supabase şifre sıfırlama e-postası tetiklenir. Hesabın kayıtlı olup olmadığı sızdırılmaz, her durumda aynı onay mesajı gösterilir.
- E-postadaki bağlantı `/sifre-belirle` adresine döner. Bu değer Supabase Redirect URL listesiyle uyumlu olmalıdır; liste `PLATFORM_SETTINGS.md` bölüm 3.2'de kayıtlıdır.
- **Şifre sıfırlama bağlantısı da geçerli bir Supabase oturumu açar.** Bu nedenle `PASSWORD_RECOVERY` olayı normal girişten ayrıştırılır ve kullanıcı panele alınmaz; aksi halde şifresini hiç belirleyemeden içeri girerdi. Bayrak, şifre belirlenene veya vazgeçilene kadar kalıcıdır.
- Yeni şifre kaydedildikten sonra oturum kapatılır ve kullanıcı yeni şifresiyle giriş yapar. Bu bilinçli bir karardır: akışın amacı şifrenin gerçekten çalıştığını doğrulamaktır.
- Şifre politikası istemcide de doğrulanır (minimum 8 karakter, küçük harf + büyük harf + rakam) ancak kaynak doğruluk sunucudadır. Politika panelden değiştirilirse `client/src/auth/passwordPolicy.ts` ve testleri güncellenmelidir.
- Akış demo modunda (yerel geliştirme ve Vercel Preview) kapalıdır.

---

## 8. Platform Sahipliği ve Production Bağlantıları (Issue #14)

**Durum:** Tamamlandı. Supabase sahiplik transferi ve production bağlantıları doğrulandı; Arda `ORBIT Platform` Owner davetini kabul etti.

- Production Supabase projesi `orbit-dershane`, silinmeden ve proje kimliği değiştirilmeden Hamza'nın sahibi olduğu `ORBIT Platform` organizasyonuna transfer edildi.
- Transfer sonrasında Auth kullanıcısı, profil, kurum, şube, üyelik ve audit kayıt sayıları kaynak envanteriyle eşleşti; `workspace_documents` ve Storage nesne sayıları sıfır kaldı.
- Hamza ve Arda `ORBIT Platform` organizasyonunda Owner'dır.
- `Hamzabyrk/orbit_v3` GitHub production entegrasyonu repo kökü, `main` branch'i ve production migration uygulamasıyla yeniden etkinleştirildi.
- Vercel `orbit-v3` projesi Hamza'nın Owner olduğu `ORBİT` Hobby takımındadır. Production adresi `https://orbit-v3-topaz.vercel.app` ve deployment durumu `Ready` olarak doğrulandı.
- Vercel'deki `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` tüm ortamlarda korunmuştur. Proje kimliği ve API anahtarları transferde değişmediği için uygulama bağlantısı kesilmedi.
- Least-privilege gereği Vercel Marketplace Supabase kurulumu yapılmaması kararlaştırılmıştı. **Bu karar korunmadı:** Vercel `orbit-v3` projesine `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD` ve `POSTGRES_URL` türevleri dahil 16 sunucu değişkeni eklendi. Bu değerlerin production istemci bundle'ına sızmadığı doğrulandı (Vite yalnızca `VITE_` önekli değişkenleri istemciye açar) ve hassas olanlar Vercel'de `Sensitive` işaretli olduğu için API üzerinden geri okunamıyor. Kalan risk build ortamıdır; uygulamanın ihtiyaç duymadığı bu değişkenlerin temizliği v1.1.1 kapsamındadır.
- Uygulamanın gerçekten kullandığı değişkenler yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`'dir. `NEXT_PUBLIC_` önekli değişkenler bu Vite projesinde hiçbir kod tarafından okunmaz.

---

## 9. Platform Operatörü Ekseni ve `/platform` Paneli (Issue #16, hedef v1.1.2)

**Durum: tamamlandı.** Veritabanı şeması (Issue #27), Edge Function operatör kontrolü (#37), kimliğin iki eksene ayrılması (#40) ve panelin kendisi — kurum listesi, kurum oluşturma, operatör listesi, denetim kaydı (#41) — hepsi production'da. Ayrıntılı gerekçe için bkz. `DECISION_LOG.md` — "Platform operatörü ayrı bir eksendir".

> **Sonradan düzeltme (2026-08-25):** Bu satır uzun süre _"panel ve Edge Function güncellemesi bekliyor"_ diyordu; ikisi de 2026-08-24'te bitmişti. Codex'in A1 analizinde bulundu (Issue #80, B11).

Sistemde iki bağımsız kimlik ekseni bulunur. Bir kullanıcı ikisinden birine, hiçbirine veya (teoride) her ikisine de ait olabilir:

```
auth.users
  ├─→ organization_memberships   → kurum içi rol (app_role)      → /          dershane paneli
  └─→ platform_operators         → platform ekseni               → /platform  yönetim paneli
```

- **`app_role` enum'u (`admin`, `teacher`, `student`, `parent`) genişletilmez.** Bu roller her zaman bir kuruma bağlıdır; platform operatörü hiçbir kuruma ait değildir.
- Operatör kaydının tek doğruluk kaynağı `platform_operators` tablosudur. `auth.users.app_metadata` üzerinde bayrak tutulmaz. Yetki kontrolü, `current_user_has_membership()` ile aynı desende yazılacak `current_user_is_platform_operator()` security-definer fonksiyonu ile yapılır.
- Panel `client/src/platform/` altında kendi bileşen ağacıyla yaşar. `client/src/components/education/` ağacına dokunulmaz (dosya başına tek sorumluluk kuralı; bkz. `AGENTS.md`).
- Yetkilendirme her zaman sunucudadır. Rota koruması yalnızca kullanıcı deneyimi içindir; her platform işlemi operatör kontrolünü sunucuda yapan bir Edge Function üzerinden yürür.
- **Kapsam kabı ile sınırlıdır:** kurum, şube, kurum yöneticisi hesabı ve operatör listesi yönetilir. Öğrenci, not, yoklama, ödev ve ödeme verisine erişim yoktur — bu, mevcut RLS politikalarının doğal sonucudur ve "platform operatörü her şeyi okur" türünde bir policy eklenmeyecektir.
- Kuruma bağlı olmayan platform işlemleri `platform_audit_events` tablosuna yazılır; `audit_events.organization_id` NOT NULL olduğu için o tablo kullanılamaz.
- Şemadaki roller `owner` ve `operator`, durumlar `active` ve `suspended`'dır. Yalnızca `active` operatörler yetkili sayılır.
- `platform_operators` ve `platform_audit_events` tablolarına **istemciden yazma yolu yoktur**; ekleme ve denetim kaydı üretme yalnızca `service_role` ile çalışan Edge Function üzerinden yapılır. Aksi halde bir operatör kendi yetkisini yükseltebilir veya sahte denetim kaydı üretebilirdi.
- Operatörün kurum içeriğine erişemediği `supabase/tests/database/platform_operators.test.sql` içinde üç ayrı testle doğrulanır. Bu, KVKK gerekçesiyle verilen taahhüdün çalıştırılabilir karşılığıdır ve ileride sessizce gevşetilirse CI'da kırılır.
- İlk operatör hesapları, panel kendi kendini oluşturamayacağı için bir defaya mahsus kontrollü biçimde eklenir. Bu, "kayıtlar elle oluşturulmaz" kuralının tek tanımlı istisnasıdır.

---

## 10. Kurum Kurulum İş Akışı (uçtan uca)

Kararların gerekçeleri için bkz. `DECISION_LOG.md` — "Kimlik ve Giriş Bilgisi Mimarisi".

### Adım adım

> **Sonradan düzeltme (2026-08-24):** Aşağıdaki 1., 2. ve 5. adımlar davet e-postası akışını anlatıyordu. **Davet akışı kaldırılmıştır.** Güncel hâl bu blokta; gerekçe için bkz. `DECISION_LOG.md` — "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır".

1. **Platform operatörü kurumu oluşturur.** Panel; kurumu, varsayılan şubeyi, kurum kodunu (1000'den otomatik artan) ve kurum yöneticisi hesabını üretir. **E-posta sorulmaz**; yönetici de herkes gibi giriş numarası ve geçici şifreyle açılır.
2. **Yönetici ilk girişte şifresini değiştirir ve e-postasını doğrular.** Şifre değiştirilmeden hiçbir ekrana gidilemez. E-posta doğrulaması kurum yöneticisi için **zorunludur** — kendi kurumundaki herkesin kurtarma kanalı odur.
3. **Yönetici sınıfları oluşturur.** Öğrenciler sınıfa atanacağı için bu adım öğrenci aktarımından önce gelmek zorundadır.
4. **Yönetici öğretmen ve öğrencileri içe aktarır.** Panelden indirilen şablon doldurulur, yüklenir, önce doğrulama önizlemesi gösterilir, onaydan sonra kayıt yapılır.
5. **Sistem giriş bilgilerini üretir.** Giriş hesabı açılan herkese 8 haneli kişi numarası ve kişiye özel geçici şifre üretilir. E-posta ve telefon toplanır ancak giriş için kullanılmaz; kurtarma içindir ve öğretmen/öğrenci/veli için isteğe bağlıdır.
6. **Yönetici yazdırılabilir listeyi bir kez indirir** ve dağıtır.
7. **Kullanıcılar ilk girişte şifrelerini değiştirir.**

### Bağlayıcı kurallar

- **Platform operatörü, ürün üzerinden kurum içeriğini okuyamaz — ancak kimlik bilgisi üreterek yetki yükseltebilir.**

  > **Sonradan düzeltme (2026-08-24):** Bu madde önceden _"Platform operatörü kurum yöneticisinin şifresini bilmez"_ diyordu ve gerekçesi, yöneticinin şifresini davet bağlantısıyla kendisinin belirlemesiydi. Davet akışı kaldırıldığı için **operatör artık geçici şifreyi görüyor** ve eski ifade doğru değil.
  >
  > Daha önemlisi, eski ifade davet akışıyla bile tam doğru değildi: operatör kurum yöneticisinin şifresini her zaman **sıfırlayabilir** — kurtarma zincirinin son halkası budur ve tasarım gereği vardır. Yani yetki yükseltme imkânı geçici şifreden değil, operatörlüğün kendisinden geliyor.

  Taahhüdün doğru ve savunulabilir hâli:
  - **Ürün üzerinden erişim yoktur.** Operatör; öğrenci, not, yoklama, ödeme verisini hiçbir ekrandan, sorgudan veya API çağrısından okuyamaz. RLS bunu zorlar ve pgTAP ile sınanır (`platform_operator_reads.test.sql`).
  - **Yetki yükseltme mümkündür ve gizlenmez.** Operatör kimlik bilgisi üretebilir veya sıfırlayabilir. Bu, her SaaS sağlayıcısı için geçerlidir; iddia edilmeyecek bir şeyi iddia etmiyoruz.
  - **Her yükseltme denetim kaydı üretir.** Geçici şifre üretimi ve şifre sıfırlama işlemleri `platform_audit_events`'e yazılır; kayıt operatör tarafından silinemez veya değiştirilemez (istemciden yazma yolu yoktur).

    > **"Zorunlu" ne demek — 2026-08-25'te netleştirildi.** Bu madde uzun süre denetim kaydını zorunlu ilan ediyordu, kod ise yazımı en-iyi-çaba yapıyordu; ikisi açıkça çelişiyordu (Issue #80 · B05).
    >
    > Çelişki kod lehine değil, **tanım netleştirilerek** kapatıldı: zorunluluk _"denetim yazılamazsa işlem geri alınır"_ değil, **"denetim yazılamadığı operatörden gizlenemez"** anlamındadır. İşlemi geri almak daha kötü olurdu — oluşmuş bir kurumu "oluşmadı" göstermek, tekrar denendiğinde slug çakışması üretir; değişmiş bir şifreyi "değişmedi" göstermek ise hem eski hem yeni şifreyi kullanılamaz kılar.
    >
    > Karşılığı: Edge Function yanıtları `audit_written` alanını taşır ve panel `false` olduğunda operatöre işlemin ize geçmediğini söyler. Aynı desen kilit bayrağı için `password_lock_set` ile de geçerlidir.

  - **Kurum yöneticisi haberdar edilir.** Kendi hesabında yapılan her kimlik bilgisi işlemi ona bildirilir. Bildirim kanalı, e-postası doğrulandıktan sonra çalışır.

  Bu ayrım KVKK açısından da doğrudur: veri işleyenin teknik erişim imkânını inkâr etmek değil, **denetlenebilir ve hesap verebilir** kılmak beklenir.

- **Geçici şifreler düz metin saklanmaz.** Oluşturma anında bir kez gösterilir. Kaybedilirse yeniden üretilir; bu nedenle hem tek kişi hem sınıf bazında "şifreyi yeniden üret" işlemi bulunmak zorundadır.
- **İçe aktarma yarım kalmamalıdır.** Doğrulama kayıttan önce yapılır, işlem parçalara bölünür ve tekrar çalıştırıldığında aynı kişiyi iki kez oluşturmaz.
- **Şablon biz veririz.** Rastgele Excel dosyalarından sütun eşleştirmeye çalışmak kapsam dışıdır.
- **Fotoğraf/OCR ile veri çıkarma yapılmaz.** Öğrenci listesi görüntüsünü bir OCR servisine göndermek, çocukların kişisel verisini üçüncü tarafa aktarmak anlamına gelir ve ayrı bir veri işleme sözleşmesi gerektirir. El yazısı Türkçe isimlerde doğruluk da düşüktür ve hatalar sessizdir.

### Giriş hesabı kime açılır — kararı kurum verir

Sistemde **kayıtlı olmak** ile **giriş hesabı olmak** iki ayrı şeydir ve karıştırılmamalıdır.

|               | Nedir                                      | Kimde bulunur               |
| ------------- | ------------------------------------------ | --------------------------- |
| Öğrenci kaydı | Ad, sınıf, not, yoklama, ödeme             | Herkeste                    |
| Giriş hesabı  | `auth.users` satırı, giriş numarası, şifre | Yalnızca giriş yapacaklarda |

Dokuz yaşındaki bir öğrenci sisteme kayıtlıdır, öğretmeni not girer, velisi kendi hesabından takip eder; ancak kendi giriş hesabı yoktur. On ikinci sınıftaki bir öğrenci kendi deneme sonuçlarını görmek isteyebilir ve hesabı olur. İkisi de sistemdedir.

Gerekçe KVKK'daki veri minimizasyonu ilkesidir: hiç giriş yapmayacak bir çocuk için kimlik oluşturmak, ihtiyaç duyulmayan kişisel veriyi işlemektir.

**Kararı ORBIT vermez, kurum verir.** İlkokul dershanesiyle YKS kursunun ihtiyacı aynı değildir. Kurum iki yerden seçer:

1. **İçe aktarma şablonunda `Giriş Hesabı` sütunu** — satır bazında evet/hayır
2. **Öğrenci listesinde işlem** — sonradan fikir değişirse tek işlemle hesap üretilir

Bu tercih için veritabanında ayrı bir bayrak **tutulmaz**: `students.auth_user_id` doluysa hesap vardır, boşsa yoktur. Şablondaki sütun saklanan bir alan değil, içe aktarma anına ait bir talimattır. Aynı bilgiyi iki yerde tutmak bu projede tekrar eden hata kalıbıdır.

### Şema ekleme sırası

| Ne zaman                | Ne                                                                                                                 | Neden                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Eklendi (Issue #37)** | `organizations.code` (4 hane, 1000'den artan, benzersiz)                                                           | Panel kurum üretmeye başladığı anda her kurumun kodu olmalı; sonradan geriye dönük atamak gerekirdi |
| v1.2                    | `students`, `guardians`, `student_guardians`, `classes`, `class_enrollments` ve `students.auth_user_id` (nullable) | Panelin bu tablolara ihtiyacı yok; kurum, şube ve yönetici tabloları zaten mevcut                   |
| ~~İçe aktarma (v1.4)~~  | ~~`profiles.login_number`, `profiles.must_change_password`, `profiles.phone`~~                                     | **Geçersiz — aşağıdaki düzeltmeye bakın**                                                           |
| Faz E1                  | `organization_memberships.person_code` + kurum başına benzersizlik                                                 | Panel kurum yöneticisi hesabı üretmeye başladığı anda numaranın ikinci yarısı gerekli               |
| Faz E3                  | `profiles.must_change_password`, `profiles.password_expires_at`                                                    | Geçici şifre üretilen ilk anda kilit de gerekli; ikisi ayrı fazda olamaz                            |
| Faz E4                  | `profiles.phone`, `profiles.pending_email` ve doğrulama alanları                                                   | Kurtarma zinciri burada kuruluyor                                                                   |

> **Sonradan düzeltme (2026-08-24):** Üstteki üstü çizili satır iki bakımdan yanlıştı.
>
> **Yer:** `profiles.login_number` kurum kodunu ikinci kez saklardı — giriş numarası `<kurum:4><kişi:4>` olduğu için kurum kodu hem `organizations.code`'da hem burada dururdu. Bu, projenin yedi kez tökezlediği drift kalıbının aynısıdır. Doğrusu `organization_memberships.person_code`: yalnızca kişi yarısı saklanır, kurum yarısı üyelik üzerinden zaten bellidir.
>
> **Zaman:** v1.4 çok geç. Panel kurum yöneticisi hesabını Faz E1'de üretmeye başlıyor; numara olmadan hesap açılamaz.

Sonradan nullable kolon eklemek ucuz ve kırıcı değildir; bu nedenle şemanın tamamını erkenden kurmak gerekmez. `organizations.code` ve `person_code` istisnadır çünkü veri üretimi onlarla başlar.

### Henüz tasarlanmamış, pilot öncesi gereken adımlar

- Öğrenci veya öğretmenin kurumdan ayrılması (`membership_status = suspended` mevcut, akış yok)
- Kurumun ikinci ve sonraki şubelerinin eklenmesi
- KVKK silme hakkı (pilot öncesi güvenlik listesi; bkz. `ROADMAP.md` v1.5)
- Veri işleme sözleşmesi, aydınlatma metni ve açık rıza akışı
