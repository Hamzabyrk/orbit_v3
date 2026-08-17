# DECISION_LOG.md — ORBIT

> Mini-ADR formatında karar kaydı. Format: `PROJECT_ARCHITECT.md` §04 / `CLAUDE.md` §04.

---

### Karar: Repo görünürlüğü — Private

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** `ardabulent/orbit_v2` reposu public olarak oluşturulmuştu; repo gerçek bir dershane/CRM ürününün iş mantığını, veri modellerini ve olası ticari fikirleri içeriyor.

**Karar:** Repo GitHub üzerinde Private'a çevrilecek.

**Gerekçe:** Ticari/finansal iş mantığı ve müşteri veri modelleri, rakiplerin veya üçüncü tarafların erişimine kapalı tutulmalı. Açık kaynak/portföy amaçlı bir kullanım hedeflenmiyor.

**Alternatifler ve neden elenmişti:**
- Public kalması — reddedildi: ticari/hassas iş mantığı içeriyor.

**Sonuçlar / Trade-off'lar:** Repo artık yalnızca eklenen collaborator'lar tarafından görülebilir; potansiyel açık kaynak/portföy görünürlüğü kaybedilir (bu proje için önemsiz kabul edildi).

**Ne zaman yeniden değerlendirilmeli:** Proje bir açık kaynak bileşeni ayrıştırırsa veya portföy amaçlı ayrı bir showcase repo'su açılırsa.

**Aksiyon Maddeleri:**
1. [ ] GitHub Settings → Danger Zone → Change repository visibility → Private (repo sahibi tarafından, bkz. bu PR'ın açıklaması).

---

### Karar: Kök dizindeki 24 not dosyasının `docs/archive/`'a taşınması

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** Repo kökünde, önceki geliştirme sürecinden (MoneyFlow dönemi + Orbit pivotu + tasarım/animasyon analizleri) kalma 24 adet dağınık `.md` dosyası birikmişti. Bunlar yaşayan dokümantasyon değil, geçmiş checkpoint/araştırma/QA kayıtlarıydı.

**Karar:** Tüm 24 dosya, içerik kaybı olmadan tek bir `docs/archive/PROJECT_HISTORY.md` dosyasında üç bölüm altında (MoneyFlow Dönemi, Orbit Pivotu, Tasarım/Animasyon Analizleri) birleştirildi; orijinal dosyalar kökten silindi.

**Gerekçe:** Kök dizini yeni katkıda bulunanlar (ve YZ ajanları) için taranabilir tutmak; geçmiş kararların/araştırmaların izini kaybetmemek.

**Alternatifler ve neden elenmişti:**
- Kategori bazlı birkaç ayrı dosya — reddedildi: tek dosya daha az gezinme yükü getiriyor, proje bu ölçekte hâlâ küçük.
- Doğrudan silme — reddedildi: araştırma bulguları (rakip analizi, KVKK bulguları, veri modeli tasarım gerekçeleri) ileride tekrar gerekebilir.

**Sonuçlar / Trade-off'lar:** `docs/archive/PROJECT_HISTORY.md` büyük tek bir dosya (~950 satır); arama/grep ile gezinmek gerekir, ayrı dosyalar kadar modüler değildir.

**Ne zaman yeniden değerlendirilmeli:** Arşiv dosyası çok büyürse (yeni büyük araştırma turları eklenirse) kategori bazlı ayrıma geçmek yeniden değerlendirilebilir.

**Aksiyon Maddeleri:**
1. [x] 24 dosyanın içeriği `docs/archive/PROJECT_HISTORY.md`'ye taşındı.
2. [x] Orijinal 24 dosya + boş `.gitkeep` kökten silindi.
