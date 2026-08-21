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
