# PROJECT_STATE.md — ORBIT

> Bu dosya, `PROJECT_ARCHITECT.md` §01'de tanımlanan çoklu-YZ ortak hafızasının parçasıdır. Her ajan (Claude, Codex, Antigravity vb.) kod yazmaya başlamadan önce bu dosyayı okumalıdır.
>
> **Durum:** ONAYLI MVP MİMARİSİ (Keşif Mülakatı Tamamlandı).

---

## 1. Ürün Tanımı & MVP Kapsamı

**ORBIT** — Devlet kısıtlılıkları gerektirmeyen özel eğitim kurumları (LGS/YKS kurs merkezleri, butik etüt merkezleri, özel dil kursları) için tasarlanmış; müşteri görüşmeleri ve saha doğrulaması için optimize edilmiş yalın CRM, sınıf ve öğrenci yönetim platformu.

### 🎯 MVP (Faz 1) Kapsamı:

1. **Sınıf & Grup Yönetimi:** Sınıf adı, program türü, mentor öğretmen, öğrenci kapasitesi ve derslik organizasyonu.
2. **Öğrenci Yönetimi:** Ad-Soyad, Öğrenci No, Sınıf, Telefon, Veli Adı, Veli Telefonu.
3. **Müşteri Doğrulama Odaklı Rol Arayüzü:** Auth bariyeri olmadan 4 farklı rol (Admin, Öğretmen, Öğrenci, Veli) arasında tek tıkla geçiş yapılabilen, saha testine ve demo sunumlarına uygun arayüz.
4. **İzole Mock Veri Katmanı:** Müşteriye sunum yaparken kurumun dolu gözükmesini sağlayan, `isMock: true` olarak bayraklanmış ve istendiğinde tek tıkla sıfırlanabilen gerçekçi örnek veriler.

### 🚫 Faz 1 Kapsam Dışı (Non-Goals):

- Karmaşık Auth / Şifreleme (Müşteri görüşmeleri aşamasında gereksiz sürtünmeyi önlemek için)
- n8n / Zapier webhook entegrasyonları
- Otomatik SMS / WhatsApp / E-posta gönderim API'leri
- Online ödeme ağ geçitleri (Iyzico, Stripe vb.)

---

## 2. Ekip Dinamiği & Geliştirme Kültürü

- **Ekip:** 2 Kişi (Arda & Hamza) — Uçtan uca Full-Stack / Vibe Coding.
- **Kullanılan YZ Araçları:** Claude Code, Codex, Antigravity.
- **Hedef Takvim:** Birkaç gün içinde Vercel üzerinde yayına çıkacak MVP.
- **Bütçe:** 0₺ (Tamamen ücretsiz katmanlar).
- **Çalışma Prensibi:** `PROJECT_ARCHITECT.md` kuralları — Tek doğruluk kaynağı (`.ai/`), atomik commit'ler, branch bazlı PR ve karşılıklı onay süreci.
- **Karar Alma İlkesi (Graph-First):** Herhangi bir kod yazılmadan önce problem 6 Boyutlu Graf Haritası (Teknik Tipler/State/DB, Ticari Bütçe, Hata/Fallback, KVKK/Gizlilik, Pik Yük/Darboğaz, Güvenlik) olarak analiz edilir; risk varsa proaktif itiraz (pushback) yapılır.

---

## 3. Kullanıcı Rolleri & Erişim Modeli (RBAC)

1. **Kurum Yöneticisi (admin):** Kurum genel görünümü, tüm sınıflar, tüm öğrenciler, yoklama ve operasyon ayarları.
2. **Öğretmen (teacher):** Kendi sınıfları, ders programı, yoklama alma, öğrenci listeleri.
3. **Öğrenci (student):** Kendi sınıfı, kişisel ders programı, sınav ve ödev görünümü.
4. **Veli (parent):** Bağlı öğrencinin devam durumu, ders programı ve kurum duyuruları.

---

## 4. Teknoloji Yığını (Stack)

- **Frontend:** Vite 7.1 + React 19.2 + TypeScript 5.9
- **Yönlendirme:** `wouter` (pnpm patch: `patches/wouter@3.7.1.patch`)
- **UI & Stil:** Radix UI + Tailwind CSS v4 + shadcn/ui (`components.json`) + Lucide Icons + Sonner Toast
- **Form / Doğrulama:** `react-hook-form` + `zod`
- **Sunucu State:** `@tanstack/react-query` v5
- **Veri Saklama:** React State + Yerel Kalıcılık (Local Persistence) & bağlı Supabase projesi (Faz 1'de deny-by-default RLS; gerçek veri kullanımı Faz 3'te)
- **Test:** Vitest 2.1 (RBAC yetki testleri)
- **Kod Kalitesi:** ESLint 9 (flat config) + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh
- **CI/CD & Dağıtım:** GitHub Actions + Vercel (`https://orbit-v3-topaz.vercel.app`)
- **Paket Yöneticisi:** pnpm (v10.4.1)

---

## 5. Klasör Yapısı

```
client/src/
├── components/
│   ├── ui/                 # 53 adet Radix/shadcn UI bileşeni
│   ├── education/           # ORBIT Eğitim Çekirdek Ekranları (rol/sayfa bazlı bölünmüş)
│   │   ├── types.ts          # Student/ClassGroup/ScheduleItem/Automation/PaymentRow (isMock: true)
│   │   ├── mockData.ts       # Tüm mock veri + roleMeta/roleEmail/allNav
│   │   ├── shared.tsx        # Badge, StatCard, PageHeader vb. paylaşılan UI parçaları
│   │   ├── LoginScreen.tsx   # EducationLoginScreen
│   │   ├── StudentDetail.tsx # Öğrenci profil çekmecesi
│   │   ├── EducationPlatform.tsx # Kompozisyon kökü (state + localStorage demo kalıcılığı)
│   │   ├── dashboards/       # AdminDashboard, TeacherDashboard, StudentDashboard, ParentDashboard
│   │   └── pages/            # StudentsPage, ClassesPage, AttendancePage, ... SettingsPage vb.
│   ├── educationAccess.ts  # Rol bazlı yetki matrisi (RBAC)
│   ├── educationAccess.test.ts # Vitest yetki testleri
│   ├── OrbitMark.tsx       # Logo / Marka bileşeni
│   └── ErrorBoundary.tsx   # React Hata Yakalayıcı
├── contexts/               # ThemeProvider
├── hooks/                  # useMobile, useComposition
├── lib/                    # supabaseClient, documents, utils, demoStorage (+ test)
└── pages/
    ├── Home.tsx            # Temiz ana sayfa / Login yönlendirici
    └── NotFound.tsx        # 404 sayfası
```

---

## 6. Sıradaki Uygulama Adımları

1. Sınıf oluşturma, düzenleme ve silme modal ve formlarının dinamik state'e bağlanması.
2. Öğrenci kayıt formunun (Ad, No, Sınıf, Telefon, Veli Adı/Telefonu) tam interaktif CRUD'a dönüştürülmesi.
3. Yoklama ve sınıf içi durum güncellemelerinin anlık arayüze yansıması.
4. `isMock: true` alanının gerçek backend/Supabase entegrasyonunda kaldırılması (Aşama 3 kapsamında).

---

## 7. v1.1 Auth ve Tenant Temeli (Issue #8)

**Durum:** PR #9 merge edildi; migration ve `bootstrap-organization` Edge Function production Supabase'e deploy edildi; ilk tenant Hamza Bayrak yönetici hesabıyla kuruldu ve production login akışı doğrulandı.

- Kimlik doğrulama production'da Supabase Auth e-posta/şifre oturumuyla çalışır. Rol istemciden alınmaz; aktif `organization_memberships` kaydından çözülür.
- Local geliştirme ve Vercel Preview derlemeleri demo modundadır. Vercel Production derlemesinde rol geçişi gizlenir ve demo şifresi kabul edilmez.
- Tenant çekirdeği `profiles`, `organizations`, `branches`, `organization_memberships` ve `audit_events` tablolarından oluşur.
- Organizasyon yöneticisi org-wide üyelik taşır; aktif ekran bağlamı varsayılan şubeden başlar. Şube sınırlı üyelikler yalnızca kendi şubesini görür.
- İlk kurum, varsayılan şube ve admin daveti yalnızca `platform_admin` app metadata'sına sahip operatörün çağırabildiği `bootstrap-organization` Edge Function üzerinden hazırlanır.
- Tarayıcıya yalnızca anon key verilir. `service_role` yalnızca Supabase Edge Function sunucu ortamında kullanılır.
- RLS istemci yazılarını deny-by-default bırakır; üyeler yalnızca kendi tenant kapsamlarını, adminler ise yetkili audit kapsamını okuyabilir.
- İlk tenant için `orbitdershane` / `orbit123` kararı verildi. `yonetici@orbit.edu.tr` adresinin DNS/MX kaydı olmadığı ve Supabase tarafından `email_address_invalid` ile reddedildiği doğrulandı; yarım kullanıcı/tenant kaydı oluşmadı.
- v1.2 iş tabloları ve v1.3 mock temizliği bu dalın bilinçli kapsamı dışındadır.

---

## 8. Platform Sahipliği ve Production Bağlantıları (Issue #14)

**Durum:** Supabase sahiplik transferi ve production bağlantı doğrulaması tamamlandı; Arda'nın yeni organizasyon Owner davetini kabul etmesi bekleniyor.

- Production Supabase projesi `orbit-dershane`, silinmeden ve proje kimliği değiştirilmeden Hamza'nın sahibi olduğu `ORBIT Platform` organizasyonuna transfer edildi.
- Transfer sonrasında Auth kullanıcısı, profil, kurum, şube, üyelik ve audit kayıt sayıları kaynak envanteriyle eşleşti; `workspace_documents` ve Storage nesne sayıları sıfır kaldı.
- Hamza `ORBIT Platform` Owner'ıdır. Arda'nın `Owner` daveti gönderildi; davet kabul edilene kadar durum `Invited` olarak izlenecektir.
- `Hamzabyrk/orbit_v3` GitHub production entegrasyonu repo kökü, `main` branch'i ve production migration uygulamasıyla yeniden etkinleştirildi.
- Vercel `orbit-v3` projesi Hamza'nın Owner olduğu `ORBİT` Hobby takımındadır. Production adresi `https://orbit-v3-topaz.vercel.app` ve deployment durumu `Ready` olarak doğrulandı.
- Vercel'deki `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` tüm ortamlarda korunmuştur. Proje kimliği ve API anahtarları transferde değişmediği için uygulama bağlantısı kesilmedi.
- Least-privilege gereği Vercel Marketplace Supabase kurulumu yapılmadı; bu kurulum uygulamanın ihtiyaç duymadığı veritabanı parolası ve Supabase secret key gibi sunucu sırlarını da Vercel'e aktaracaktı.
