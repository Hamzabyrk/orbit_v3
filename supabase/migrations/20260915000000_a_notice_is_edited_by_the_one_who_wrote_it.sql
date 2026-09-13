-- v1.4-12 · Duyuruyu yazan düzenler; pano iz bırakır
--
-- `daily_feed_posts` v1.2-09'da geldi ve **hiç ekranı olmadı**. K-10 turu
-- (2026-09-13) ölçtü: istemcide sıfır kod, üretimde 0 satır, tablo realtime
-- birliğinde yok. Yazma yüzeyi ise **tam** — politikalar ve sütun yetkileri
-- hazır, `author_membership_id` sunucuda atanıyor.
--
-- ⚠️ Bir bağımlılık kayda değer: öğretmenin duyuru yazabilmesi
-- `current_user_teaches_class`'a, o da `class_teachers`'a bağlı. O tablo
-- **v1.4-11'e kadar boştu ve satır yaratan hiçbir yol yoktu** — yani bu
-- politikanın öğretmen yarısı bugüne kadar ateşlenemezdi. Yazma kuralı doğru
-- yazılmıştı; eksik olan onu kullanılabilir kılan dilimdi.
--
-- =========================================================================
-- 1. Duyuruyu yazan düzenler — sınıfın her öğretmeni değil
-- =========================================================================
--
-- Ölçülen eski kural (`daily_feed_posts_update_authorized`):
--
--   yönetici  OR  (class_id dolu AND o sınıfı okutuyor)
--
-- Yani bir öğretmen, okuttuğu sınıftaki **her** duyuruyu — müdürün yazdığı
-- dahil — değiştirebiliyor ve kaldırabiliyordu. Yazma tarafında bu doğru bir
-- kural (o sınıfa duyuru yazabilmeli); düzenleme tarafında fazla geniş.
--
-- Karar (2026-09-13, Arda Bülent): **yazanına ve yöneticiye daraltılır.**
--
-- ⚠️ **Kararın literal halinden bir adım daha dar yazıldı ve sebebi burada.**
-- Yazan dalına "ve hâlâ o sınıfı okutuyor" koşulu eklendi. Sebebi deponun
-- yazılı ilkesi: `class_teachers` bir **erişim kapısıdır** ve atama
-- kaldırıldığında erişim biter (v1.4-10'un "erişim bitiyor" ölçümüyle aynı
-- gerekçe). Bu koşul olmasaydı, sınıftan alınmış bir öğretmen o sınıfa ait
-- eski duyurusunu değiştirmeye devam ederdi.
--
-- Sonuçta yeni kural şu cümle: **"yazabileceğin şeyi düzenleyebilirsin, ve
-- yalnız yazdıysan."** Koşul INSERT politikasının aynısı, üstüne yazarlık.
--
-- ⚠️ Kurum geneli duyuru (`class_id is null`) yalnız yöneticinin
-- yazabildiği bir şey; dolayısıyla düzenlemesi de yalnız yöneticide kalıyor.
-- Yazan dalı `class_id is not null` istediği için, yöneticiliği alınmış biri
-- eski kurum geneli duyurusuna dokunamaz.

drop policy if exists daily_feed_posts_update_authorized on public.daily_feed_posts;

create policy daily_feed_posts_update_author_or_admin
  on public.daily_feed_posts
  for update
  to authenticated
  using (
    (
      public.current_user_has_membership(
        organization_id, null, array['admin']::public.app_role[]
      )
      or (
        public.current_user_owns_membership(author_membership_id)
        and class_id is not null
        and public.current_user_teaches_class(class_id)
      )
    )
    and not (select public.current_user_must_change_password())
  )
  with check (
    (
      public.current_user_has_membership(
        organization_id, null, array['admin']::public.app_role[]
      )
      or (
        public.current_user_owns_membership(author_membership_id)
        and class_id is not null
        and public.current_user_teaches_class(class_id)
      )
    )
    and not (select public.current_user_must_change_password())
  );

comment on policy daily_feed_posts_update_author_or_admin on public.daily_feed_posts is
  'Duyuruyu yöneticiler ve YAZANI düzenleyebilir. Eski kural sınıfın her öğretmenine izin veriyordu; bir öğretmen müdürün duyurusunu değiştirebiliyordu. Yazan dalı ayrıca sınıfı hâlâ okutmayı şart koşar: class_teachers bir erişim kapısıdır ve atama kalktığında erişim biter.';

-- =========================================================================
-- 2. Pano iz bırakmıyordu
-- =========================================================================
--
-- Ölçüldü: `daily_feed_posts`'ta **0** denetim, **0** yayın tetikleyicisi.
-- Yalnız `set_feed_post_author` ve `set_updated_at` var.
--
-- Bir duyurunun sonradan değiştirilmesi ya da kaldırılması, defterin
-- cevaplaması gereken sorulardan biri: insanlar onu okuduktan sonra metnin
-- değişmesi, değişmediği varsayılan bir şeyin değişmesidir.
--
-- ⚠️ **`body` BİLEREK izlenmiyor** (karar, 2026-09-13, Arda Bülent).
-- İzlenen alanlar `title` ve `class_id`; yani defter "kim, ne zaman, hangi
-- sınıfa, hangi başlıklı duyuruyu yazdı/değiştirdi/kaldırdı" sorusuna cevap
-- verir. Duyuru **metni** defterde durmaz: `audit_events` kalıcıdır, kurum
-- yöneticisi tarafından okunabilir ve metin kişisel bilgi taşıyabilir.
--
-- Bunun kabul edilen bedeli: "duyuru sonradan değiştirildi, eski metni neydi"
-- sorusu **cevaplanamaz**. Değiştirildiği görülür, eski hali görülmez.
--
-- ⚠️ `archived_at` izlenen alanlar listesinde değil ve olması da gerekmiyor:
-- `audit_row_change` arşive geçişi ve arşivden dönüşü izlenen alanlardan
-- **bağımsız** olarak `.archived` / `.restored` diye yazıyor (ölçüldü).

create trigger daily_feed_posts_audit_insert
  after insert on public.daily_feed_posts
  for each row execute function public.audit_row_change(
    'feed_post', 'title', 'class_id'
  );

create trigger daily_feed_posts_audit_update
  after update on public.daily_feed_posts
  for each row execute function public.audit_row_change(
    'feed_post', 'title', 'class_id'
  );

create trigger daily_feed_posts_broadcast_insert
  after insert on public.daily_feed_posts
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger daily_feed_posts_broadcast_update
  after update on public.daily_feed_posts
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger daily_feed_posts_broadcast_delete
  after delete on public.daily_feed_posts
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();
