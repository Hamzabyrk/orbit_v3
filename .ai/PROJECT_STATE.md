# PROJECT_STATE.md — ORBIT

> Bu dosya, `PROJECT_ARCHITECT.md` §01'de tanımlanan çoklu-YZ ortak hafızasının parçasıdır. Her ajan (Claude, Cursor, Gemini, Antigravity vb.) kod yazmaya başlamadan önce bu dosyayı okumalıdır.
>
> **Durum: TASLAK.** Aşağıdaki bilgiler yalnızca kod/repo/commit geçmişinden gözlemlenen doğrulanmış gerçeklerdir. Mimari kararların resmî gerekçe/trade-off analizi, `PROJECT_ARCHITECT.md` §02 Keşif Mülakatı tamamlanıp §03 Teknoloji ve Mimari Karar Motoru raporu üretildikten sonra bu dosyaya işlenecektir. O ana kadar bu dosyayı "geçici/gözlemsel" kabul edin.

## Ürün

ORBIT — dershane/kurs merkezi/eğitim kurumu için CRM + finans + eğitim operasyonları platformu. Önceki adı "MoneyFlow" (bağımsız finans/muhasebe SaaS konsepti). Rebrand ve platform geçişi (Manus → GitHub) 2026-08-16'da tamamlandı. Geçmiş süreç detayı: `docs/archive/PROJECT_HISTORY.md`.

Hedef kullanıcı rolleri (gözlemlenen, henüz teyitli değil): kurum yöneticisi, öğretmen, öğrenci, veli.

## Stack (doğrulanmış — `package.json`)

- **Frontend:** Vite 7 + React 19 + TypeScript 5.9
- **Yönlendirme:** `wouter` (pnpm patch: `patches/wouter@3.7.1.patch`)
- **UI:** Radix UI + Tailwind CSS v4, shadcn tarzı bileşen yapılandırması (`components.json`)
- **Form/Doğrulama:** `react-hook-form` + `zod`
- **Sunucu state:** `@tanstack/react-query`
- **Backend:** Yok (ayrı server/API katmanı yok) — `@supabase/supabase-js` doğrudan istemciden BaaS olarak kullanılıyor
- **Test:** Vitest
- **Paket yöneticisi:** pnpm (`packageManager: pnpm@10.4.1`)

## Veri Katmanı

- Supabase proje bağlantısı `.env` üzerinden (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- `supabase/migrations/` içinde şu an tek migration var: `0001_workspace_documents.sql`.
- **Doğrulanmadı:** Row Level Security (RLS) kurulum durumu. İstemci doğrudan Supabase'e bağlandığı için, RLS kurulmadan hassas/gerçek veriyle production'a çıkılmamalı (bkz. CLAUDE.md §06).

## Klasör Yapısı

```
client/src/
├── components/   # Radix/shadcn tabanlı UI bileşenleri
├── contexts/
├── hooks/
├── lib/
└── pages/        # Home, NotFound, ComponentShowcase
```

## Henüz Netleşmemiş / Keşif Mülakatı Bekleyen Kararlar

- Auth/yetkilendirme modeli (Supabase Auth mı, rol bazlı erişim nasıl uygulanacak)
- Veri hassasiyeti kapsamı (KVKK — öğrenci/veli kişisel verisi işleme sınırları)
- Ölçek/trafik beklentisi, hosting/deploy platformu
- Bütçe kısıtı
- Ekip teknik yatkınlığı ve haftalık geliştirme kapasitesi

Bu maddeler `PROJECT_ARCHITECT.md` §02 Grup A–D sorularının karşılığıdır; ikinizin birlikte katılacağı ayrı bir oturumda netleştirilecek.
