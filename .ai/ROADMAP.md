# ORBIT - Aşamalı Geliştirme Yol Haritası

Bu dosya sürüm kapsamını, kabul kriterlerini ve kullanıcı tarafından onaylanan ürün/mimari kararlarını tek doğruluk kaynağı olarak tutar. Her sürüm tamamlanıp kalite kapısından geçmeden sonraki sürüme başlanmaz.

---

## 0. Durum Özeti

> Son güncelleme: **2026-08-29**. İşaretler: ✅ tamam · 🟡 kısmen · ⬜ başlanmadı · ⚠️ tamam sanılıyordu, değil.
>
> Ayrıntı için ilgili bölüme bakın; bu tablo yalnızca tek bakışta durum içindir.
>
> **Sıradaki işi buradan seçme.** Bu tablo _nerede olduğumuzu_ söyler; _ne yapılacağını_ **§4.6** söyler. Orada kalan bütün sürümler dilimlere bölünmüş ve her dilim **dayandığı varsayımları** yazmıştır — bir dilim, o varsayımlar canlı sistemde doğrulanmadan başlamaz (**K-10**).
>
> **Açık bulgular `gh issue list`'tedir.** Sayı buraya yazılmıyor: denetimden bir gün sonra eskidi (**K-06**). Sıradaki dilim **v1.2-11** 🔒 (kilit sunucuda). Yeni tabloların hepsinde koşul zaten var; kalan iş 2026-09-04 öncesi **beş** tabloyu taramak: `profiles`, `organizations`, `branches`, `organization_memberships`, `audit_events`. Sistemin bugünkü durumu: `PROJECT_STATE.md` **§6.1**.

| Sürüm / Dilim | Kapsam                                                                                                                                                                                                                                                                                        | Durum |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| v1.0          | Arayüz demosu, 4 rol görünümü, mock veri katmanı, kalite kapısı, Vercel + Supabase bağlantısı                                                                                                                                                                                                 | ✅    |
| v1.1          | Tenant şeması, rol enum'u, gerçek Auth session, `audit_events`, kurum kurulum Edge Function'ı                                                                                                                                                                                                 | ✅    |
| v1.1.1        | Fonksiyon yetkileri, production Auth ayarları, `PLATFORM_SETTINGS.md`, CI sertleştirmesi, güvenlik başlıkları                                                                                                                                                                                 | ✅    |
| v1.1.2 · D0   | Sentetik e-posta ile hesap açma ve giriş kanıtı (#35)                                                                                                                                                                                                                                         | ✅    |
| v1.1.2 · D1   | `organizations.code`, Edge Function operatör kontrolü (#37)                                                                                                                                                                                                                                   | ✅    |
| v1.1.2 · D2   | Kimliğin iki bağımsız eksene ayrılması, `/platform` rotası (#40)                                                                                                                                                                                                                              | ✅    |
| v1.1.2 · D3   | Panel: kurum listesi, kurum oluşturma, operatör listesi, denetim kaydı (#41)                                                                                                                                                                                                                  | ✅    |
| v1.1.2 · D4   | İlk platform operatörleri (#43) — ikisi de eklendi                                                                                                                                                                                                                                            | ✅    |
| —             | Panel bağlantısı, demo rol kartlarının gizlenmesi, kullanılabilir sol menü (#45)                                                                                                                                                                                                              | ✅    |
| **Faz E**     | **Kimlik zinciri — ayrıntı bölüm 4.5**                                                                                                                                                                                                                                                        | 🟡    |
| Faz E · E0    | E-posta değişimi spike'ı (#51)                                                                                                                                                                                                                                                                | ✅    |
| Faz E · E1    | Kurum kurma makinesi: `person_code`, geçici şifre, yazdırılabilir fiş (#53 · #57 · #59 · #61 · #63 · #65)                                                                                                                                                                                     | ✅    |
| Faz E · E2    | Test kurumu `orbitdershane`'in kaldırılması                                                                                                                                                                                                                                                   | ✅    |
| Faz E · E3    | İlk giriş kilidi ve 8 haneli numarayla giriş (#69 · #73)                                                                                                                                                                                                                                      | ✅    |
| Faz E · E4    | İletişim bilgisi ve kurtarma zinciri — **mailsiz yarısı bitti**, gönderim sağlayıcı bekliyor (#95 · #96 · #97 · #98)                                                                                                                                                                          | 🟡    |
| Faz E · E5    | Mock verinin kaldırılması (#88 · #90 · #93) — üç madde v1.2'ye taşındı                                                                                                                                                                                                                        | ✅    |
| Faz E · E6    | Kurum yöneticisinin kullanıcı ekleme ekranı (#105 · #106 · #107 · #113) — rol değiştirme, kurumdan çıkarma ve yönetici devri **v1.4'te**                                                                                                                                                      | 🟡    |
| Faz E · E7    | Uçtan uca doğrulama — beş adımın beşi de koşuldu (2026-08-26 · 2026-08-29)                                                                                                                                                                                                                    | ✅    |
| Faz E · E7.2  | Canlı turdan çıkan çevre ekran bulguları (#131 – #137) — yedisi de kapandı, dört rolle doğrulandı                                                                                                                                                                                             | ✅    |
| **Denetim**   | **Sistem denetimi (2026-08-29) — bulgular #143 – #151, kurallar K-10/11/12, dilimler §4.6.** #143, #150, #145, #144, #151, #146 ve #147 kapandı. **Açık kalan üçü sonraki sürümlere çapalı:** #149 → v1.2-12 ve v1.4 öncesi · #148 → v1.6-01 açılışı · #118 → v1.5-03. v1.2'nin önünde iş yok | 🟡    |
| v1.2          | İş tabloları + tenant/rol RLS matrisi — **dilimleri §4.6'da**. v1.2-01…10 kapandı; on sekiz iş tablosu, 97 RLS politikası, ve kapsam artık istemcide değil veritabanında                                                                                                                      | 🟡    |
| v1.3 (kalan)  | Ekranların canlı sorguya bağlanması, hesaplar arası geçiş ve kişi kaydı — mock temizliği E5'te bitti, **kalanın dilimleri §4.6'da**                                                                                                                                                           | ⬜    |
| v1.4 (kalan)  | Sınıf/program/yoklama/sınav/ödev/ödeme CRUD akışları                                                                                                                                                                                                                                          | ⬜    |
| v1.5          | 4 rol kabul testi, KVKK envanteri ve hukuki hazırlık, pilot geri bildirimi                                                                                                                                                                                                                    | ⬜    |
| v1.6 – v2.0   | Storage, toplu aktarım, raporlama, ticarileşme kapısı                                                                                                                                                                                                                                         | ⬜    |

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

> **Bu bölüm _ne yapılacağını_ tutar:** kapsam maddeleri, kutucuklar, release gate'ler. **§4.6 _hangi sırayla ve neye dayanarak_ yapılacağını** tutar: dilimler, bağımlılıklar, varsayımlar.
>
> İkisi birbirini tekrar etmez. Bir maddenin **kapsamı** buradadır; o maddeye **ne zaman başlanabileceği** §4.6'dadır. Kapsam değişirse burası, sıra veya bağımlılık değişirse orası güncellenir (**K-06**).

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
- [x] Test kurumu `orbitdershane`'in silinip ilk kurumun panel üzerinden yeniden kurulması. Silme Faz **E2**'de, panelden yeniden kurulum **E7**'de (kurum 1003) yapıldı; ayrıntı orada, burada tekrarlanmıyor (**K-06**).

**Release gate:** Kurum ve kurum yöneticisi yalnızca panel üzerinden oluşturulabilir; oluşturulan kullanıcı kendisine verilen giriş numarası ve geçici şifreyle giriş yapıp şifresini değiştirebilir; platform operatörü hiçbir kurumun öğrenci/not/yoklama/ödeme verisini okuyamaz; her platform işlemi denetim kaydı üretir.

> **Sonradan düzeltme (2026-08-24):** Bu gate'in ikinci maddesi önceden _"davet edilen kullanıcı kendi şifresini kurup giriş yapabilir"_ biçimindeydi ve **hiçbir zaman sağlanmamıştı** — `type=invite` istemcide ele alınmadığı için davetle gelen kullanıcı şifresini belirlemeden panele düşüyordu. Gate, davet yolunun kaldırılmasıyla birlikte yukarıdaki gibi yeniden yazıldı; gerçek karşılığı Faz E1'de teslim edilecektir.

### v1.2 - İlişkisel Veritabanı ve RLS

**Hedef:** Kurumun insan, sınıf ve akademik organizasyonunu foreign key ilişkileriyle kurmak.

- [x] **Ön koşul: `isMock: true` tiplerden kaldırılsın.** `types.ts`'te sekiz tipte **zorunlu** alan; gerçek veri bu alanı sağlayamaz. Tablolar yazılmadan önce temizlenmeli, sonra değil — bkz. Faz E5.

  **Kapandı (#96, Faz E5).** 2026-08-29 denetiminde doğrulandı: `grep -r isMock client/src` → sonuç yok. Kutucuk aylarca işaretsiz kaldı ve v1.2'nin önünde duran bir ön koşul gibi göründü; oysa iş çoktan bitmişti (**K-08'in tersi: biten iş de kendiliğinden işaretlenmiyor**).

- [x] `students`, `guardians` (**v1.2-01**). Öğrencinin akademik kaydı giriş hesabından bağımsızdır; `auth_user_id` boş kalabilir (Soru 4). Sistemde `authenticated` rolünün **yazabildiği ilk tablolar** — gerekçe: `DECISION_LOG.md` — "İş verisi RLS ile yazılır, kimlik işlemleri Edge Function'da kalır". Öğretmen ve veli bu dilimde hiçbir öğrenci göremez; kapsamları v1.2-02 ve v1.2-03'ten gelir ve bugün bilinçli olarak **kapalıdır** (K-04).

  **Sonradan düzeltme (2026-09-04, K-11):** Bu cümlenin öğretmen yarısı **karşılığını buldu.** v1.2-02 `class_teachers` ve `class_enrollments` tablolarını getirdi; `students_select_teacher` politikası eklendi ve öğretmen artık **yalnızca kendi sınıfındaki** öğrencileri okuyabiliyor (yazamıyor — "öğretmen öğrenci ekleyemez", 2026-08-29). **Veli yarısı da aynı gün v1.2-03'te kapandı:** `student_guardians` geldi; `students_select_guardian`, `classes_select_guardian` ve `class_enrollments_select_guardian` politikaları eklendi. v1.2-01'in bu cümlesinin artık açık bıraktığı bir şey yok.

- [x] `student_guardians` — veli–öğrenci bağı (**v1.2-03**). Velinin kapsamı **rolünden değil bu bağdan** gelir: rolü `parent` olup hiçbir öğrenciye bağlı olmayan hesap hiçbir şey görmez. Veli yalnızca **okur** — ne öğrenci kaydını, ne sınıfını, ne bağını değiştirebilir. Bir veli aynı öğrencinin **diğer velisini görmez**; velayet durumlarında bu bilgi ona ait değildir.
- [x] Öğretmen-sınıf/ders atamaları (**v1.2-02**). `class_teachers` **üyeliğe** bağlanır, role değil: rolü `admin` olan biri de ders verebilir ve bunun için ikinci üyeliğe ihtiyaç duymaz (`DECISION_LOG` 2026-08-25). Sınıfın rehber öğretmeni ayrı bir ilişkidir ve `classes.mentor_membership_id` sütununda yaşar.
- [x] `classes`, `class_enrollments`, `subjects` (**v1.2-02**). Dönem/akademik yıl tablosu **yok**: yeni yıl yeni sınıf satırı açar, eskisi arşivlenir ve benzersizlik kısmi indeksten gelir, böylece "YKS 12-A" adı her yıl yeniden kullanılabilir.
- [x] `schedule_entries` — ders programı (**v1.2-07**). Gün, **ISO 8601 numarasıdır (1–7)**: veritabanı istemcinin beş günlük sınırını miras almadı çünkü dershanede hafta sonu kursu gerçek. Program **kurumun planıdır**: okuma geniş (yönetici, sınıfı okutan öğretmen, saati kendisine yazılmış vekil, öğrenci, veli), yazma yalnızca yöneticide — öğretmen programı değiştirebilseydi oda ve saat çakışmalarını kurumun haberi olmadan üretirdi. Aynı öğretmeni aynı saate iki sınıfa yazmak **veritabanı düzeyinde** engelleniyor.
- [x] `daily_feed_posts`, kişisel `tasks` ve `calendar_events` için ayrı modeller (**v1.2-09**). İki model ayrı tutuldu: duyuru hedefine göre yayılır, kişisel kayıt hiçbir yere yayılmaz. **`tasks` ve `calendar_events`, kurum yöneticisinin de göremediği ilk tablolar** — kişisel çalışma alanı kurumun değil kişinindir. Ölçülebilir hâli: o iki tablonun politikalarında `admin` geçen **sıfır** ifade var.
- [x] `attendance_sessions`, `attendance_records` (**v1.2-04**). Ders yoklaması ve günlük yoklama **birlikte** destekleniyor: `subject_id` doluysa ders, boşsa gün. **Öğretmenin sistemdeki ilk yazma yetkisi** burada açıldı ve role değil **atamaya** bağlandı: rolü `teacher` olup o sınıfa atanmamış biri yoklama alamaz, rolü `admin` olup atanmış biri alabilir. Yoklamayı kimin aldığı istemciden gelmiyor — sütun yazma yetkisinde yok, trigger çağıranın kimliğinden dolduruyor.
- [x] `homework_assignments` (**v1.2-08**). Yazma yetkisi yoklamadaki kalıbın aynısı: role değil **atamaya** bağlı. Ödev vermek **yürütmedir** — programı kurum kurar (paylaşılan kaynak bağlar), ödevi öğretmen verir (yalnızca kendi dersini bağlar). Ödevi kimin verdiği istemciden gelmez; trigger çağıranın kimliğinden doldurur. Öğrenci bazında teslim takibi kapsam dışı: ödev sınıfa verilir.
- [x] `exams`, `exam_results` ve güvenli sıralama RPC'si (**v1.2-05**). Sıralama bir **görünüm değil fonksiyon** oldu: `exam_ranking()`. Sebebi, RLS'in bu işi yapamaması — öğrenci tüm sıralamayı görmeli (kaçıncı olduğunu bilmesi için) ama yalnızca kendi ismini görmeli, yani gizlenmesi gereken şey satır değil **aynı satırın bazı sütunları**. Maskeleme yeni bir yetki kavramı getirmedi; v1.2-01…04'ün dört kapsamının birleşimi. Sınava girmemiş ve orada kimseyi okutmayan biri isimsiz dağılımı bile göremez.
- [x] `payment_plans`, `installments` (**v1.2-06**). Ödeme modülü **defter**, altyapı değil: kart, IBAN veya ödeme jetonu taşıyan hiçbir sütun yok ve olmayacak. **Öğretmen ödemeyi hiç görmez** — sistemde `current_user_teaches_student` kapsamının bilinçli olarak KULLANILMADIĞI ilk yer; ödeme kurum ile aile arasındadır. **Öğrenci de kendi planını görmez** (2026-09-04 kararı); ailenin borcu çocuğun ekranına düşmemeli. Taksit durumu (ödendi/gecikti) `paid_at` ve `due_date`'ten **türetilir, saklanmaz** (K-02).
- [x] Her tabloda tenant ve rol kapsamlı RLS; gerekli foreign key/index/constraint'ler (**v1.2-01…09**). On sekiz iş tablosu, 97 politika, altı kapsam yardımcısı. Bileşik yabancı anahtarlar tenant sınırını RLS'ten **bağımsız olarak** veri düzeyinde de tutuyor: başka kurumun sınıfına, dersine veya öğrencisine bağlanan hiçbir satır yazılamıyor.
- [ ] **Repository/query/mutation katmanı** — taşınabilirlik sınırının istemci tarafındaki dikişi. `educationData.ts` bugün bir dikiş ama sorgu katmanı değil; Faz E5'ten taşındı.
- [ ] **Loading ve error durumları.** Boş durumlar E5'te eklendi; bekleme ve hata durumları ancak eşzamansız veri gelince anlam kazanır.
- [ ] **Kilit sunucuda da devreye girsin.** İş tablolarının politikalarına `and not public.current_user_must_change_password()` koşulu eklenir. Fonksiyon E3'te yazıldı, süreyi de okuyor.

  **Yarısı v1.2-01'de yapıldı, kutucuk bilinçli olarak açık** (K-08: yarım biten iş tam işaretlenmez). `students` ve `guardians`'ın sekiz politikasının hepsi koşulu **baştan** taşıyor; koşulu dokuz dilim sonra eklemek, o dokuz dilimin kilitsiz yaşaması demekti. Kalan iş, dilim adının vaat ettiğinden **daha küçük** ama hâlâ gerçek: bu tarihten önce yazılmış tablolar (`profiles`, `organizations`, `branches`, `organization_memberships`, `audit_events`) koşulu taşımıyor. v1.2-11 artık "hepsine ekle" değil, "eskileri tara ve tamamla" işidir.

- [x] **Dolu kurumun silinmesi engellensin** (#150). `internal_delete_organization` artık kurumda içerik varsa reddediyor: `ORB01` SQLSTATE'i ile durur, engelleyen tablo ve satır sayısını döner, hiçbir şey silmez ve "silindi" denetim kaydı yazmaz — reddin kendi kaydını Edge Function yazar. **Sabit tablo listesi yok:** `public` şemasında `organization_id` taşıyan her tablo, dört yapısal tablo (`branches`, `organization_memberships`, `audit_events`, `platform_audit_events`) dışında, içerik sayılır. Aşağıdaki her dilim tablosunu eklediği gün koruma onu kimse bir şey yazmadan kapsar. **Bunun karşılığı bir varsayımdır: kuruma ait her tablo `organization_id` taşır** — taşımayan bir tablo yalnızca bu korumayı değil tenant modelinin tamamını deler.

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

- [x] İstemci tarafı hareketsizlik sayacı: belirli süre işlem yoksa oturum kapatılır. Supabase'in sunucu tarafı oturum zaman aşımı Pro plan gerektirdiği için ücretsiz karşılığıdır; dershanenin ortak bilgisayarında açık bırakılan tarayıcı senaryosuna karşı etkilidir. Sayaç **#128**'de yazıldı (tarayıcı kapansa da süre işlemeye devam ediyor), **#143**'te tamamlandı: süre dolduğunda yalnızca ekran değil **jeton** da temizleniyor — öncesinde sayfayı yenilemek kilidi aşıyordu.

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
- [x] **Demo verisi production paketinden çıkarılsın** (#144). Çözüm isimleri değiştirmek değil, `isDemoMode`'u **derleme zamanı sabitine** çevirmek oldu: karar artık `vite.config.ts`'te bir kez veriliyor ve define olarak gömülüyor, böylece `isDemoMode ? demoX : []` üçlüleri üretim derlemesinde `[]`'e çöküyor ve `demoData.ts` ulaşılamaz hale gelip eleniyor. İki yönde de ölçüldü: üretim paketinde altı demo isminin altısı da **0**, preview (demo) paketinde hepsi yerinde — satış sunumu bozulmadı. Paket 944K → 916K.

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
- [x] **Her rolün yalnızca kendi kapsamını gördüğü doğrulanır.** Koşuldu: **2026-08-29**, dört rolle ayrı ayrı giriş yapılarak, her ekran tek tek gezilerek.

  **Sonuç: kapsam doğru.** Dört rolün menüsü de `educationAccess.ts`'teki listeyle birebir uyuştu — öğretmende Ayarlar/Otomasyonlar/Kayıt-Ödemeler yok, öğrencide beş bölüm, velide altı. Kurumlar arası hiçbir sızıntı görülmedi. Sınavlar ekranı personel ile öğrenci/veliyi doğru ayırıyor ("Kurum ortalaması" ↔ "Puan"). `HomeworkCreateDialog` fail-closed çalışıyor: sınıf listesi boş, düğme kapalı.

  **Ölçülemeyen tek şey kalmadı:** bu adım #116 kapanana kadar koşulamıyordu, çünkü ekranlarda başkasının adı yazarken "kendi kapsamını görmek" doğrulanamıyordu.

**Release gate: karşılandı.** Zincirin hiçbir adımında elle veritabanı müdahalesi gerekmedi.

#### E7.2 - İkinci canlı turdan çıkan bulgular (2026-08-29)

Aynı tur, zincirin **etrafındaki** ekranlarda 28 gözlem üretti. Bunlar 7 issue'da toplandı; ikisi kimlik zincirini değil, ekranların doğruluğunu ilgilendiriyor.

| #    | Bulgu                                                                                                                    | Dilim | Durum |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ----- | ----- |
| #131 | Beş ekran yapılmayan işi yapılmış gibi bildiriyor (sahte `toast.success`)                                                | A     | açık  |
| #132 | Oturum sekmeler arasında ortak; ikinci sekme giriş ekranı görmeden açılıyor                                              | A     | açık  |
| #133 | `roleMeta` demo kimlikleri üretimde okunuyor — veli başlığında "Zeynep Kaya"                                             | A     | açık  |
| #134 | Arkasında iş olmayan beş ekran dürüstlük notu taşımıyor (Bildirimler, Sistem, Veri İçe Aktarma, Veri Yönetimi, Raporlar) | A     | açık  |
| #135 | Ayarlar yalnızca kurum yöneticisinde; kişisel ayarlar diğer üç rolde hiç yok, Tema kategorisi hiç yok                    | B     | açık  |
| #136 | Kapsam sabit metinlerle belirleniyor; `PageHeader` her eyleme artı basıyor; rol kapısı iki yerde                         | B     | açık  |
| #137 | Başlıklar role çevrilmiş, içerik çevrilmemiş — öğretmene/veliye personel metrikleri                                      | B     | açık  |

**En ağır olan #131.** Uydurma veriden daha tehlikeli, çünkü görünmez: bir öğretmen yoklama alır, "Yoklama kaydedildi" bildirimini görür, düğme "Kaydedildi"ye döner — ve hiçbir kayıt oluşmamıştır.

**Çözüm kalıpları depoda zaten var.** #131 için `SettingsSecuritySection.tsx:30`'un dürüst `toast.info`'su; #137 için `AssessmentsPage`'in rol ayrımı; #136 için `HomeworkCreateDialog`'un fail-closed deseni. Üçü de yazılmış, sadece diğer ekranlara uygulanmamış.

**Sıra bağlayıcı:** A önce, B sonra. `EducationPlatform.tsx`, `PaymentsPage.tsx` ve `CommunicationsPage.tsx` her iki dilimde de değişiyor.

#### E7.1 - Canlı koşudan çıkan bulgular (2026-08-26/27)

Zincir çalışıyor. Aynı koşu, zincirin **etrafındaki** ekranlarda beş şey gösterdi:

| #    | Bulgu                                                                                                                             | Durum       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| #116 | Dört panelin dördü de canlıda uydurma veri gösteriyor. Öğrenci ve veli **başkasının adıyla** karşılanıyor ("Merhaba Zeynep").     | **kapandı** |
| #117 | Ders programı gün şeridi: "Bugün" Pazartesi'ye sabit, düğmeler tıklanamıyor.                                                      | **kapandı** |
| #118 | Kurtarma: "Bağlantı gönderildi" yalanı kalktı, kurtarma kanalı durumu görünür oldu. **E4'ün ikinci yarısı sağlayıcıyı bekliyor.** | kısmen açık |
| #119 | Şube seçimi zorunlu oldu; "Kurum geneli" artık bilinçli seçim. Sınıf düzeyinde kapsam hâlâ yok — ayrı iş.                         | **kapandı** |
| #120 | Kayıt yokken takvim tamamen gizleniyordu.                                                                                         | **kapandı** |
| #128 | Hareketsizlik zaman aşımı soğuk açılışta sıfırlanıyordu; tarayıcı kapatılıp ertesi gün açıldığında oturum açık geliyordu.         | **kapandı** |
| #126 | Güvenlik ayarlarındaki üç kontrol hiçbir şey yapmıyordu; artık devre dışı ve zaman aşımı gerçek sabitten okunuyor.                | **kapandı** |
| #123 | İkinci dalga: İletişim'de uydurma yazışma, Ayarlar'da başka bir kurumun bilgileri, başlıkta uydurma akademik dönem.               | **kapandı** |

**Neden bugüne kadar kapanamadı:** "kendi kapsamını görmek" ölçülebilir bir şey değil, çünkü her rolün ekranında görülenin büyük kısmı veritabanından gelmiyor. Bir öğrencinin "yalnızca kendi verisini" gördüğünü, ekranda başka birinin adı yazarken doğrulayamayız. #116 kapandığına göre bu adım artık tek başına koşulabilir.

**Yetki tarafı ayrıca ölçüldü ve sağlam:** kurum izolasyonu `current_user_has_membership` içinde kaçışsız. Doğrulanamayan şey arayüzün ne gösterdiği, veritabanının ne verdiği değil.

---

## 4.6 Dilimler ve dayandıkları varsayımlar

> **Bu bölüm 2026-08-29 denetiminden çıktı.** Kalan bütün sürümler, tek tek çalışılabilir dilimlere bölünmüştür. Her dilim **neyin doğru olduğunu varsaydığını** yazar.
>
> Varsayım satırı süs değildir; **K-10** onu bir açılış kontrolüne, **K-11** de bir kapanış yükümlülüğüne bağlar:
>
> - **Açılışta:** dilimin varsayımları canlı sistemde tek tek doğrulanır. Doğrulanmayan varsayım engel değil, kapsamın parçasıdır.
> - **Kapanışta:** iş, başka bir dilimin varsayımını geçersiz kıldıysa kaydı düşülür — varsayımın yaşadığı yere.
>
> Varsayımlar bu grafiğin **kenarlarıdır**. Bir düğüm değişince hangi düğümlerin etkilendiği aranarak bulunur, hatırlanarak değil.
>
> **Kapsam burada değil.** Bu bölüm _sıra, bağımlılık ve varsayım_ tutar; bir dilimin **ne içerdiği** §4 ve §5'teki sürüm bölümlerinde yazılıdır ve orada kutucuklarıyla izlenir. Aynı olguyu iki yerde yazmıyoruz (**K-06**) — dilimler kapsamı tekrar etmez, ona **atıf verir**.

### v1.2 · İlişkisel veritabanı ve RLS

**Bugünkü gerçek (denetimde ölçüldü):** iş tablolarının **hiçbiri yok**. 40 eğitim bileşeninin 37'si hiçbir veriye bağlı değil; `educationData.ts`'in her ihracı `isDemoMode ? demo… : boş` kalıbında sabitlenmiş ve dosyanın Supabase importu **sıfır**.

Bu yüzden v1.2 "tabloları ekle" işi değildir. Her varlık için **dört katman** birden gerekir: tablo → RLS → servis → ekran bağlantısı. Dilimler bu dörtlüye göre kesilmiştir.

**Kapsam ve release gate için §4 → "v1.2 - İlişkisel Veritabanı ve RLS"**. Aşağıdaki tablo o maddelerin _sırasını ve bağımlılığını_ verir, içeriğini değil.

| Dilim          | Kapsam                                                                         | Dayandığı varsayımlar                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --- | ----- | --------------------------------------------------------------- |
| **v1.2-01** ✅ | `students`, `guardians`                                                        | **Üçü de 2026-09-04'te canlı sistemde doğrulandı.** Bir giriş hesabı tek kuruma aittir — kısıt şemada değil kimlik katmanında (giriş numarası `<kurum:4><kişi:4>`) · `auth_user_id` opsiyonel kalabilir (Soru 4) · `anon` hiçbir tabloda yetkili değil (grant sorgusu: sıfır satır)                                  |
| **v1.2-02** ✅ | `classes`, `class_enrollments`, `subjects` + öğretmen–sınıf/ders ataması       | **Üçü de 2026-09-04'te canlı sistemde doğrulandı.** v1.2-01 production'da ✅ · Ders vermek bir **atama**, rol değil — canlı veritabanında `teacher`'a atıf yapan **sıfır** politika vardı, yani yanlış modelin kalıntısı yoktu · `admin` yetkileri `teacher`'ı kapsar (teacher hiçbir tabloda ayrıcalık taşımıyordu) |
| **v1.2-03** ✅ | `student_guardians` (veli–öğrenci bağı)                                        | **Üçü de 2026-09-04'te canlı sistemde doğrulandı.** v1.2-01 production'da ✅ · `parent` rol olarak kalır — canlı kurumda aktif bir `parent` üyeliği var, kapsamı ise bağdan geliyor · Çoklu rol için ikinci hesap: `(organization_id, user_id)` unique indeksi aynı kurumda ikinci üyeliği zaten imkânsız kılıyor    |
| **v1.2-04** ✅ | `attendance_sessions`, `attendance_records`                                    | **İkisi de 2026-09-04'te canlı sistemde doğrulandı** — v1.2-01 ve v1.2-02 production'da, 44 politika ve altı kapsam yardımcısı ayakta. Bu dilim yeni kapsam **kurmadı**, mevcut yardımcıları yeniden kullandı                                                                                                        |
| **v1.2-05** ✅ | `exams`, `exam_results` + güvenli sıralama                                     | **Üçü de 2026-09-04'te canlı sistemde doğrulandı** — v1.2-01 ve v1.2-02 production'da; Soru 6'nın "diğerleri anonim" şartı `exam_ranking()` ile karşılandı ve hem satır sayısı hem görünen isim sayısı ayrı ayrı ölçüldü                                                                                             |
| **v1.2-06** ✅ | `payment_plans`, `installments`                                                | **Üçü de 2026-09-04'te canlı sistemde doğrulandı** — v1.2-01 ve v1.2-03 production'da; "kart verisi kapsam dışı" bir niyet değil ölçüm: şemada `card                                                                                                                                                                 | iban | cvv | token | bank` kalıbına uyan **sıfır** sütun var ve bu dilim de eklemedi |
| **v1.2-07** ✅ | `schedule_entries` (ders programı)                                             | **2026-09-05'te koda bakılarak doğrulandı:** `getTodayWeekDay()` günü `new Date()`'ten türetiyor, yani #117'nin düzeltmesi canlı ve "gün alanı gerçek" varsayımı geçerli                                                                                                                                             |
| **v1.2-08** ✅ | `homework_assignments`                                                         | ⚠️ **Beyan edilen varsayım YANLIŞ çıktı** — aşağıdaki nota bakınız. v1.2-02 production'da ✅                                                                                                                                                                                                                         |
| **v1.2-09** ✅ | `daily_feed_posts` · kişisel `tasks` ve `calendar_events`                      | **2026-09-05'te doğrulandı:** v1.2-02 production'da; iki modelin bugün karışmadığı da ölçüldü — Gün Planı arayüzde var, Günlük Akış **hiç yok** (`grep -rn "Akış" client/src` → sıfır), veritabanında da ikisini birleştiren bir şey yoktu                                                                           |
| **v1.2-10** ✅ | **Kapsam çözümleyicisi** — kapsam istemciden veritabanına taşındı              | **2026-09-05'te doğrulandı:** v1.2-02 ve v1.2-03 production'da; `scopeFilters.ts`'in üretim dalı gerçekten boş küme dönüyordu (7 fonksiyon, 6 ekran)                                                                                                                                                                 |
| **v1.2-11**    | **Kilit sunucuda devreye girsin** 🔒 — kapsamı **daraldı**, bkz. aşağıdaki not | ~~v1.2-01…09~~ · v1.2-01'den itibaren her yeni tablo koşulu **baştan** taşıyor; kalan iş yalnızca 2026-09-04 öncesi tabloları taramak                                                                                                                                                                                |
| **v1.2-12**    | Kurum denetim kaydı ekranı (**#149**)                                          | `audit_events` yazılıyor ve `audit_events_select_admin` politikası var · İzlenebilirlik kararı (`DECISION_LOG` 2026-08-25)                                                                                                                                                                                           |

> ✅ **#150 kapandı ve artık hiçbir dilimin kapsamına girmiyor.** Fonksiyon eskiden içerik koruması taşımıyordu ve her dilim "yeni tablomu kontrol listesine eklemeyi hatırlamak" zorundaydı. Koruma ters çevrildi: `organization_id` taşıyan her tablo varsayılan olarak korunuyor, istisna listesi ise elle düzenleniyor. Yeni bir tablo eklendiğinde yapılacak bir şey **yok** — unutmanın sonucu artık veri kaybı değil, açıkça reddedilen bir silme.
>
> ⚠️ **Karşılığı, her dilimin beyan etmesi gereken bir varsayımdır:** _tablom `organization_id` taşıyor._ Taşımıyorsa koruma onu göremez; ama o tablo zaten tenant modeline uymuyordur ve dilim açılışında (**K-10**) bu yakalanmalıdır.
>
> ⚠️ **İkinci karşılık:** silme onay ekranındaki sayılar (`platform_organization_stats`) yalnızca üyelik, şube ve denetim kaydı sayıyor. Yeni bir iş tablosu o görünüme eklenmezse operatör "boş" görünen bir kurumu silmeye çalışır ve reddedilir — zarar yok, ama şaşırtıcı. Görünümü genişletmek her dilimin isteğe bağlı işidir; **korumanın doğruluğu buna bağlı değildir.**

> ❌ **v1.2-08'in varsayımı yanlıştı — K-10'un işe yaradığı yer.** Bu satır eskiden "`HomeworkCreateDialog` fail-closed çalışıyor" diyordu. **2026-09-05'te koda bakıldı ve tersi bulundu:** diyalog üretimde `toast.success("Ödev oluşturuldu")` diyor, kaydı yalnızca React state'ine ekliyor ve ilk sayfa yenilemesinde kayıt kayboluyordu — üretimde `writeDemoData` no-op ve `initialHomework` boş dizi. Karşılaştırma net: `AttendancePage` aynı durumda doğruyu söylüyor, ödev diyaloğu söylemiyordu.
>
> K-10 gereği bu bir engel değil **kapsamın parçası**: diyalog aynı PR'da düzeltildi (üretimde artık "şu an bir kayıt oluşturulmadı" diyor, demo modunda davranış değişmedi) ve kalıp **K-14** olarak kural listesine eklendi — bu, aynı hatanın üçüncü örneğiydi (#131, #134, ödev).

> ⚠️ **v1.2-09 da bir K-11 kaydı bıraktı — ve bu üçüncüsü.** `educationData.ts` kişisel verileri `dayPlanTasksByRole` ve `dayPlanEventsByRole` adlarıyla **role göre** tutuyor. Rol bazlı bir liste gerçek veride çalışmaz: aynı kurumdaki iki öğretmen tek listeyi paylaşır ve birinin notu diğerine görünür. Veri modeli **kullanıcı bazlıdır** (Soru 5) ve ekran bağlanırken o yapı kullanıcıya göre yeniden kurulmalıdır. **Kontrol noktası v1.2-10'dan v1.3-01'e kaydı (2026-09-05):** aynı sebeple — v1.2-10 ekran bağlamadı.
>
> Ayrıca: "Günlük Akış" bugün arayüzde **hiç yok**. Tablo ekranından önce geldi — sorun değil ama v1.2-10'un iş listesine bağlanacak değil **yazılacak** bir ekran ekliyor.

> ⚠️ **v1.2-07 bir K-11 kaydı bıraktı.** Veritabanı haftanın **yedi** gününü kabul ediyor; istemcideki `WeekDay` tipi yalnızca **beş** (Pazartesi–Cuma). Ekran bu tabloya bağlandığında ya tip yediye genişletilmeli ya da hafta sonu dersleri **açıkça** kapsam dışı ilan edilmeli. **Kontrol noktası v1.2-10'dan v1.3-01'e kaydı (2026-09-05):** v1.2-10 ekranı tabloya bağlamadı, yalnızca istemcideki kapsam mantığını kaldırdı; ekran bağlantısı v1.3-01'in işi. Sessizce dar kalırsa sonuç, kaydedilmiş ama hiçbir ekranda görünmeyen ders satırlarıdır — kullanıcının veri kaybı sandığı, aslında görüntülenmeyen kayıtlar.

> ✅ **v1.2-10'un K-11 kaydı kapandı (2026-09-05).** E7.2-B2'nin "üretimde boş küme" varsayımı gerçekten geçersizleşti ve `scopeFilters.ts`'in başlık notu yeniden yazıldı. Dosya artık bir **güvenlik sınırı değil**: sınır RLS, oradaki `if (isDemo)` dalları yalnızca satış sunumu için.
>
> **Bu bir hazırlık değil hata düzeltmesiydi.** Üretim dalı boş küme bırakılsaydı, v1.3'te veri aktığı gün RLS'in doğru getirdiği satırları ekran yok ederdi: her öğretmen, öğrenci ve veli boş bir panel görür ve sebebi hiçbir hata mesajında görünmezdi.
>
> ⚠️ **Değişiklik sırasında bir hata yapıldı ve testler yakaladı:** o `return []` satırı **iki iş birden** yapıyordu — hem üretimin cevabıydı, hem de demo modunda filtresi olmayan rollerin kapısı. Geçirgen yapılınca demo modunda üç fonksiyon sızmaya başladı (öğrenci, yoklama ekranında bütün öğrencileri görüyordu). Kapılar ayrı ayrı geri kondu ve üçünü birden bekleyen bir regresyon testi eklendi.

> 🔒 **v1.2-11 atlanabilir görünür, atlanamaz.** Zorunlu şifre değişimi kilidi bugün **yalnızca istemcide** duruyor; kilitli bir kullanıcı REST API'yi doğrudan çağırabilir. Bugün zararı sınırlı çünkü erişebileceği tek şey kendi profili ve üyeliği. **İş tabloları geldiği anda bu, kilidin hiç var olmaması demektir.** Bu yüzden dilim v1.2-01…09'un tamamına bağlıdır: her yeni tablonun politikasına `and not public.current_user_must_change_password()` koşulu girmelidir.
>
> _2026-08-29 denetiminde bu madde **gözden kaçtı**: RLS politikaları listelendi ama hangi koşulun eksik olduğu sorulmadı. §4'teki kutucuk sayesinde bulundu — iki kaydın birbirini denetlemesinin işe yaradığı bir örnek._
>
> **Sonradan düzeltme (2026-09-04):** Yukarıdaki "dilim v1.2-01…09'un tamamına bağlıdır" cümlesi artık geçerli değil. v1.2-01, koşulu kendi sekiz politikasına **baştan** koydu ve bunu sonraki dilimler için de kural hâline getirdi. Gerekçe: v1.2-01 sistemin **yazma yetkisi olan ilk iş tablosunu** getiriyordu; koşulu dokuz dilim sonraya bırakmak, o dokuz dilimin kilitsiz yaşaması demekti. v1.2-11 artık "hepsine ekle" değil **"2026-09-04 öncesi tabloları tara ve tamamla"** işidir — ve o tabloların listesi bugün bilinen ve sonlu bir listedir: `profiles`, `organizations`, `branches`, `organization_memberships`, `audit_events`.

> ⚠️ **v1.2-01'in açıkta bıraktığı iş — sahibi var (K-12).** `platform_organization_stats` genişletilmedi; operatörün silme onay ekranı öğrenci ve veli sayısını **göstermiyor**. Sonucu: kurumun 40 öğrencisi varken ekran "0 üye, 1 şube" der, operatör silmeye çalışır ve `ORB01` ile reddedilir. Zarar yok, koruma çalışıyor — ama operatör neden reddedildiğini ekranda göremez.
>
> **Şart:** öğrenci yazan ilk ekran geldiğinde. **Kontrol noktası:** v1.4-01 (öğrenci kaydı CRUD) açılışı. **Yapılacak iş:** fonksiyona `student_count` ve `guardian_count` eklemek ve panelde göstermek. Bu dilimde yapılmadı çünkü fonksiyona anahtar eklemek panel arayüzünü de değiştirmeyi gerektiriyor ve dilimin sınırı "tablo + RLS + test" olarak çizildi.

### v1.3 · Ekranların canlı veriye bağlanması

**E5 bu sürümün mock temizliği kısmını tamamladı.** Kalan, ekranların gerçekten sorgu atması.

**Kapsam ve release gate için §4 → "v1.3 - Dinamik Frontend ve Temiz Kurum Görünümü"**. Orada Realtime abonelikleri ve hesaplar arası geçişin tasarım kuralları da yazılıdır.

| Dilim       | Kapsam                                                                             | Dayandığı varsayımlar                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.3-01** | `educationData.ts` yerine gerçek servisler                                         | v1.2 tamamı · `components/` Supabase istemcisini import edemez (taşınabilirlik sınırı, ESLint zorluyor)                                                     |
| **v1.3-02** | Yükleme ve hata durumları                                                          | v1.3-01 · `skeleton.tsx` var ama hiçbir eğitim ekranı kullanmıyor                                                                                           |
| **v1.3-03** | ✅ Giriş ekranının uydurma verisi + demo verisinin paketten çıkarılması (**#144**) | Bağımsızdı, kapandı                                                                                                                                         |
| **v1.3-04** | Hesaplar arası geçiş düğmesi ve kişi kaydı                                         | Çoklu hesap kararı (`DECISION_LOG` 2026-08-25) · ⚠️ **zemin notu 2026-08-29**: oturum artık `sessionStorage`'da, kararın iki paragrafı bu dünyada yazılmadı |

### v1.4 · Yetkili CRUD ve operasyon akışları

**Kapsam ve release gate için §4 → "v1.4 - Yetkili CRUD ve Operasyon Akışları"**.

| Dilim       | Kapsam                                                | Dayandığı varsayımlar                                                                                               |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **v1.4-01** | Öğrenci kaydı CRUD                                    | v1.2-01 · v1.3-01 · Öğretmen öğrenci **ekleyemez** (2026-08-29 kararı)                                              |
| **v1.4-02** | Sınıf yönetimi                                        | v1.2-02                                                                                                             |
| **v1.4-03** | Yoklama akışı                                         | v1.2-04 · Bugün "Yoklamayı kaydet" hiçbir şey kaydetmiyor ve bunu söylüyor (#131)                                   |
| **v1.4-04** | Sınav sonucu girişi                                   | v1.2-05                                                                                                             |
| **v1.4-05** | Ödev akışı                                            | v1.2-08                                                                                                             |
| **v1.4-06** | Ödeme takibi                                          | v1.2-06                                                                                                             |
| **v1.4-07** | Üye satır işlemleri: rol değiştirme, kurumdan çıkarma | E6'dan kalan · `CredentialsPanel` `components/credentials/` altında ortak                                           |
| **v1.4-08** | Kurum yöneticisi devri                                | v1.4-07 · Bugün tek "kaldırma" işlemi kurumu silmek                                                                 |
| **v1.4-09** | Şube yönetimi (ikinci şube açma)                      | #119 şube seçimini zorunlu kıldı ama **ikinci şube üretilemiyor** — kurulumda gelen varsayılan şube dışında yol yok |

> **v1.4'ün her CRUD dilimi denetim kaydı yazar.** İzlenebilirlik kararı bunu "atlanamaz" diyor; **#149** ekranı v1.4'ten önce gelmelidir, yoksa kayıtlar birikirken kimse göremez.

### v1.5 · Kabul, hukuk ve pilot hazırlığı

**Kapsam ve release gate için §4 → "v1.5 - Functional MVP ve Kapalı Beta"**.

| Dilim       | Kapsam                                               | Dayandığı varsayımlar                                                                                     |
| ----------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **v1.5-01** | Dört rol kabul testi                                 | v1.4 tamamı · E7 zinciri (2026-08-29'da doğrulandı)                                                       |
| **v1.5-02** | **KVKK envanteri ve Frankfurt kararı**               | ⏳ **K-12 borcu**: karar _"ilk gerçek kurum verisinden önce"_ diyor, şartı kontrol edecek adım yazılmamış |
| **v1.5-03** | E-posta sağlayıcısı + E4'ün ikinci yarısı (**#118**) | ⏳ **K-12 borcu**: _"ilk gerçek kurum davetinden önce"_ · `recovery_email` sütunu ve GRANT kilidi hazır   |
| **v1.5-04** | Rate limit ve CORS denetimi                          | `ALLOWED_ORIGINS` bir güvenlik sınırı değil, CORS hijyeni                                                 |
| **v1.5-05** | Pilot geri bildirimi                                 | v1.5-01…04                                                                                                |

### v1.6 – v2.0 · Phase 2

**Kapsam için §5 → "Phase 2 - Operational Depth ve Core Product"**.

| Dilim       | Kapsam                                    | Dayandığı varsayımlar                                                                                                                                                                                                                                                                            |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **v1.6-01** | Storage: private bucket + signed URL      | ⚠️ `workspace_documents` bugün ölü ve **public URL** saklıyor (**#148**); bu tasarıma uymuyor — dilim açılışında kaldırma/uyarlama kararı verilir · 🔁 **S3-uyumlu arayüz zorunlu**, Supabase Storage istemcisine doğrudan bağlanılmaz (`DECISION_LOG` 2026-09-04, "Sistem taşınabilir kurulur") |
| **v1.6-02** | Sınav evrakı ve öğrenci fotoğrafı         | v1.6-01 · v1.2-01 · v1.2-05                                                                                                                                                                                                                                                                      |
| **v1.7-01** | CSV/Excel toplu aktarım                   | v1.2 tamamı · Bugün ekranı var, arkasında hiçbir şey yok ve bunu söylüyor (#134)                                                                                                                                                                                                                 |
| **v1.7-02** | Kolon eşleme ve idempotent import         | v1.7-01                                                                                                                                                                                                                                                                                          |
| **v1.8-01** | Güvenli aggregate view / RPC              | v1.2 tamamı · `platform_organization_stats` deseni (fail-closed + `search_path` sertleştirmesi)                                                                                                                                                                                                  |
| **v1.8-02** | Filtreleme, grafikler, rapor dışa aktarma | v1.8-01 · Öğretmen kurum ortalamasını **isimsiz** görür (2026-08-29 kararı)                                                                                                                                                                                                                      |
| **v2.0-01** | Hesap silme ve anonimleştirme             | ⚠️ Çoklu hesap ihtimali: aynı kişinin birden fazla kaydı olabilir, eksik silme riski (`DECISION_LOG` 2026-08-25)                                                                                                                                                                                 |
| **v2.0-02** | Backup ve kurtarma                        | —                                                                                                                                                                                                                                                                                                |
| **v2.0-03** | Ticarileşme kapısı: tüm gate'ler          | Yukarıdakilerin tamamı                                                                                                                                                                                                                                                                           |

> 🔁 **v1.6-01 taşınabilirliğin ilk gerçek sınavıdır.** Bugüne kadar hiç kullanılmamış tek Supabase bileşeni Storage'dır; dolayısıyla yeni sağlayıcı bağımlılığı yaratabilecek tek yer orasıdır. Şema, RLS ve testler düz Postgres olduğu için zaten taşınabilir — Storage sağlayıcının kendi istemcisine bağlanırsa bu tabloyu bozan ilk parça o olur. Ayrıntı ve ölçümler: `DECISION_LOG.md` — "Sistem taşınabilir kurulur; sağlayıcı bir tercih, bağımlılık değildir".

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
