/**
 * Navigasyon ve bölüm geçiş korumaları (v1.4-03 R1 & R2).
 *
 * Kullanıcı Yoklama ekranında henüz kaydedilmemiş değişiklikler yapmışken
 * sol menüden başka bir bölüme geçmeye veya rol değiştirmeye çalıştığında
 * verinin sessizce kaybolmasını önlemek için onay penceresi açılır.
 *
 * Bu karar saf bir fonksiyona çıkarılmıştır çünkü:
 * 1. Karar mantığı tek bir yerde tanımlanır ve bileşenden bağımsız doğrudan sınanabilir.
 * 2. `EducationPlatform` içindeki `navigate` ve `changeRole` aynı koruma kuralını paylaşır.
 * 3. Test edilebilirlik: sahte yerel fonksiyon kopyaları yerine gerçek karar sınanır.
 */

/**
 * Kullanıcı aktif bölümden ayrılırken kaydedilmemiş değişiklik onayı gerekip gerekmediğini belirler.
 *
 * @param activeSection Kullanıcının şu an bulunduğu bölüm (örn. "Yoklama")
 * @param nextSection Kullanıcının gitmek istediği hedef bölüm (örn. "Öğrenciler")
 * @param isDirty Aktif bölümde kaydedilmemiş değişiklik olup olmadığı
 * @returns Onay penceresi açılması gerekiyorsa true, doğrudan geçilebilir ise false
 */
export function shouldConfirmLeaving(
  activeSection: string,
  nextSection: string,
  isDirty: boolean
): boolean {
  // Kullanıcı Yoklama veya Sınavlar bölümündeyken, kaydedilmemiş değişiklikler varken (kirli)
  // ve hedef bölüm o bölümden farklı bir bölümken onay gerekir (v1.4-03, v1.4-04 #270).
  // Aynı bölüme tıklanırsa veya veri temizse onay sorulmaz.
  const isGuardedSection =
    activeSection === "Yoklama" || activeSection === "Sınavlar";
  return Boolean(isDirty && isGuardedSection && nextSection !== activeSection);
}
