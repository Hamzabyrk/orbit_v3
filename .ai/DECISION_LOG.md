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

---

### Karar: Kimlik ve Giriş Bilgisi Mimarisi

**Durum:** Alındı
**Tarih:** 2026-08-23
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Ürünün hedef kitlesinde herkesin e-postası yok. Kurum yöneticileri ve çoğu öğretmen e-posta kullanıyor; öğrencilerin özellikle küçük yaş grubunda çoğunun yok, velilerin ise neredeyse tamamında telefon var ama e-posta değişken. Supabase Auth ise giriş için e-posta veya telefon istiyor, kullanıcı adı desteklemiyor.

T.C. Kimlik numarası KVKK gerekçesiyle kimlik belirteci olarak kullanılmayacaktır. e-Okul'un T.C. Kimlik + okul numarası ile şifresiz giriş modeli örnek alınmamıştır; düşük güvenlikli bir tasarımdır.

Sorun üç ayrı parçadan oluşur ve genelde birbirine karıştırılır: kimlik belirteci, kimlik kanıtı ve ilk kimlik bilgisinin teslimi. Asıl zor olan üçüncüsüdür.

**Karar:**

**1. Giriş belirteci: e-posta veya 8 haneli kişi numarası.**

Giriş formu tek bir alan sorar. İstemci girdiyi şöyle yorumlar:

- `@` içeriyorsa e-posta adresidir, olduğu gibi kullanılır
- 8 haneli sayıysa `<numara>@orbit.invalid` sentetik adresine çevrilir

Numara `<kurum:4 hane><kişi:4 hane>` biçimindedir ve **global olarak benzersizdir**; bu nedenle giriş ekranında ayrıca kurum kodu sorulmaz.

- Her iki bölüm de **1000'den başlar**. Baştaki sıfır hiç oluşmaz; kullanıcı `0042`'yi `42` diye yazıp giriş yapamaz duruma düşmez.
- Kapasite: 9000 kurum × 9000 kişi.
- Numara **rol kodlamaz.** Roller değişebilir (öğrenci ileride asistan olabilir) ve rolü kimliğe gömmek, rol değişiminde kimlik değiştirmeyi gerektirirdi. Rol `organization_memberships` kaydında durur.
- Numara "öğrenci numarası" değil **kişi numarasıdır**; e-postası olmayan öğrenci, veli ve öğretmen aynı şemayı kullanır.
- Kurumun kendi iç öğrenci numarası ayrı bir alanda saklanır. İkisini birleştirmek, kuruma numaralandırma sistemini değiştirtmek anlamına gelirdi.

**2. Sentetik adresler istemcide deterministik olarak üretilir.**

Yaygın alternatif, her girişte kullanıcı adını e-postaya çeviren `service_role` yetkili bir Edge Function kullanmaktır. Bu yaklaşım **reddedilmiştir**: kullanıcı şifresi bizim sunucu kodumuzdan geçerdi ve giriş yoluna ayrıcalıklı bir bileşen eklenirdi.

Numara global olarak benzersiz olduğu için istemci sentetik adresi kendisi kurabilir ve doğrudan `signInWithPassword` çağırabilir. Giriş yolunda ayrıcalıklı hiçbir bileşen yoktur; şifre tarayıcıdan doğrudan Supabase'e gider.

`.invalid` uzantısı RFC 2606 gereği hiçbir zaman çözümlenemez; bu adreslere kimse posta gönderemez ve gerçek bir adresle çakışamaz. `.local` **kullanılmaz**; o uzantı mDNS için ayrılmıştır ve yerel ağlarda çözümleme sorunlarına yol açar.

**3. İlk şifre geçicidir, bir kez gösterilir ve asla saklanmaz.**

- Kullanıcı oluşturulurken kişiye özel, rastgele bir geçici şifre üretilir. Herkese aynı standart şifre verilmez.
- Şifre **yalnızca oluşturma anında ekranda gösterilir**; veritabanına düz metin olarak yazılmaz. Kaybolursa yönetici yenisini üretir.
- Kullanıcı ilk girişte şifresini değiştirmek **zorundadır**; değiştirmeden başka hiçbir ekrana gidemez.
- Geçici şifrenin ömrü sınırlıdır. Dağıtılıp hiç kullanılmayan kâğıtlardaki şifreler süresiz geçerli kalmaz.
- Şifre kâğıttan okunabilir olmalıdır. Onaltılık dizeler (`9b2d4a6f7c`) bu amaçla kullanılmaz.

**4. Pilot aşamada teslim yöntemi: yazdırılabilir liste ve varsa e-posta.**

Panel, oluşturma anında yazdırılabilir bir liste üretir. E-postası olan kullanıcılara ayrıca gönderilir. SMS ve WhatsApp bu aşamada kurulmaz; `profiles.phone` alanı doldurulur ama kullanılmaz, böylece ileride bir otomasyon eklendiğinde veri hazır olur.

**5. E-postası olmayan kullanıcı için sıfırlama kanalı kurum yöneticisidir.**

Bu kişiler kendi başlarına şifre sıfırlayamaz. Panelde kullanıcı başına "şifre sıfırla" işlemi bulunmak zorundadır; aksi halde kurum her unutulan şifrede geliştirme ekibine başvurur. Bunun sonucu olarak kurum yöneticisi hesabı yüksek değerli bir hedeftir ve gerçek e-posta ile korunur.

**Gerekçe:** Tek alanlı giriş, iki alanlı girişe göre sahada belirgin biçimde daha az hata üretir; hedef kitlenin bir kısmı ilkokul çağında ve kâğıttan okuyarak giriş yapacaktır. Sentetik adresin istemcide üretilebilmesi, giriş yolundan ayrıcalıklı bir bileşeni tamamen kaldırır. Geçici şifrenin bir kez gösterilip saklanmaması, düz metin şifre saklama gereğini ortadan kaldırır ve KVKK açısından savunulabilir tek konumdur.

Numarada isim taşınmaması bilinçlidir: K-12 kimlik yönetimi rehberleri, kimlik belirtecinin opak, değişmez ve kişisel veri içermeyen bir değer olmasını önerir. `ahmet.yilmaz@...` biçimi ismi belirtece gömerdi; ayrıca aynı isimli iki kişide çakışır ve isim değişikliğinde kimliğin değişmesini gerektirirdi.

**Alternatifler:**

- **Telefon numarasıyla giriş (Supabase phone auth):** Velilerin neredeyse tamamında telefon var. Reddedildi; operatörler numaraları geri dönüşüme sokuyor ve geri dönüştürülmüş bir numarayı alan kişi önceki kullanıcının hesabına erişebiliyor. Supabase de bu yöntemi bu nedenle önermiyor. Ayrıca SMS maliyeti sıfır bütçe hedefiyle çelişiyor.
- **UUID tabanlı kullanıcı adı (`user_123e4567@...`):** Benzersizliği garanti eder ancak kâğıttan okunup yazılamaz. Kimlik hem benzersiz hem kullanılabilir olmak zorundadır.
- **İsim tabanlı kullanıcı adı:** Hatırlaması kolaydır ancak belirtece kişisel veri gömer, çakışır ve isim değişikliğinde kırılır.
- **Kurum kodu + kullanıcı adı iki ayrı alan:** İlk tasarımdı. Numaraya kurum kodunun gömülmesiyle gereksiz hale geldi.
- **Kontrol hanesi (Luhn) eklemek:** Yazım hatalarını yakalar ve daha iyi hata mesajı verir. Numarayı dokuz haneye çıkardığı için tercih edilmedi; kâğıttan okunabilirlik daha değerli görüldü.

**Uygulama sırası notu:** Bu karar bugün alınmıştır ancak tamamı bugün uygulanmayacaktır. Kurum yöneticileri gerçek e-posta adresine sahip olacağı için, platform paneli onları mevcut davet ve şifre belirleme akışıyla oluşturabilir; sentetik adres ve geçici şifre makinesi ilk kez kurum yöneticisi kendi öğretmen ve öğrencilerini eklerken gerekecektir. Karar erken sabitlenmiştir çünkü kimlik şemasını sonradan değiştirmek, oluşturulmuş her hesabı etkiler.

**Ek karar (2026-08-23): Platform operatörleri için ayrı giriş ekranı yapılmayacaktır.**

Daha önceki "Platform operatörü ayrı bir eksendir" kararında `/platform` altında ayrı bir giriş ekranı öngörülmüştü. Gerekçeleri iki taneydi ve ikisi de yukarıdaki kimlik kararıyla birlikte geçersiz kaldı:

1. _"Kurum girişi kurum kodu soracağı için operatörlerde karşılığı olmaz."_ Numaraya kurum kodu gömüldüğü için giriş ekranı artık tek alan soruyor ve o alan e-postayı da kabul ediyor. Operatörler gerçek e-posta kullanır; aynı ekran ikisine de hizmet eder.
2. _"Kurum girişi ileride kuruma özel markalanabilir."_ Giriş anında hangi kurumun kullanıcısı olduğunu bilmiyoruz — kimlik ancak doğrulamadan sonra çözülüyor. Dolayısıyla giriş ekranı zaten kuruma göre markalanamaz.

**Karar:** Tek giriş ekranı, girişten sonra dallanma. Kimlik çözümlendiğinde kullanıcı `platform_operators` kaydına sahipse `/platform` paneline, kurum üyeliğine sahipse dershane paneline yönlendirilir. Panellerin kendisi ayrı kalmaya devam eder; ayrışan şey giriş değil, girişten sonraki hedeftir.

**Uygulama notu:** `authService.loadAuthenticatedIdentity` şu anda aktif bir kurum üyeliği bulamazsa hata fırlatıyor ve `AuthProvider` kullanıcıyı oturumdan atıyor. Platform operatörünün tasarım gereği hiçbir kurum üyeliği yoktur; bu nedenle kimlik çözümlemesi, üyelik bulunamadığında `platform_operators` kaydına da bakacak biçimde genişletilmelidir. Aksi halde operatör giriş yapar yapmaz sistemden atılır.

---

### Karar: Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** "Kimlik ve Giriş Bilgisi Mimarisi" kararının uygulama sırası notu, kurum yöneticilerinin gerçek e-postası olduğu gerekçesiyle onları mevcut davet akışıyla açmayı öngörüyordu. Sentetik adres ve geçici şifre makinesi yalnızca öğretmen/öğrenci/veli için kurulacaktı.

Bu ayrım iki sorun üretti:

1. **Davet akışı çalışmıyor.** `bootstrap-organization`, yöneticiyi `inviteUserByEmail` ile yani şifresiz yaratıyor. Davet bağlantısı `type=invite` ile dönüyor; istemci yalnızca `type=recovery` biliyor (`supabaseClient.ts`) ve yalnızca `PASSWORD_RECOVERY` olayını ayrıştırıyor (`AuthProvider.tsx`). Davetle gelen kullanıcı `SIGNED_IN` üretiyor, üyeliği olduğu için doğrudan panele düşüyor ve **şifresini hiç belirlemiyor**. O oturum kapandığında bir daha giremez. Panel bugün "çalışıyor" görünüp ilk gerçek kurumda kilitlenirdi.
2. **İki mekanizma bakılıyor.** Yönetici için davet, diğerleri için geçici şifre. Aynı işin iki yolu, iki hata yüzeyi.

**Karar:** Tüm hesaplar aynı yolla açılır — **giriş numarası + kişiye özel geçici şifre**. Davet yolu kaldırılır; `inviteUserByEmail` yerine `admin.createUser` kullanılır. Kurum yöneticisi de dahil hiç kimseye oluşturma anında e-posta sorulmaz.

- Geçici şifre yalnızca oluşturma anında bir kez gösterilir, veritabanına düz metin yazılmaz.
- Geçici şifrenin ömrü **7 gündür**.
- İlk girişte şifre değiştirmek zorunludur; değiştirilmeden hiçbir ekrana gidilemez.

**E-posta kritik yoldan çıkar ama kurtarma yolundan çıkmaz.** Bu ayrım kararın özüdür:

- **Giriş** e-postaya hiç bağlı değildir; numara ve şifreyle yapılır.
- **Kurtarma** doğrulanmış bir e-posta gerektirir. Adres doğrulanana kadar "şifremi unuttum" o adrese çalışmaz.
- **Kurum yöneticisi için e-posta eklemek ve doğrulamak ilk girişte zorunludur.** Öğretmen, öğrenci ve veli için isteğe bağlıdır.

Zorunluluğun gerekçesi: kurum yöneticisi, kendi kurumundaki herkesin şifre kurtarma kanalıdır. Kendini kilitlerse tüm kurumun sıfırlama zinciri kopar ve iş geliştirme ekibine gelir. Ayarlarda isteğe bağlı bırakılırsa çoğu yönetici hiç eklemez.

**Kurtarma zinciri:** öğretmen/öğrenci/veli → kurum yöneticisi → doğrulanmış e-postası → platform operatörü.

**Gerekçe:** Kendi kaydımız (`PLATFORM_SETTINGS.md` bölüm 5) Supabase'in paylaşımlı SMTP'sini "production için uygun değil, spam'e düşmesi olağan" diye işaretliyor. Kurum kurulumunu teslimat garantisi olmayan bir kanala bağlamak kırılgandır. Doğrudan oluşturma, kırık `type=invite` yolunu onarmak yerine tamamen siler; daha az kod ve daha az durum bırakır.

**Neyi kaybediyoruz:** Davet, adresin sahipliğini kanıtlıyordu. Doğrudan oluşturmada adres doğrulanmadan kabul edilir; yanlış yazılmış bir adres kurtarma postasını bir yabancıya gönderebilir. Telafisi yukarıdaki "doğrulanana kadar kurtarma çalışmaz" kuralıdır.

**Açık bilinmez ÖLÇÜLDÜ (2026-08-24, Faz E0).** Şüphe doğru çıktı: **"Secure email change" açıkken sentetik adresten gerçek adrese geçiş imkânsız.** Ölçüm, production ile birebir aynı GoTrue sürümüyle (v2.195.0) yapıldı; betikler ve tam tablo `supabase/tests/auth/email_change_spike/`.

- Ayar **açıkken** GoTrue iki onay maili gönderiyor: yeni adrese **ve** `@orbit.invalid` adresine. **Tek onay yetmiyor** — yeni adresin bağlantısı tıklandığında `verify` başarılı dönüyor ama adres değişmiyor. Production'da `.invalid` kutusuna posta ulaşamayacağı için değişim kalıcı olarak kilitli kalır.
- Ayar **kapalıyken** yalnızca yeni adrese tek bir onay maili gidiyor; tıklanınca adres değişiyor ve eski sentetik adres artık giriş kabul etmiyor.
- **`admin.updateUserById` bir doğrulama yolu değildir.** `email_confirm` ister `true` ister `false` olsun adres anında değişiyor ve **hiçbir doğrulama maili gitmiyor**. "Adresi admin API ile yazalım, doğrulamayı GoTrue yapsın" seçeneği yoktur; bu yol kullanılırsa adres doğrulanmadan kabul edilmiş olur — kararın "doğrulanana kadar kurtarma çalışmaz" ilkesiyle çelişir.

Sonuç: doğrulamalı tek yol ayarın kapatılmasıdır. Bunun güvenlik bedeli ve telafisi ayrı bir kararda ele alınmıştır: **"Sentetik adresten gerçek adrese geçiş"**.

**Alternatifler:**

- **Davet akışını onarmak (`type=invite` desteği eklemek):** Mümkündü ama e-posta bağımlılığını kritik yolda bırakırdı ve iki mekanizmayı korurdu.
- **Herkese aynı standart şifre:** Reddedildi; bir kişinin şifresi sızdığında herkesinki sızar.

---

### Karar: Platform operatörü girişte panele düşer, dershane paneline değil

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Kimlik iki bağımsız eksen taşıyor ve `Home` bugün üyeliği önceliyor: kurum üyeliği olan kullanıcı dershane paneline düşüyor. Hamza Bayrak hem test kurumunun yöneticisi hem platform operatörü olduğu için girişte dashboard'a düştü ve panelin var olduğunu göremedi.

Öncelik kuralı koymamak bilinçliydi ve gerekçesi **test kurumunun varlığıydı**: kurucu ekip üyeleri iki ekseni de taşıdığı için hangisini önceleseydik diğerine ulaşamayacaklardı.

**Karar:** Platform operatörü girişte `/platform` paneline düşer. Test kurumu kaldırılıp kurucu ekibin kurum üyeliği sonlandırıldığı için öncelik kuralının eski sakıncası ortadan kalkmıştır.

- Kimliğin iki eksenli modeli **korunur**; değişen yalnızca varsayılan hedeftir.
- Hem operatör hem kurum üyesi olan biri dershane paneline menüdeki bağlantıyla ulaşır.
- Platform operatörlerinin kurum üyeliği olmaz. Kurum içeriğine erişimleri yoktur ve bu, "operatör kapları yönetir, içeriği görmez" taahhüdünün doğal sonucudur.

**Terim kuralı:** Arayüzde ve yazışmada **"admin" kelimesi kullanılmaz.** `app_role` enum'unun bir değeri zaten `admin`'dir ve **kurum yöneticisi** anlamına gelir; aynı kelimeyi platform operatörü için de kullanmak bu projenin yedi kez tökezlediği isim çakışması kalıbını yeniden kurar. Doğru terimler: **platform operatörü** ve **kurum yöneticisi**.

---

### Karar: Öğrenci ve veli ekranları mobil-öncelikli tasarlanır

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Ürünü öğrenciler ve veliler ezici çoğunlukla telefondan kullanacak; öğretmenler tablet, kurum yöneticileri masaüstü ağırlıklı. Bugünkü arayüz responsive sınıflar içeriyor ve sol menü mobilde çekmece olarak çalışıyor, ancak **hiçbir gerçek cihaz testi kaydı yok** ve kırılım noktası dağılımı dengesiz.

Kararın zamanlaması bilinçlidir: öğrenci ve veli ekranlarının gerçek hâlleri **henüz yazılmadı**, hepsi mock veriyle besleniyor. Kural, o ekranlar yazılmadan önce konursa bedelsizdir; sonra konursa yeniden yazım gerektirir.

**Karar:**

- **Öğrenci ve veli ekranları mobil-öncelikli tasarlanır.** Önce dar ekran çalışır hâle getirilir, masaüstü genişletme olarak ele alınır.
- **Öğretmen ekranları tablet ve masaüstünde**, kurum yöneticisi ve platform paneli **masaüstünde** birincil kabul edilir; hepsi telefonda kullanılabilir kalır ama tasarım önceliği burada değildir.
- Yatay kaydırma gerektiren tablolar öğrenci/veli akışlarında **birincil gösterim olamaz**; kart düzeni tercih edilir.
- Her yeni ekran, dar ekranda gözden geçirilmeden teslim edilmiş sayılmaz.

**Gerekçe:** Hedef kitlenin bir bölümü ilkokul çağında ve tek cihazı ailedeki telefon. Masaüstü için tasarlanıp sonra sıkıştırılan bir arayüz, bu kullanıcılar için ürünün tamamıdır.

**Kapsam dışı:** Yerel mobil uygulama. Mimari buna uygundur — backend'in tamamı (RLS, Edge Function, giriş numarası mantığı) aynen kullanılır, yalnızca arayüz yeniden yazılır — ancak bugün planlanmamıştır.

---

### Karar: Taşınabilirlik sınırı — yetkilendirme veritabanında, veri erişimi servis katmanında

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** ORBIT ayrı bir geleneksel backend sunucusu yerine BaaS (Supabase) üzerine kuruldu (`ROADMAP.md` bölüm 1). Bu, tesisatı — HTTP sunucusu, oturum yönetimi, şifre saklama, e-posta gönderimi — kiralamak demektir. İş büyürse veya sağlayıcı kısıtları engel olursa kendi sunucumuza geçme ihtimali gerçektir; Pro plan gerektiren özellikler (sızmış şifre koruması, oturum zaman aşımı) bu kısıtın ilk örnekleridir.

Ölçüm (2026-08-24): Supabase'e özgü veritabanı yüzeyi yalnızca `auth.uid()` çağrısıdır ve **8 yerde** geçer. `client/src/components` ve `client/src/pages` altında doğrudan Supabase çağrısı **sıfırdır**; tüm erişim dört servis modülünden geçer.

**Karar:** Taşınabilirlik bir hedef değil, **korunacak bir sınırdır**. İki kural:

1. **Yetkilendirme veritabanında yaşar, uygulama kodunda değil.** Kim neyi görebilir sorusunun cevabı RLS politikalarında durur ve pgTAP ile test edilir. Edge Function'lara veya istemciye taşınmaz.
2. **Ekran bileşenleri veri katmanını doğrudan çağırmaz.** Tüm Supabase erişimi servis modüllerinden geçer (`auth/`, `platform/`, `lib/`, ileride `data/`).

İkinci kural **ESLint ile zorlanır** (`eslint.config.js`, `no-restricted-imports`). Yazılı kural unutulur; kapı sessizce kapanır ve kapandığı fark edilmez. Kuralı susturmak çözüm değildir — doğru hamle erişimi bir servis modülüne taşımaktır.

**Gerekçe:** Kendi sunucumuza geçiş, bu iki kural korunduğu sürece **dört dosyanın içini değiştirmek** demektir; 15.000 satırlık arayüz ve 640 satırlık şema olduğu gibi kalır. Yetkilendirme Edge Function'lara serpilseydi taşıma, güvenliğin sıfırdan yazılması anlamına gelirdi.

**Taşınırken yine de yeniden yazılacaklar — dürüst liste:**

- Kimlik doğrulama servisi (GoTrue). İyi haber: şifreler bcrypt ile saklanıyor ve bcrypt hash'leri çoğu sisteme taşınabilir.
- `auth.uid()` — standart Postgres'te oturum değişkeninden kimliği okuyan bir sarmalayıcıyla karşılanır. 8 çağrı.
- Realtime abonelikleri (v1.3) ve Storage (v1.6). Bunlar sağlayıcı servisleridir; alternatifleri vardır ama yeniden yazım gerektirir.

**Lock-in'i büyüten şeyler — bilinçli izlenecek:** her yeni Realtime aboneliği, her Storage yolu ve servis katmanını atlayan her sorgu.

**Alternatifler:**

- **Baştan kendi backend'imizi yazmak:** İki kişilik, sıfır bütçeli bir ekip için aylarca tesisat yazmak demekti; ürünün kendisine hiç sıra gelmezdi.
- **Taşınabilirliği tamamen yok saymak:** Daha hızlı ilerletirdi ama Pro plan kısıtları şimdiden hissediliyorken kapıyı bilerek kapatmak olurdu.

---

### Karar: Bir giriş hesabı tek kuruma aittir

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** `ROADMAP.md` Soru 2'nin onaylı cevabı şöyleydi: _"Bir kullanıcı farklı kurum veya şubelerde farklı rollere sahip olabilecek; aktif üyelik oturum bağlamında seçilecek."_ Şema buna göre kuruldu — `organization_memberships` bir kullanıcıya birden fazla satır verebiliyor.

Kimlik mimarisi kararı bu vaadi farkında olmadan geçersiz kıldı. Giriş numarası `<kurum:4><kişi:4>` biçiminde ve **auth kimliğinin kendisi**: `10421000@orbit.invalid`. Bir kişinin tek auth hesabı, tek numarası, dolayısıyla numarasına gömülü tek kurumu olur. İki dershanede ders veren bir öğretmen bu şemaya sığmıyor.

Çelişki, Faz E1 `person_code` kolonunu yazmadan **önce** yakalandı. Sonradan fark edilseydi açılmış her hesabı etkilerdi.

**Karar:** Bir giriş hesabı tek kuruma aittir. İki kurumda yer alan kişi, her kurumda **ayrı bir hesap ve ayrı bir giriş numarası** alır.

- `organization_memberships` şeması değişmez; çoklu satır teknik olarak mümkün kalır ancak **giriş hesabı açılan** üyelik kurum başına birdir.
- Kimliğin iki eksenli modeli etkilenmez; platform operatörlüğü zaten kurumdan bağımsızdır.
- Kurum yöneticisi başka bir kurumun kullanıcısını göremez ve arayamaz; hesaplar birbirini tanımaz.

**Gerekçe:** Tek hesapla çoklu üyelik, giriş anında kurum seçtirmeyi gerektirir ve kimlik çözümlemesini "hangi kurum bağlamındayım" durumuna bağlar. Bu durum RLS politikalarının tamamına sızar: her politika artık yalnızca "bu kullanıcı üye mi" değil, "şu anda hangi kurum bağlamında" sorusunu da sormak zorunda kalır. Oturum bağlamı istemciden geldiği için bu, yetkilendirmeye istemci kaynaklı bir girdi eklemek demektir — bugünkü en güçlü güvenlik özelliğimizi zayıflatır.

Ayrı hesap ise izolasyonu güçlendirir: iki kurum arasında hiçbir teknik köprü kalmaz.

**Bedeli — açıkça kabul ediliyor:** İki kurumda çalışan kişi iki numara taşır ve iki kez giriş yapar. Hedef kitlede bu durum nadirdir; küçük dershanelerde öğretmenlerin çoğu tek kurumda çalışır. Nadir bir kolaylık için, yetkilendirmenin tamamını karmaşıklaştırmak doğru takas değildir.

**Soru 2'ye etkisi:** Cevabın "bir kullanıcı farklı kurumlarda rollere sahip olabilecek" kısmı, **giriş hesabı düzeyinde geçersizdir**. "Farklı şubelerde farklı roller" kısmı geçerliliğini korur — şube kurumun içindedir ve numarayı etkilemez.

**Yeniden değerlendirme tetikleyicisi:** Aynı kişinin iki kurumda hesap istemesi sahada gerçekten sorun olursa. O noktada seçenek, tek hesaba çoklu üyelik değil, **hesaplar arası geçiş** olabilir: kullanıcı yine ayrı kimliklerle var olur, yalnızca arayüz aralarında geçiş sunar. Yetkilendirme sınırı bozulmaz.

**Alternatifler:**

- **Tek hesap, girişte kurum seçimi:** Soru 2'ye sadık kalırdı. Reddedildi; yetkilendirmeye istemci kaynaklı bağlam girdisi ekliyor.
- **Numaradan kurum kodunu çıkarmak (yalnızca kişi numarası):** Numarayı kurumdan bağımsız kılardı ama global benzersizliği kaybederdi; o zaman girişte kurum kodu ayrıca sorulurdu ve tek alanlı giriş kararı çökerdi.

---

### Karar: Sentetik adresten gerçek adrese geçiş

**Durum:** ⛔ **REDDEDİLDİ** — yerine "Auth e-postası hiç değişmez" kararı alındı (aşağıda)
**Tarih:** 2026-08-24
**Ölçüm:** Faz E0 spike, `supabase/tests/auth/email_change_spike/`

> **Neden reddedildi:** Bu öneri `Secure email change` ayarının kapatılmasını savunuyordu. Arda Bülent, e-postanın hesabın kimliği olmak zorunda olmadığını sorunca ölçüm verisine yeniden bakıldı ve **raporlanmamış bir sonuç** fark edildi: e-posta değiştikten sonra sentetik adresle giriş **HTTP 400** dönüyor — yani **kişinin giriş numarası ölüyor.**
>
> Sonucu ağır: e-postasını ekleyen bir öğretmenin kâğıda yazılıp verilmiş numarası geçersizleşir. Öneri, kurum yöneticisini kurtarırken numara sisteminin tamamını bozuyordu.
>
> Kayıt silinmiyor çünkü değeri gerekçesinde: bu, ölçümü yapmış olmama rağmen **verinin bir satırını yeterince önemsememiş olduğumu** gösteriyor. Aşağıdaki karar bu yanlıştan çıktı.

**Bağlam:** Kimlik kararı gereği herkes `<numara>@orbit.invalid` sentetik adresiyle açılıyor. Kurum yöneticisinin ilk girişte gerçek bir e-posta ekleyip doğrulaması **zorunlu**; kurtarma zincirinin tamamı buna dayanıyor.

E0 ölçümü, bunun bugünkü production ayarlarıyla **mümkün olmadığını** gösterdi. Ölçümün tamamı README'de; özeti:

| Yol                        | `Secure email change` | Sonuç                                                              |
| -------------------------- | --------------------- | ------------------------------------------------------------------ |
| Kullanıcı kendi oturumuyla | **AÇIK** (bugünkü)    | İki onay maili; biri `@orbit.invalid`'e. **Değişim tamamlanmıyor** |
| Kullanıcı kendi oturumuyla | **KAPALI**            | Tek onay maili, yalnızca yeni adrese. **Çalışıyor**                |
| `admin.updateUserById`     | fark etmiyor          | Anında değişiyor, **hiç doğrulama yok**                            |

**Öneri:** Production'da **`Secure email change` kapatılsın** ve e-posta değişimi kullanıcının kendi oturumu üzerinden yapılsın.

`admin.updateUserById` yolu reddediliyor: adresi doğrulamadan kabul etmek, "doğrulanana kadar kurtarma çalışmaz" ilkesini fiilen ortadan kaldırır — kullanıcı yanlış yazdığı adresi doğrulanmış sanır ve şifresini unuttuğunda kurtarma bir yabancıya gider.

**Neyi kaybediyoruz — dürüst hâli:** Ayar açıkken, oturumu ele geçirilmiş bir kullanıcının e-postasını değiştirmek için saldırganın **eski posta kutusuna da** erişmesi gerekiyordu. Kapatınca yalnızca yeni adresteki onay yeterli hâle gelir; saldırgan hesabı kalıcı olarak devralabilir.

Bu kaybın gerçek büyüklüğü sanıldığından küçüktür:

- **Sentetik adresli kullanıcılar için ayar zaten sıfır koruma sağlıyordu.** Eski kutu `@orbit.invalid`; kimse oraya erişemez. Ayar onları korumuyor, yalnızca engelliyordu.
- Koruma yalnızca **gerçek e-postasını çoktan doğrulamış** kullanıcılar için anlamlıydı; onlar da bugün sistemde yok.

**Telafiler — bizim elimizde olanlar:**

1. **E-posta değişiminden önce şifre yeniden istenir.** Açık bırakılmış bir tarayıcı başına oturan kişiye karşı etkilidir. Sınırı dürüstçe: jetonu çalmış bir saldırgan istemci kodunu yok sayabilir; bu bir yavaşlatmadır, sınır değil.
2. **Her e-posta değişimi denetim kaydı üretir** ve kurum yöneticisi hesaplarında ilgili kişiye bildirilir.
3. **Eski adrese bildirim gider** — gerçek bir adresten gerçek bir adrese geçişte kullanıcı durumdan haberdar olur.

**Yeniden değerlendirme tetikleyicisi:** Kendi alan adımız ve işlemsel e-posta sağlayıcımız olduğunda. O noktada sentetik adresler `@orbit.invalid` yerine gerçek bir alt alan adı alabilir (`users.orbit.app`); adresler teslim edilebilir hâle gelir ve `Secure email change` yeniden açılabilir. Bu ihtimal kimlik kararında zaten öngörülmüştü.

**Alternatifler:**

- **`admin.updateUserById` ile yazmak:** Ölçüldü, çalışıyor, ama doğrulama üretmiyor. Reddedildi.
- **Auth e-postasını hiç değiştirmemek, iletişim adresini yalnızca `profiles`'ta tutmak:** Supabase'in şifre sıfırlaması auth e-postasına gider; sentetik adres kalırsa sıfırlama hiç çalışmaz. Kendi sıfırlama akışımızı yazmak ise kendi SMTP'mizi gerektirir — bugün yok.
- **Ayarı açık bırakıp e-posta doğrulamasını zorunlu olmaktan çıkarmak:** Kurum yöneticisini kurtarma kanalsız bırakır; kendini kilitlediğinde tüm kurumun sıfırlama zinciri kopar.

---

### Karar: Auth e-postası hiç değişmez; kurtarma linkini biz üretir, biz göndeririz

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent
**Ölçüm:** Faz E0 spike, `supabase/tests/auth/email_change_spike/`

**Bağlam:** Herkes `<numara>@orbit.invalid` sentetik adresiyle açılıyor. Kurum yöneticisinin gerçek bir e-posta ekleyip doğrulaması zorunlu, çünkü kurtarma zinciri buna dayanıyor. İlk plan, kullanıcının auth e-postasını sentetikten gerçeğe **değiştirmekti**.

E0 ölçümü bu planın iki ayrı sebeple yanlış olduğunu gösterdi:

1. **`Secure email change` açıkken geçiş imkânsız** — eski adres olan `@orbit.invalid` kutusuna da onay maili gidiyor ve tek onay yetmiyor.
2. **Ayar kapatılsa bile geçiş yıkıcı** — e-posta değiştikten sonra sentetik adresle giriş `HTTP 400` dönüyor. Yani kişinin **giriş numarası ölüyor.** Kâğıda yazılıp dağıtılmış numara geçersizleşir.

İkinci madde birinciden ağırdır ve ayarı kapatma seçeneğini tamamen geçersiz kılar.

**Karar:** Auth e-postası **hiçbir zaman değişmez**. `<numara>@orbit.invalid` kişinin kalıcı kimliğidir.

- **Giriş her zaman numarayladır.** Kullanıcı e-posta eklese de numarası çalışmaya devam eder.
- **Gerçek e-posta `profiles` içinde iletişim bilgisidir**, kimlik değildir.
- **`Secure email change` production'da AÇIK kalır.** Hiçbir güvenlik ayarı zayıflatılmıyor; e-posta değiştirmediğimiz için o ayar bizim yolumuza hiç girmiyor.
- **Kurtarma linkini biz üretir, biz göndeririz.** Edge Function `service_role` ile `POST /auth/v1/admin/generate_link` çağırır ve linki `profiles`'taki doğrulanmış adrese gönderir.

**Ölçüldü, varsayılmadı** (GoTrue v2.195.0, production ile aynı sürüm):

| Ölçüm                                 | Sonuç                                                   |
| ------------------------------------- | ------------------------------------------------------- |
| `generate_link` posta gönderiyor mu   | **Hayır — 0 mesaj.** Link ve kod bize dönüyor           |
| Dönen alanlar                         | `action_link`, `hashed_token`, **`email_otp`** (6 hane) |
| Üretilen jeton gerçekten çalışıyor mu | Evet — kurtarma oturumu alındı, şifre güncellendi       |
| Sonrasında yeni şifreyle giriş        | HTTP 200                                                |
| Sonrasında eski şifreyle giriş        | HTTP 400                                                |
| Tüm akış boyunca giden posta          | **0**                                                   |

`email_otp` alanı beklenmedik bir kazanç: 6 haneli kod, kâğıttan okunabilir ve ileride SMS'e taşınabilir. Link tıklanamayan durumlarda (yazdırılmış liste, telefonla iletme) kullanılabilir.

**Gerekçe:** Kimlik kararının ilkesi "numara opak, değişmez ve kalıcı bir belirteçtir" idi. E-posta eklendiğinde kimliğin değişmesi bu ilkeyle baştan çelişiyordu; ölçüm bunu somut bir arızaya çevirdi. Bu tasarımda kimlik hiç oynamıyor, e-posta yalnızca bir iletişim kanalı olarak ekleniyor — rolü neyse o.

Yan fayda: kurtarma akışı **bizim** kontrolümüzde. Hangi adrese gittiğini, kaç kez denendiğini, ne zaman süresinin dolduğunu biz belirleriz ve denetim kaydına yazarız. Supabase'in hazır akışında bunların hiçbiri elimizde değildi.

**Bedeli — açıkça kabul ediliyor:** Kendi e-posta gönderim sağlayıcımız gerekiyor. Supabase'in paylaşımlı SMTP'si yalnızca GoTrue'nun kendi akışlarını tetikliyor; biz link üretip gönderdiğimizde araya girmiyor.

Bu bir ek yük değil, **zaten planlı olan işin öne çekilmesi**: `PLATFORM_SETTINGS.md` bölüm 5, paylaşımlı SMTP'yi "production için uygun değil, spam'e düşmesi olağan" diye kaydediyor ve pilot kuruma açılmadan önce değiştirilmesini şart koşuyor. Seçenekler bölüm 7'de listeli.

**Bağlayıcı sonuç:** E-posta gönderim sağlayıcısı kurulmadan **kurtarma çalışmaz**. Bu nedenle Faz E4'ün ön koşuludur ve gerçek bir kuruma hesap açılmadan önce tamamlanmalıdır.

**E-posta doğrulaması da aynı mekanizmayla:** Kullanıcı adresini girer, `profiles.pending_email` alanına yazılır, ürettiğimiz kodu o adrese göndeririz. Kod geri girilirse adres doğrulanmıştır. Ayrı bir sistem gerekmez ve GoTrue'nun e-posta değiştirme akışına hiç dokunulmaz.

**Alternatifler:**

- **`Secure email change`'i kapatıp auth e-postasını değiştirmek:** Ölçüldü ve reddedildi — numara ölüyor. Yukarıdaki reddedilmiş karara bakın.
- **`admin.updateUserById` ile adresi doğrudan yazmak:** Ölçüldü; çalışıyor ama hiçbir doğrulama üretmiyor ve yine numarayı öldürüyor.
- **Kurtarmayı tamamen kurum yöneticisine bırakmak:** Öğretmen/öğrenci/veli için zaten böyle. Ancak kurum yöneticisinin kendisi için bir üst basamak gerekiyor; aksi halde her unutulan yönetici şifresi geliştirme ekibine geliyor.

---

### Karar: Şifre değiştirme ile sıfırlama ayrı akışlardır; kurtarma kanalı isteğe bağlıdır ama görünürdür

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Toplu kurulumda bir dershaneye 200 öğrenci açılacak. "Herkese hem ilk şifresini hem şifre yenileme kodunu elden vermek süreci uzatır" endişesi doğdu.

Endişe, iki farklı işlemin karıştırılmasından kaynaklanıyordu ve bu ayrım kayda geçmemişti:

| İşlem          | Ne zaman                    | Ne gerektirir                                           |
| -------------- | --------------------------- | ------------------------------------------------------- |
| **Değiştirme** | Mevcut şifreyi biliyorum    | Hiçbir şey — eski şifrenin kendisi kanıt                |
| **Sıfırlama**  | Unuttum, hesaba giremiyorum | Dışarıdan bir kanal: e-posta, SMS veya kurum yöneticisi |

**Karar:**

**1. İlk giriş bir "değiştirme"dir, "sıfırlama" değil.** Kullanıcı geçici şifresiyle girer, `must_change_password` kilidi devreye girer, yeni şifresini belirler. **İletişim bilgisi gerekmez ve ikinci bir kod dağıtılmaz.** Toplu kurulumda kişi başına tek bir fiş vardır.

**2. İletişim bilgisi ilk girişte sorulur ama zorunlu değildir** — kurum yöneticisi hariç; onun için zorunludur (bkz. "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır").

Zorunlu yapılamaz: e-postası olmayan öğrenci sisteme hiç giremez hâle gelirdi. Ancak yalnızca "atla" seçeneği sunulursa çoğu kullanıcı atlar ve kurtarma sorunu geri gelir.

**Çözüm: atlanabilir ama kalıcı olarak görünür.** Kurtarma yöntemi olmayan hesap, ayarlar ekranında ve profil alanında sürekli bir uyarı taşır: _"Kurtarma yöntemin yok — şifreni unutursan kurum yöneticine başvurman gerekir."_

**3. Doğrulanmamış adres, kurtarma kanalı sayılmaz.** `ahmet@gmial.com` yazan bir kullanıcının sıfırlama postası bir yabancıya gider. Adres doğrulanana kadar hesap "kurtarma yöntemi yok" kabul edilir ve yukarıdaki uyarı görünmeye devam eder.

**4. Sıfırlama akışı kanal varlığına göre dallanır:**

- Doğrulanmış iletişim bilgisi **varsa** → linki ve 6 haneli kodu biz üretip o adrese göndeririz.
- **Yoksa** → kullanıcı kurum yöneticisine yönlendirilir; yönetici panelden yeni geçici şifre üretir.

**Gerekçe:** Toplu dağıtım tek seferliktir ve zaten kaçınılmazdır — ilk kimlik bilgisi kişiye bir şekilde ulaşmak zorunda. İkinci bir dağıtım turu hiç var olmadığı için asıl endişe ortadan kalkıyor. Sıfırlama ise bireysel ve seyrek bir olaydır; toplu bir yük oluşturmaz.

Kurtarma kanalını zorunlu yapmamak, KVKK'daki veri minimizasyonu ilkesiyle de uyumludur: giriş yapacak her çocuk için e-posta toplamak, ihtiyaç duyulmayan kişisel veri işlemek olurdu.

**Ertelenen fikir — veli üzerinden kurtarma:** Öğrencinin iletişim bilgisi yoksa, bağlı velisinin doğrulanmış adresine gönderilmesi önerildi. Fikir yöneticinin yükünü azaltır ancak iki koşul olmadan uygulanamaz:

1. **Yaş sınırı.** Küçük bir öğrencinin kurtarmasını velisine göndermek doğrudur; veli yasal temsilcidir. **Yetişkin bir kursiyerinkini göndermek değildir.** Zincir ya yaşa bağlanmalı ya da öğrencinin açık onayına dayanmalıdır.
2. **Bağlantının doğrulanmış olması.** Veri girişinde yanlış veli bağlanmışsa kimlik bilgisi yanlış kişiye gider.

`student_guardians` tablosu v1.2'de geldiği için bu karar o sürüme ertelenmiştir.

---

### Karar: Operatör desteği üç katmanlıdır — teşhis, izinli oturum, acil erişim

**Durum:** Alındı
**Tarih:** 2026-08-24
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** Platform operatörü kurum içeriğini göremiyor ve bu bilinçli. Ancak geliştirme ekibi biziz: kurumda bir sorun çıktığında bize gelecekler. Hiçbir görüş olmadan sorun çözmek imkânsız veya çok yavaş olur.

**Gözlem — sorunların çoğu kişisel veri görmeyi gerektirmez.** "Öğrenci listesi yüklenmiyor" sorununu teşhis etmek için isimleri görmek gerekmez; kayıt sayıları, hata kayıtları ve ilişki bütünlüğü yeter.

**Karar:** Destek erişimi tek bir anahtar değil, üç katmandır.

**Katman 1 — Teşhis ekranı (kişisel veri yok).** Platform panelinde kurum başına yapısal görünüm: kayıt sayıları, son işlem zamanı, hata kayıtları, şema tutarsızlıkları. Hiçbir kişi adı, notu, yoklaması veya ödemesi görünmez. KVKK sınırına dokunmaz, izin gerektirmez, her zaman açıktır.

**Katman 2 — Destek oturumu (kurumun izniyle).** Kurum yöneticisi kendi panelinden "geliştirme ekibine erişim ver" der. Oturum **süre sınırlıdır** ve kendiliğinden kapanır; her okuma denetim kaydına yazılır; yönetici ne yapıldığını görebilir.

Erişim **salt okunurdur.** Sorunların neredeyse tamamı okumayla teşhis edilir; yazma yetkisi riski katlar ve "verimizi siz mi sildiniz" tartışmasına kapı açar. Düzeltme gerekiyorsa ya kurum yöneticisi uygular ya da ayrı bir migration ile yapılır.

**Katman 3 — Acil erişim.** Kurum yöneticisi kilitlendiyse izin verecek kimse kalmaz. Operatör bu durumda erişimi kendisi açabilir, ancak:

- **Gerekçe yazmak zorunludur** ve gerekçe denetim kaydına girer.
- Süre kısadır ve uzatılamaz; uzatma yeni bir kayıt üretir.
- Kurumdaki **tüm yöneticilere bildirim gider.**

**Gerekçe:** KVKK çerçevesinde kurum veri sorumlusu, ORBIT veri işleyendir. Veri işleyenin, sorumlunun talimatıyla erişmesi beklenen ve meşru olandır — Katman 2 tam olarak budur. Katman 3 ise inkâr edilen bir yetki değil, **görünür kılınmış** bir yetkidir; gizli bir arka kapıdan çok daha güvenlidir.

Bu karar, `PROJECT_STATE.md` bölüm 10'daki düzeltilmiş taahhüdün somut hâlidir: _"operatör ürün üzerinden içerik okuyamaz; yetki yükseltebilir, her yükseltme kayda geçer ve bildirilir."_

**Sıra:** Katman 1 Faz E4'te yapılabilir; kişisel veriye dokunmadığı için iş tablolarını beklemez. Katman 2 ve 3, RLS koşulları iş tablolarına yazılacağı için **v1.2 sonrasına** aittir.

**Alternatifler:**

- **Operatöre kalıcı okuma yetkisi vermek:** En kolayı. Reddedildi; "operatör kapları yönetir, içeriği görmez" taahhüdünü tamamen ortadan kaldırır ve kuruma satış yaparken savunulamaz.
- **Hiçbir erişim vermemek:** Bugünkü durum. İşlemez; her sorun için kurumdan ekran görüntüsü istemek zorunda kalırız.
- **Destek oturumunda yazma yetkisi de vermek:** Reddedildi; teşhis için gereksiz, sorumluluk açısından risklidir.

---

### Karar: Rol, atama ve bağlantı üç ayrı kavramdır

**Durum:** Alındı
**Tarih:** 2026-08-25
**Kararı Onaylayan(lar):** Arda Bülent

**Bağlam:** "Bir kişinin bir kurumda tek üyeliği olur" kısıtı konduktan sonra doğal soru geldi: **peki bir kişinin aynı kurumda iki yetkisi olursa ne olacak?**

Soru gerçek durumlara dayanıyor ve üçü de sahada yaygın:

1. Küçük bir dershanenin sahibi hem yönetiyor hem ders veriyor.
2. Çocuğu aynı dershanede okuyan bir öğretmen.
3. Alt sınıflara ders veren 12. sınıf öğrencisi.

İnceleme, bugünkü `app_role` enum'unun (`admin`/`teacher`/`student`/`parent`) **üç farklı kavramı tek kutuya koyduğunu** gösterdi.

**Karar:** Üç kavram ayrılır ve karıştırılmaz.

| Kavram       | Ne belirtir                    | Nerede yaşar                                     |
| ------------ | ------------------------------ | ------------------------------------------------ |
| **Rol**      | Kişinin kurumdaki temel işlevi | `organization_memberships.role`                  |
| **Atama**    | Hangi sınıf/ders/şube onun     | Ayrı atama tabloları (v1.2)                      |
| **Bağlantı** | Kime bağlı olduğu              | `student_guardians` gibi ilişki tabloları (v1.2) |

Bu ayrımın üç somut sonucu var:

**1. Ders vermek bir atama, rol değil.** Yönetici aynı zamanda ders verebilir; rolü `admin` kalır, hangi sınıfların onun olduğu atama kaydından gelir. `admin` yetkileri `teacher` yetkilerini zaten kapsar. İkinci bir üyelik gerekmez.

**2. `parent` bir rol OLARAK KALIR, ama kapsamı bağlantıdan gelir.** Rol hangi panelin açılacağını belirler; hangi öğrencinin görüleceğini `student_guardians` bağlantısı belirler.

> **Sonradan düzeltme (2026-08-25):** Bu madde ilk yazımında _"`parent` rol olmaktan çıkarılır"_ diyordu. Gerekçe, öğretmen-veli durumunun tek hesapla ifade edilememesiydi.
>
> Arda Bülent daha basit bir çözüm gösterdi: **birden fazla rolü olan kişi için ikinci bir hesap.** O zaman `parent`'ın rol olarak kalmasında hiçbir sakınca yok ve v1.2'den bir şema değişikliği eksiliyor. Enum'dan çıkarma önerisi, ikinci hesabın daha basit çözdüğü bir soruna karşı fazladan karmaşıklıktı.

> ⚠️ **Yönetici-veli durumunda çıkar çatışması vardır.** Yönetici hem notu/yoklamayı düzenleyebilen kişi hem de o öğrencinin velisidir; kendi çocuğunun kaydını değiştirebilir. Bu **teknik bir açık değildir** — yönetici zaten her öğrencinin kaydını değiştirebilir — ancak sonucu ağırdır ve fark edilmesi güçtür.
>
> Karşılığı erişimi kısıtlamak değil, **izlenebilirlik**tir: not, yoklama ve ödeme değişiklikleri kurumun kendi denetim kaydına yazılmalı ve kaydın kim tarafından yapıldığı görünmelidir. v1.4'te CRUD akışları yazılırken bu kayıtlar atlanamaz.
>
> Erişimi kısıtlamak — "yönetici kendi çocuğunun notunu düzenleyemesin" — bilinçli olarak reddedilmiştir: tek yöneticili küçük bir kurumda o öğrencinin notunu girecek başka kimse olmayabilir ve sistem kullanılamaz hâle gelir.

**3. Birden fazla rol gerektiren HER durumda kurum ikinci hesap açar.** Öğretmen-veli, yönetici-veli, öğrenci-asistan — hepsinde aynı yol.

Her hesabın kendi rolü ve kendi yetkisi vardır. Veli hesabı gerçekten velidir; tüm öğrencileri göremez, çünkü yetkisi yoktur. Yönetici hesabı ayrıdır. Yeni bir yetki mantığı gerekmez — her rolün paneli zaten var.

**Gerekçe:** İlk iki durum **rol sorunu değildi**; öyle görünmelerinin sebebi enum'un üç kavramı birleştirmesiydi. Doğru modellendiklerinde tek hesapla çözülüyorlar ve ikinci hesaba hiç gerek kalmıyor.

Üçüncü durum gerçekten iki roldür ve nadirdir. Nadir bir durum için rol kümesi, rol hiyerarşisi veya çoklu üyelik gibi kalıcı bir karmaşıklık taşımak, her RLS politikasını ve her kimlik çözümlemesini etkiler — bedeli faydasından büyüktür. İkinci hesap, kararı kuruma bırakır ve sistemde hiçbir iz bırakmaz.

**İkinci hesabın bedeli — açıkça kabul ediliyor:**

- Kişi iki giriş numarası taşır ve hangisinin ne olduğunu hatırlamak zorundadır.
- Verisi bölünür; iki hesap arasında hiçbir bağ yoktur.
- **KVKK:** aynı veri sahibinin iki kaydı olur. "Verilerimi sil" talebinde tüm hesapların bulunması gerekir; eksik silme riski doğar. Silme akışı yazılırken (v2.0) bu ihtimal hesaba katılmalıdır.

Bu bedel, **yalnızca üçüncü durum için** kabul ediliyor. İlk iki durumda ikinci hesap açmak yanlış olur: öğretmen-veli iki hesapla günde birkaç kez çıkış-giriş yapmak zorunda kalır ve pratikte veli hesabını hiç kullanmaz.

**Hesaplar arası geçiş düğmesi.**

Birden fazla rolü olan kişi, rolü kadar hesaba sahiptir. Her giriş-çıkışta şifre yazmak günlük kullanımda katlanılabilir değil; bu yüzden sağ üstte hesaplar arası geçiş düğmeleri bulunur.

**Hangi düğmelerin görüneceği kişinin gerçekten sahip olduğu hesaplardan türetilir.** Sabit bir liste veya sabit bir sayı yoktur. Örnekler — tamamı değil:

| Kişi                       | Görünen düğmeler                         |
| -------------------------- | ---------------------------------------- |
| Yalnızca öğretmen          | **Hiçbiri** — bileşen hiç render edilmez |
| Yönetici + veli            | `Yönetici` · `Veli` — öğretmen görünmez  |
| Öğretmen + veli            | `Öğretmen` · `Veli`                      |
| Yönetici + öğretmen + veli | Üçü birden                               |

**Bu bir şablon değil, bir sistemdir.** İki tasarım kuralı bağlayıcıdır:

1. **Hesap sayısı sınırsızdır.** İkili geçiş (toggle) olarak yazılmaz; N hesap üzerinden döner. Bugün en fazla üç rol var, yarın dört olabilir.
2. **Roller kodda sabitlenmez.** Düğme, kişinin hesaplarında hangi rol varsa onu gösterir; rol isimlerini kendisi bilmez. İleride `muhasebeci` gibi yeni bir rol eklendiğinde — ve o kişi aynı zamanda veli olduğunda — geçiş bileşenine **tek satır** dokunulmaz.

İkinci kural, roller büyüdükçe her yeni rolde aynı bileşeni düzenlemek zorunda kalmamak içindir. Rol listesini bileşene gömmek, bugün üç satırlık bir kolaylık, altı ay sonra unutulacak bir bakım borcudur.

**Bu düğme yeni bir yetki mantığı getirmez.** Her hesabın rolü ve yetkisi zaten kendindedir; veli hesabı tüm öğrencileri göremez çünkü yetkisi yoktur. Düğme yalnızca çıkış-giriş zahmetini kaldırır. Rollerin panelleri de zaten mevcuttur.

**Geçiş şifre sormaz.** Sorması daha güvenli olurdu ancak günde birkaç kez şifre yazmak kimsenin katlanacağı şey değildir; pratikte düğme kullanılmaz ve kişi tek hesapta kalır. Ortak bilgisayar riskini hareketsizlik sayacı karşılıyor.

**Bağlayıcı sonuç — sayaç tüm oturumları birden kapatır.** Şifresiz geçiş, iki oturumun aynı anda saklanması demektir. Hareketsizlik sayacı yalnızca aktif oturumu kapatırsa diğeri açık kalır ve sayacın var olma sebebi ortadan kalkar.

**Hesaplar bir kişi kaydına bağlanır — ikili bağ olarak DEĞİL.** "Bu kişinin diğer hesapları hangileri" sorusunun cevabı bir yerde durmak zorunda; düğmenin çalışması için zaten gerekli.

Modelleme biçimi önemli: hesaptan hesaba işaret eden bir alan (`linked_account_id`) iki hesapta çalışır, **üçte kırılır** — üç hesabın hangi ikisinin bağlanacağı belirsizdir ve zincir kopabilir. Doğrusu **hesapların ait olduğu bir kişi kaydı**: N hesap aynı kişiye bağlanır, kaç tane olduğu fark etmez.

Aynı kayıt KVKK açısından da gerekli: aksi halde bir insanın birden fazla kaydı olur, aralarında hiçbir bağ bulunmaz ve "verilerimi sil" talebinde biri gözden kaçabilir.

**Uygulama sırası:**

- **Bugün geçerli:** bir kişi, bir kurumda, bir üyelik, bir kod, bir numara (Issue #65 ile şemada zorlanıyor).
- **v1.2:** `student_guardians` bağlantısı ve öğretmen-sınıf/ders atamaları. `parent` enum değeri **kalır**; kaldırılması gerekmiyor (yukarıdaki düzeltmeye bakın).
- **v1.3:** Hesaplar arası geçiş düğmesi ve kişi kaydı. Hareketsizlik sayacının tüm oturumları kapatacak biçimde genişletilmesi aynı işin parçasıdır.
- **v2.0:** hesap silme/anonimleştirme akışında çoklu hesap ihtimali.

**Alternatifler:**

- **Rol kümesi (`role[]`) veya rol hiyerarşisi:** Her RLS politikası "bu kişinin rollerinden herhangi biri" sorusunu sormak zorunda kalırdı. Politikaların tamamını karmaşıklaştırır ve bugün gerçek karşılığı olmayan bir esneklik için ödenir.
- **Kişi başına çoklu üyelik:** Denendi ve geri alındı (Issue #65). `person_code` üyelikte durduğu için iki üyelik iki giriş numarası üretiyor, ancak auth hesabı tek olduğundan numaralardan biri hiçbir hesaba karşılık gelmiyordu.
- **Her durumda ikinci hesap:** Kullanıcının önerisinin genel hâli. Reddedildi: öğretmen-veli günlük bir durum ve iki hesapla kullanılamaz hâle gelir.
