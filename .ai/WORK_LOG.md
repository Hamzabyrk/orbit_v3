# WORK_LOG.md — ORBIT

> Hangi geliştirici/YZ ne yaptı, sırada hangi bilet var. Format: `PROJECT_ARCHITECT.md` §01.

---

## 2026-08-21 — Vercel Production Deploy ve Supabase Güvenlik Bağlantısı

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/1-platform-integrations` branch'inde)

**Ne yapıldı:**

- GitHub Issue #1 açıldı ve çalışma doğrudan `main` yerine feature branch üzerinde yürütüldü.
- ORBİT Vercel ekibinde `orbit-v3` projesi oluşturuldu ve `Hamzabyrk/orbit_v3` GitHub reposuna otomatik deployment için bağlandı; Production/Preview/Development ortamlarına `VITE_SUPABASE_URL` ve public anon key eklendi. `service_role` anahtarı kullanılmadı.
- Production build `https://orbit-v3-topaz.vercel.app` adresinde yayınlandı.
- Mevcut `orbit-dershane` Supabase projesi bağlandı. Denetimde sıfır belge satırı ve sıfır storage nesnesi bulundu.
- Anonim SELECT/INSERT/DELETE ve storage okuma/yükleme/silme politikaları migration ile kaldırıldı; `workspace-documents` bucket'ı private yapıldı. Son doğrulamada tablo politikası `0`, storage politikası `0`, bucket `public=false` olarak ölçüldü.
- Supabase CLI yapılandırması ve uzak migration geçmişiyle eşleşen timestamp'li migration dosyaları repoya eklendi.
- `pnpm test` (7/7), TypeScript, ESLint ve production build başarıyla tamamlandı.
- Draft PR #2 için GitHub Actions `quality-gate` işi başarıyla geçti.

**Sırada ne var:**

1. Arda'yı GitHub repo ve Vercel ORBİT ekibinde gereken rollerle doğrulamak.
2. Supabase Auth + tenant sahipliği tasarlanmadan belge yazma/okuma politikası eklememek.

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
