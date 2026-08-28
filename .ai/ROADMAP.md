# ORBIT - Aşamalı Geliştirme Yol Haritası

Bu dosya sürüm kapsamını, kabul kriterlerini ve kullanıcı tarafından onaylanan ürün/mimari kararlarını tek doğruluk kaynağı olarak tutar. Her sürüm tamamlanıp kalite kapısından geçmeden sonraki sürüme başlanmaz.

---

## 0. Durum Özeti

> Son güncelleme: **2026-08-25**. İşaretler: ✅ tamam · 🟡 kısmen · ⬜ başlanmadı · ⚠️ tamam sanılıyordu, değil.
>
> Ayrıntı için ilgili bölüme bakın; bu tablo yalnızca tek bakışta durum içindir.

| Sürüm / Dilim | Kapsam                                                                                                               | Durum |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ----- |
| v1.0          | Arayüz demosu, 4 rol görünümü, mock veri katmanı, kalite kapısı, Vercel + Supabase bağlantısı                        | ✅    |
| v1.1          | Tenant şeması, rol enum'u, gerçek Auth session, `audit_events`, kurum kurulum Edge Function'ı                        | ✅    |
| v1.1.1        | Fonksiyon yetkileri, production Auth ayarları, `PLATFORM_SETTINGS.md`, CI sertleştirmesi, güvenlik başlıkları        | ✅    |
| v1.1.2 · D0   | Sentetik e-posta ile hesap açma ve giriş kanıtı (#35)                                                                | ✅    |
| v1.1.2 · D1   | `organizations.code`, Edge Function operatör kontrolü (#37)                                                          | ✅    |
| v1.1.2 · D2   | Kimliğin iki bağımsız eksene ayrılması, `/platform` rotası (#40)                                                     | ✅    |
| v1.1.2 · D3   | Panel: kurum listesi, kurum oluşturma, operatör listesi, denetim kaydı (#41)                                         | ✅    |
| v1.1.2 · D4   | İlk platform operatörleri (#43) — ikisi de eklendi                                                                   | ✅    |
| —             | Panel bağlantısı, demo rol kartlarının gizlenmesi, kullanılabilir sol menü (#45)                                     | ✅    |
| **Faz E**     | **Kimlik zinciri — ayrıntı bölüm 4.5**                                                                               | 🟡    |
| Faz E · E0    | E-posta değişimi spike'ı (#51)                                                                                       | ✅    |
| Faz E · E1    | Kurum kurma makinesi: `person_code`, geçici şifre, yazdırılabilir fiş (#53 · #57 · #59 · #61 · #63 · #65)            | ✅    |
| Faz E · E2    | Test kurumu `orbitdershane`'in kaldırılması                                                                          | ✅    |
| Faz E · E3    | İlk giriş kilidi ve 8 haneli numarayla giriş (#69 · #73)                                                             | ✅    |
| Faz E · E4    | İletişim bilgisi ve kurtarma zinciri — **mailsiz yarısı bitti**, gönderim sağlayıcı bekliyor (#95 · #96 · #97 · #98) | 🟡    |
| Faz E · E5    | Mock verinin kaldırılması (#88 · #90 · #93) — üç madde v1.2'ye taşındı                                               | ✅    |
| Faz E · E6    | Kurum yöneticisinin kullanıcı ekleme ekranı                                                                          | ⬜    |
| Faz E · E7    | Uçtan uca doğrulama                                                                                                  | ⬜    |
| v1.2          | İş tabloları + tenant/rol RLS matrisi                                                                                | ⬜    |
| v1.4 (kalan)  | Sınıf/program/yoklama/sınav/ödev/ödeme CRUD akışları                                                                 | ⬜    |
| v1.5          | 4 rol kabul testi, KVKK envanteri ve hukuki hazırlık, pilot geri bildirimi                                           | ⬜    |
| v1.6 – v2.0   | Storage, toplu aktarım, raporlama, ticarileşme kapısı                                                                | ⬜    |

**v1.1 neden artık yeşil (2026-08-25):** Uzun süre ⚠️ idi, çünkü release gate'i _"davet edilen kullanıcı kendi şifresini kurup giriş yapabilir"_ diyordu ve bu doğru değildi — `type=invite` istemcide hiç ele alınmıyordu. **Faz E1 davet yolunu tamamen kaldırdı**, E3 de yerine geçen akışı kapattı. Gate bugünkü karşılığıyla yeniden yazıldı: _"panelden açılan hesap, numara ve geçici şifreyle girip şifresini değiştirebilir"_ — ve bu production'da doğrulandı. Bkz. `DECISION_LOG.md` — "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır".

---

## 1. Onaylı Mimari Soru-Cevap Kaydı

**Karar tarihi:** 2026-08-21

**Onaylayan:** Hamza Bayrak

**Kaynaklar:** Repo analizi, kimlik doğrulama iş akışı PDF'i, Functional MVP/Core Product faz görselleri ve iş kuralı notları.

Bu bölüm, ileride bir karar değiştirildiğinde eski bağlamın kaybolmaması için soru ve cevapları birlikte saklar. Değişiklik yapılırsa cevap silinmez; tarihli yeni cevap ve gerekçe eklenir.

### Soru 1 - Login ve demo rol geçişi nasıl çalışacak?

**Onaylı cevap:** Login ekranının mevcut UI/UX tasarımı korunacak, ancak production ortamında giriş arka planda gerçek Supabase Auth e-posta/şifre oturumuyla çalışacak. Sağ üstteki rol geçişi yalnızca local geliştirme ve izole Vercel Preview demo ortamında açık olacak. Gerçek production kurumlarında kullanıcı kendi rolünü değiştiremeyecek.

**Gerekçe:** Demo hızını korurken istemci üzerinden admin rolüne geçilmesini ve yetki atlatmayı engellemek.

### Soru 2 - Rol ve kurum bilgisi nerede tutulacak?

**Onaylı cevap:** Supabase tarafından yönetilen `auth.users` tablosuna uygulama sütunları eklenmeyecek. Kimlik bilgileri `profiles`, kurum/rol ilişkileri `organization_memberships` tablosunda tutulacak. Bir kullanıcı farklı kurum veya şubelerde farklı rollere sahip olabilecek; aktif üyelik oturum bağlamında seçilecek.

**Gerekçe:** Supabase Auth sınırlarını korumak, çoklu tenant modelini sürdürülebilir kılmak ve ileride rol değişimini veri taşımadan yapabilmek.

**Güncelleme (2026-08-24):** Cevabın _"bir kullanıcı farklı **kurumlarda** farklı rollere sahip olabilecek"_ kısmı **giriş hesabı düzeyinde geçersizdir.** Giriş numarası `<kurum:4><kişi:4>` biçiminde ve auth kimliğinin kendisi olduğu için bir hesap tek kuruma aittir; iki kurumda yer alan kişi iki ayrı hesap ve iki ayrı numara alır. _"Farklı **şubelerde** farklı roller"_ kısmı geçerliliğini korur — şube kurumun içindedir ve numarayı etkilemez. Şema da değişmez. Gerekçe ve reddedilen alternatifler için bkz. `DECISION_LOG.md` — "Bir giriş hesabı tek kuruma aittir".

### Soru 3 - İlk pilot kurum ve ilk admin nasıl oluşturulacak?

**Onaylı cevap:** Kapalı beta döneminde ilk kurum, varsayılan şube ve ilk admin platform tarafında önceden oluşturulacak. Admin benzersiz e-posta adresine Supabase daveti alacak. Herkese açık self-service "kurum oluştur" onboarding akışı v1.5 sonrasına bırakılacak.

**Gerekçe:** İlk pilotta kötüye kullanım ve yarım kurum kayıtları oluşturmadan kontrollü kurulum yapmak.

**Güncelleme (2026-08-24):** Cevabın "admin benzersiz e-posta adresine Supabase daveti alacak" kısmı **geçersizdir**. Davet akışı kaldırılmıştır; kurum yöneticisi de herkes gibi giriş numarası ve geçici şifreyle açılır, oluşturma anında e-posta sorulmaz. E-posta ilk girişte eklenir ve doğrulanır; kurtarma kanalı olarak orada gerekir. Gerekçe için bkz. `DECISION_LOG.md` — "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır". Kararın asıl niyeti — kontrollü kurulum, self-service onboarding'in v1.5 sonrasına bırakılması — değişmemiştir.

### Soru 4 - Öğrenci giriş hesabı nasıl açılacak?

**Onaylı cevap:** Öğrencinin akademik kaydı Auth hesabı olmadan oluşturulabilecek ve `auth_user_id` başlangıçta boş kalabilecek. Öğrenciye benzersiz bir e-posta sağlandığında davetle giriş hesabı etkinleştirilecek. Sahte e-posta, ortak hesap veya paylaşılan geçici şifre üretilmeyecek. Öğrencinin hesabı yoksa bağlı veli kendi hesabından yalnızca izin verilen öğrenci verisini görecek.

**Gerekçe:** Çocuk kullanıcılar, benzersiz kimlik gereksinimi ve KVKK güvenliği.

**Güncelleme (2026-08-23):** Bu cevabın "sahte e-posta üretilmeyecek" kısmı daraltılmıştır. Gerekçe ve tam metin için bkz. `DECISION_LOG.md` — "Kimlik ve Giriş Bilgisi Mimarisi".

Kararın asıl niyeti korunmuştur: **ortak hesap ve paylaşılan geçici şifre hâlâ yasaktır**, her kişinin kimliği benzersizdir. Değişen tek şey, e-postası olmayan ancak gerçekten giriş yapması gereken kullanıcılar için bir yol açılmasıdır.

| Durum                             | Uygulama                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Giriş yapmayacak küçük öğrenci    | Auth hesabı **açılmaz**; `auth_user_id` boş kalır, bağlı veli kendi hesabından görür |
| Giriş yapacak, e-postası var      | Davet akışı; kullanıcı kendi şifresini belirler                                      |
| Giriş yapacak, e-postası yok      | 8 haneli kişi numarası ve kişiye özel geçici şifre                                   |
| Ortak hesap veya paylaşılan şifre | Her durumda yasak                                                                    |

Sentetik adres bir varsayılan değil, erişime ihtiyacı olup e-postası bulunmayan kullanıcılar için yedek yoldur. E-postası olmayan yetişkin bir kursiyer veya öğretmen de aynı yolu kullanır; bu nedenle şema öğrenciye özel değildir.

**Güncelleme (2026-08-24):** Yukarıdaki tablonun ikinci satırı **geçersizdir** ve sentetik adres artık "yedek yol" değil **tek yoldur**. Giriş yapacak herkes — e-postası olsun olmasın — giriş numarası ve kişiye özel geçici şifreyle açılır; davet akışı kaldırılmıştır.

| Durum                             | Güncel uygulama                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Giriş yapmayacak küçük öğrenci    | Değişmedi: Auth hesabı **açılmaz**, bağlı veli kendi hesabından görür                                |
| Giriş yapacak, e-postası var      | Giriş numarası + geçici şifre. E-posta ilk girişte eklenir; **kurtarma kanalı** olarak orada gerekir |
| Giriş yapacak, e-postası yok      | Değişmedi: giriş numarası + geçici şifre                                                             |
| Ortak hesap veya paylaşılan şifre | Değişmedi: her durumda yasak                                                                         |

Kurum yöneticisi için e-posta ekleme ve doğrulama **zorunludur**; kendi kurumundaki herkesin kurtarma kanalı olduğu için. Öğretmen, öğrenci ve veli için isteğe bağlıdır. Gerekçe: `DECISION_LOG.md` — "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır".

### Soru 5 - Günlük Akış ile Gün Planı aynı özellik mi olacak?

**Onaylı cevap:** Hayır, iki ayrı veri modeli ve ayrı sorumluluk olarak geliştirilecek.

- **Günlük Akış:** Admin veya yetkili öğretmenin kurum/sınıf hedefiyle paylaştığı içeriktir. Hedeflenen sınıfa bağlı öğretmen, öğrenci ve velilere görünür.
- **Gün Planı:** Kullanıcıya ait kişisel to-do ve takvim kayıtlarıdır. Kayıtları yalnızca sahibi görebilir ve yönetebilir. İlk UI kapsamı mevcut tasarıma uygun olarak admin/öğretmen panelidir; veri modeli kullanıcı bazlı kurulacaktır.

**Gerekçe:** Kurumsal duyuru/operasyon akışı ile kişisel çalışma alanının RLS ve ürün davranışını birbirine karıştırmamak.

### Soru 6 - Sınav sıralamasında kim ne görecek?

**Onaylı cevap:** Admin ve yetkili öğretmen, sorumlu oldukları kapsamda öğrenci isimleriyle tam sıralamayı görebilecek. Öğrenci ve veli yalnızca kendi/bağlı öğrencisinin sonucunu ve sırasını görecek; diğer öğrencilerin kimlikleri anonim olacak.

**Gerekçe:** Akademik analiz ihtiyacını karşılarken öğrenci sonuçlarının başka öğrenci ve velilere sızmasını önlemek.

### Soru 7 - Yeni kurulan boş kurumda hangi veriler bulunacak?

**Onaylı cevap:** Gerçek kurumda yalnızca kurum, varsayılan şube ve ilk admin bulunacak. Öğrenci, öğretmen, sınıf, ödeme, sınav, mesaj, görev ve dashboard örnekleri bulunmayacak; mevcut ekran tasarımları korunarak `0` ve "Henüz veri yok" durumları gösterilecek. Dört demo kimliği ve örnek veriler yalnızca production'dan izole Preview demo tenant'ında tutulabilecek.

**Gerekçe:** Gerçek kurulum ile satış demosunu ayırmak ve mock verinin gerçek müşteri verisine karışmasını engellemek.

### Soru 8 - Uygulama hangi sürüm ve PR sırasıyla geliştirilecek?

**Onaylı cevap:** Functional MVP, v1.1-v1.5 arasında beş küçük ve incelenebilir PR ile geliştirilecek. Ardından dosya yönetimi, içe aktarma ve gelişmiş raporlama v1.6-v1.8 kapsamında ele alınacak; v2.0 Core Product kapısı bunların tamamlanmasıyla açılacak.

**Gerekçe:** İki kişilik ekipte çakışmayı ve tek devasa PR riskini azaltmak; her sürümde güvenlik ve ürün davranışını ayrı doğrulamak.

### Önceden onaylanan tamamlayıcı kararlar

- Ayrı bir geleneksel backend sunucusu yerine yetkili işlemler için Supabase Edge Functions kullanılacak.
- `service_role` anahtarı hiçbir zaman tarayıcıya veya Vite environment değişkenlerine konmayacak.
- Organizasyon, şube ve üyelik temelli multi-tenant yapı ilk günden kurulacak.
- Öğretmen birden fazla sınıf/derse; veli birden fazla öğrenciye, öğrenci birden fazla veliye bağlanabilecek.
- Kritik admin/öğretmen değişiklikleri `audit_events` ile kaydedilecek; loglara kişisel veri yazılmayacak.
- Öğrenci, öğretmen, sınıf ve ilişkili iş kayıtları varsayılan olarak kalıcı silinmek yerine arşivlenecek/pasife alınacak.
- Yönetici değişiklikleri diğer açık oturumlara Supabase Realtime ile yansıtılacak; kanallar kurum ve gerekli sınıf kapsamıyla sınırlandırılacak.
- Ödeme modülü yalnızca tutar, vade ve durum takibidir; kart verisi, ödeme alma ve ödeme sağlayıcısı v1.x kapsamına dahil değildir.
- UI/UX tasarımı korunacak; yalnızca veri kaynağı, yetkilendirme, form davranışı, loading/error/empty durumları bağlanacak.

---

## 2. Sürüm Geçiş Notu

Önceki yol haritası Auth ve kalıcı veritabanını "Aşama 3 / v1.2" olarak toplu biçimde tanımlıyordu. 2026-08-21 onayıyla bu büyük faz, izlenebilir teslimatlar için v1.1-v1.5 arasına bölündü. Önceki hedefler iptal edilmedi; aşağıdaki sürümlere yeniden eşlendi.

---

## 3. Tamamlanan Temel - v1.0 Demo ve Platform Altyapısı

**Durum:** Tamamlandı

- [x] ORBIT eğitim arayüzü ve dört rol görünümü.
- [x] Modüler `components/education/` klasör yapısı.
- [x] İzole `isMock: true` demo veri katmanı ve localStorage kalıcılığı.
- [x] Gün Planı, Ödevler ve genişletilmiş Ayarlar arayüzleri.
- [x] Prettier, ESLint, TypeScript, Vitest ve Vite build kalite kapısı.
- [x] GitHub branch/PR ve `.ai` ortak hafıza düzeni.
- [x] Vercel production deploy ve GitHub otomatik deployment bağlantısı.
- [x] Mevcut `orbit-dershane` Supabase projesinin bağlanması.
- [x] Belge tablosu ve storage bucket için deny-by-default güvenlik düzeltmesi.

**Sınır:** v1.0 bir arayüz demosudur; gerçek Auth, tenant RLS ve iş verisi CRUD'ı içermez.

---

## 4. Phase 1 - Functional MVP (Hedef: v1.5)

### v1.1 - Supabase Auth ve Tenant Temeli

**Hedef:** Kimliği doğrulanmış kullanıcıyı güvenli kurum üyeliğine bağlamak.

- [x] `profiles`, `organizations`, `branches`, `organization_memberships` şeması.
- [x] Rol enum'u ve aktif kurum/şube bağlamı.
- [x] Gerçek Supabase Auth session provider; mevcut login tasarımının korunması.
- [x] Preview demo modu ve production rol geçişi kilidi.
- [x] İlk kurum/kurum yöneticisi kurulum Edge Function'ı. _(2026-08-24: madde başlangıçta "davet Edge Function'ı" idi; davet yolu Faz E1'de `admin.createUser` + geçici şifre ile değiştirilmektedir.)_
- [x] `audit_events` temeli.
- [x] RLS yardımcı fonksiyonları ve kurumlar arası negatif güvenlik testleri.

**Uygulama durumu (Issue #8, 2026-08-23 güncellemesi):** Kod, migration ve testler merge edildi (PR #9); CI, Vercel Preview ve pgTAP Tenant RLS testleri geçti; migration ve Edge Function production'a deploy edildi. İlk tenant oluşturuldu ancak `bootstrap-organization` Edge Function akışıyla değil, kontrol düzleminden doğrudan RPC ile — onboarding mekanizması hiç doğrulanmadı ve hiçbir hesapta `platform_admin` bayrağı bulunmuyor.

**Release gate:** Production kullanıcısı rolünü istemciden değiştiremez; iki farklı kurum birbirinin hiçbir kaydını okuyamaz/yazamaz.

**Release gate durumu: KAPANMADI.** Denetimde (Issue #16) tespit edilenler:

- Tenant izolasyonu tarafı geçiyor: `anon` rolünün tenant tablolarında hiçbir yetkisi yok, RLS politikaları ve org-geneli üyelik davranışı doğru çalışıyor, production'da demo rol geçişi kapalı.
- Ancak `internal_bootstrap_organization`, `handle_new_auth_user` ve `current_user_has_membership` fonksiyonları `anon` ve `authenticated` rollerine açık; production'da yeni kayıt (signup) da açık. Bu ikisi birlikte, yetkisiz bir kullanıcının kendisine kurum ve admin üyeliği açmasına imkân veriyor.
- Production login akışı doğrulanamadı: kurucu yöneticinin e-posta/şifre girişi çalışmıyor, UI'da şifre belirleme/sıfırlama ekranı yok.

Kalan işler aşağıdaki iki ara sürüme alınmıştır. **v1.2'ye bu iki sürüm kapanmadan geçilmez** (sürüm kapısı kuralı; bkz. `AGENTS.md`).

### v1.1.1 - Güvenlik Kapanışı ve Ortam Ayarlarının Hizalanması

**Hedef:** v1.1 release gate'ini gerçekten kapatmak; repo ile production arasındaki ayarların ayrışmasını sonlandırmak.

- [x] Migration: `internal_bootstrap_organization` ve `handle_new_auth_user` fonksiyonlarından `anon` ve `authenticated`, `current_user_has_membership`'ten yalnızca `anon` EXECUTE yetkisinin kaldırılması (Issue #18, PR #19).
- [x] Migration: `workspace_documents` üzerindeki `anon` ve `authenticated` DML yetkilerinin kaldırılması (PR #19).
- [x] pgTAP: `anon` ve `authenticated` rollerinin ayrıcalıklı fonksiyonları çağıramadığını doğrulayan negatif testler ve trigger/RLS regresyon testleri (PR #19).
- [x] Production Auth ayarları: signup kapatıldı, minimum şifre uzunluğu 8, şifre karmaşıklığı, Site URL ve redirect listesi düzeltildi (Issue #20).
- [x] Edge Function `ALLOWED_ORIGINS` secret'ının production'a set edilmesi (Issue #20).
- [x] Vercel: uygulamanın kullanmadığı 16 sunucu değişkeni silindi; Supabase→Vercel env senkronizasyonu kapatıldı (Issue #20).
- [x] `.ai/PLATFORM_SETTINGS.md` eklendi; `config.toml`'un production'ı yönetmediği, elle yönetilen ayarların envanteri ve kabul edilmiş açıklar kayda geçti (Issue #20).
- [x] CI: bağımlılık taraması engelleyici hale getirildi ve yıkıcı migration guard'ı eklendi (Issue #22, PR #23). Kapı production bağımlılıklarına uygulanır; geliştirme bağımlılıkları görünür ama engellemez, aksi halde kapı kalıcı olarak kırmızı kalırdı. Production'daki iki high seviyeli lodash açığı `pnpm.overrides` ile kapatıldı.
- [x] `.gitattributes` ile satır sonları normalize edildi (Issue #22, PR #23).
- [x] Production güvenlik başlıkları `vercel.json` üzerinden eklendi: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (Issue #29). Pilot öncesi güvenlik listesinin gereği; bkz. bölüm 4 · v1.5.
- [x] CI tetikleyicileri düzeltildi: `pull_request` artık hedef dal filtresi olmadan çalışır (Issue #27). Öncesinde base'i `main` olmayan PR'lar hiçbir kontrol almıyordu.

**Kapsam dışına alınanlar (gerekçeleriyle `PLATFORM_SETTINGS.md` bölüm 4 ve 5'te kayıtlı):**

- Sızmış şifre koruması Supabase Pro plan gerektiriyor; sıfır bütçe hedefi nedeniyle açılmadı.
- Oturum zaman aşımı, `secure password change` ve `require current password` ayarları v1.1.2 sonrasına ertelendi; şu an açılmaları ekibin tamamını sistemden kilitler.
- Preview deployment koruması bilinçli olarak kapalı bırakıldı; açılması ekip üyelerinden birini preview'lardan tamamen dışlar ve karşılığında yalnızca demo verisi korunur.

**Release gate:** `anon` anahtarıyla hiçbir SECURITY DEFINER fonksiyonu çağrılamaz; production'da yeni kayıt açılamaz; Supabase security advisor'da `PLATFORM_SETTINGS.md` bölüm 5'te kabul edilmiş olanlar dışında uyarı kalmaz; repo ile production ayarları arasındaki bilinen farklar `PLATFORM_SETTINGS.md` üzerinden izlenir.

### v1.1.2 - Şifre Akışı ve Platform Operatörü Paneli

**Hedef:** Ürüne insan erişimini tek bir oturuma bağlı olmaktan çıkarmak ve kurum/kullanıcı kurulumunu tasarlanan mekanizma üzerinden yapılabilir hale getirmek.

- [x] Şifre belirleme ve sıfırlama ekranları (Issue #25). `/sifre-sifirla` ve `/sifre-belirle` rotaları, şifre politikasının istemci doğrulaması ve `PASSWORD_RECOVERY` olayının normal girişten ayrıştırılması.
- [x] `platform_operators` tablosu, `current_user_is_platform_operator()` yardımcısı ve `platform_audit_events` tablosu (Issue #27). Operatörün kurum içeriğini göremediği pgTAP ile doğrulandı.
- [x] `bootstrap-organization` Edge Function'ı `app_metadata.platform_admin` yerine `platform_operators` tablosunu okuyor (Issue #37). Merge ile birlikte production'a otomatik deploy edildi ve doğrulandı.
- [x] `organizations.code` eklendi: 1000'den başlayan, benzersiz, dört haneli kurum kodu (Issue #37). Giriş numarasının ilk yarısıdır.
- [x] Kimlik çözümlemesi iki bağımsız ekseni birden taşıyor: kurum üyeliği ve platform operatörlüğü (Issue #39). Önceki hâlinde üyelik bulunamazsa oturum kapatılıyordu; operatörün tasarım gereği üyeliği olmadığı için giriş yapar yapmaz sistemden atılırdı.
- [x] `/platform` rotası ve panel iskeleti (`client/src/platform/` altında, dershane ağacına dokunmadan) (Issue #39). Ayrı giriş ekranı **yok**; tek giriş, girişten sonra dallanma — bkz. `DECISION_LOG.md` ilgili değişiklik notu.
- [x] Panelden kurum + varsayılan şube + kurum yöneticisi oluşturma akışı (Issue #41). Kurum listesi, operatör listesi ve platform denetim kaydı da aynı panelde; ikisi salt okunur.
- [x] Operatörün kurum **kabını** okuyabilmesi (Issue #41). `organizations_select_member` üyelik istediği için kurum listesi operatöre boş dönüyordu. Kap açıldı, içerik (`branches`, `organization_memberships`, `audit_events`) kapalı kaldı ve bu sınır pgTAP ile sabitlendi.
- [x] Kurum oluşturma artık `platform_audit_events`'e de yazıyor (Issue #41). Öncesinde yalnızca kurumun kendi `audit_events` kaydına yazılıyordu; operatör o tabloyu okuyamadığı için panelin denetim listesi hiç dolmayacaktı.
- [~] İlk platform operatörü hesaplarının bir defaya mahsus kontrollü eklenmesi (Issue #43). **Yarısı yapıldı:** Hamza Bayrak 2026-08-24'te `owner` olarak eklendi ve RLS'in ona kurum/operatör/denetim listelerini gerçekten verdiği kimliğine bürünülerek doğrulandı. Arda Bülent'in **hesabı henüz yok**; hesap açıldığında ikinci operatör kaydı eklenecek.
- [ ] Test kurumu `orbitdershane`'in silinip ilk kurumun panel üzerinden yeniden kurulması.

**Release gate:** Kurum ve kurum yöneticisi yalnızca panel üzerinden oluşturulabilir; oluşturulan kullanıcı kendisine verilen giriş numarası ve geçici şifreyle giriş yapıp şifresini değiştirebilir; platform operatörü hiçbir kurumun öğrenci/not/yoklama/ödeme verisini okuyamaz; her platform işlemi denetim kaydı üretir.

> **Sonradan düzeltme (2026-08-24):** Bu gate'in ikinci maddesi önceden _"davet edilen kullanıcı kendi şifresini kurup giriş yapabilir"_ biçimindeydi ve **hiçbir zaman sağlanmamıştı** — `type=invite` istemcide ele alınmadığı için davetle gelen kullanıcı şifresini belirlemeden panele düşüyordu. Gate, davet yolunun kaldırılmasıyla birlikte yukarıdaki gibi yeniden yazıldı; gerçek karşılığı Faz E1'de teslim edilecektir.

### v1.2 - İlişkisel Veritabanı ve RLS

**Hedef:** Kurumun insan, sınıf ve akademik organizasyonunu foreign key ilişkileriyle kurmak.

- [ ] **Ön koşul: `isMock: true` tiplerden kaldırılsın.** `types.ts`'te sekiz tipte **zorunlu** alan; gerçek veri bu alanı sağlayamaz. Tablolar yazılmadan önce temizlenmeli, sonra değil — bkz. Faz E5.
- [ ] `students`, `guardians`, `student_guardians`.
- [ ] Öğretmen üyelik detayları ve öğretmen-sınıf/ders atamaları.
- [ ] `classes`, `class_enrollments`, `subjects`, `schedule_entries`.
- [ ] `daily_feed_posts`, kişisel `tasks` ve `calendar_events` için ayrı modeller.
- [ ] `attendance_sessions`, `attendance_records`.
- [ ] `homework_assignments`.
- [ ] `exams`, `exam_results` ve güvenli sıralama görünümü/RPC'si.
- [ ] `payment_plans`, `installments`.
- [ ] Her tabloda tenant ve rol kapsamlı RLS; gerekli foreign key/index/constraint'ler.
- [ ] **Repository/query/mutation katmanı** — taşınabilirlik sınırının istemci tarafındaki dikişi. `educationData.ts` bugün bir dikiş ama sorgu katmanı değil; Faz E5'ten taşındı.
- [ ] **Loading ve error durumları.** Boş durumlar E5'te eklendi; bekleme ve hata durumları ancak eşzamansız veri gelince anlam kazanır.
- [ ] **Kilit sunucuda da devreye girsin.** İş tablolarının politikalarına `and not public.current_user_must_change_password()` koşulu eklenir. Fonksiyon E3'te yazıldı, süreyi de okuyor, ama **bugün hiçbir politikada kullanılmıyor**; kilit yalnızca istemcide.
- [ ] **Dolu kurumun silinmesi engellensin.** `internal_delete_organization`, kurumda öğrenci/sınıf/not/ödeme kaydı varsa reddetmelidir. Bugün engel yok çünkü iş tabloları yok; kurumlar boşken silme düğmesi "zararsız" hissettiriyor ve alışkanlık öyle oturuyor. Veri geldiğinde aynı düğme aynı yerde duruyor olacak. Silinecek kayıt sayıları onay ekranında zaten gösteriliyor (Issue #65), ancak sayı göstermek engel değildir.

**Release gate:** RLS test matrisi admin/teacher/student/parent için olumlu ve olumsuz senaryolarda geçer; sahipsiz tenant kaydı oluşamaz.

### v1.3 - Dinamik Frontend ve Temiz Kurum Görünümü

> **Sıra kararı (2026-08-23):** Bu sürüm, platform paneli tamamlandıktan **hemen sonra** ve ilk gerçek kurum açılmadan **önce** yapılacaktır. Bugün 13 dosya mock veriden besleniyor; kurum yöneticisi hesabına ilk girdiğinde kendi kurumu boşken karşısına sahte öğrenci isimleri ve uydurma istatistikler çıkar. Bu, pilotun ilk izlenimini bitirir ve ürünün gerçekliğini sorgulatır.

**Hedef:** Dört paneli gerçek oturum ve Supabase verisiyle çalıştırmak, production mock verisini kaldırmak.

- [ ] `mockData.ts`, `isMock: true` tipleri ve `orbit:demo:*` production bağımlılığının kaldırılması.
- [ ] React Query tabanlı modüler repository/query/mutation katmanı.
- [ ] Dashboard, öğrenci, sınıf, program, ödeme, sınav ve rapor değerlerinin canlı sorgulardan türetilmesi.
- [ ] Tasarım değişmeden loading, error ve boş kurum durumlarının eklenmesi.
- [ ] Sağ üst rol göstergesinin gerçek üyelikten gelmesi; demo geçişinin environment ile sınırlandırılması.
- [ ] **Hesaplar arası geçiş düğmesi.** Birden fazla rolü olan kişi rolü kadar hesaba sahiptir; sağ üstte hesaplar arası geçiş bulunur. Düğmeler kişinin **gerçekten sahip olduğu hesaplardan** türetilir: tek hesabı olanda bileşen hiç render edilmez, yönetici-veli olan birinde öğretmen düğmesi görünmez.

  **Şablon değil sistem:** hesap sayısı sınırsızdır (ikili toggle olarak yazılmaz) ve rol isimleri bileşene gömülmez. İleride `muhasebeci` gibi yeni bir rol eklendiğinde geçiş bileşenine tek satır dokunulmamalı.

  Yeni bir yetki mantığı getirmez — her hesabın rolü ve yetkisi kendindedir. Geçiş **şifre sormaz**; günde birkaç kez şifre yazmak pratikte kullanılmaz hâle getirir.

  **Bağlayıcı:** şifresiz geçiş iki oturumun birden saklanması demek. Hareketsizlik sayacı **tüm oturumları** kapatacak biçimde genişletilmeli; yalnızca aktif olanı kapatırsa diğeri açık kalır ve sayacın anlamı kalmaz.

- [ ] **Kişi kaydı — hesapların ait olduğu grup.** "Bu kişinin diğer hesapları hangileri" bilgisi; geçiş düğmesi için zaten gerekli, KVKK "verilerimi sil" talebinde tüm kayıtların birlikte bulunabilmesi için de gerekli. **İkili bağ olarak modellenmez** (`linked_account_id` iki hesapta çalışır, üçte kırılır); N hesap aynı kişi kaydına bağlanır. Bkz. `DECISION_LOG.md` — "Rol, atama ve bağlantı üç ayrı kavramdır".
- [ ] Kurum/sınıf kapsamlı Realtime invalidation ve abonelikleri.

- [ ] İstemci tarafı hareketsizlik sayacı: belirli süre işlem yoksa oturum kapatılır. Supabase'in sunucu tarafı oturum zaman aşımı Pro plan gerektirdiği için ücretsiz karşılığıdır; dershanenin ortak bilgisayarında açık bırakılan tarayıcı senaryosuna karşı etkilidir.

**Release gate:** Yeni kurum yalnızca admin ve boş ekranlarla açılır; production bundle içinde demo kişi/kurum verisi bulunmaz; aynı veri farklı yetkili oturumlarda doğru kapsamda güncellenir.

### v1.4 - Yetkili CRUD ve Operasyon Akışları

**Hedef:** Görsellerde tanımlanan temel iş kurallarını çalışan formlara bağlamak.

- [ ] Kurum yöneticisi: öğretmen/öğrenci/veli oluşturma ve kayıt yönetimi. **Faz E6'ya çekildi** — davetle değil, giriş numarası ve geçici şifreyle.
- [ ] Admin: sınıf oluşturma, düzenleme ve arşivleme.
- [ ] Admin: ders programı ve öğretmen ataması.
- [ ] Admin/öğretmen: sorumlu kapsamda yoklama oluşturma ve düzeltme.
- [ ] Admin/öğretmen: sınav oluşturma, sonuç girme/düzeltme ve sıralama analizi.
- [ ] Öğretmen: sorumlu sınıfa ödev oluşturma.
- [ ] Admin/öğretmen: hedefli Günlük Akış paylaşımı.
- [ ] Kullanıcı: kendine özel Gün Planı görev ve takvim yönetimi.
- [ ] Admin: ödeme planı/taksit kaydı; veli: yalnızca bağlı öğrencinin tutar/vade görünümü.
- [ ] Zod doğrulama, kontrollü hata mesajları ve kritik mutasyon audit kayıtları. **Not, yoklama ve ödeme değişiklikleri atlanamaz:** kurum yöneticisi aynı zamanda bir öğrencinin velisi olabilir ve kendi çocuğunun kaydını değiştirebilir. Erişimi kısıtlamak reddedildi (tek yöneticili kurumda sistem kullanılamaz hâle gelir); karşılığı izlenebilirliktir. Bkz. `DECISION_LOG.md` — "Rol, atama ve bağlantı üç ayrı kavramdır".

**Release gate:** Yetkisiz CRUD, doğrudan API isteğiyle de RLS tarafından reddedilir; admin değişikliği ilgili öğretmen/öğrenci/veli ekranında Realtime ile görünür.

### v1.5 - Functional MVP ve Kapalı Beta

**Hedef:** Bir pilot kurumun kontrollü gerçek kullanıcı/veri akışını uçtan uca test etmek.

- [ ] Dört rol için kabul testi ve tenant izolasyon testi.
- [ ] Gerçek pilot kurumun kurum yöneticisi/öğretmen/öğrenci/veli hesaplarının açılması. Mekanizma Faz E7'de doğrulanmış olacağı için burada yalnızca pilot verisiyle tekrarlanır.
- [ ] KVKK veri envanteri, log sanitization ve erişim matrisi denetimi.
- [ ] KVKK hukuki hazırlık: kurumla veri işleme sözleşmesi (kurum veri sorumlusu, ORBIT veri işleyen), velilere aydınlatma metni ve açık rıza akışı, silme hakkı uygulaması (pilot öncesi güvenlik listesi, madde 12).
- [ ] Kişisel verinin yurt dışında (Supabase `eu-central-1`, Frankfurt) tutulmasına ilişkin kararın netleştirilmesi ve belgelenmesi.
- [ ] Rate limit, CORS, security headers ve production hata mesajları denetimi.
- [ ] Realtime kopması, ağ hatası ve boş veri fallback senaryoları.
- [ ] Supabase/Vercel ücretsiz katman kullanım ve bütçe alarmı kontrolü.
- [ ] **Yedekleme ve kurtarma planı.** Günlük otomatik snapshot'ın açık olduğu, saklama süresi ve bir geri yükleme provasının yapıldığı doğrulanır. Gerçek kurum verisi girdikten sonra ilk kez sınanacak bir yedek, yedek sayılmaz.
- [ ] **Demo verisi production paketinden çıkarılsın.** E5'ten sonra demo verisi hiçbir ekranda **gösterilmiyor**, ancak JS paketinin içinde duruyor — ölçüldü, `Zeynep Kaya` gibi isimler production derlemesinde bulunabiliyor.

  Sebep: `isDemoMode`, `runtime.ts` içinde bir fonksiyon çağrısıyla ve fail-closed bir yedekle hesaplanıyor; derleme zamanı sabiti olmadığı için Rollup her iki dalı da tutuyor. Ayrıca `LoginScreen` demo giriş kartları için `roleEmail`'i doğrudan `demoData`'dan alıyor ve modülü ağaçta canlı tutuyor.

  İşlevsel bir açık değil ve gerçek kişi verisi içermiyor. Yine de pilot öncesi kapatılmalı: paketi inceleyen bir kurum, uydurma isimleri **sızmış müşteri verisi** sanabilir. Çözerken `runtime.ts`'in bilinmeyende production'ı seçen davranışı **zayıflatılmamalıdır**; ağaç budama uğruna fail-closed'dan vazgeçilmez.

- [ ] Prettier, ESLint, TypeScript, Vitest, SQL/RLS testleri ve production build.
- [ ] Pilot kurumdan ölçülebilir geri bildirim ve hata listesi.

**Release gate:** Pilot onayı, kritik/yüksek güvenlik açığı olmaması ve tüm CI kontrollerinin yeşil olması.

---

## 4.5 Faz E - Kimlik Zinciri

> **Sıra kararı (2026-08-24):** Bu faz v1.2'den **önce** yapılır. Gerekçe: kiracı RLS matrisi, her rolden gerçek bir hesap olmadan doğrulanamaz. Bugün sistemde yalnızca platform operatörü hesabı var; öğretmen, öğrenci ve veli hesabı yaratacak bir mekanizma hiç yok. v1.2'yi önce yazsaydık, yazdığımız politikaları ancak aylar sonra sınayabilirdik.
>
> Faz E mevcut sürümlerin yerine geçmez; belirli maddeleri öne çeker. E5 v1.3'ün tamamıdır, E6 v1.4'ün ilk maddesidir. Bu maddeler ilgili sürümlerde tekrar listelenmez.

**Hedef:** Bir kurumun sıfırdan kurulup, kendi kullanıcılarını açıp, her rolün kendi hesabıyla giriş yapabildiği zincirin uçtan uca çalışması.

**Çalışma biçimi:** Dikey dilimler. Her dilim şema + sunucu + arayüz + test olarak tek başına doğrulanabilir. "Önce tüm frontend, sonra tüm backend" bilinçli olarak reddedildi: arayüzün şekli sunucunun ne yapabildiğine bağlı, ve hata geç çıkarsa pahalı oluyor.

**Kural:** Önce yerine geçecek olan, sonra kaldırılacak olan. Test kurumu, yerine kurum kurabilen makine çalıştığı kanıtlanmadan silinmez.

### E0 - E-posta değişimi spike'ı

**Durum: ✅ tamamlandı (2026-08-24).** Betikler ve tam tablo: `supabase/tests/auth/email_change_spike/`.

- [x] Sentetik adresten gerçek adrese geçişin `Secure email change` ile çakışıp çakışmadığı ölçüldü — **çakışıyor**, geçiş imkânsız.
- [x] Üç çıkış yolu da denendi. Sonuç, üçünden hiçbiri değil: **ayarı kapatmak da yıkıcı çıktı** çünkü e-posta değişince giriş numarası ölüyor (`HTTP 400`).
- [x] Bunun üzerine dördüncü yol ölçüldü: **auth e-postasını hiç değiştirmemek** ve kurtarma linkini `admin/generate_link` ile kendimiz üretip göndermek. **Çalışıyor** — 0 posta gönderiliyor, link ve 6 haneli kod bize dönüyor, jeton geçerli.
- [x] Bulgular `DECISION_LOG.md`'ye işlendi; reddedilen öneri gerekçesiyle birlikte kayıtta bırakıldı.

**Neden ilk sıradaydı:** Kurtarma zincirinin tamamı bu cevaba dayanıyordu ve cevabı bilmiyorduk. Karşılığını verdi — ilk iki planın ikisi de ölçümde çöktü ve doğru tasarım ancak üçüncü denemede çıktı. Kod yazılıp aylar sonra sahada öğrenilecek bir arızaydı.

**Ortaya çıkan yeni ön koşul:** Kurtarma linkini artık biz gönderdiğimiz için **kendi e-posta gönderim sağlayıcımız** gerekiyor. E4'e ön koşul olarak eklendi.

### E1 - Kurum kurma makinesi

- [x] İkinci platform operatörü kaydının eklenmesi (D4'ün kalanı) ve `display_name` düzeltmesi.
- [x] Platform operatörünün girişte `/platform` paneline düşmesi.
- [x] `organization_memberships.person_code` + kurum başına benzersizlik ve 1000'den başlayan tahsis.
- [x] `bootstrap-organization`'ın `inviteUserByEmail` yerine `admin.createUser` + geçici şifre kullanması; davet yolunun kaldırılması.
- [x] Panelin giriş numarası ve geçici şifreyi bir kez göstermesi; yazdırılabilir çıktı.
- [x] Her geçici şifre üretiminin `platform_audit_events`'e yazılması. Operatör kimlik bilgisi ürettiğinde bunu görebilen bir kayıt kalmak zorundadır; bkz. `PROJECT_STATE.md` bölüm 10 bağlayıcı kuralı.
- [x] pgTAP: `person_code` benzersizliği, kurum başına 1000'den başlaması ve **aynı kişinin iki kurumda ayrı hesap alması** (bkz. `DECISION_LOG.md` — "Bir giriş hesabı tek kuruma aittir").

**Release gate:** Panelden kurulan bir kurumun yöneticisi, kendisine verilen numara ve geçici şifreyle giriş yapabilir. Hiçbir adımda e-posta gerekmez.

### E2 - Test kurumunun kaldırılması

- [x] `orbitdershane` kurumunun, şubelerinin, üyeliklerinin ve denetim kayıtlarının silinmesi.
- [x] Kurucu ekip üyesinin kurum üyeliğinin sonlandırılması; yalnızca platform operatörü kalması.

**Not:** Geri alınamaz bir işlemdir. Silinecek kayıtlar önce listelenip onaya sunulur. E1 tamamlanmadan yapılmaz.

### E3 - İlk giriş kilidi ve numarayla giriş

- [x] `profiles.must_change_password` ve `profiles.password_expires_at` (7 gün).
- [x] Şifre değiştirilmeden hiçbir ekrana gidilemeyen kilit ekranı.
- [x] `loginIdentifier`'ın giriş ekranına bağlanması; giriş alanının e-posta ve 8 haneli numarayı birlikte kabul etmesi (Issue #57). Alan `type="email"` olduğu için tarayıcı `10011000` girdisini "@ eksik" diye reddediyordu ve numarayla giriş hiç mümkün değildi.
- [x] Kilidin sunucu tarafında da anlam taşıması için yardımcı fonksiyon; v1.2'de iş tablolarının RLS politikalarına koşul olarak girer.

**Not:** `must_change_password` kesinlikle `user_metadata`'ya konmaz; orayı kullanıcı kendisi yazabilir ve kilidi atlar.

**Not — ilk giriş bir "değiştirme"dir, "sıfırlama" değil.** Kullanıcı mevcut (geçici) şifresini bildiği için ikinci bir doğrulama kanalı gerekmez; iletişim bilgisi olmadan da çalışır. Bu nedenle toplu kurulumda kişi başına **tek bir fiş** dağıtılır, ikinci bir kod turu yoktur. Ayrım için bkz. `DECISION_LOG.md` — "Şifre değiştirme ile sıfırlama ayrı akışlardır".

**Release gate:** Geçici şifreyle giren kullanıcı, şifresini değiştirmeden başka hiçbir ekrana ulaşamaz. 8 haneli numarayla giriş çalışır.

### E4 - İletişim bilgisi ve kurtarma zinciri

- [ ] **Ön koşul: e-posta gönderim sağlayıcısı kurulması** (seçenekler `PLATFORM_SETTINGS.md` bölüm 7). Kurtarma linkini artık biz gönderiyoruz; sağlayıcı olmadan **kurtarma hiç çalışmaz**. Bkz. `DECISION_LOG.md` — "Auth e-postası hiç değişmez".
- [x] `profiles.phone` ve `profiles.recovery_email` sütunları, sütun düzeyi yetkiler ve `current_user_has_recovery_channel()` yardımcısı (#95).

  **`pending_email` bilinçli olarak eklenmedi.** Şekli doğrulama akışının nasıl kurulacağına bağlı — jeton saklanacak mı, süre nerede tutulacak, kaç deneme hakkı olacak — ve o tasarım E4'ün ikinci yarısında yapılacak. Bugün kullanılmayacak bir sütun eklemek, şemaya tahmin yazmaktır.

  **`recovery_email` kullanıcıya kapalıdır** ve bu kararın tamamı şu: doğrulama, adresin gerçekten o kişiye ait olduğunu kanıtlamak içindir. Kullanıcı sütunu doğrudan yazabilseydi doğrulama anlamsız kalırdı — ve hesaba kısa süreliğine erişen biri (açık bırakılmış oturum, ödünç cihaz) kendi adresini yazıp **şifre değişse bile duran kalıcı bir arka kapı** bırakabilirdi. pgTAP bunu sabitliyor.

  **Telefon kurtarma kanalı sayılmaz.** Doğrulanmıyor ve üzerinden kod gönderilmiyor; telefonu dolu olan birine "kurtarma yolun var" demek yanlış olurdu.

- [ ] Kurum yöneticisi için ilk girişte **zorunlu** e-posta ekleme ve doğrulama; diğer roller için isteğe bağlı. Doğrulama, ürettiğimiz kodun adrese gönderilip geri girilmesiyle yapılır; GoTrue'nun e-posta değiştirme akışına **dokunulmaz**.
- [ ] Kurtarma akışı: Edge Function `admin/generate_link` ile link ve 6 haneli kodu üretir, `profiles`'taki doğrulanmış adrese gönderir, denetim kaydı yazar.
- [x] Ayarlar ekranının iletişim bölümü gerçek veriye bağlandı (#98). Ekran ayrıca uydurma ad ve telefon gösteriyordu; "Kaydet" de hiçbir şey kaydetmiyordu.
- [x] **Mevcut iki auth ekranındaki metin kayması düzeltildi (#96).** Davet akışı döneminden kalma; Codex tanıma turunda buldu (Issue #71):
  - `SetPasswordScreen.tsx` — _"Bundan sonra e-posta ve şifrenizle giriş yapacaksınız"_ diyor. Kullanıcıların çoğu **numarayla** girecek; e-postası olmayanlar için bu cümle yanlış.
  - `ForgotPasswordScreen.tsx` — _"Kurum hesabınızın e-posta adresini girin"_ diyor ve Supabase'in kendi sıfırlama e-postasını varsayıyor. Güncel tasarımda akış kanal varlığına göre dallanıyor: doğrulanmış adres varsa link + kod gönderilir, yoksa kullanıcı kurum yöneticisine yönlendirilir.
- [x] **Kurtarma yöntemi olmayan hesap için kalıcı uyarı (#98).** İletişim bilgisi kurum yöneticisi dışındaki roller için isteğe bağlıdır; yalnızca "atla" sunulursa çoğu kullanıcı atlar ve sorun geri gelir. Uyarı ayarlar ve profil alanında sürekli görünür: _"Kurtarma yöntemin yok — şifreni unutursan kurum yöneticine başvurman gerekir."_
- [ ] **Sıfırlama akışı kanal varlığına göre dallanır:** doğrulanmış adres varsa link + 6 haneli kod gönderilir; yoksa kullanıcı kurum yöneticisine yönlendirilir.

  **Yarısı yapıldı (#96):** ekran artık e-postası olmayana ne yapacağını **söylüyor**. Dallanmanın kendisi e-posta sağlayıcısını bekliyor.

- [ ] Kurum yöneticisi panelinde kullanıcı başına "yeni geçici şifre üret" işlemi — iletişim bilgisi olmayanların tek kurtarma yolu.
  - [x] **Sunucu yarısı (#97).** `reset-member-password` Edge Function'ı ve yetki kararını veren `internal_resolve_member_for_reset`.

    Yetki kararı bilinçli olarak **SQL'e** kondu, fonksiyonun içine değil: işlem `service_role` ile çalışıyor ve `service_role` RLS'i baypas ediyor, yani bu sınır hiçbir politikadan geçmiyor. Deno kodunda kalsaydı **hiçbir testin ulaşamadığı bir güvenlik sınırı** olurdu. Sekiz pgTAP iddiası sabitliyor; en kritiği bir kurumun yöneticisinin başka kurumun üyesine ulaşamaması.

  - [ ] Arayüz yarısı — kurum yöneticisinin panelinde üye listesi ve satır bazında işlem. E6 ile birlikte gelir.

- [x] Platform panelinde kurum yöneticisinin şifresini sıfırlama işlemi - kurtarma zincirinin son halkası. Denetim kaydı üretir. **Öne çekildi (Issue #59):** panel denemesinde geçici şifre kaybolunca kurum kalıcı olarak erişilemez hâle geldi ve tek çare yeni bir kurum açmak oldu.
- [ ] Kurum yöneticisinin hesabında yapılan her kimlik bilgisi işleminin (geçici şifre üretimi, sıfırlama) **ona bildirilmesi**. Operatörün yetki yükseltebildiği kabul edilmiş bir gerçektir; bildirim onu gizli olmaktan çıkarır.
- [ ] **Operatör teşhis ekranı (destek Katman 1).** Kurum başına kayıt sayıları, son işlem zamanı, hata kayıtları, şema tutarsızlıkları. **Hiçbir kişisel veri yok** — kişi adı, not, yoklama, ödeme görünmez. Destek taleplerinin çoğu bununla teşhis edilir; KVKK sınırına dokunmadığı için izin gerektirmez ve iş tablolarını beklemez. Katman 2 (izinli destek oturumu) ve Katman 3 (acil erişim) v1.2 sonrasına aittir; bkz. `DECISION_LOG.md` — "Operatör desteği üç katmanlıdır".
- [x] Telefon alanı doldurulur ancak doğrulanmaz (#95, #98). `current_user_has_recovery_channel()` telefonu **kurtarma kanalı saymaz** — doğrulanmıyor ve üzerinden kod gönderilmiyor.

**Release gate:** Kurum yöneticisi e-postasını doğrulamadan panele giremez. Doğrulanmamış adrese şifre sıfırlama gönderilmez. Kurtarma yöntemi olmayan kullanıcı bunu ekranında görür.

**Kapsam dışı — v1.2 sonrasına ertelendi:**

- **Veli üzerinden kurtarma.** Öğrencinin iletişim bilgisi yokken bağlı velisinin doğrulanmış adresine gönderilmesi. İki koşul gerekiyor: yaş sınırı (yetişkin kursiyerin kurtarmasını velisine göndermek doğru değil) ve veli bağlantısının doğrulanmış olması. `student_guardians` tablosu v1.2'de geliyor.
- **Destek Katman 2 ve 3.** RLS koşulları iş tablolarına yazılacağı için v1.2'yi bekliyor.

### E5 - Mock verinin kaldırılması (v1.3'ün tamamı)

**Durum: hedefi tamamlandı (2026-08-25).** Production artık sahte veri göstermiyor. Üç dilimde yapıldı: C2 veriyi uygulama yapılandırmasından ayırdı (#88), C3 her listeye boş durum verdi (#90), C4 anahtarı çevirdi (#93).

- [x] `mockData.ts` üçe ayrıldı — `demoData.ts`, `roleMeta.ts`, `navigation.ts`. Kimlik katmanının "mock" adlı dosyaya bağımlılığı da böyle kalktı.
- [x] `orbit:demo:*` production bağımlılığı kaldırıldı. `demoStorage` hiç kontrol edilmiyordu; production'da yoklama işaretleyen kullanıcı **kaydedildiğini sanıyordu**, veri yalnızca kendi tarayıcısındaydı.
- [x] Boş kurum durumları — sekiz ekran, ortak `EmptyState` bileşeni.

**v1.2'ye taşınan üç madde.** Üçü de gerçek veri katmanı olmadan yapılamaz veya anlamsız kalır:

- **`isMock: true` tiplerden kaldırılsın.** `types.ts`'te sekiz tipte zorunlu alan olarak duruyor. Gerçek veri geldiğinde bu alan sağlanamaz, dolayısıyla **v1.2'nin ön koşuludur** — tabloları yazmadan önce kaldırılmalı.
- **Repository/query/mutation katmanı.** `educationData.ts` bugün bir dikiş ama sorgu katmanı değil; sorgulanacak tablo yok.
- **Loading ve error durumları.** Bugün hiçbir ekranda yok ve olamaz: veri eşzamanlı bir modül sabiti, beklenecek bir istek bulunmuyor.
- [x] **Şifre alanlarına görünürlük (göz) düğmesi** — giriş ekranı, kilit ekranı ve şifre belirleme ekranı. Karakterler nokta olarak gizli kalır, düğme isteğe bağlı olarak açar. Gerekçe: geçici şifreler kâğıt fişten elle yazılıyor ve yanlış yazıldığında kullanıcı nedenini göremiyor. Düğme klavyeyle erişilebilir olmalı ve durumu `aria-label` ile bildirmelidir. _(Arda Bülent'in isteği, 2026-08-25. E3 brifinginde bilinçli olarak yasaklanmıştı; gereksinim sonradan değişti.)_
- [x] **`tsconfig.node.json` kaldırılması.** Hiçbir yerden referans alınmıyor: `tsconfig.json`'da `references` anahtarı yok, `package.json` script'leri ve `vite`/`vitest` yapılandırmaları onu okumuyor. Kaldırıldıktan sonra `check`, `test` ve `build` çalıştırılarak doğrulanmalı. _(Issue #77 sırasında bulundu; o PR yalnızca belge kapsamında olduğu için ayrıldı.)_
- [x] İstemci tarafı hareketsizlik sayacı (Issue #57). Panel denemesinde ortaya çıktığı için öne çekildi: siteye girildiğinde giriş ekranı hiç görünmeden eski oturuma düşülüyordu. 30 dakika, son bir dakikada uyarı. Zaman damgası `localStorage`'da tutuluyor — yalnızca bellekte olsaydı sayfa yenilemesi sayacı sıfırlar ve tarayıcı ertesi gün açıldığında oturum hâlâ açık olurdu.

### E6 - Kurum yöneticisinin kullanıcı ekleme ekranı (v1.4'ün ilk maddesi)

> **Hazır olan sunucu parçaları (2026-08-26):**
>
> - `internal_next_person_code(uuid)` — advisory lock'lu numara tahsisi, E1'den (`service_role`)
> - `reset-member-password` Edge Function + `internal_resolve_member_for_reset` — ön koşulun sunucu yarısı (#97)
> - `profiles_select_organization_admin` politikası — yöneticinin kendi üyelerinin **adını** okuması (#100). Bu olmadan üye tablosu bir UUID listesidir.
>
> **Planlanan bölünme.** İki iş paralel yürüyebilir; dosya kümeleri kesişmiyor:
>
> | Kim            | İş                                                                                               | Dosyalar    |
> | -------------- | ------------------------------------------------------------------------------------------------ | ----------- |
> | **Yazan ajan** | Üye tablosu — salt okunur liste: ad, giriş numarası, rol, şube, durum                            | `client/`   |
> | **Denetleyen** | `create-member` Edge Function — numara tahsisi, `admin.createUser`, üyelik, kilit, denetim kaydı | `supabase/` |
>
> **Satır bazında işlemler ayrı dilimdir** ve tablodan sonra gelir. Sebebi bağımlılık değil, karar eksikliği: "yeni geçici şifre üret" sonucu geçici şifreyi **bir kez** göstermek zorunda ve o ekran (`CredentialsPanel`) bugün `platform/` altında, operatör paneline ait. Dershane ağacında yeniden kullanılması modül sınırını aşar; nereye taşınacağına karar verilmeden arayüz yazılmamalıdır.
>
> **Sonradan düzeltme (2026-08-26):** Engel ölçüldü ve sanıldığından inceydi. `PrintPortal`'ın platforma hiçbir bağlılığı yoktu (yalnızca react) ve onu yalnızca `CredentialsPanel` kullanıyordu; `CredentialsPanel`'in tek bağlılığı bir tip importuydu. İkisi `components/credentials/` altına **taşındı**, kopyalanmadı — bu ekran geçici şifreyi bir kez gösterip yok ettiği için iki kopyanın birinin düzeltilip diğerinin unutulmasının bedeli şifrenin sızması olurdu. Şifre sıfırlama satır işlemi #107 ile geldi; rol değiştirme ve kurumdan çıkarma hâlâ açılmadı.

- [ ] Ayarlar altında öğretmen/öğrenci/veli ekleme; ad-soyad, rol, **şube**, isteğe bağlı e-posta ve telefon.

  **Sunucu yarısı yazıldı (#106):** `create-member` Edge Function'ı + `internal_allocate_member_slot` ve `internal_create_membership` RPC'leri; yetki sınırı SQL'de ve 15 pgTAP iddiasıyla kapsanıyor. Migration production'a **uygulandı** (Supabase→GitHub tümleşmesi `main`'e merge ile uyguluyor), ancak Edge Function **deploy edilmedi.**

  **Arayüz yarısı yazıldı (#113):** `MemberCreateDialog` — ad-soyad, rol, şube; başarıda `CredentialsPanel` ile geçici şifrenin bir kez gösterimi; liste yenilenmesi.

  **`create-member` 2026-08-26'da deploy edildi** (v1, ACTIVE, `verify_jwt: true`). Modülün yüklendiği veri oluşturmadan doğrulandı: izinli origin ile `OPTIONS` → `204` + CORS başlıkları, izinsiz origin ile → `403 origin_not_allowed`. Yanıtta `x-deno-execution-id` var, yani Deno fonksiyonu gerçekten çalıştırdı. Deno bütün üst düzey import'ları çalıştırmadan önce çözdüğü için bu, `_shared/http.ts`, `_shared/temporaryPassword.ts` ve `_shared/syntheticEmail.ts` üçünün de çözüldüğü anlamına gelir.

  **Kutucuk hâlâ boş (K-08):** fonksiyon açılıyor ama **henüz tek bir üye oluşturulmadı.** `internal_allocate_member_slot` ve `internal_create_membership` bugüne kadar yalnızca pgTAP ile kanıtlandı, canlı bir çağrıyla değil. Kutucuk E7-3 ile birlikte kapanır.

  E-posta ve telefon alanları **bu dilimde yok**: `create-member`'ın sözleşmesi bunları almıyor. Sözleşmeyi genişletmek ayrı iştir.

- [ ] `person_code`'un sıradaki değerinin tahsisi ve geçici şifrenin bir kez gösterimi; yazdırılabilir liste.
- [x] **Bağlayıcı ön koşul — kullanıcı başına "yeni geçici şifre üret" (#97 sunucu · #107 arayüz).** Bu iş, hesap açma ile **aynı sürümde** gelmek zorundadır, sonraya bırakılamaz.

  Gerekçe: 2026-08-25'ten bu yana süresi dolmuş bir geçici şifre, değiştirilerek kurtarılamıyor (Issue #80 · B06, `20260825190000_enforce_password_expiry.sql`). Kilit ancak yeni bir geçici şifre üretilerek açılır. Bugün bu güvenli, çünkü hesabı olan tek rol kurum yöneticisidir ve `reset-admin-password` ona bu yolu sunar. E6 öğretmen/öğrenci/veli hesaplarını açtığında aynı yol onlar için de bulunmazsa, **7 gün içinde giriş yapmayan bir öğrenci kalıcı olarak kilitlenir ve kurtarılamaz.**

- [x] **Kurum içi üye tablosu — salt okunur kısım** (#105). Ayarlar altında, yalnızca kurum yöneticisinde: kişi adı, giriş numarası, rol, şube, durum. Dershane tarafının ilk servis modülü (`client/src/organization/`) bu dilimde kuruldu.
- [x] **Satır bazında şifre sıfırlama** (#107). `CredentialsPanel` ve `PrintPortal` `components/credentials/` altına taşındı; operatör ve kurum yöneticisi aynı bileşeni kullanıyor, ikinci kopya yok.
- [ ] **Satır bazında rol değiştirme ve kurumdan çıkarma.** Henüz açılmadı.
- [ ] **Bağlı veli/öğrenci sütunu.** Tablodan çıkarıldı: veli ile öğrenciyi bağlayan tablo hiç oluşturulmamış, sütunun veri kaynağı yok. Ayrı bir iş; ilişki modeli kurulmadan yazılamaz.

  Tablo **yalnızca kurum yöneticisinin** panelinde bulunur. Platform paneline konulamaz: operatörün kurum kişi listesini görmesi "operatör kapları yönetir, içeriği görmez" taahhüdünü ihlal eder.

  Gerekçe: yönetim işlemleri (silme, yetkilendirme) kişiyi tek tek aramadan, listeye bakarak yapılabilmeli. Dağınık ekranlarda kişi yönetmek, yanlış kişiye işlem uygulama riskini büyütür.

- [ ] **Kurum yöneticisini değiştirme.** Yönetici ayrıldığında yerine başkasının atanabilmesi. Bugün böyle bir işlem yok ve panelde görünen tek "kaldırma" işlemi kurumu silmek — kişiyi kaldırmak isteyen birinin kurumu yok etmesine açık kapı bırakıyor.
- [ ] Öğrenci ve veli ekranları **mobil-öncelikli** tasarlanır (bkz. `DECISION_LOG.md`).

**Not:** Şube seçimi atlanmamalıdır; `organization_memberships.branch_id` mevcut ancak akışta bugüne kadar hiç konuşulmadı.

### E7 - Uçtan uca doğrulama

Production'da koşuldu: 2026-08-26, kurum **1003 · deneme3**.

- [x] Platform operatörü gerçek bir kurum ve kurum yöneticisi oluşturur.
- [x] Kurum yöneticisi kendi hesabıyla girer, şifresini değiştirir. **E-posta doğrulaması bu adımdan düştü:** hesap sentetik adres kullanıyor (`10031000@orbit.invalid`), doğrulanacak bir e-posta yok. Bkz. #118.
- [x] Kurum yöneticisi bir öğretmen ve bir öğrenci ekler. Üçü de açıldı: `10031001` öğretmen, `10031002` öğrenci, `10031003` veli.
- [x] Öğretmen ve öğrenci kendi numaralarıyla girer. Üçü de girdi, şifrelerini belirledi, çıkıp tekrar girdi. Öğretmenin şifresi satırdan sıfırlanıp yeniden giriş de denendi.
- [ ] **Her rolün yalnızca kendi kapsamını gördüğü doğrulanır.** #116 kapandı; doğrulama canlıda dört rolle tekrar giriş yapılarak koşulacak.

**Release gate: karşılandı.** Zincirin hiçbir adımında elle veritabanı müdahalesi gerekmedi.

#### E7.1 - Canlı koşudan çıkan bulgular (2026-08-26/27)

Zincir çalışıyor. Aynı koşu, zincirin **etrafındaki** ekranlarda beş şey gösterdi:

| #    | Bulgu                                                                                                                                              | Durum       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| #116 | Dört panelin dördü de canlıda uydurma veri gösteriyor. Öğrenci ve veli **başkasının adıyla** karşılanıyor ("Merhaba Zeynep").                      | **kapandı** |
| #117 | Ders programı gün şeridi: "Bugün" Pazartesi'ye sabit, düğmeler tıklanamıyor.                                                                       | açık        |
| #118 | Şifre kurtarma iki eksende de çalışmıyor: sentetik adresler ulaşılamaz; gerçek adresli operatör hesabına mail gitmiyor (muhtemelen özel SMTP yok). | açık        |
| #119 | "Kurum geneli" varsayılanı üyeye **tüm şubeleri** açıyor; sınıf düzeyinde kapsam hiç yok. Kurum izolasyonu sağlam.                                 | açık        |
| #120 | Kayıt yokken takvim tamamen gizleniyordu.                                                                                                          | **kapandı** |

**Neden bugüne kadar kapanamadı:** "kendi kapsamını görmek" ölçülebilir bir şey değil, çünkü her rolün ekranında görülenin büyük kısmı veritabanından gelmiyor. Bir öğrencinin "yalnızca kendi verisini" gördüğünü, ekranda başka birinin adı yazarken doğrulayamayız. #116 kapandığına göre bu adım artık tek başına koşulabilir.

**Yetki tarafı ayrıca ölçüldü ve sağlam:** kurum izolasyonu `current_user_has_membership` içinde kaçışsız. Doğrulanamayan şey arayüzün ne gösterdiği, veritabanının ne verdiği değil.

---

## 5. Phase 2 - Operational Depth ve Core Product

### v1.6 - Supabase Storage ile Dosya Yönetimi

- [ ] Sınav evrakı, öğrenci fotoğrafı ve ders notu yükleme.
- [ ] Private bucket, tenant/path tabanlı RLS ve signed URL.
- [ ] Dosya türü/boyutu doğrulama, zararlı içerik riski ve audit kaydı.
- [ ] Mevcut `documents.ts` public URL yaklaşımının kaldırılması.

### v1.7 - Toplu Veri Aktarımı

- [ ] CSV/Excel öğrenci, sınıf ve geçmiş sonuç önizleme.
- [ ] Kolon eşleme, Zod doğrulama ve satır bazlı hata raporu.
- [ ] Tekrar çalıştırılabilir/idempotent import ve transaction stratejisi.
- [ ] Büyük dosya ve ücretsiz katman limitleri için batch işleme.

### v1.8 - Gelişmiş Filtreleme ve Raporlama

- [ ] Sınıf başarı ortalamaları ve devamsızlık grafikleri.
- [ ] Kurum/şube/tarih/sınıf filtreleri.
- [ ] Güvenli aggregate view/RPC; N+1 sorgu ve gereksiz Realtime yükünün önlenmesi.
- [ ] Rol kapsamlı rapor dışa aktarma.

### v2.0 - Core Product / Ticarileşme Kapısı

- [ ] v1.1-v1.8 release gate'lerinin tamamı geçmiş.
- [ ] Pilot kurum geri bildirimleri önceliklendirilmiş ve kritik olanlar çözülmüş.
- [ ] Backup/kurtarma, hesap silme-anonimleştirme ve operasyon runbook'u doğrulanmış.
- [ ] LLM/otomasyon özellikleri yalnızca açık iş değeri ve güvenlik onayı varsa ayrı roadmap kararıyla değerlendirilecek.

---

## 6. Her PR İçin Zorunlu Teslim Kapısı

- GitHub Issue ve `feat/<issue-no>-<kisa-ad>` branch'i.
- Graph-First etki analizi ve kapsam dışı maddeler.
- Atomik Conventional Commits.
- İlgili Vitest ve SQL/RLS güvenlik testleri.
- Prettier, ESLint, TypeScript, test ve build kontrolleri.
- Değişen kararlar `DECISION_LOG.md`'a, durum değişikliği `ROADMAP.md` §0'a, panel ayarı `PLATFORM_SETTINGS.md`'ye **aynı PR içinde** işlenir.
- Draft PR, diğer ekip üyesinin review onayı ve yeşil CI olmadan merge yapılmaması.

**Taşınabilirlik kontrolü** (bkz. `DECISION_LOG.md` — "Taşınabilirlik sınırı"):

- Yetkilendirme veritabanında mı? Kim neyi görebilir sorusunun cevabı RLS'te durmalı; Edge Function'a veya istemciye taşınmamalı.
- Ekran bileşeninden doğrudan veri çağrısı yapıldı mı? ESLint bunu engeller; kural susturulmuşsa PR reddedilir, erişim servis modülüne taşınır.
- Yeni bir Realtime aboneliği veya Storage yolu eklendiyse, sağlayıcı bağımlılığını büyüttüğü için PR açıklamasında belirtilir.

**Mobil kontrolü** (bkz. `DECISION_LOG.md` — "Öğrenci ve veli ekranları mobil-öncelikli"):

- Ekran dar ekranda gözden geçirildi mi? Gözden geçirilmemiş ekran teslim edilmiş sayılmaz.
- Öğrenci veya veli akışıysa: yatay kaydırmalı tablo birincil gösterim olarak kullanılmamış olmalı.
