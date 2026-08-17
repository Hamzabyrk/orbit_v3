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
- **Veri Saklama:** React State + Yerel Kalıcılık (Local Persistence) & Supabase hazırlığı
- **Test:** Vitest 2.1 (RBAC yetki testleri)
- **CI/CD & Dağıtım:** GitHub Actions + Vercel
- **Paket Yöneticisi:** pnpm (v10.4.1)

---

## 5. Klasör Yapısı

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

## 6. Sıradaki Uygulama Adımları

1. Sınıf oluşturma, düzenleme ve silme modal ve formlarının dinamik state'e bağlanması.
2. Öğrenci kayıt formunun (Ad, No, Sınıf, Telefon, Veli Adı/Telefonu) tam interaktif CRUD'a dönüştürülmesi.
3. Yoklama ve sınıf içi durum güncellemelerinin anlık arayüze yansıması.
4. Mock verilerin `isMock: true` bayrağı ile izole edilmesi ve demo sıfırlama butonu eklenmesi.
