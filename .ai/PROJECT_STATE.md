# PROJECT_STATE.md — ORBIT

> Bu dosya, `PROJECT_ARCHITECT.md` §01'de tanımlanan çoklu-YZ ortak hafızasının parçasıdır. Her ajan (Claude, Cursor, Gemini, Antigravity vb.) kod yazmaya başlamadan önce bu dosyayı okumalıdır.
>
> **Durum:** AKTİF ÇEKİRDEK (Eğitim CRM & Operasyon Platformu).

---

## 1. Ürün Tanımı

**ORBIT** — 1–5 şubeli dershane, kurs merkezi ve özel eğitim kurumları için tasarlanmış entegre CRM, akademik takip ve operasyon yönetim platformu.

### 4 Temel Kullanıcı Rolü (RBAC):
1. **Kurum Yöneticisi (admin):** Kurum genel görünümü, öğrenci ve sınıf organizasyonu, yoklama takipleri, sınav analizleri, kayıt ve ödeme operasyonları, otomasyonlar ve ayarlar.
2. **Öğretmen (teacher):** Günlük ders programı, hızlı yoklama alma, sınıf listeleri, sınav sonuçları, insan takibi gereken öğrenci alarmları ve veli iletişimi.
3. **Öğrenci (student):** Kişisel ders programı, ödev ve etüt takibi, deneme sınavı gelişim grafikleri, öğretmen iletişimi.
4. **Veli (parent):** Öğrenci devam/devamsızlık sinyalleri, deneme sınavı karne özeti, taksit/ödeme planı ve kurum duyuruları.

---

## 2. Teknoloji Yığını (Stack)

- **Frontend:** Vite 7.1 + React 19.2 + TypeScript 5.9
- **Yönlendirme:** `wouter` (pnpm patch: `patches/wouter@3.7.1.patch`)
- **UI & Stil:** Radix UI + Tailwind CSS v4 + shadcn/ui (`components.json`) + Lucide Icons + Sonner Toast
- **Form / Doğrulama:** `react-hook-form` + `zod`
- **Sunucu State:** `@tanstack/react-query` v5
- **Backend / Veri:** `@supabase/supabase-js` (BaaS doğrudan istemciden)
- **Test:** Vitest 2.1 (RBAC yetki testleri)
- **Paket Yöneticisi:** pnpm (v10.4.1)

---

## 3. Veri ve Güvenlik Katmanı

- Supabase proje bağlantısı `.env` üzerinden yönetilir (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- `supabase/migrations/` altında veritabanı şemaları tutulur.
- Rol bazlı yetkilendirme istemcide `client/src/components/educationAccess.ts` kuralları ile kontrol edilir ve birim testleri ile doğrulanır.
- Gerçek veriye geçildiğinde Supabase Row Level Security (RLS) politikaları zorunlu olacaktır.

---

## 4. Klasör Yapısı

```
client/src/
├── components/
│   ├── ui/                 # 53 adet Radix/shadcn UI bileşeni
│   ├── EducationPlatform.tsx # ORBIT Eğitim Çekirdek Ekranları ve 4 Rol Arayüzü
│   ├── educationAccess.ts  # Rol bazlı yetki matrisi (RBAC)
│   ├── educationAccess.test.ts # Vitest yetki testleri
│   ├── OrbitMark.tsx       # Logo / Marka bileşeni
│   └── ErrorBoundary.tsx   # React Hata Yakalayıcı
├── contexts/               # ThemeProvider
├── hooks/                  # useMobile, useComposition
├── lib/                    # supabaseClient, documents, utils
└── pages/
    ├── Home.tsx            # Temiz ana sayfa / Login yönlendirici
    └── NotFound.tsx        # 404 sayfası
```

---

## 5. Sıradaki Mimari Geliştirmeler

- Supabase veritabanı tablolarının (öğrenciler, sınıflar, yoklama kayıtları, deneme sınavları, veli mesajları, taksit ödemeleri) oluşturulması.
- Supabase Auth entegrasyonu (rol tabanlı oturum açma).
- Öğrenci kayıt ve yoklama formlarının kalıcı veritabanı API'lerine bağlanması.
