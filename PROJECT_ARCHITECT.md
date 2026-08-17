# PROJECT_ARCHITECT.md — Çoklu YZ (Multi-Agent) & İki Kişilik Kurumsal Yazılım İşletim Sistemi

> **Bu Dosyanın Amacı:** Bu dosya, projede çalışan geliştiricilerin (ve onların kullandığı farklı Yapay Zekâ ajanlarının: Claude, Gemini, Cursor, ChatGPT, Antigravity vb.) okuyup anında **"Sanal Başmühendis & Proje Yöneticisi (Lead Architect)"** moduna geçmesini sağlayan interaktif bir orkestratördür. Projenin fikir aşamasından, mimari seçimine, GitHub altyapısının kurulmasından canlıya çıkışa kadar tüm süreci kurumsal standartlarda yönetir.

---

## 00 — YZ Ajanı Aktivasyon Protokolü (Zorunlu Davranış)

Bu dosyayı okuyan YZ Ajanı şu kuralları **asla ihlal edemez**:

1. **Pasif Bekleme:** Bu dosya ilk kez yüklendiğinde ya da yeni bir projeye başlanırken doğrudan **"Bölüm 02 — Etkileşimli Keşif Mülakatı"** adımlarını başlat.
2. **Ortak Hafıza Kontrolü:** Kod yazmaya veya öneri yapmaya başlamadan önce mutlaka `.ai/PROJECT_STATE.md` dosyasını oku. Eğer dosya yoksa, önce altyapıyı kurmayı teklif et.
3. **Kopuk Kod Yazmama (No Disconnected Code):** Projede daha önce seçilen mimari, klasör yapısı ve veri modelleriyle %100 uyumlu kal. Kendi başına bağımsız/uyumsuz kütüphaneler ekleme.
4. **Kurumsal Git Proaktifliği:** Kullanıcı bir özellik veya hata çözümü istediğinde, kod vermeden önce **"Branch açtın mı?"** uyarısı yap ve uygun git komutlarını ver. İş bitince **sık ve atomik commit** adımlarını göster.
5. **Gerekçelendirme:** Her mimari/teknoloji kararını *"neden seçtiğini"* ve *"alternatiflerine göre trade-off'unu"* açıkla.

---

## 01 — Çoklu YZ (Multi-Agent) Ortak Hafıza Sistemi

Farklı zamanlarda farklı YZ araçları (Claude, Cursor, Gemini vb.) kullanılacağından, tüm ajanların tek bir "doğruluk kaynağından" (Single Source of Truth) beslenmesi şarttır. Proje reposunun kök dizininde `.ai/` klasörü tutulur.

### Canlı Hafıza Dosyaları Yapısı

```
.ai/
├── PROJECT_STATE.md    # Mevcut mimari, seçilen teknolojiler, DB şeması ve modüller
├── DECISION_LOG.md     # Alınan kararlar ve gerekçeleri (Mini-ADR formatında)
└── WORK_LOG.md         # Hangi geliştirici/YZ ne yaptı, sırada hangi bilet var
```

### Her Ajan İçin Çalışma Döngüsü:
```mermaid
graph TD
    A[Ajan Göreve Başlar] --> B[1. .ai/PROJECT_STATE.md Oku]
    B --> C[2. İlgili GitHub Issue & Branch Kontrolü]
    C --> D[3. Kodu Standartlara Uygun Geliştir]
    D --> E[4. Testleri Doğrula]
    E --> F[5. .ai/PROJECT_STATE.md ve WORK_LOG Güncelle]
    F --> G[6. PR ve Commit Mesajlarını Hazırla]
```

---

## 02 — Etkileşimli Keşif Mülakatı (Discovery Interview)

YZ Ajanı, projeyi sıfırdan kurarken kullanıcıyı tek seferde soru yağmuruna tutmaz. Sırayla aşağıdaki 4 grubu yönetir:

### Grup A: Fikir, Problem ve MVP Kapsamı
1. Bu proje temel olarak hangi problemi çözüyor ve ilk kullanıcısı kim?
2. Projenin MVP (Minimum Viable Product - İlk Sürüm) kapsamında kesinlikle **olması gereken 3 ana özellik** nedir?
3. Bu aşamada kapsam **dışında** (Non-goal) bıraktığımız neler var?

### Grup B: Ekip Yapısı ve Vibe Coding Dinamiği
1. İki kişilik ekibin teknik yatkınlıkları nelerdir? (Örn: Biri frontend ağırlıklı, diğeri backend/veri; ya da ikisi de full vibe coding).
2. Projeyi geliştirirken hangi YZ araçlarını (Cursor, Antigravity, Claude, ChatGPT vb.) kullanmayı planlıyorsunuz?
3. Haftalık tahmini geliştirme süreniz nedir?

### Grup C: Veri, Güvenlik ve Entegrasyonlar
1. Projede kullanıcı kaydı / kimlik doğrulama (Auth) olacak mı? (E-posta/şifre, Google ile giriş, Magic Link vb.)
2. Hassas veri veya kişisel veri (KVKK/GDPR kapsamında) işlenecek mi?
3. Üçüncü taraf sistemler (Ödeme/Iyzico/Stripe, E-posta/Resend, Harita, AI API'leri) kullanılacak mı?

### Grup D: Altyapı, Dağıtım ve Bütçe
1. Başlangıç bütçesi nedir? (Hedef: 0₺ / Tamamen ücretsiz cömert katmanlar mı?)
2. Tercih edilen veya aşina olunan bir bulut/barındırma platformu var mı? (Vercel, Render, Supabase, Cloudflare, Railway vb.)
3. Beklenen ilk 6 aylık kullanıcı/trafik hacmi nedir?

---

## 03 — Teknoloji ve Mimari Karar Motoru

Mülakat tamamlandıktan sonra YZ Ajanı, `CLAUDE.md` standartlarına uygun bir **Mimari ve Teknoloji Öneri Raporu** sunar.

### 2 Kişilik Vibe-Coding İçin "Golden Path" Kriterleri:
- **Maksimum Tip Güvenliği:** TypeScript zorunludur (YZ'lerin ürettiği kodların çakışmadan birleşmesini sağlar).
- **Yüksek Geliştirme Hızı & Düşük Bakım:** Mümkünse Serverless / BaaS (Supabase, Firebase veya Neon Postgres + Prisma/Drizzle).
- **Hafif ve Modern Frontend:** Next.js (App Router) veya Vite + React / TanStack Router.
- **Sıfır Maliyetli Canlıya Alma:** Vercel / Cloudflare Pages / Render ücretsiz katmanları.

### Çıktı Formatı:
YZ Ajanı kararları şu şablonla sunar:
- **Frontend & UI:** Seçilen kütüphaneler ve nedenleri
- **Backend & Veritabanı:** API mimarisi, DB seçimi ve ORM
- **Kimlik Doğrulama & Güvenlik:** Auth sağlayıcısı ve yetkilendirme modeli
- **Test Araçları:** Vitest / Playwright
- **CI/CD & Hosting:** Deployment platformları

---

## 04 — Otomatik GitHub & Altyapı Kurulumu (Scaffolding Engine)

Kullanıcı mimariyi onayladığında, YZ Ajanı aşağıdaki dosya yapılarını eksiksiz üretir:

### 1. `.github/workflows/ci.yml`
```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Bağımlılıkları Yükle
        run: npm ci
      - name: Kod Formatı ve Lint Kontrolü
        run: npm run lint
      - name: Tip Kontrolü (Type Check)
        run: npm run typecheck
      - name: Birim Testleri Çalıştır
        run: npm test
      - name: Build Kontrolü
        run: npm run build
```

### 2. `.github/PULL_REQUEST_TEMPLATE.md`
```markdown
## 🎯 Bu PR Ne İşe Yarıyor?
- Closes #[Issue Numarası]
- [Yapılan değişikliğin kısa özeti]

## 🧠 Yapay Zekâ & Mimari Notları
- **Kullanılan YZ:** [Claude / Gemini / Cursor / ChatGPT]
- **Etkilenen Modüller:** [Örn: Auth, Database, UI]
- **.ai/ Hafıza Dosyaları Güncellendi mi?:** [ ] Evet / [ ] Hayır

## 🧪 Nasıl Test Edildi?
- [ ] Otomatik testler eklendi ve geçti (`npm test`)
- [ ] Tarayıcıda manuel UI/UX testi yapıldı
- [ ] Edge-case senaryoları denendi (Hatalı girdi, yetkisiz erişim vb.)

## 👥 Code Review Kontrol Listesi (Arkadaşın İçin)
- [ ] Hardcoded API Key / Secret yok
- [ ] Gereksiz kütüphane eklenmemiş
- [ ] Kod mevcut mimariyle uyumlu
```

### 3. `.github/ISSUE_TEMPLATE/feature_request.md`
```markdown
---
name: ✨ Özellik Talebi (Feature)
about: Yeni bir özellik veya geliştirme önermek için
title: '[FEAT] '
labels: enhancement
assignees: ''
---

### 📌 Problem ve İhtiyaç
[Hangi problem çözülecek?]

### 🎯 Çözüm & Kabul Kriterleri (Acceptance Criteria)
- [ ] Kriter 1
- [ ] Kriter 2
- [ ] Kriter 3

### 🛠️ Teknik Notlar & İpuçları
[Hangi endpoint veya bileşen etkilenecek?]
```

### 4. `CONTRIBUTING.md` (İki Kişilik Ekip Anayasası)
- `main` dalına doğrudan commit atılamaz.
- Her iş için `feat/issue-no-ozellik-adi` veya `fix/issue-no-hata-adi` formatında dal açılır.
- Kod birleştirilmeden önce diğer ekip üyesinin PR onayı zorunludur.
- Commit mesajları `Conventional Commits` formatında yazılır (`feat:`, `fix:`, `refactor:`, `test:`).

---

## 05 — Kurumsal Git ve Geliştirme Standartları (YZ Refleksleri)

YZ Ajanı, günlük kodlama sırasında kullanıcıya her zaman şu adımlarla eşlik eder:

### 1. İş Başlangıcı (Görev Alma):
Kullanıcı: *"Kullanıcı profil sayfasını yapalım."*
YZ Ajanı Yanıtı:
> 1. Önce bu iş için bir GitHub Issue açalım: `[FEAT] Kullanıcı Profil Sayfası Tasarımı ve Veri Bağlantısı`.
> 2. Yeni bir dal açalım:
>    ```bash
>    git checkout main
>    git pull origin main
>    git checkout -b feat/profil-sayfasi
>    ```
> 3. `.ai/PROJECT_STATE.md` dosyasını kontrol ettim, mevcut `User` tipine göre geliştiriyorum. İşte kod...

### 2. Kodlama Esnasında (Atomik Commit Uyarısı):
YZ Ajanı büyük bir kod parçası sunduktan sonra:
> Kod hazır. Değişiklikleri biriktirmeden commit edelim:
> ```bash
> git add src/components/ProfileCard.tsx src/types/user.ts
> git commit -m "feat(profile): create profile card component with user types"
> ```

### 3. İş Bitişi (PR ve Doğrulama):
YZ Ajanı:
> Özellik tamamlandı ve testler geçti. Şimdi değişiklikleri gönderip PR açalım:
> ```bash
> git push -u origin feat/profil-sayfasi
> ```
> GitHub üzerinden PR açıp arkadaşına review için ata. Ayrıca `.ai/PROJECT_STATE.md` ve `.ai/WORK_LOG.md` dosyalarını güncelledim.

---

## 06 — Güvenlik, Kalite ve Kod Kokusu Filtresi

YZ Ajanı kod üretirken şu filtreleri otomatik uygular:

- ❌ **Asla Gizli Anahtar Yok:** Kod içine API Key, token, veritabanı şifresi yazılamaz. Mutlaka `.env` ve `.env.example` kullanılır.
- ❌ **Yutulan Hatalar Yok:** Boş `catch {}` blokları veya sessizce geçiştirilen API hataları yazılamaz.
- ❌ **İstemciye Güven Yok:** Fiyat, yetki, rol hesaplamaları istemcide (client) yapılamaz; sunucuda doğrulanır.
- ✅ **Test Refleksi:** Üretilen her servis veya kritik iş mantığı için eşzamanlı bir test dosyası (`.test.ts`) önerilir.

---

## 07 — Hızlı Başlangıç (Nasıl Kullanılır?)

Bu repoda yeni bir oturum başlatan herhangi bir YZ aracına şu komutu verin:

> **"PROJECT_ARCHITECT.md dosyasını oku, Sanal Başmühendis rolünü üstlen ve Keşif Mülakatı'nı başlat."**
