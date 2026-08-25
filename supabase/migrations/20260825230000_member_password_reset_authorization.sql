-- Kurum yöneticisinin üye şifresi sıfırlama yetkisi — kararın kendisi.
--
-- **Neden bu fonksiyon var:** İşlemi yapan Edge Function `service_role` ile
-- çalışıyor ve `service_role` RLS'i baypas ediyor. Yani "bu kişi bu üyenin
-- şifresini sıfırlayabilir mi" sorusunun cevabı hiçbir politikadan geçmiyor.
-- Karar fonksiyonun içindeki bir sorguda kalsaydı **hiçbir testin ulaşamadığı
-- bir güvenlik sınırı** olurdu; pgTAP SQL'i sınayabiliyor, Deno kodunu değil.
--
-- Bu yüzden karar buraya taşındı. Edge Function artık yalnızca sonucu
-- uyguluyor: kim olduğunu doğruluyor, bu fonksiyona soruyor, satır dönerse
-- işlemi yapıyor.

create or replace function public.internal_resolve_member_for_reset(
  caller_user_id uuid,
  target_membership_id uuid
)
returns table (
  membership_id uuid,
  member_user_id uuid,
  organization_id uuid,
  login_number text,
  member_role public.app_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    target.id,
    target.user_id,
    target.organization_id,
    organization.code::text || target.person_code::text,
    target.role
  from public.organization_memberships as target
  join public.organizations as organization
    on organization.id = target.organization_id
  where target.id = target_membership_id
    -- Hedef üyelik aktif olmalı. Askıya alınmış bir üyeye şifre üretmek,
    -- kuruma erişimi kapatılmış birine erişim vermek olurdu.
    and target.status = 'active'
    -- Kimse kendi şifresini buradan sıfırlayamaz. Yeni şifre kilitli gelir;
    -- kendi şifresini değiştirmek isteyen kişinin yolu ayarlar ekranıdır.
    and target.user_id <> caller_user_id
    -- 🔴 Asıl sınır: çağıran, **aynı kurumun** aktif yöneticisi olmak zorunda.
    -- Bu koşul düşerse bir kurumun yöneticisi başka kurumun kullanıcılarının
    -- şifresini sıfırlayabilir — kiracı yalıtımının tam ihlali.
    and exists (
      select 1
      from public.organization_memberships as caller
      where caller.user_id = caller_user_id
        and caller.organization_id = target.organization_id
        and caller.role = 'admin'
        and caller.status = 'active'
    );
$$;

comment on function public.internal_resolve_member_for_reset(uuid, uuid) is
  'Kurum yöneticisinin bir üyenin şifresini sıfırlayıp sıfırlayamayacağına karar verir ve izin varsa üyeyi döndürür. Yetkisiz, kendi kaydı, askıdaki üyelik ve bulunamayan üyelik durumlarının hepsi aynı biçimde BOŞ döner — ayırt edilebilseler çağıran taraf hangi üyeliklerin var olduğunu öğrenebilirdi.';

-- Yalnızca `service_role`. Bu fonksiyon yetki **sorgular**, yetki vermez; ama
-- istemciye açık olsaydı kurum yöneticisi olmayan biri de kurumdaki üyelikleri
-- ve giriş numaralarını numaralandırabilirdi.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.internal_resolve_member_for_reset(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.internal_resolve_member_for_reset(uuid, uuid)
  to service_role;
