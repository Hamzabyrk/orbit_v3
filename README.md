# ORBIT

Dershane/eğitim kurumu ve kurs merkezleri için CRM, finans ve eğitim operasyonlarını tek panelde toplayan bir yönetim platformu.

## Problem

> **TODO — Keşif Mülakatı'nda netleşecek** (bkz. `PROJECT_ARCHITECT.md` §02). Aşağıdaki özet, kod ve geçmiş proje notlarından (`docs/archive/PROJECT_HISTORY.md`) çıkarılan gözlemdir, henüz ekip tarafından resmî olarak teyit edilmiş bir kapsam tanımı değildir.

Proje "MoneyFlow" adıyla bağımsız bir finans/muhasebe SaaS konsepti olarak başladı, sonrasında "ORBIT" adıyla Trakya bölgesindeki 1–5 şubeli dershane/kurs merkezlerini hedefleyen bir eğitim kurumu yönetim platformuna pivot etti. Hedeflenen kullanıcı rolleri: kurum yöneticisi, öğretmen, öğrenci ve veli. Kapsanan alanlar: öğrenci/sınıf/ders programı yönetimi, yoklama, sınav takibi, veli iletişimi, kayıt/ödeme operasyonları, CRM (müşteri/randevu yönetimi), temel muhasebe (banka, satış, fatura, gider, hesap planı) ve n8n/Zapier/Make tarzı otomasyon kataloğu.

## Neden Bu Stack

| Katman | Seçim | Not |
| --- | --- | --- |
| Frontend | Vite + React 19 + TypeScript | Hızlı geliştirme döngüsü, geniş ekosistem. |
| Yönlendirme | `wouter` | React Router'a göre daha hafif; `patches/wouter@3.7.1.patch` ile pnpm patch'i uygulanıyor. |
| UI | Radix UI + Tailwind v4 (shadcn tarzı, `components.json`) | Erişilebilir headless bileşenler + hızlı stil üretimi. |
| Veri/Backend | `@supabase/supabase-js` (BaaS) | Ayrı bir Node/Express API katmanı yok — Supabase doğrudan istemciden kullanılıyor. |
| Form/Doğrulama | `react-hook-form` + `zod` | — |
| Sunucu state | `@tanstack/react-query` | — |
| Test | Vitest | — |
| Paket yöneticisi | pnpm | `wouter@3.7.1` için 1 patch, `tailwindcss>nanoid` için 1 override içeriyor. |

> Bu tablo gözlemlenen mevcut durumu özetler; teknoloji kararlarının resmî gerekçe/alternatif karşılaştırması henüz `.ai/DECISION_LOG.md`'de ADR formatında yazılmadı — bu, Keşif Mülakatı sonrası yapılacak.

## Mimari

```
client/
├── index.html
└── src/
    ├── App.tsx          # Uygulama kabuğu / route tanımları (wouter)
    ├── main.tsx
    ├── components/       # UI bileşenleri (Radix/shadcn tabanlı)
    ├── contexts/
    ├── hooks/
    ├── lib/
    └── pages/            # Home, NotFound, ComponentShowcase
supabase/
└── migrations/           # Şu an tek migration: 0001_workspace_documents.sql
patches/                  # pnpm patch dosyaları (wouter)
docs/archive/              # Geçmiş proje notları (bkz. aşağıda)
.ai/                        # Çoklu-YZ ortak hafıza (PROJECT_STATE, DECISION_LOG, WORK_LOG)
```

Backend ayrı bir sunucu değil; Supabase doğrudan istemciden (`@supabase/supabase-js`) kullanılıyor. Kimlik doğrulama ve veri erişimi kararları (RLS dahil) henüz `.ai/PROJECT_STATE.md`'de resmî olarak dokümante edilmedi.

Projenin `MoneyFlow` → `ORBIT` marka geçişi ve önceki "Manus" platformundan GitHub'a taşınma sürecinin ayrıntılı geçmişi `docs/archive/PROJECT_HISTORY.md` içinde korunuyor.

## Hızlı Başlangıç

```bash
pnpm install
cp .env.example .env   # VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini doldurun
pnpm dev
```

## Kurulum ve Konfigürasyon

| Komut | Amaç |
| --- | --- |
| `pnpm dev` | Geliştirme sunucusu (Vite) |
| `pnpm build` | Production build |
| `pnpm preview` | Production build'i yerelde önizleme |
| `pnpm check` | TypeScript tip kontrolü (`tsc --noEmit`) |
| `pnpm format` | Prettier ile formatlama |
| `pnpm test` | Vitest ile testleri çalıştırma |

### Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve doldurun:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Bu değerler asla commit edilmemeli; `.gitignore` `.env` dosyalarını zaten dışlıyor.

## Test Etme

`pnpm test` (Vitest) mevcut birim testlerini çalıştırır. `pnpm check` ile TypeScript tip hataları, `pnpm build` ile production build doğrulanır. Repo şu an bir lint script'i içermiyor — bkz. Bilinen Sınırlamalar.

## Bilinen Sınırlamalar

- **Lint script yok:** `package.json` içinde `lint` script'i tanımlı değil; CI kalite kapısı bu nedenle şimdilik lint adımı içermiyor.
- **Mimari kararlar henüz resmî değil:** Auth/yetkilendirme modeli, veri hassasiyeti (KVKK kapsamı — bkz. `docs/archive/PROJECT_HISTORY.md` içindeki `research_turkiye_egitim_pazari.md` bölümü), ölçek ve hosting kararları `PROJECT_ARCHITECT.md` §02 Keşif Mülakatı tamamlanana kadar geçici kabul edilmelidir.
- **Supabase RLS durumu doğrulanmadı:** İstemci doğrudan Supabase'e bağlandığı için, satır seviyeli güvenlik (RLS) kurulmadan gerçek/hassas veriyle production'a çıkılmamalı.
- **Tek migration:** `supabase/migrations/` şu an yalnızca `0001_workspace_documents.sql` içeriyor; şema geri kalanının nasıl/ne zaman migration'a döküleceği netleşmedi.
