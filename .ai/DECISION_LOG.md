# DECISION_LOG.md — ORBIT

> Mini-ADR formatında karar kaydı. Format: `PROJECT_ARCHITECT.md` §04.

---

### Karar: Repo görünürlüğü — Private

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** `ardabulent/orbit_v2` reposu public olarak oluşturulmuştu; repo gerçek bir dershane/CRM ürününün iş mantığını, veri modellerini ve ticari fikirleri içeriyor.
**Karar:** Repo GitHub üzerinde Private'a çevrildi.
**Gerekçe:** Ticari/finansal iş mantığı ve müşteri veri modelleri üçüncü tarafların erişimine kapalı tutulmalı.

**Bu karar 2026-08-23 tarihinde değiştirildi — bkz. aşağıdaki "Repo görünürlüğü Public'e alındı" kaydı.**

---

### Karar: MoneyFlow kalıntılarının temizlenmesi ve ORBIT Eğitim Çekirdeğinin kurulması

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** Repoda eski MoneyFlow döneminden kalma 15+ adet ölü bileşen, kullanılmayan 1438 satırlık vitrin ve 83 KB'lık eski tarihçe birikmişti.
**Karar:** Tüm ölü dosyalar silindi, `Home.tsx` ve stiller temizlendi. Repo saf ORBIT Eğitim Platformu haline getirildi.
**Gerekçe:** Repoyu sıfırdan başlayan net, tip güvenli ve yeni geliştiricinin anında anlayabileceği bir eğitim CRM platformuna dönüştürmek.

---

### Karar: MVP Faz 1 Kapsamı — Saha Doğrulaması & Müşteri Görüşmesi Odaklı Mimari

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent & Hamza Bayrak

**Bağlam:** Hedef kitle devlet kısıtlılıklarına tabi olmayan özel kurslar (LGS/YKS kursları, butik etüt merkezleri, dil kursları). İlk hedef, birkaç gün içinde çalışan bir MVP çıkarıp potansiyel müşterilere sahada göstererek geri bildirim toplamak.
**Karar:**

1. **MVP Çekirdeği:** Sınıf & Grup Yönetimi + Öğrenci Yönetimi (Ad, No, Sınıf, Tel, Veli Ad/Tel) + 4 Rol Arayüzü (Admin, Öğretmen, Öğrenci, Veli).
2. **Auth & 3. Parti Entegrasyonlar:** Saha görüşmelerinde sürtünmeyi sıfıra indirmek amacıyla karmaşık Auth ve harici SMS/ödeme API'leri MVP sonrasına bırakıldı; tek tıkla rol değiştirilebilen interaktif demo modu benimsendi.
3. **Mock Veri İzolasyonu:** Kurumun dolu görünmesini sağlayan örnek veriler `isMock: true` bayrağı ile işaretlenecek ve istendiğinde tek tıkla temizlenebilecek.
4. **Dağıtım & Bütçe:** GitHub + Vercel entegrasyonu ile 0₺ bütçeli anlık canlıya alma.

**Gerekçe:** Hız, sıfır maliyet ve müşteriyle doğrudan temas kurarak gerçek ihtiyaçları en kısa sürede öğrenmek.

---

### Karar: EducationPlatform Bileşen Bölünmesi, Mock Veri İzolasyonu ve ESLint Kalite Kapısı

**Durum:** Alındı
**Tarih:** 2026-08-18
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** `EducationPlatform.tsx` 2659 satıra ulaşmış tek dosyalık bir bileşendi; `.ai/` dokümantasyonu MVP kapsamında `isMock`/localStorage/reset butonu tanımlıyordu ama kodda hiçbiri yoktu; repoda hiçbir ESLint kurulumu bulunmuyordu.

**Karar:**

1. `EducationPlatform.tsx`, rol/sayfa bazlı ayrı dosyalara bölündü (`components/education/`), gelecekteki `feat/*-profile` dallarındaki merge çakışmalarını azaltmak amacıyla.
2. Sadece gerçekten mutasyona uğrayan iki veri kümesi (`attendances`, `automations`) için `lib/demoStorage.ts` ile localStorage kalıcılığı ve sıfırlama aksiyonu eklendi; `students`/`classes`/`schedule`/`paymentRows` yalnızca `isMock: true` bayrağı ile işaretlendi (henüz mutasyon yolu olmadığı için kalıcılık eklenmedi).
3. ESLint 9 flat config + typescript-eslint + eslint-plugin-react-hooks, tip kontrollü (type-checked) kural setleri olmadan eklendi; `eslint-plugin-react-hooks` bilinçli olarak v5'e sabitlendi (v7'nin React Compiler odaklı yeni kuralları ilk kalite kapısı için gereksiz sürtünme yaratacaktı).

**Gerekçe:** Sürdürülebilirlik (dosya bölünmesi), demo sunumlarının sayfa yenilemeye dayanıklı olması (persistence), ve ekip büyürken kod kalitesinin otomatik denetlenmesi (ESLint). RLS, tam CRUD ve gerçek Auth bu kapsamın dışında bırakıldı — bunlar Aşama 3'te ele alınacak.

---

### Karar: Sistemik Graph-First Düşünme, Blast Radius ve 6 Boyutlu Risk Protokolü

**Durum:** Alındı
**Tarih:** 2026-08-18
**Kararı Onaylayan(lar):** Arda Bülent & Hamza Bayrak

**Bağlam:** Vibe-coding yapan ekiplerde YZ ajanlarının körü körüne koda atlayarak yan etkileri (blast radius), ticari maliyetleri, KVKK açıklarını ve pik yük darboğazlarını göz ardı etme riski bulunmaktadır.
**Karar:** `PROJECT_ARCHITECT.md` §00 Kural 8 ve Bölüm 08 ile `CONTRIBUTING.md` ve `.github/PULL_REQUEST_TEMPLATE.md` içine "Graph-First Düşünme Protokolü" eklendi. Tüm YZ ajanları ve geliştiriciler değişiklik öncesinde:

1. Netleştirici sorular sormak,
2. Problemi 6 Boyutlu Graf Haritası (Teknik Kod/Tipler, Ticari Bütçe, Hata/Fallback, KVKK/Gizlilik, Pik Yük, Güvenlik) olarak modellemek,
3. Risk durumunda proaktif itiraz (pushback) yaparak güvenli alternatifi sunmakla yükümlü kılınmıştır.

**Gerekçe:** Mimari bozulmaları, beklenmedik maliyet patlamalarını ve regülasyon ihlallerini daha ilk satır kod yazılmadan graf seviyesinde önlemek.

---

### Karar: ORBİT Vercel Ekibi + Mevcut Supabase Projesiyle Güvenli Platform Bağlantısı

**Durum:** Alındı
**Tarih:** 2026-08-21
**Kararı Onaylayan(lar):** Hamza Bayrak

**Bağlam:** `orbit_v3` için ayrı bir Vercel deployment'ı ve Supabase bağlantısı gerekiyordu. Supabase hesabında iki aktif ücretsiz proje bulunduğu için üçüncü proje maliyet/limit riski taşıyordu. Mevcut `orbit-dershane` projesinde belge tablosu ve storage bucket için anonim okuma, ekleme ve silme politikaları tespit edildi.

**Karar:**

1. Vercel projesi iki kişilik erişime uygun `ORBİT` ekibi altında `orbit-v3` adıyla oluşturuldu ve `Hamzabyrk/orbit_v3` GitHub reposuna otomatik deployment için bağlandı.
2. Yeni ve potansiyel olarak ücretli Supabase projesi yerine mevcut `orbit-dershane` projesi yeniden kullanıldı.
3. `VITE_SUPABASE_URL` ve yalnızca public `VITE_SUPABASE_ANON_KEY`, Vercel Production/Preview/Development ortamlarına eklendi; `service_role` anahtarı aktarılmadı.
4. Belge tablosundaki ve storage bucket'taki tüm public/anon politikalar kaldırıldı, bucket private yapıldı. Auth ve tenant sahipliği gelene kadar erişim deny-by-default kalacak.

**Gerekçe:** Ücretsiz katmanı korurken iki kişilik ekip erişimini sağlamak; public Vite anahtarının yetkisiz veri okuma/yükleme/silme aracına dönüşmesini engellemek; gerçek veri ve Auth kapsamını yol haritasındaki Aşama 3'e bırakmak.

---

### Karar: v1.1 Membership Tabanlı Auth, Tenant RLS ve Ortam Ayrımı

**Durum:** Alındı
**Tarih:** 2026-08-21
**Kararı Onaylayan(lar):** Hamza Bayrak

**Bağlam:** v1.0 demosunda login ve sağ üst rol geçişi tamamen istemci state'iyle çalışıyordu. Bu davranış production'da herhangi bir ziyaretçinin admin görünümüne geçmesine izin verdiği için gerçek kullanıcı/veri aşamasına güvenli bir temel oluşturmuyordu.

**Karar:**

1. Production kimliği Supabase Auth e-posta/şifre oturumundan, rol ve tenant kapsamı `organization_memberships` kaydından gelir; rol hiçbir zaman form veya localStorage değerinden yetki olarak kabul edilmez.
2. Local geliştirme ve Vercel Preview demo rol geçişini korur; Vercel Production derlemesi demo davranışını fail-closed biçimde kapatır.
3. Bir org-wide admin üyeliği tüm kurum şubelerini kapsar; şube üyelikleri yalnızca kendi şubesini kapsar. İlk aktif ekran bağlamı varsayılan şubedir.
4. İlk kurum/admin kurulumu public onboarding ile değil, `platform_admin` app metadata kontrolü yapan Edge Function ve yalnızca `service_role` rolüne açık atomik SQL fonksiyonuyla yürür.
5. Audit kayıtları yalnızca yetkili sunucu işlemlerinden yazılır; kişisel veri metadata'ya eklenmez. İstemci audit olayı üretemez.

**Gerekçe:** Demo hızını kaybetmeden production yetki atlatmasını kapatmak; iki kurum arasında IDOR/veri sızıntısını RLS katmanında önlemek; Supabase `auth.users` şemasını uygulama rol alanlarıyla kirletmemek.

**Alternatifler:** Rolü JWT user metadata veya frontend state'inde tutmak daha az tablo gerektirirdi; ancak çoklu kurum/şube ve rol değişikliklerinde eski token/istemci verisine güvenme riski nedeniyle reddedildi.

---

### Karar: Hafıza kayıtları ileriye doğru düzeltilir, geri alınmaz

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** PR #11'de `.ai/` dosyalarına üç doküman commit'i eklendi, ardından üçü de aynı branch içinde revert edilip PR öyle merge edildi. Commit'lerden biri kişisel veri içeriyordu ve onun temizlenmesi doğru bir refleksti; ancak tek satır düzeltmek yerine tüm zincir geri alındı. Sonuç: doğru bilgi silindi, yerine yanlış olan geri geldi ve `WORK_LOG.md` ile `PROJECT_STATE.md` birbiriyle çelişir hale geldi. `PROJECT_ARCHITECT.md` §01'in tek doğruluk kaynağı ilkesi kırıldı.

**Karar:**

1. `.ai/WORK_LOG.md` ve `.ai/DECISION_LOG.md` içindeki geçmiş girdiler silinmez, revert edilmez ve yeniden yazılmaz. Bu dosyalar bir denetim izidir.
2. Bir kayıt sonradan yanlış çıkarsa, ilgili girdinin altına `**Sonradan düzeltme (tarih, Issue #):**` bloğu eklenir; güncel durum en üstteki girdide anlatılır.
3. Kişisel veri yanlışlıkla kayda girerse yalnızca o veri maskelenir; kaydın kendisi korunur.
4. `PROJECT_STATE.md` ve `ROADMAP.md` mevcut durumu anlattığı için yerinde güncellenebilir; ancak kapanmamış bir release gate "tamamlandı" olarak işaretlenemez.

**Gerekçe:** Bir hafıza sisteminin değeri, geçmişte neyin yanlış bilindiğini de saklayabilmesinde. Revert, hatayı değil hatanın kaydını siler; aynı hataya ikinci kez düşmeyi kolaylaştırır. Farklı YZ ajanlarının sırayla çalıştığı bir projede bu maliyet katlanır.

**Alternatifler:** Yanlış satırı doğrudan düzeltmek dosyayı daha kısa tutardı; ancak "bu bilgi ne zamandan beri yanlıştı ve kim neye göre karar verdi" sorusunu cevapsız bırakacağı için reddedildi.

---

### Karar: İlk production tenant'ı bir defalık istisnadır; panel hazır olunca silinip mekanizma üzerinden yeniden kurulacaktır

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** `orbitdershane` kurumu, tasarlanan `bootstrap-organization` Edge Function akışıyla değil, yetkili kontrol düzleminden doğrudan `internal_bootstrap_organization` RPC'si çağrılarak kuruldu. O anda hiçbir hesapta `platform_admin` bayrağı yoktu; bugün de yok. Dolayısıyla onboarding mekanizmasının çalıştığı hiç doğrulanmadı. Kurumda öğrenci, belge ve Storage nesnesi bulunmuyor.

**Karar:**

1. Mevcut `orbitdershane` kaydı bir **test verisi** olarak kabul edilir, referans kurulum olarak kabul edilmez.
2. Platform paneli çalışır duruma geldikten sonra (Faz F) bu kurum silinir ve ilk kurum panel üzerinden yeniden kurulur. Ekip üyelerinin kurum içi hesapları da aynı yoldan açılır.
3. Silme işlemi panelin uçtan uca doğrulanmasından **sonra** yapılır. Aksi halde mevcut tek erişim yolu da kaybedilir.
4. Bu tarihten sonra hiçbir kurum, kullanıcı veya üyelik kaydı SQL editöründen veya kontrol düzleminden elle oluşturulmaz. Tek istisna, aşağıdaki "Stabilizasyon sırası" kararında tanımlanan ilk platform operatörü hesabıdır.

**Gerekçe:** Bir mekanizmanın çalıştığının tek kanıtı onu çalıştırmaktır. Elle kurulan kayıtların üstüne inşa edersek, `bootstrap-organization`'daki bir hatayı ilk gerçek müşterinin önünde keşfederiz. Kurumda veri olmadığı için silme maliyeti bugün sıfır.

**Alternatifler:** Kaydı korumak daha hızlıydı; ancak onboarding akışını ilk müşteride test etmek anlamına geldiği için reddedildi. Kaydı "test kurumu" diye işaretleyip bırakmak da değerlendirildi, veritabanında kalıcı çöp bırakacağı için tercih edilmedi.

---

### Karar: Platform operatörü ayrı bir eksendir; panel `/platform` altında yaşar ve kurum içeriğine erişmez

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Geliştirme ekibinin yeni kurum ve kurum yöneticisi oluşturabileceği bir yönetim yüzeyi yok. Bu eksiklik nedeniyle ilk kurum elle kuruldu ve ikinci ekip üyesinin hiç hesabı olmadı. `app_role` enum'u (`admin`, `teacher`, `student`, `parent`) kurum içi rolleri tanımlar ve her zaman bir kuruma bağlıdır; platform operatörü ise hiçbir kuruma ait değildir.

**Karar:**

1. Platform operatörlüğü `app_role` enum'una **eklenmez**. Ayrı bir `platform_operators` tablosu ve `current_user_is_platform_operator()` security-definer yardımcısı ile modellenir — mevcut `current_user_has_membership()` deseninin kardeşi.
2. `auth.users.app_metadata.platform_admin` bayrağı **kullanılmaz**; tek doğruluk kaynağı tablodur. Bayrak + tablo ikilisi tutmak, aynı bilgiyi iki düzlemde saklamak demektir ve bu projede halihazırda üç kez sorun çıkarmış olan drift kalıbının aynısıdır. `bootstrap-organization` Edge Function'ı tabloyu sorgulayacak biçimde güncellenir.
3. Panel `/platform` rotası altında, `client/src/platform/` içinde kendi bileşen ağacıyla yaşar. Dershane ekranlarına (`components/education/`) dokunulmaz. Giriş formu bileşeni paylaşılabilir; ayrışma girişten sonraki kimlik çözümlemesinde olur.
4. **Rota yetkilendirme değildir.** Her platform işlemi, operatör kontrolünü sunucuda yapan bir Edge Function üzerinden yürür. İstemcideki rota koruması yalnızca kullanıcı deneyimi içindir.
5. Platform operatörü yalnızca **kabı** yönetir: kurum, şube, kurum yöneticisi hesabı, operatör listesi. Öğrenci, not, yoklama, ödev ve ödeme verisine erişimi **yoktur**. Bu, mevcut RLS politikalarının doğal sonucudur; "platform operatörü her şeyi okur" türünde bir policy eklenmeyecektir.
6. İleride destek amaçlı içerik erişimi gerekirse, kurum yöneticisinin onayladığı, süreli ve her okuması denetlenen ayrı bir mekanizma olarak tasarlanır.
7. `audit_events.organization_id` NOT NULL olduğu için kuruma bağlı olmayan platform işlemleri ayrı bir `platform_audit_events` tablosuna yazılır.
8. `/platform` giriş hatası, kurum girişiyle aynı ayrım yapmayan mesajı döner; "bu hesap platform operatörü değil" gibi bir yanıt operatör listesini sızdıracağı için verilmez.

**Gerekçe:** Kap ile içeriği ayırmak KVKK açısından savunulabilir tek konum — özellikle çocuk verisi işlendiği için. Ayrıca "yazılımcılar öğrencilerimin verisini göremiyor" cümlesi kuruma satış yaparken teknik bir dayanağa sahip olur. Tek Supabase projesi ve tek auth sistemi kullanmak, iki kişilik ekip için ikinci bir projenin getireceği çift migration hattı ve projeler arası kullanıcı oluşturma köprüsünden daha ucuzdur.

**Alternatifler:** Platform paneli için ayrı bir Supabase projesi maksimum izolasyon sağlardı; iki auth sistemi ve kullanıcı oluşturmada projeler arası köprü gerektirdiği için reddedildi. Beşinci bir `app_role` değeri en az kod gerektirirdi; sahte bir "platform kurumu" kaydı yaratmayı zorunlu kıldığı ve tenant modelini bozduğu için reddedildi.

---

### Karar: Stabilizasyon sırası — hafıza, güvenlik, şifre akışı, panel

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Denetimde on bir açık bulgu tespit edildi. Bunların yalnızca ikisi platform panelinin yokluğundan kaynaklanıyor; kalanı bağımsız. Ayrıca kurucu yöneticinin şifre girişi çalışmıyor, erişim süresi dolmayan tek bir davet oturumuna bağlı ve UI'da şifre belirleme ekranı yok.

**Karar:**

1. Sıra: **A** hafıza düzeltmesi → **B** güvenlik yamaları (fonksiyon grant'ları, production Auth ayarları, config drift kontrol listesi, CI sıkılaştırması) → **C1** şifre belirleme/sıfırlama akışı → **C2** `platform_operators` şeması → **D** panel → **F** test kurumunun panelden yeniden kurulması.
2. Panel, güvenlik yamalarından **sonra** gelir. Panelin yapacağı iş kurum ve kullanıcı oluşturmaktır ve bu, şu an `anon` rolüne açık olan RPC'nin üstüne kurulacaktır; yamayı sonraya bırakmak açığın yüzeyini büyütür.
3. Şifre akışı panelden **önce** gelir. Panelden davet edilen kullanıcı şifresini kuramıyorsa panel işlevsizdir; ayrıca mevcut tek erişim noktası riski bu adımla kalkar.
4. JWT secret ve `service_role` anahtarı rotasyonu, şifre akışı çalışır hale gelene kadar **yapılmaz**. Rotasyon mevcut oturumu düşürür ve sistemde erişilebilir hesap kalmaz.
5. İlk platform operatörü hesapları, panel kendi kendini oluşturamayacağı için bir defaya mahsus kontrollü biçimde eklenir. Bu, yukarıdaki "elle kayıt oluşturulmaz" kuralının tek tanımlı istisnasıdır ve ADR olarak burada kayıtlıdır.
6. v1.2 iş tabloları bu listenin tamamı bitmeden başlamaz (`PROJECT_ARCHITECT.md` §00 kural 6).

**Gerekçe:** Bulguların çoğu bugün ucuz çünkü gerçek kullanıcı, gerçek veri ve müşteri yok. Aynı liste altı ay sonra pahalı olurdu. Sıralama, her adımın bir sonrakinin ön koşulu olmasına göre kuruldu.

**Alternatifler:** Paneli önce yapmak, ekibin en çok hissettiği sorunu (giriş yapamama) daha erken çözerdi; açık RPC'nin üstüne inşa etmek anlamına geldiği için reddedildi.

---

### Karar: Supabase auto-deploy açık kalır; branch protection açığı tetikleyiciyle kayda geçer

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Supabase GitHub entegrasyonu açık: `main`e merge edilen her migration production veritabanına otomatik uygulanıyor. Buna karşılık GitHub Free planında private repo için branch protection ve ruleset **uygulanmıyor** — ruleset ekranı "GitHub Team organization account'a geçene kadar kurallar zorlanmaz" uyarısı veriyor. `CODEOWNERS` ve `CONTRIBUTING.md` zorunlu review tanımlıyor ancak PR #11, #13 ve #15 review'suz merge edildi ve sorun çıkaran commit'ler tam olarak bunlardı.

**Karar:**

1. Supabase auto-deploy **açık kalır**. Bugüne kadarki üç sorunun üçü de repo ile production'ın ayrışmasından çıktı; auto-deploy bu ayrışmayı ortadan kaldıran mekanizmadır.
2. Uygulanmayan bir ruleset **oluşturulmaz**. Çalışmayan bir koruma, korumasızlıktan daha kötüdür çünkü yanlış güven üretir.
3. `CODEOWNERS` ve `CONTRIBUTING.md` madde 3 yeniden işletilir: `main`e giden hiçbir PR karşı tarafın onayı olmadan merge edilmez. Kural araçla değil disiplinle uygulanır ve her PR'da açıkça kontrol edilir.
4. CI'a yıkıcı migration guard'ı eklenir: `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM` içeren bir migration, açık bir işaretleyici olmadan kalite kapısını düşürür.
5. **Tetikleyici:** İlk gerçek müşteri verisi sisteme girmeden önce ya GitHub Team planına geçilir ve branch protection açılır, ya da Supabase auto-deploy kapatılıp migration'lar bilinçli bir adımla uygulanır. Bu karar o noktada yeniden ele alınacaktır.

**Gerekçe:** Auto-deploy'un kapatılması repo-production ayrışmasını geri getirir ki asıl sorunumuz odur. Şu an veri ve müşteri olmadığı için yanlış bir migration'ın etki alanı düşük; ilk müşteriyle birlikte bu denge tersine döner, o yüzden karar tarihsiz bırakılmayıp tetikleyiciye bağlandı.

**Alternatifler:** Auto-deploy'u şimdi kapatmak insan kapısını geri getirirdi; migration'ların elle uygulanması repo ile production'ın yeniden ayrışmasına kapı açtığı için reddedildi. GitHub Team planı (kullanıcı başı aylık ücret) sıfır bütçe hedefiyle çeliştiği için bu aşamada alınmadı.

---

### Karar: Repo görünürlüğü Public'e alındı (2026-08-17 kararını değiştirir)

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** Vercel, Hobby planında **private** repolarda yalnızca Vercel projesine erişimi olan commit author'ların deployment tetiklemesine izin veriyor. Arda, Hamza'nın `ORBİT` Vercel takımının üyesi olmadığı için (üyelik ücretli) Arda'nın authored ettiği her PR'da Vercel check'i başarısız oluyor ve preview deployment üretilmiyordu. Vercel'in kendi dokümantasyonunda bu durum için önerilen çözümlerden biri repoyu public yapmak veya Pro plana geçmektir.

**Karar:** `Hamzabyrk/orbit_v3` reposu Public'e alındı. Bu, 2026-08-17 tarihli "Repo görünürlüğü — Private" kararını geçersiz kılar.

**Gerekçe:** Sıfır bütçe hedefi korunarak build/preview akışının açılması. Ürün geliştirme aşamasında, gerçek kullanıcısı ve müşteri verisi olmayan bir sistem için erişilebilir bir CI/preview hattının değeri, mimarinin gizliliğinden yüksek görüldü.

**Kabul edilen riskler:**

1. Repo, çok kiracılı şema tasarımını, RLS mimarisini, Edge Function mantığını ve `.ai/` altındaki yol haritası ile karar kaydını üçüncü taraflara açar. Bu ticari bir maliyettir ve bilerek kabul edilmiştir.
2. **Karar geri alınamaz.** Public yapıldıktan sonra repo klonlanabilir, GitHub araması indeksler ve üçüncü taraf arşivler kopyasını saklar. Tekrar Private'a çevirmek, yayınlanmış içeriği geri almaz.
3. `.ai/WORK_LOG.md`, kararın alındığı anda **kapatılmamış** bir güvenlik zincirini (açık `anon` RPC yetkisi + açık production signup) ayrıntısıyla anlatıyordu. Bu nedenle Issue #18 (fonksiyon yetkileri) ve production Auth ayarlarının kapatılması, planlanan sıradaki yerlerinden alınıp **zaman kritik** işler haline getirilmiştir.

**Alternatifler:** Vercel Pro planı sıfır bütçe hedefiyle çeliştiği için alınmadı. Vercel Deploy Hooks ile takım üyeliği olmadan deployment tetiklemek değerlendirildi; kurulum maliyeti nedeniyle şimdilik ertelendi, gerekirse yeniden ele alınacaktır. Preview olmadan yalnızca yerelde doğrulama yapmak da mümkündü; UI değişikliği içeren fazlarda (v1.1.2) yetersiz kalacağı için tercih edilmedi.

---

### Karar: Stabilizasyon fazında tek kişilik merge'e sınırlı izin

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** `CONTRIBUTING.md` madde 3 ve yukarıdaki auto-deploy kararı, `main`e giden her PR için karşı tarafın onayını zorunlu kılıyor. Ancak GitHub Free planında private/public repo ayrımından bağımsız olarak bu kural araçla zorlanamıyor; yalnızca disiplinle uygulanıyor. Stabilizasyon çalışması sırasında ekip üyelerinden biri saatlerce müsait olmayabiliyor ve açık bir güvenlik bulgusunun kapatılması onay beklemek yüzünden gecikiyor.

Kuralı sessizce çiğnemek, bu projede tedavi edilen asıl hastalığın (belgenin bir şey, gerçeğin başka şey söylemesi) tekrarı olurdu. Bu nedenle kural çiğnenmek yerine gerçeğe uyduruldu.

**Karar:**

1. Stabilizasyon fazı boyunca (v1.1.1 ve v1.1.2 kapanana kadar), diğer ekip üyesi müsait değilken, aşağıdaki koşulların **tamamını** sağlayan bir PR tek kişi tarafından merge edilebilir:
   - Tüm CI kontrolleri yeşil (`quality-gate`, ve `supabase/**` değiştiyse `Supabase Database Tests`)
   - Mevcut production verisini silmiyor veya geri döndürülemez biçimde değiştirmiyor
   - Merge gerekçesi ve tek kişilik merge'in sebebi PR açıklamasına yazılmış
2. Tek kişilik merge edilen her PR, karşı ekip üyesi müsait olduğunda **geriye dönük olarak** gözden geçirilir; itiraz olursa düzeltme yeni bir PR ile yapılır, merge geri alınmaz.
3. Bu izin v1.1.2 kapandığında sona erer ve `CONTRIBUTING.md` madde 3'e dönülür. İzin süresizleştirilmek istenirse yeni bir ADR gerekir.
4. Veri silen, şema düşüren veya production Auth/altyapı ayarlarını değiştiren PR'lar bu iznin **dışındadır**; onlar her durumda iki kişilik onay gerektirir.

**Gerekçe:** İki kişilik bir ekipte, uygulanamayan bir kuralın kâğıt üzerinde durması onu zamanla tümüyle işlevsiz kılar. Sınırlı, tarihli ve koşullu bir izin, kuralın kalan kısmını korur. 4. maddedeki istisna, iznin gerçekten tehlikeli olabileceği tek alanı dışarıda bırakır.

**Alternatifler:** Kuralı olduğu gibi bırakıp fiilen uymamak değerlendirildi ve reddedildi; belge ile davranışın ayrışması bu projenin tekrar eden hata kalıbıdır. Kuralı tamamen kaldırmak da reddedildi; PR #11, #13 ve #15'in review'suz merge edilmesi ile sonrasında ortaya çıkan tutarsızlıklar arasındaki bağ göz önüne alındığında, onay mekanizmasının değeri kanıtlanmıştır.
