# 🗺️ ORBIT — Aşamalı Geliştirme Yol Haritası (Release Roadmap)

Bu dosya, projenin her aşamasında nelerin yapılacağını, hangi özelliklerin tamamlandığını ve kabul kriterlerini (Definition of Done) tanımlayan yaşayan yol haritasıdır.

---

## 📍 Aşama 1: MVP v1.0 — Saha Doğrulaması & Temel CRM

> **Hedef:** Birkaç gün içinde Vercel üzerinde yayına çıkıp potansiyel kurs/dershane yöneticilerine arayüz üzerinden demo yapabilmek.

### Kapsam & Görevler:

- [x] MoneyFlow ve eski muhasebe kalıntılarının temizlenmesi.
- [x] Çoklu-YZ ve 2 kişilik kurumsal git altyapısının kurulması.
- [x] CI/CD kalite kapısının (Prettier + TypeScript + Vitest + Vite Build) kurulması.
- [ ] **Sınıf Yönetimi CRUD (`feat/admin-profile`):** Sınıf ekleme/düzenleme/silme modal ve formları.
- [ ] **Öğrenci Yönetimi CRUD (`feat/core-shared-modules`):** Öğrenci ekleme/düzenleme (Ad, No, Sınıf, Tel, Veli Bilgileri).
- [ ] **4 Rol Canlı Arayüzü:** Admin, Öğretmen, Öğrenci, Veli ekranlarının interaktif hale getirilmesi.
- [ ] **Mock Veri İzolasyonu:** `isMock: true` bayraklı hazır veriler ve "Demo Verileri Sıfırla" butonu.
- [ ] **Vercel Deploy:** GitHub entegrasyonu ile canlıya alma.

---

## 📍 Aşama 2: v1.1 — Akademik Operasyon & Veli İletişimi

> **Hedef:** Öğretmen ve veli arasındaki günlük iletişim ve yoklama deneyimini zenginleştirmek.

### Kapsam & Görevler:

- [ ] **Dinamik Yoklama Modülü (`feat/teacher-profile`):** Öğretmenin aldığı yoklamanın anında sınıf devam yüzdelerine yansıması.
- [ ] **Deneme Sınavı & Karne Görünümü (`feat/student-profile`):** Ders bazlı net grafikleri ve gelişim sinyalleri.
- [ ] **Veli Bildirim & Mesajlaşma (`feat/parent-profile`):** Kurum duyuruları ve öğretmenle soru/cevap paneli.
- [ ] **Landing Page (`feat/landing-page`):** Kurumların başvurabileceği yalın tanıtım sayfası.

---

## 📍 Aşama 3: v1.2 — Kalıcı Veritabanı & Supabase Auth

> **Hedef:** İlk pilot kurs merkezinin gerçek öğrenci ve öğretmen verileriyle sisteme giriş yapmasını sağlamak.

### Kapsam & Görevler:

- [ ] Supabase veritabanı tablolarının ve foreign key ilişkilerinin oluşturulması.
- [ ] Supabase Auth (E-posta/şifre ve rol bazlı JWT token doğrulama).
- [ ] Row Level Security (RLS) politikalarının her tablo için aktif edilmesi.
- [ ] KVKK uyumlu kişisel veri saklama ve şifreleme denetimi.

---

## 📍 Aşama 4: v2.0 — Finansal Takip & Otomasyonlar

> **Hedef:** Kurumun gelir/taksit takibini ve otomatik bildirimleri devreye almak.

### Kapsam & Görevler:

- [ ] Taksit ve kayıt sözleşmesi modülü.
- [ ] Devamsızlık ve sınav sonuçlarında veliye otomatik SMS / WhatsApp bildirimleri.
- [ ] Kurum genel başarı ve doluluk raporlama paneli.
