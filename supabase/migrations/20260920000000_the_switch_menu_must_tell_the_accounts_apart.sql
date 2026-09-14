-- v1.4-17 · Geçiş menüsü hesapları birbirinden ayırabilmeli
--
-- #301 geçişin güvenlik kararını indirdi ama bir boşluk kaldı ve brifingi
-- yazarken ölçüldü (2026-09-14): **menü iki hesabı ayırt edemiyor.**
--
-- `organization_memberships`'in SELECT politikaları yalnız ikisi:
-- `memberships_select_self` (kendi satırın) ve `memberships_select_admin`
-- (kurumun yöneticisi). Bağlı kardeş hesabın üyeliği **hiçbirine girmiyor**.
--
-- Sonuç: istemci kardeş hesabın `profiles` satırını okuyabiliyor —
-- `profiles_select_linked_account` bunu açtı — ama oradan çıkan tek şey
-- `display_name`, ve iki hesap **aynı kişiye** ait olduğu için o ad ikisinde
-- de aynı. Menü "Ayşe Yılmaz" ve "Ayşe Yılmaz" gösterirdi.
--
-- =========================================================================
-- Neden tabloyu genişletmiyoruz
-- =========================================================================
--
-- En kısa yol `organization_memberships`'e `current_user_shares_person`
-- koşullu bir SELECT politikası eklemekti. Reddedildi: o politika üyeliğin
-- **tüm satırını** açar (`person_code`, `branch_id`, `status`, `created_at`),
-- oysa menünün üç alana ihtiyacı var.
--
-- Deponun bu duruma verdiği cevap yazılı ve üç kez uygulanmış
-- (`class_staff_names`, `feed_post_authors`, `student_attendance_counts`):
-- okunamayan satırlardan **birkaç alan** gerekiyorsa, tabloyu değil **dar bir
-- fonksiyonu** açarsın. Aynı gerekçe velilerin adı için `profiles`'ı
-- genişletmeyi reddederken de yazılmıştı: "açılan şey istenen şeyden fazla
-- olduğunda kimse fark etmez".
--
-- =========================================================================
-- Liste, geçişin kabul edeceği kümenin AYNISI
-- =========================================================================
--
-- ⚠️ Yalnız **aktif üyeliği olan** hesaplar dönüyor ve bu bir ayrıntı değil:
-- `internal_begin_account_switch` üyeliksiz hedefi reddediyor (#301, testte
-- 5. iddia). Menü onu listeleseydi, basılınca reddedilen bir düğme çizerdi —
-- ekranın yapabileceğini söylediği şeyle gerçekten yapabildiği ayrışırdı
-- (**K-22**).
--
-- Kendi hesabın da listede ve `is_current` ile işaretli: menü "buradasın"
-- diyebilsin. Tek satır dönüyorsa bileşen hiç çizilmez — bugün üretimdeki
-- herkesin durumu bu (`person_id` her satırda NULL).

create or replace function public.my_linked_accounts()
returns table (
  user_id uuid,
  display_name text,
  role public.app_role,
  organization_id uuid,
  organization_name text,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hesap.id as user_id,
    hesap.display_name,
    uyelik.role,
    uyelik.organization_id,
    kurum.name as organization_name,
    (hesap.id = (select auth.uid())) as is_current
  from public.profiles as ben
  join public.profiles as hesap
    on hesap.person_id = ben.person_id
  join public.organization_memberships as uyelik
    on uyelik.user_id = hesap.id
   and uyelik.status = 'active'
  join public.organizations as kurum
    on kurum.id = uyelik.organization_id
  where ben.id = (select auth.uid())
    and not (select public.current_user_must_change_password())
  order by kurum.name, uyelik.role, hesap.id;
$$;

comment on function public.my_linked_accounts() is
  'Çağıranın kişi kaydına bağlı, AKTİF ÜYELİĞİ OLAN hesapları döner: kim, hangi rol, hangi kurum. Menünün iki hesabı ayırt edebilmesi için var — `profiles` yalnız adı veriyor ve iki hesap aynı kişiye ait olduğu için o ad ikisinde de aynı. Liste, `internal_begin_account_switch`''in kabul edeceği kümenin aynısıdır: üyeliksiz hesap listelenmez, çünkü basılınca reddedilen bir düğme çizilmemeli (K-22). Kişi kaydı olmayan çağıran KENDİNİ bile görmez — bağ yoksa menü de yoktur. Şifre kilidi açıkken boş döner.';

revoke all on function public.my_linked_accounts() from public, anon;
grant execute on function public.my_linked_accounts() to authenticated;
