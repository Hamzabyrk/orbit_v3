# WORK_LOG.md — ORBIT

> Hangi geliştirici/YZ ne yaptı, sırada hangi bilet var. Format: `PROJECT_ARCHITECT.md` §01.

---

## 2026-08-21 — Ayarlar Sayfasının Kategorili Yapıya Genişletilmesi

**Kim:** Claude (Arda Bülent ile birlikte, `feat/4-kullanici-paneli-gelistirme` branch'inde, `Hamzabyrk/orbit_v3` reposu)

**Ne yapıldı:**

- `SettingsPage.tsx` 3 statik karttan, sol tarafta kategori listesi + sağda detay paneli olan 8 kategorili bir yapıya genişletildi (Profil, Kurum, Bildirimler, Roller ve Erişim, Sistem, Güvenlik, Veri Yönetimi, Veri İçe Aktarma) — referans bir SaaS uygulamasının canlı sürümü (demo1/demo1 ile) incelenerek tasarlandı. Sayfa hâlâ sadece admin'e açık, `educationAccess.ts`'e dokunulmadı.
- Profil/Kurum/Sistem/Güvenlik kategorileri gerçek düzenlenebilir form alanları + "Değişiklikleri Kaydet" butonu içeriyor (ephemeral, backend yok); Bildirimler ve Güvenlik'te gerçek shadcn `Switch` kullanıldı — bu, `education/` modülünde ilk shadcn kullanımı (repo genelinde zaten kurulu, kullanıcı onayıyla).
- "Roller ve Erişim" kategorisi artık `educationAccess.ts`'in gerçek `access` verisinden (mevcut 2 export edilen fonksiyon üzerinden, dosyaya dokunmadan) üretilen canlı bir erişim matrisi gösteriyor — sahte/statik içerik değil.
- "Veri Yönetimi"deki "Demo Verilerini Sıfırla" birebir aynı işlevle korundu, üzerine shadcn `Dialog` ile bir onay adımı eklendi (geri alınamaz aksiyon artık onaysız tetiklenmiyor); yanına referanstaki dışa aktarma kartına simetrik bir placeholder eklendi.
- Yeni "Veri İçe Aktarma" kategorisi: bağımlılıksız, elle yapılmış dosya seçici/sürükle-bırak alanı (CSV/Excel), gerçek dosya adını toast'ta gösteriyor.
- `pnpm check`, `pnpm lint`, `pnpm test` (14/14), `pnpm build` geçti; dev server'da admin olarak 8 kategorinin tamamı, "Değişiklikleri Kaydet" toast'ları, switch'ler, erişim matrisinin gerçek verilerle eşleştiği, sıfırlama onay diyaloğunun gerçekten çalıştığı (regresyon yok), dosya seçme + sürükle-bırakın toast attığı ve öğretmen/öğrenci/veli rollerinde "Ayarlar"ın hâlâ hiç görünmediği tek tek doğrulandı.
- Not: Test sırasında otomasyon tarayıcı sekmesinin CSS animasyonlarını tick'lemediği (muhtemelen arka planda/throttle edilmiş sekme) fark edildi — bu, Dialog kapanışında görünmez bir overlay'in DOM'da takılı kalmasına yol açtı; `animationend` event'ini elle tetikleyince sorunun anında düzeldiği doğrulandı, yani bu gerçek kullanıcıyı etkilemeyen bir otomasyon-ortamı artefaktı, kod tarafında bir hata değil.

**Sırada ne var:**

1. Kullanıcının bir sonraki fazı: rol-bazlı bir "Ödevler" bölümü (öğretmen sadece sorumlu olduğu sınıflara girer — mevcut eşleme Merve Karaca → YKS 12-A & YKS 11-C, Bora Ekin → YKS 12-B —, admin hepsini görür, öğrenci/veli/admin sadece görüntüler). Ayrı bir plan turu olarak ele alınacak.

---

## 2026-08-21 — Gün Planı (To-Do List + Takvim) — Yönetici & Öğretmen Paneli

**Kim:** Claude (Arda Bülent ile birlikte, `feat/4-kullanici-paneli-gelistirme` branch'inde, `Hamzabyrk/orbit_v3` reposu)

**Ne yapıldı:**

- Yönetici ve öğretmen panellerine yeni bir "Gün Planı" bölümü eklendi: üstte "To-Do List" (4 kolonlu Kanban görev panosu — Planla/Bugün/Odaklan/Tamamlandı) ve "Takvim" (aylık takvim + günlük ajanda) sekmeleri.
- `educationAccess.ts`'e `"Gün Planı"` section'ı eklendi, sadece `admin`/`teacher` erişebiliyor (`student`/`parent`'a kapalı) — hem birim testle hem tarayıcıda rol geçişleriyle doğrulandı.
- Veri role-özel: yönetici ve öğretmen kendi ayrı mock görev/randevu listelerine sahip (`dayPlanTasksByRole`/`dayPlanEventsByRole`, `mockData.ts`).
- Görev durumu değişimi (dropdown ile kolon taşıma) tam fonksiyonel ve `demoStorage` ile kalıcı (mevcut `attendances`/`automations` deseniyle aynı, `resetDemoData()`'ya dahil edildi); takvimde gün seçimi ajandayı güncelliyor. "+ Yeni görev" / "+ Yeni Görüşme Ekle" ve kolon-içi "+" butonları, uygulamanın geri kalanındaki "Yeni sınıf" konvansiyonuyla tutarlı şekilde placeholder toast gösteriyor.
- Yeni dosyalar: `DayPlanPage.tsx`, `DayPlanToDoBoard.tsx`, `DayPlanTaskCard.tsx`, `DayPlanCalendar.tsx`, `DayPlanMonthGrid.tsx`, `DayPlanAgenda.tsx`, `dayPlanHelpers.ts` (+ test). Yeni npm bağımlılığı eklenmedi (`date-fns`, `lucide-react`, mevcut `Badge`/`PageHeader`/`StatCard` yeterliydi).
- `pnpm check`, `pnpm lint`, `pnpm test` (14/14), `pnpm build` başarıyla geçti; dev server'da admin ve öğretmen olarak gerçek tarayıcı testi yapıldı (nav görünürlüğü, kolon taşıma, kalıcılık, takvim gün seçimi, placeholder toast'lar, rol-özel veri izolasyonu tek tek doğrulandı).
- Not: `pnpm run format:check` bu Windows checkout'ta 38 dosyada CRLF/LF uyuşmazlığı uyarısı veriyor (`core.autocrlf=true` vs `.prettierrc`'deki `endOfLine: "lf"`) — bu, bu iş kapsamının dışında, repo genelini etkileyen ortam kaynaklı bir durum; CI Linux'ta çalıştığı için etkilenmiyor.

**Sırada ne var:**

1. Hamza/Codex'in `feat/1-platform-integrations` (Draft PR #2, sadece Vercel/Supabase platform bağlantısı — henüz gerçek auth/DB fazı değil) işi ayrı olarak merge edilmeyi bekliyor.
2. Asıl auth + Supabase Auth + RLS fazı (mock veri temizliği dahil) henüz başlamadı, ayrı bir Issue olarak planlanacak.

---

## 2026-08-18 — Graph-First Düşünme, Blast Radius ve Sistemik Risk Protokolü

**Kim:** Antigravity (Arda Bülent ile birlikte, `feat/orbit-core-init` branch'inde)

**Ne yapıldı:**

- `PROJECT_ARCHITECT.md` §00 Kural 8 ve yeni `08 — Graph-First Düşünme ve Sistemik Risk Protokolü` eklendi. YZ ajanlarına koda atlamadan önce 6 Boyutlu Sistem Grafı (Teknik Kod/Tipler/State, Ticari Bütçe, Hata/Fallback, KVKK/Gizlilik, Pik Yük/Darboğaz, Güvenlik) çıkarma ve risk durumunda proaktif itiraz (pushback) kuralı getirildi.
- `.github/PULL_REQUEST_TEMPLATE.md` içine "🕸️ Graph & Etki Alanı (Blast Radius) Analizi" şablonu eklendi.
- `CONTRIBUTING.md` içine 7. kural olarak "Graph-First Düşünme ve Etki Alanı Analizi" işlendi.
- `.ai/PROJECT_STATE.md` ve `.ai/DECISION_LOG.md` güncellendi.
- `npm run format`, `npm run format:check`, `npm run lint`, `npm test`, `npm run check`, `npm run build` ile doğrulandı.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme (CRUD) formlarının dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme interaktif modalının geliştirilmesi.
3. Yoklama ve sınav hesaplama mantıklarının bağlanması.

---

## 2026-08-18 — EducationPlatform Bölünmesi, Mock Veri İzolasyonu ve ESLint Kalite Kapısı

**Kim:** Claude Code (Arda Bülent ile birlikte, `feat/core-shared-modules` branch'inde)

**Ne yapıldı:**

- 2659 satırlık `EducationPlatform.tsx` tek dosyası `components/education/` altında `types.ts`, `mockData.ts`, `shared.tsx`, `LoginScreen.tsx`, `StudentDetail.tsx`, `dashboards/`, `pages/` ve kompozisyon kökü `EducationPlatform.tsx` olarak bölündü; `Home.tsx` import'ları güncellendi.
- `Student`, `ClassGroup`, `ScheduleItem`, `Automation`, yeni `PaymentRow` tiplerine `isMock: true` bayrağı eklendi (`PaymentsPage`'in inline `items` dizisi `mockData.ts`'e `paymentRows` olarak taşındı).
- `attendances` ve `automations` state'leri için `lib/demoStorage.ts` (+ `demoStorage.test.ts`) ile localStorage kalıcılığı eklendi; `SettingsPage`'e "Demo Verilerini Sıfırla" kartı/butonu eklendi.
- ESLint 9 (flat config, `eslint.config.js`) + typescript-eslint + eslint-plugin-react-hooks (v5, klasik kural seti) + eslint-plugin-react-refresh eklendi; `pnpm lint` script'i ve CI'a `Lint Kontrolü (ESLint)` adımı eklendi. Kurulum sırasında bulunan gerçek sorunlar (kullanılmayan import, `usePersistFn`'deki `any`, `ThemeContext`'in context+hook dışa aktarımı) düzeltildi.
- `pnpm check`, `pnpm test`, `pnpm run lint`, `pnpm run format:check`, `pnpm build` hepsi yeşil.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme işlevlerinin (CRUD) dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme formlarının interaktif hale getirilmesi.
3. Supabase Auth ve RLS politikalarının aktif edilmesi (Aşama 3 kapsamında).

---

## 2026-08-17 — Keşif Mülakatı ve MVP Mimarisinin Kesinleştirilmesi

**Kim:** Antigravity (Arda Bülent ile birlikte, `feat/orbit-core-init` branch'inde)

**Ne yapıldı:**

- `PROJECT_ARCHITECT.md` §02 Etkileşimli Keşif Mülakatı (Grup A, B, C, D) başarıyla tamamlandı.
- Ürün kapsamı: Devlet kısıtlaması olmayan özel kurslar (LGS/YKS, butik etüt, dil kursları) için yalın Sınıf & Öğrenci CRM'i olarak belirlendi.
- Müşteri görüşmesi stratejisi: Auth ve harici API yükü olmadan, tek tıkla rol geçişli ve `isMock: true` bayraklı verilerle çalışan saha demosu olarak kararlaştırıldı.
- `.ai/PROJECT_STATE.md` ve `.ai/DECISION_LOG.md` güncellenerek tüm kararlar kayıt altına alındı.
- Vercel dağıtım ve GitHub entegrasyon kararları onaylandı.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme işlevlerinin (CRUD) dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme (Ad, No, Sınıf, Tel, Veli Bilgileri) formlarının interaktif hale getirilmesi.
3. Yoklama alma ve sınav sonuçlarının dinamik olarak hesaplanması.
4. Örnek verilerin `isMock: true` bayrağı ile işaretlenmesi ve tek tıkla "Demo Verileri Sıfırla / Temizle" aksiyonunun eklenmesi.
