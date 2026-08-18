# 🎓 ORBIT — Eğitim Kurumu & Dershane Yönetim Platformu

> **ORBIT**, 1–5 şubeli dershane, kurs merkezi ve eğitim kurumları için tasarlanmış; kurum yöneticisi, öğretmen, öğrenci ve veli rollerini tek bir modern çalışma alanında birleştiren yeni nesil eğitim CRM ve operasyon platformudur.

---

## 🚀 Projeye Genel Bakış ve Mimari

ORBIT; devamsızlık takibi, ders programı, deneme sınavı analizleri, veli iletişimi ve kayıt/ödeme operasyonlarını rol bazlı erişim modeli (RBAC) ile yönetir.

### 👥 Roller ve Çalışma Alanları

- 👑 **Kurum Yöneticisi (Admin):** Kurum genel özeti, öğrenci ve sınıf organizasyonu, yoklama takibi, sınav başarı grafikleri, kayıt ve ödeme takibi, operasyonel otomasyonlar ve ayarlar.
- 🧑‍🏫 **Öğretmen (Teacher):** Ders programı, hızlı yoklama alma, sınıf listeleri, sınav analizleri, insan takibi gereken öğrenci sinyalleri ve veli iletişimi.
- 🎒 **Öğrenci (Student):** Kişisel ders programı, haftalık ödev/etüt takibi, deneme sınavı gelişim grafikleri ve öğretmenle mesajlaşma.
- 👨‍👩‍👧 **Veli (Parent):** Öğrencinin devam durumu, son sınav karnesi, ödeme planı/taksit takibi ve kurum duyuruları.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

| Katman                 | Teknoloji                              | Açıklama                                                                  |
| :--------------------- | :------------------------------------- | :------------------------------------------------------------------------ |
| **Frontend**           | React 19 + TypeScript 5.9 + Vite 7     | Maksimum tip güvenliği, hızlı derleme ve modüler SPA                      |
| **Stil & Tasarım**     | Tailwind CSS v4 + Radix UI + shadcn/ui | Erişilebilir headless bileşenler (`components/ui/`), modern tipografi     |
| **Yönlendirme**        | `wouter`                               | Hafif ve performanslı istemci yönlendirici (`patches/wouter@3.7.1.patch`) |
| **BaaS / Veri**        | `@supabase/supabase-js`                | Doğrudan istemciden Supabase BaaS bağlantısı                              |
| **State Yönetimi**     | `@tanstack/react-query` v5             | Sunucu durumu senkronizasyonu                                             |
| **İkonlar & Bildirim** | `lucide-react`, `sonner`               | Tutarlı arayüz ikonları ve zengin bildirimler                             |
| **Test**               | Vitest 2.1                             | Birim ve yetkilendirme (RBAC) testleri                                    |
| **Paket Yöneticisi**   | `pnpm` (v10.4.1)                       | Hızlı ve disk tasarruflu paket yönetimi                                   |

---

## 📁 Klasör Yapısı

```
dashboard-dershane/
├── .ai/                            # Çoklu-YZ Ortak Hafıza Sistemi
│   ├── PROJECT_STATE.md            # Canlı mimari durum ve veri modelleri
│   ├── DECISION_LOG.md             # Alınan mimari kararlar (ADR)
│   └── WORK_LOG.md                 # Yapılan işler ve geliştirme günlüğü
├── .github/                        # CI/CD ve GitHub Şablonları
│   ├── workflows/ci.yml            # PR ve push kalite kapısı
│   ├── ISSUE_TEMPLATE/             # Özellik ve görev şablonları
│   └── PULL_REQUEST_TEMPLATE.md    # PR kontrol listesi
├── client/
│   ├── public/                     # Logo, marka ikonları ve statik varlıklar
│   └── src/
│       ├── components/
│       │   ├── ui/                 # 53 adet Radix/shadcn UI primitifi
│       │   ├── education/           # ORBIT Eğitim Çekirdek Ekranları (rol/sayfa bazlı bölünmüş)
│       │   │   ├── types.ts          # Student/ClassGroup/ScheduleItem/Automation/PaymentRow
│       │   │   ├── mockData.ts       # Tüm mock veri + roleMeta/roleEmail/allNav
│       │   │   ├── shared.tsx        # Badge, StatCard, PageHeader vb. paylaşılan UI
│       │   │   ├── LoginScreen.tsx   # EducationLoginScreen
│       │   │   ├── EducationPlatform.tsx # Kompozisyon kökü
│       │   │   ├── dashboards/       # Rol bazlı dashboard'lar
│       │   │   └── pages/            # Öğrenciler, Sınıflar, Yoklama, Ayarlar vb.
│       │   ├── educationAccess.ts  # Rol bazlı yetki matrisi (RBAC)
│       │   ├── educationAccess.test.ts # Yetki testleri
│       │   ├── OrbitMark.tsx       # Logo / Marka bileşeni
│       │   └── ErrorBoundary.tsx   # React Hata Yakalayıcı
│       ├── contexts/               # ThemeProvider vb. React Context'leri
│       ├── hooks/                  # useMobile, useComposition vb. özel hook'lar
│       ├── lib/                    # supabaseClient, documents, utils, demoStorage
│       ├── pages/
│       │   ├── Home.tsx            # Temiz ana sayfa / Login yönlendirici
│       │   └── NotFound.tsx        # 404 Sayfası
│       ├── App.tsx                 # Uygulama kabuğu ve rota tanımları
│       ├── index.css               # Tailwind CSS v4 ve ORBIT renk/tipografi tokenları
│       └── main.tsx                # React DOM Mount
├── supabase/
│   └── migrations/                 # Veritabanı migration dosyaları
├── PROJECT_ARCHITECT.md            # Çoklu-YZ ve 2 Kişilik Ekip Anayasası
├── CONTRIBUTING.md                 # Git kuralları ve PR süreçleri
├── package.json
└── tsconfig.json
```

---

## ⚡ Hızlı Başlangıç (Geliştirici Rehberi)

Projeyi yerelinizde çalıştırmak için aşağıdaki adımları izleyin:

```bash
# 1. Bağımlılıkları yükleyin
pnpm install

# 2. Ortam değişkenlerini kopyalayın
cp .env.example .env

# 3. Geliştirme sunucusunu başlatın
pnpm dev
```

Tarayıcınızda `http://localhost:5173` adresine giderek demoyu açabilirsiniz.
Giriş ekranında **Kurum Yöneticisi, Öğretmen, Öğrenci veya Veli** rollerinden birini seçerek anında ilgili arayüze geçiş yapabilirsiniz (Demo şifresi: `demo123`).

---

## 📋 Kullanılabilir Komutlar

| Komut          | Açıklama                                                 |
| :------------- | :------------------------------------------------------- |
| `pnpm dev`     | Vite geliştirme sunucusunu başlatır                      |
| `pnpm build`   | Production derlemesi oluşturur (`tsc` + Vite)            |
| `pnpm preview` | Üretilen derlemeyi yerelde önizler                       |
| `pnpm check`   | TypeScript tip kontrollerini çalıştırır (`tsc --noEmit`) |
| `pnpm lint`    | ESLint ile kod kalitesi kontrollerini çalıştırır         |
| `pnpm test`    | Vitest ile birim testlerini çalıştırır                   |
| `pnpm format`  | Prettier ile tüm kodları formatlar                       |

---

## 🤝 Geliştirme ve Git Kuralları (Ekip Anayasası)

Bu repoda iki kişilik ekip ve YZ ajanları (`PROJECT_ARCHITECT.md` ve `CONTRIBUTING.md`) kurallarına göre çalışır:

1. **`main` Dalına Doğrudan Commit Yasaktır:**
   Her özellik veya düzeltme için `feat/ozellik-adi` veya `fix/hata-adi` formatında branch açılır.
2. **Atomik Commitler:**
   Commit mesajları `feat:`, `fix:`, `refactor:`, `test:` standartlarında yazılır.
3. **Çoklu-YZ Ortak Hafızası:**
   Her YZ oturumu öncesinde `.ai/PROJECT_STATE.md` okunur, iş tamamlandığında `.ai/WORK_LOG.md` güncellenir.
4. **Code Review:**
   PR açıldığında diğer ekip üyesinin review onayı olmadan `main` ile birleştirilemez.
