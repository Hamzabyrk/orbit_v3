# DECISION_LOG.md — ORBIT

> Mini-ADR formatında karar kaydı. Format: `PROJECT_ARCHITECT.md` §04.

---

### Karar: Repo görünürlüğü — Private

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** `ardabulent/orbit_v2` reposu public olarak oluşturulmuştu; repo gerçek bir dershane/CRM ürününün iş mantığını, veri modellerini ve ticari fikirleri içeriyor.
**Karar:** Repo GitHub üzerinde Private'a çevrildi.
**Gerekçe:** Ticari/finansal iş mantığı ve müşteri veri modelleri üçüncü tarafların erişimine kapalı tutulmalı.

---

### Karar: MoneyFlow kalıntılarının temizlenmesi ve ORBIT Eğitim Çekirdeğinin kurulması

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent (repo sahibi)

**Bağlam:** Repoda eski MoneyFlow döneminden kalma 15+ adet ölü bileşen, kullanılmayan 1438 satırlık vitrin ve 83 KB'lık eski tarihçe birikmişti.
**Karar:** Tüm ölü dosyalar silindi, `Home.tsx` ve stiller temizlendi. Repo saf ORBIT Eğitim Platformu haline getirildi.
**Gerekçe:** Repoyu sıfırdan başlayan net, tip güvenli ve yeni geliştiricinin anında anlayabileceği bir eğitim CRM platformuna dönüştürmek.

---

### Karar: MVP Faz 1 Kapsamı — Saha Doğrulaması & Müşteri Görüşmesi Odaklı Mimari

**Durum:** Alındı
**Tarih:** 2026-08-17
**Kararı Onaylayan(lar):** Arda Bülent & Hamza Bayrak

**Bağlam:** Hedef kitle devlet kısıtlılıklarına tabi olmayan özel kurslar (LGS/YKS kursları, butik etüt merkezleri, dil kursları). İlk hedef, birkaç gün içinde çalışan bir MVP çıkarıp potansiyel müşterilere sahada göstererek geri bildirim toplamak.
**Karar:**

1. **MVP Çekirdeği:** Sınıf & Grup Yönetimi + Öğrenci Yönetimi (Ad, No, Sınıf, Tel, Veli Ad/Tel) + 4 Rol Arayüzü (Admin, Öğretmen, Öğrenci, Veli).
2. **Auth & 3. Parti Entegrasyonlar:** Saha görüşmelerinde sürtünmeyi sıfıra indirmek amacıyla karmaşık Auth ve harici SMS/ödeme API'leri MVP sonrasına bırakıldı; tek tıkla rol değiştirilebilen interaktif demo modu benimsendi.
3. **Mock Veri İzolasyonu:** Kurumun dolu görünmesini sağlayan örnek veriler `isMock: true` bayrağı ile işaretlenecek ve istendiğinde tek tıkla temizlenebilecek.
4. **Dağıtım & Bütçe:** GitHub + Vercel entegrasyonu ile 0₺ bütçeli anlık canlıya alma.

**Gerekçe:** Hız, sıfır maliyet ve müşteriyle doğrudan temas kurarak gerçek ihtiyaçları en kısa sürede öğrenmek.
