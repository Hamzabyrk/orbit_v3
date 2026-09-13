-- v1.4-12 · Duyurunun yazarının bir adı var
--
-- İnceleme turunda ölçülen kusur: **kurum geneli her duyuru ekranda
-- "adı okunamadı" diyor.** Ölçüm (istemci birim testi, 2026-09-13):
--
--   kurum geneli duyuru → RPC hiç çağrılmıyor (0 çağrı) → yazar "adı okunamadı"
--
-- Sebebi bir kod hatası değil, **yanlış kaynağa sorulması**. İstemci yazar
-- adını `class_staff_names`'ten çözüyordu; o fonksiyon tanımı gereği yalnız
-- **sınıfın** mentorunu, atanmış öğretmenlerini ve programdaki vekilini
-- döndürür. Kurum geneli duyuruda sınıf **yoktur** — ve o duyuruyu yalnız
-- yönetici yazabilir. Yani müdürün her duyurusu adsız görünüyordu.
--
-- =========================================================================
-- Neden istemci tarafında çözülemiyor
-- =========================================================================
--
-- Ölçüldü: `profiles` tablosunun SELECT politikaları **üç** tane —
-- `profiles_select_self`, `profiles_select_organization_admin`
-- (`current_user_administers_person`) ve `profiles_select_platform_operator`.
--
-- Yani bir öğrenci, veli veya öğretmen **başka bir üyenin profilini
-- okuyamaz** ve bu bilinçli bir karar (v1.3-01'in #228'i tam bu sınırdan
-- doğmuştu). Dolayısıyla "yazarın adını istemcide çöz" diye bir seçenek yok:
-- adı okuyabilen tek rol yönetici ve o bile bu yolu kullanmıyordu.
--
-- Deponun bu soruna verilmiş bir cevabı zaten var: `class_staff_names`.
-- `security definer`, `authenticated`'a açık, ve **çağıranın görebildiği**
-- kapsamla sınırlı. Bu fonksiyon onun aynası.
--
-- ⚠️ **Görünürlük koşulu uydurulmadı, tablonun kendi SELECT politikalarından
-- kopyalandı** (beşi birden, ölçülerek):
--
--   admin          → kurumun her duyurusu
--   kurum geneli   → `class_id is null` ve kurumda aktif üyelik
--   öğretmen       → okuttuğu sınıf
--   öğrenci        → devam ettiği sınıf
--   veli           → çocuğunun sınıfı
--
-- `security definer` RLS'i atladığı için koşulun burada **tekrar** yazılması
-- zorunlu; bu K-06'nın bilinçli olarak kabul edilmiş bir istisnası ve sebebi
-- şu: politikalar bir fonksiyondan çağrılamaz. Bir politika değişirse burası
-- da değişmeli — `feed_post_authorship.test.sql` beş rolü de sınıyor.
--
-- ⚠️ **Advisor sayısı 28'den 29'a çıkacak ve bu bilinçli.** `0029` lint'i
-- `authenticated` tarafından çağrılabilen her `security definer` fonksiyonu
-- sayıyor; bu fonksiyonun çağrılabilir olması **zorunlu**, çünkü işi tam
-- olarak "RLS'in vermediği bir veriyi, kontrollü biçimde vermek".
-- `class_staff_names`, `exam_ranking` ve `exam_participant_count` aynı
-- ailedendir.

create or replace function public.feed_post_authors(target_post_ids uuid[])
returns table (post_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select post.id, profile.display_name
  from public.daily_feed_posts as post
  join public.organization_memberships as membership
    on membership.id = post.author_membership_id
  join public.profiles as profile
    on profile.id = membership.user_id
  where post.id = any(target_post_ids)
    and (
      public.current_user_has_membership(
        post.organization_id, null, array['admin']::public.app_role[]
      )
      or (
        post.class_id is null
        and public.current_user_has_membership(post.organization_id)
      )
      or public.current_user_teaches_class(post.class_id)
      or public.current_user_attends_class(post.class_id)
      or public.current_user_guards_class(post.class_id)
    )
    and not (select public.current_user_must_change_password());
$$;

comment on function public.feed_post_authors(uuid[]) is
  'Duyuruların yazar adlarını çözer. Gerekli çünkü profiles yalnız kişinin kendisine, kurum yöneticisine ve platform operatörüne açık; öğrenci/veli/öğretmen yazarın profilini okuyamaz. class_staff_names''in aynısı ama kapsamı SINIF değil DUYURU: görünürlük koşulu daily_feed_posts''un beş SELECT politikasından kopyalandı, çünkü security definer RLS''i atlar.';

revoke all on function public.feed_post_authors(uuid[]) from public, anon;
grant execute on function public.feed_post_authors(uuid[]) to authenticated;
