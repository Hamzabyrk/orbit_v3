-- v1.3'ün fonksiyonlarından varsayılan `PUBLIC` yetkisi geri alınıyor.
--
-- =========================================================================
-- Bulgu
-- =========================================================================
--
-- v1.4 öncesi kapsamlı tarama (2026-09-09) Supabase güvenlik danışmanını
-- çalıştırdı ve **üç `SECURITY DEFINER` fonksiyonun giriş yapmadan
-- çağrılabildiğini** buldu:
--
--   public.broadcast_organization_change()
--   public.class_staff_names(uuid[])
--   public.current_user_teaches_guardian(uuid)
--
-- Sebep, Postgres'in her yeni fonksiyona `PUBLIC` için varsayılan bir EXECUTE
-- yetkisi vermesi. `grant execute ... to authenticated` yazmak o varsayılanı
-- kaldırmıyor; kaldırmak için önce `revoke` gerekiyor.
--
-- **Bu depo bu hatayı bir kez yaşamış ve yazmış.** `20260825140000`
-- migration'ının kendi yorumu şunu söylüyor:
--
--   > "Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
--   >  EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz.
--   >  **Issue #18'de tam olarak bu kaçırılmıştı.**"
--
-- Ölçüldü: v1.3'ün **sekiz migration'ından yalnız biri** `revoke` satırını
-- taşıyordu (`exam_participant_count` — `exam_ranking`'in deseni bilerek
-- kopyalandığı için). Kalan yedisi atlamıştı.
--
-- =========================================================================
-- Sızıntı YOK — ölçüldü
-- =========================================================================
--
-- Üç fonksiyon da `anon` rolüyle çağrıldığında **kapalı kapıya çarpıyor**,
-- çünkü guard'ları `auth.uid()`'e dayanıyor ve o giriş yapmamış çağıran için
-- boş. Canlıda ölçüldü (`begin; … rollback;`), kurgulanmış bir sınıf ve veli
-- üzerinden:
--
--     anon → class_staff_names(...)            → 0 satır
--     anon → current_user_teaches_guardian(...) → false
--
-- `broadcast_organization_change` ise bir tetikleyici fonksiyonu; tetikleyici
-- bağlamı dışında çağrılırsa Postgres zaten hata veriyor.
--
-- Yani bu bir **sertleştirme açığı, ihlal değil**. Kapatılmasının sebebi
-- sızıntı değil, yüzey: üç RPC uç noktası jeton olmadan erişilebilir
-- durumdaydı ve bunun hiçbir karşılığı yok.
--
-- =========================================================================
-- Kapsam: v1.3'ün on iki fonksiyonu birden
-- =========================================================================
--
-- Danışman yalnız `definer` olanları işaretliyor çünkü `invoker` olanlar
-- çağıranın haklarıyla çalışıyor ve `anon` için RLS zaten hiçbir şey
-- döndürmüyor. Yine de hepsi kapsama alındı: ev kuralı "önce revoke, sonra
-- grant" ve bir kuralın istisnası, bir sonraki kişinin hangi tarafın doğru
-- olduğunu bilememesi demek (**K-06**).
--
-- `broadcast_organization_change` ayrıca `authenticated`'dan da alınıyor:
-- tetikleyici fonksiyonunun doğrudan çağrılması için hiçbir sebep yok ve
-- tetikleyici yolu bu yetkiye ihtiyaç duymuyor.

revoke all on function public.current_user_teaches_guardian(uuid) from public, anon;
grant execute on function public.current_user_teaches_guardian(uuid) to authenticated;

revoke all on function public.class_staff_names(uuid[]) from public, anon;
grant execute on function public.class_staff_names(uuid[]) to authenticated;

revoke all on function public.student_attendance_counts(uuid[]) from public, anon;
grant execute on function public.student_attendance_counts(uuid[]) to authenticated;

revoke all on function public.student_latest_exam_scores(uuid[]) from public, anon;
grant execute on function public.student_latest_exam_scores(uuid[]) to authenticated;

revoke all on function public.orbit_local_date(timestamptz) from public, anon;
grant execute on function public.orbit_local_date(timestamptz) to authenticated;

revoke all on function public.orbit_today() from public, anon;
grant execute on function public.orbit_today() to authenticated;

revoke all on function public.student_payment_summaries(uuid[]) from public, anon;
grant execute on function public.student_payment_summaries(uuid[]) to authenticated;

revoke all on function public.payment_plan_summaries(uuid[]) from public, anon;
grant execute on function public.payment_plan_summaries(uuid[]) to authenticated;

revoke all on function public.payment_overview_counts() from public, anon;
grant execute on function public.payment_overview_counts() to authenticated;

revoke all on function public.realtime_topic_organization_id(text) from public, anon;
grant execute on function public.realtime_topic_organization_id(text) to authenticated;

-- Tetikleyici fonksiyonları: hiç kimse doğrudan çağırmamalı.
--
-- `set_updated_at` v1.3'ten değil, ama aynı varsayılan yetkiyi taşıyordu ve
-- kapsam dışı bırakılsaydı "hiçbir public fonksiyon anon'a açık değildir"
-- kuralının tek istisnası olurdu. Bir kuralın istisnası, bir sonraki kişinin
-- hangi tarafın doğru olduğunu bilememesi demek.
--
-- **Tetikleyicileri kırmadığı ölçüldü** (canlı, `begin; … rollback;`):
-- yetki alındıktan sonra `authenticated` bir UPDATE koştu, hata almadı;
-- `broadcast_organization_change` yayınını gönderdi ve `set_updated_at` elle
-- 2020'ye çekilmiş `updated_at`'i `now()`'a ezdi. Postgres tetikleyici
-- fonksiyonunun EXECUTE yetkisini tetikleyici KURULURKEN denetliyor,
-- ateşlenirken değil.
revoke all on function public.broadcast_organization_change() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
