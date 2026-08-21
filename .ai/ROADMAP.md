# ORBIT - Aşamalı Geliştirme Yol Haritası

Bu dosya sürüm kapsamını, kabul kriterlerini ve kullanıcı tarafından onaylanan ürün/mimari kararlarını tek doğruluk kaynağı olarak tutar. Her sürüm tamamlanıp kalite kapısından geçmeden sonraki sürüme başlanmaz.

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

### Soru 3 - İlk pilot kurum ve ilk admin nasıl oluşturulacak?

**Onaylı cevap:** Kapalı beta döneminde ilk kurum, varsayılan şube ve ilk admin platform tarafında önceden oluşturulacak. Admin benzersiz e-posta adresine Supabase daveti alacak. Herkese açık self-service "kurum oluştur" onboarding akışı v1.5 sonrasına bırakılacak.

**Gerekçe:** İlk pilotta kötüye kullanım ve yarım kurum kayıtları oluşturmadan kontrollü kurulum yapmak.

### Soru 4 - Öğrenci giriş hesabı nasıl açılacak?

**Onaylı cevap:** Öğrencinin akademik kaydı Auth hesabı olmadan oluşturulabilecek ve `auth_user_id` başlangıçta boş kalabilecek. Öğrenciye benzersiz bir e-posta sağlandığında davetle giriş hesabı etkinleştirilecek. Sahte e-posta, ortak hesap veya paylaşılan geçici şifre üretilmeyecek. Öğrencinin hesabı yoksa bağlı veli kendi hesabından yalnızca izin verilen öğrenci verisini görecek.

**Gerekçe:** Çocuk kullanıcılar, benzersiz kimlik gereksinimi ve KVKK güvenliği.

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
- [x] İlk kurum/admin kurulum ve davet Edge Function'ı.
- [x] `audit_events` temeli.
- [x] RLS yardımcı fonksiyonları ve kurumlar arası negatif güvenlik testleri.

**Uygulama durumu (Issue #8):** Kod, migration ve testler feature branch üzerinde hazırdır. Frontend kalite kapısı ile uzak SQL lint/dry-run geçmiştir. Production migration/Edge Function deployment'ı, SQL testlerinin Docker/Supabase test veritabanında çalışması, diğer ekip üyesinin review'u ve PR merge'i sonrasında yapılacaktır.

**Release gate:** Production kullanıcısı rolünü istemciden değiştiremez; iki farklı kurum birbirinin hiçbir kaydını okuyamaz/yazamaz.

### v1.2 - İlişkisel Veritabanı ve RLS

**Hedef:** Kurumun insan, sınıf ve akademik organizasyonunu foreign key ilişkileriyle kurmak.

- [ ] `students`, `guardians`, `student_guardians`.
- [ ] Öğretmen üyelik detayları ve öğretmen-sınıf/ders atamaları.
- [ ] `classes`, `class_enrollments`, `subjects`, `schedule_entries`.
- [ ] `daily_feed_posts`, kişisel `tasks` ve `calendar_events` için ayrı modeller.
- [ ] `attendance_sessions`, `attendance_records`.
- [ ] `homework_assignments`.
- [ ] `exams`, `exam_results` ve güvenli sıralama görünümü/RPC'si.
- [ ] `payment_plans`, `installments`.
- [ ] Her tabloda tenant ve rol kapsamlı RLS; gerekli foreign key/index/constraint'ler.

**Release gate:** RLS test matrisi admin/teacher/student/parent için olumlu ve olumsuz senaryolarda geçer; sahipsiz tenant kaydı oluşamaz.

### v1.3 - Dinamik Frontend ve Temiz Kurum Görünümü

**Hedef:** Dört paneli gerçek oturum ve Supabase verisiyle çalıştırmak, production mock verisini kaldırmak.

- [ ] `mockData.ts`, `isMock: true` tipleri ve `orbit:demo:*` production bağımlılığının kaldırılması.
- [ ] React Query tabanlı modüler repository/query/mutation katmanı.
- [ ] Dashboard, öğrenci, sınıf, program, ödeme, sınav ve rapor değerlerinin canlı sorgulardan türetilmesi.
- [ ] Tasarım değişmeden loading, error ve boş kurum durumlarının eklenmesi.
- [ ] Sağ üst rol göstergesinin gerçek üyelikten gelmesi; demo geçişinin environment ile sınırlandırılması.
- [ ] Kurum/sınıf kapsamlı Realtime invalidation ve abonelikleri.

**Release gate:** Yeni kurum yalnızca admin ve boş ekranlarla açılır; production bundle içinde demo kişi/kurum verisi bulunmaz; aynı veri farklı yetkili oturumlarda doğru kapsamda güncellenir.

### v1.4 - Yetkili CRUD ve Operasyon Akışları

**Hedef:** Görsellerde tanımlanan temel iş kurallarını çalışan formlara bağlamak.

- [ ] Admin: öğretmen/öğrenci/veli daveti ve kayıt yönetimi.
- [ ] Admin: sınıf oluşturma, düzenleme ve arşivleme.
- [ ] Admin: ders programı ve öğretmen ataması.
- [ ] Admin/öğretmen: sorumlu kapsamda yoklama oluşturma ve düzeltme.
- [ ] Admin/öğretmen: sınav oluşturma, sonuç girme/düzeltme ve sıralama analizi.
- [ ] Öğretmen: sorumlu sınıfa ödev oluşturma.
- [ ] Admin/öğretmen: hedefli Günlük Akış paylaşımı.
- [ ] Kullanıcı: kendine özel Gün Planı görev ve takvim yönetimi.
- [ ] Admin: ödeme planı/taksit kaydı; veli: yalnızca bağlı öğrencinin tutar/vade görünümü.
- [ ] Zod doğrulama, kontrollü hata mesajları ve kritik mutasyon audit kayıtları.

**Release gate:** Yetkisiz CRUD, doğrudan API isteğiyle de RLS tarafından reddedilir; admin değişikliği ilgili öğretmen/öğrenci/veli ekranında Realtime ile görünür.

### v1.5 - Functional MVP ve Kapalı Beta

**Hedef:** Bir pilot kurumun kontrollü gerçek kullanıcı/veri akışını uçtan uca test etmek.

- [ ] Dört rol için kabul testi ve tenant izolasyon testi.
- [ ] İlk admin/öğretmen/öğrenci/veli davet akışı.
- [ ] KVKK veri envanteri, log sanitization ve erişim matrisi denetimi.
- [ ] Rate limit, CORS, security headers ve production hata mesajları denetimi.
- [ ] Realtime kopması, ağ hatası ve boş veri fallback senaryoları.
- [ ] Supabase/Vercel ücretsiz katman kullanım ve bütçe alarmı kontrolü.
- [ ] Prettier, ESLint, TypeScript, Vitest, SQL/RLS testleri ve production build.
- [ ] Pilot kurumdan ölçülebilir geri bildirim ve hata listesi.

**Release gate:** Pilot onayı, kritik/yüksek güvenlik açığı olmaması ve tüm CI kontrollerinin yeşil olması.

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
- `.ai/PROJECT_STATE.md` ile `.ai/WORK_LOG.md` güncellemesi; mimari karar varsa `DECISION_LOG.md` güncellemesi.
- Draft PR, diğer ekip üyesinin review onayı ve yeşil CI olmadan merge yapılmaması.
