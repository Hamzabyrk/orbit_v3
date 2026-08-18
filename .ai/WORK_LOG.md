# WORK_LOG.md — ORBIT

> Hangi geliştirici/YZ ne yaptı, sırada hangi bilet var. Format: `PROJECT_ARCHITECT.md` §01.

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
