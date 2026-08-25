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
client/src/      # React uygulaması — auth, platform paneli, dershane ekranları
supabase/        # Migration'lar, Edge Function'lar ve pgTAP testleri
.ai/             # Mimari kararlar, yol haritası ve platform ayarları
.github/         # CI iş akışları ve şablonlar
```

Dosya dosya ayrıntı — hangi modül ne yapar, hangi servis nerede yaşar — tek yerde tutulur:
**[`.ai/PROJECT_STATE.md`](.ai/PROJECT_STATE.md) bölüm 5.** Burada ikinci bir kopya tutulmuyor; iki ağaç bir süre sonra birbirini tutmuyor.

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

| Komut          | Açıklama                                                                                          |
| :------------- | :------------------------------------------------------------------------------------------------ |
| `pnpm dev`     | Vite geliştirme sunucusunu başlatır                                                               |
| `pnpm build`   | Production derlemesi oluşturur (yalnızca Vite — tip kontrolü için ayrıca `pnpm check` çalıştırın) |
| `pnpm preview` | Üretilen derlemeyi yerelde önizler                                                                |
| `pnpm check`   | TypeScript tip kontrollerini çalıştırır (`tsc --noEmit`)                                          |
| `pnpm lint`    | ESLint ile kod kalitesi kontrollerini çalıştırır                                                  |
| `pnpm test`    | Vitest ile birim testlerini çalıştırır                                                            |
| `pnpm format`  | Prettier ile tüm kodları formatlar                                                                |

---

## 🤝 Geliştirme ve Git Kuralları

Kurallar tek yerde yaşar: **[`CONTRIBUTING.md`](CONTRIBUTING.md)**. Özet — `main`'e doğrudan commit yok, her iş `feat/<issue-no>-<kisa-ad>` branch'i ve PR üzerinden ilerler, karşılıklı review zorunludur.

YZ ajanlarıyla çalışma düzeni için `.ai/AGENT_WORKFLOW.md`, projeye giriş için kökteki **[`AGENTS.md`](AGENTS.md)**.
