/**
 * PostgREST'in satır tavanı ve ona bağlı varsayımlar (v1.5-09).
 *
 * PostgREST her yanıtı bir üst sınıra kadar döndürür (`db-max-rows`). Sınır
 * aşıldığında **hata verilmez** — yanıt sessizce kesilir. Bu yüzden bu depoda
 * her liste okuması kendi `.limit()`'ini açıkça veriyor ve kesilmeyi kendisi
 * ölçüyor (`truncated` bayrağı, **K-03**): uygulamanın tavanı kendisi
 * bilmesi, sunucunun tavanına bel bağlamamasından daha güvenli.
 *
 * ## ⚠️ Bu sayı bir VARSAYIM, ölçüm değil
 *
 * `1000` PostgREST'in Supabase'deki varsayılanı ve `supabase/config.toml` da
 * öyle diyor — ama o **yerel** yapılandırma. Üretimdeki değer proje düzeyi bir
 * PostgREST ayarı; veritabanından okunamıyor (rol yapılandırmalarında
 * `pgrst.db_max_rows` yok, 2026-09-18'de ölçüldü) ve Management API dışında
 * bir yolu yok. Doğrulaması tek bir panel okumasına bakıyor:
 * **Supabase → Settings → API → Max rows**.
 *
 * Sayı bu dosyaya taşındı çünkü platformun tamamına ait bir gerçek, tek bir
 * özelliğin servis dosyasına değil (**K-06**). Eskiden
 * `education/homeworkService.ts` içinde duruyordu.
 *
 * ## Gerçek güvenlik özelliği, sayının doğruluğu değil
 *
 * Üretimdeki tavan bundan **düşük** olsa bile uygulama sessizce yanlış sayı
 * üretmez: açık `.limit()` veren her okuma kendi tavanını ölçüyor. Tehlikeli
 * olan, bir okumanın `POSTGREST_MAX_ROWS`'a **eşit veya üstünde** bir tavan
 * istemesi — o noktada hangi tarafın kestiğini uygulama ayırt edemez. Kapısı
 * `postgrestLimits.test.ts`.
 */

export const POSTGREST_MAX_ROWS = 1000;
