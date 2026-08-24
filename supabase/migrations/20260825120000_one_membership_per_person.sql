-- Issue #65 — Bir kişinin bir kurumda tek üyeliği olur.
--
-- Bugünkü şema aynı kurumda iki üyeliğe izin veriyordu: biri kurum geneli
-- (`branch_id is null`), biri şubeye bağlı. Yani bir kişi hem yönetici hem
-- öğretmen olarak iki ayrı satırda durabiliyordu.
--
-- Bu, kimlik mimarisiyle çelişiyor. `person_code` üyelik satırında duruyor ve
-- giriş numarası `<kurum><kişi>` biçiminde; iki üyelik iki kod, iki kod iki
-- giriş numarası demek. Ama auth hesabı **bir tane**:
--
--   * Kişinin adresi `10011000@orbit.invalid` ise `10011000` çalışır.
--   * İkinci üyeliğin kodu 1005 ise `10011005` numarası **hiçbir hesaba
--     karşılık gelmez** ve giriş sessizce başarısız olur.
--
-- Üstelik `loadMembershipIdentity` ilk üyeliği alıyor; kişinin rolü hangi
-- numarayla giriş yaptığına değil, hangi üyeliğin önce oluşturulduğuna bağlı
-- kalıyordu.
--
-- **Doğru model:** üyelik, kişinin KURUMA olan ilişkisidir — bir kişi, bir
-- üyelik, bir kod, bir numara. "Hem yönetici hem öğretmen" veya "iki şubede
-- ders veren öğretmen" ayrı bir şeydir: **atama**. ROADMAP v1.2 bunu zaten
-- planlıyor ("öğretmen-sınıf/ders atamaları"). Kişinin hangi şubede çalıştığı
-- üyelikten değil atamadan gelecek.
--
-- Kısıt bugün ucuz: sistemde iki kullanıcı var ve hiçbirinin çift üyeliği yok.
-- Faz E6'da kullanıcı ekleme akışı yazılırken keşfedilseydi o akışı yeniden
-- yazmak gerekirdi.

-- Eski kısmi indeksler yerini tek bir bütün indekse bırakıyor. İkisi de bu
-- indeksin altkümesiydi; `branch_id` ne olursa olsun kişi başına tek satır.
drop index if exists public.organization_memberships_org_wide_user_idx;
drop index if exists public.organization_memberships_branch_user_idx;

create unique index organization_memberships_org_user_idx
  on public.organization_memberships (organization_id, user_id);

comment on index public.organization_memberships_org_user_idx is
  'Bir kişinin bir kurumda tek üyeliği olur. Şube ve ders atamaları üyelikten ayrı modellenir (v1.2).';

-- Platform operatörü için kurum istatistikleri.
--
-- Operatör `organization_memberships` tablosunu okuyamaz ve okumamalı; kurumun
-- kim olduğunu görmesi "operatör kapları yönetir, içeriği görmez" taahhüdünü
-- ihlal ederdi. Ancak silme onayında "kaç hesap silinecek" sorusunun cevabı
-- gerekiyor ve bu bir SAYIDIR, kişisel veri değildir.
--
-- Bu, destek modelindeki **Katman 1 — teşhis** yaklaşımının ilk parçası:
-- yapısal bilgi açık, kişisel veri kapalı. Bkz. `.ai/DECISION_LOG.md` —
-- "Operatör desteği üç katmanlıdır".
create or replace function public.platform_organization_stats(
  target_organization_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.current_user_is_platform_operator() then null
    else jsonb_build_object(
      'member_count', (
        select count(*) from public.organization_memberships as m
        where m.organization_id = target_organization_id
      ),
      'admin_count', (
        select count(*) from public.organization_memberships as m
        where m.organization_id = target_organization_id and m.role = 'admin'
      ),
      'branch_count', (
        select count(*) from public.branches as b
        where b.organization_id = target_organization_id
      ),
      'audit_event_count', (
        select count(*) from public.audit_events as a
        where a.organization_id = target_organization_id
      )
    )
  end;
$$;

comment on function public.platform_organization_stats(uuid) is
  'Kurumun yapısal sayıları. Yalnızca sayı döndürür; hiçbir kişisel veri içermez. Operatör olmayan çağırana NULL döner.';

-- `authenticated` EXECUTE yetkisi KORUNUR: fonksiyonu panelden operatörün
-- kendi oturumu çağırıyor. Yetki kontrolü fonksiyonun içinde yapılıyor ve
-- operatör olmayan çağırana `null` dönüyor, veri değil.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz.
revoke all on function public.platform_organization_stats(uuid)
  from public, anon, authenticated;

grant execute on function public.platform_organization_stats(uuid)
  to authenticated;
