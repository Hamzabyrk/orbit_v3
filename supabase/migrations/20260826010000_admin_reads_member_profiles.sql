-- Kurum yöneticisi kendi kurumundaki kişilerin adını okuyabilsin.
--
-- Bugünkü boşluk: `memberships_select_self_or_admin` yöneticinin kurumundaki
-- **üyelikleri** okumasına izin veriyor, ama isim `profiles` tablosunda ve
-- orası yalnızca kişinin kendisine açık. Yani yönetici kendi kurumunun üye
-- listesini çekebiliyor ve karşısında **UUID'ler** görüyor.
--
-- E6'daki üye tablosu bu politika olmadan yazılamaz.

-- ---------------------------------------------------------------------------
-- Yardımcı — çağıran, bu kişinin kurumunda yönetici mi
-- ---------------------------------------------------------------------------
--
-- `SECURITY DEFINER` zorunlu: politika `profiles` üzerinde çalışıyor ve
-- `organization_memberships`'i sorguluyor. O tablonun da kendi RLS'i var;
-- doğrudan sorgulansaydı politika kendi kendini tetikleyebilir veya sessizce
-- filtrelenmiş bir sonuç üzerinden karar verebilirdi.
--
-- **Üyenin durumu bilinçli olarak sınırlanmıyor.** Askıya alınmış bir üye de
-- yöneticiye görünür kalmalı: aksi halde kurumdan çıkardığı kişinin adını
-- göremez, listede boş bir satır kalır ve kimi çıkardığını bilemez.
--
-- **Çağıranın durumu ise sınırlanıyor.** Askıya alınmış bir yönetici hiçbir
-- şey okuyamaz; üyeliği durdurulmuş birinin kurumun kişi listesine erişmesi,
-- durdurma işlemini anlamsız kılardı.
create or replace function public.current_user_administers_person(
  person_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as member
    join public.organization_memberships as administrator
      on administrator.organization_id = member.organization_id
    where member.user_id = person_user_id
      and administrator.user_id = (select auth.uid())
      and administrator.role = 'admin'
      and administrator.status = 'active'
  );
$$;

comment on function public.current_user_administers_person(uuid) is
  'Çağıran, verilen kişinin kurumunda aktif yönetici mi. Üyenin durumu sınırlanmaz (askıdaki üye de yöneticiye görünür); çağıranın üyeliği aktif olmak zorundadır.';

-- `authenticated` yetkisi KORUNUR: fonksiyon RLS politikasından çağrılıyor ve
-- policy ifadeleri çağıran rolün ayrıcalıklarıyla değerlendiriliyor.
-- Kaldırılırsa politika kendi koşulunu çalıştıramaz ve yönetici hiçbir ismi
-- göremez.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.current_user_administers_person(uuid)
  from public, anon, authenticated;
grant execute on function public.current_user_administers_person(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Politika
-- ---------------------------------------------------------------------------
--
-- Kapsam kurumdur, sistem değil. Bir kurumun yöneticisi yalnızca **kendi**
-- kurumundaki kişilerin profilini okur; bu, "operatör kapları yönetir,
-- içeriği görmez" taahhüdünün kurum düzeyindeki karşılığıdır — kurum kendi
-- içeriğinin sorumlusudur, başkasının içeriğinin değil.
--
-- Satır tamamı açılıyor, sütun kısıtı konmuyor: `profiles` içinde sır yok
-- (şifre karması `auth.users`'ta). Yöneticinin `must_change_password` ve
-- `password_expires_at` alanlarını görmesi ayrıca işine yarar — "bu kişi hiç
-- giriş yapmamış" veya "geçici şifresi ölmüş" sorusunun cevabı orada.
create policy profiles_select_organization_admin
on public.profiles for select
to authenticated
using (public.current_user_administers_person(profiles.id));
