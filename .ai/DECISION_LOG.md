# DECISION_LOG.md — ORBIT

> Mini-ADR formatında karar kaydı. Format: `PROJECT_ARCHITECT.md` §04.

---

### Karar: Repo görünürlüğü — Private

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** `ardabulent/orbit_v2` reposu public olarak oluşturulmuştu; repo gerçek bir dershane/CRM ürününün iş mantığını, veri modellerini ve olası ticari fikirleri içeriyor.

**Karar:** Repo GitHub üzerinde Private'a çevrildi.

**Gerekçe:** Ticari/finansal iş mantığı ve müşteri veri modelleri, rakiplerin veya üçüncü tarafların erişimine kapalı tutulmalı. Açık kaynak/portföy amaçlı bir kullanım hedeflenmiyor.

**Sonuçlar / Trade-off'lar:** Repo artık yalnızca eklenen collaborator'lar tarafından görülebilir.

---

### Karar: MoneyFlow kalıntılarının ve eski geçmiş dosyalarının temizlenmesi

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** Repoda eski MoneyFlow (muhasebe/finans SaaS) döneminden kalma 15+ adet ölü bileşen, kullanılmayan 1438 satırlık bileşen vitrini (`ComponentShowcase.tsx`), 83 KB'lık eski tarihçe (`docs/archive/PROJECT_HISTORY.md`) ve `Home.tsx` içinde 400+ satırlık ölü fatura/kasa kodu birikmişti. Bu durum repoya yeni dahil olan geliştirici arkadaş ve YZ ajanları için kafa karışıklığı yaratıyordu.

**Karar:** 
1. Eski MoneyFlow bileşenleri (`AccountingModules`, `FinancialModules`, `FinanceWorkspace`, `OperationsModules`, `PlannerBoard` vb.) tamamen silindi.
2. `Home.tsx` temizlenerek doğrudan ORBIT Eğitim Çekirdeğine (`EducationPlatform`) bağlandı.
3. Eski `docs/archive/PROJECT_HISTORY.md` dosyası ve şablon artıkları kaldırıldı.
4. CSS ve kod içindeki tüm MoneyFlow değişken/stil kalıntıları temizlendi.

**Gerekçe:** Repoyu sıfırdan başlayan net bir eğitim kurumu CRM platformu haline getirmek; kod tabanını hafif, taranabilir, tip güvenli ve yeni geliştiricilerin doğrudan anlayabileceği hale getirmek.

**Sonuçlar / Trade-off'lar:** Önceki muhasebe SaaS denemelerinin kodları repodan çıktı; repo saf eğitim kurumu operasyonlarına (ders programı, yoklama, öğrenci/sınıf takibi, sınav analizi, veli iletişimi, kayıt/ödeme) odaklandı.

**Aksiyon Maddeleri:**
1. [x] 15 adet ölü/eski dosya silindi.
2. [x] `Home.tsx`, `index.css` ve `App.tsx` temizlendi.
3. [x] TypeScript kontrolü (`pnpm check`) ve testlerin (`pnpm test`) geçmesi sağlandı.
