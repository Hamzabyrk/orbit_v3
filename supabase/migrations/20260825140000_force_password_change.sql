-- Issue #69 — Zorunlu ilk şifre değişimi.
--
-- Kullanıcılar giriş numarası ve **geçici şifre** ile açılıyor; şifre kâğıda
-- yazılıp elden veriliyor. Bugün o şifre süresiz çalışıyor: kâğıttaki şifre
-- kalıcı şifre gibi kullanılabiliyor ve kaybolan bir kâğıt kalıcı bir erişim
-- demek.
--
-- Bu migration üç şey kuruyor:
--   1. Kilit bayrağı ve süre alanı
--   2. Bayrağın istemciden yazılamaması
--   3. Şifre gerçekten değiştiğinde bayrağın kendiliğinden düşmesi

alter table public.profiles
  add column must_change_password boolean not null default false;

alter table public.profiles
  add column password_expires_at timestamptz;

comment on column public.profiles.must_change_password is
  'Kullanıcı geçici şifreyle açıldı ve henüz kendi şifresini belirlemedi. Şifre değiştiğinde trigger ile kendiliğinden düşer.';

comment on column public.profiles.password_expires_at is
  'Geçici şifrenin son geçerlilik anı. Dolduktan sonra kullanıcı kendi şifresini belirleyemez; kurum yöneticisinden yeni geçici şifre istemesi gerekir.';

-- ---------------------------------------------------------------------------
-- Bayrak istemciden yazılamaz
-- ---------------------------------------------------------------------------
--
-- `profiles_update_self` politikası kullanıcının kendi satırını güncellemesine
-- izin veriyor ve bu doğru — adını değiştirebilmeli. Ancak politika satır
-- düzeyinde çalışır, sütun düzeyinde değil: bayrak bu hâliyle kullanıcının
-- kendi eliyle `false` yapabileceği bir alan olurdu ve kilit tek bir istekle
-- atlanırdı.
--
-- Sütun düzeyi GRANT, RLS'in yapamadığı ayrımı yapıyor: kullanıcı yalnızca
-- adını ve avatarını güncelleyebilir.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Şifre değiştiğinde bayrak kendiliğinden düşer
-- ---------------------------------------------------------------------------
--
-- Bayrağı kullanıcının temizlemesi gerekseydi, temizleme yolunu ona açmak
-- zorunda kalırdık — ve o yol şifreyi hiç değiştirmeden de kullanılabilirdi.
-- Bunun yerine bayrak, şifrenin GERÇEKTEN değiştiği ana bağlanıyor.
--
-- Şifre değişimi istemciden `supabase.auth.updateUser({ password })` ile
-- yapılıyor; araya bizim sunucu kodumuz girmiyor. Kimlik kararı gereği
-- kullanıcının şifresi sunucumuzdan geçmemeli.
--
-- ⚠️ Geçici şifre üreten Edge Function'lar (`bootstrap-organization`,
-- `reset-admin-password`) şifreyi değiştirdiği için bu trigger orada da
-- çalışır ve bayrağı düşürür. Bu yüzden o fonksiyonlar bayrağı şifre
-- değişiminden **SONRA** set etmek zorundadır. Sıra deterministiktir: trigger
-- auth API çağrısı içinde çalışır, fonksiyonun kendi UPDATE'i ondan sonra.
create or replace function public.handle_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set must_change_password = false,
      password_expires_at = null
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_password_changed
  after update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is distinct from new.encrypted_password)
  execute function public.handle_password_change();

revoke all on function public.handle_password_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kilidin sunucu tarafındaki karşılığı
-- ---------------------------------------------------------------------------
--
-- Kilit ekranı tek başına bir güvenlik sınırı DEĞİLDİR: istemci kodunu yok
-- sayan biri doğrudan API çağırabilir. Bu fonksiyon, kilidin RLS politikalarına
-- koşul olarak girebilmesi için var.
--
-- **Bugün hiçbir politikaya eklenmedi ve bu bilinçli.** Mevcut tablolar kap
-- niteliğinde (kurum, şube, üyelik) ve kilitli bir kullanıcının kendi kurumunun
-- adını görmesi bir zarar üretmiyor. Asıl korunması gereken veri — öğrenci,
-- not, yoklama, ödeme — v1.2'de geliyor ve o tabloların politikalarına
-- `and not public.current_user_must_change_password()` koşulu **eklenecek**.
--
-- `profiles_select_self` politikasına asla eklenmemeli: kilit ekranının
-- kendisi bayrağı okumak için o politikaya muhtaç. Eklenirse ekran bayrağı
-- göremez ve kilit hiç görünmez.
create or replace function public.current_user_must_change_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select profile.must_change_password
      from public.profiles as profile
      where profile.id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.current_user_must_change_password() is
  'Kullanıcı geçici şifresini değiştirmek zorunda mı. v1.2 iş tablolarının RLS politikalarına koşul olarak girer.';

-- `authenticated` yetkisi KORUNUR: fonksiyon RLS politikalarından çağrılacak
-- ve policy ifadeleri çağıran rolün ayrıcalıklarıyla değerlendirilir.
-- Kaldırılırsa politikalar kendi koşullarını çalıştıramaz.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.current_user_must_change_password()
  from public, anon, authenticated;

grant execute on function public.current_user_must_change_password()
  to authenticated;
