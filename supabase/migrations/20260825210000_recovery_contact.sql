-- Kurtarma ve iletişim bilgisi — Faz E4'ün şema yarısı.
--
-- Auth e-postası hiç değişmiyor; `<numara>@orbit.invalid` kalıcıdır ve giriş
-- numarasının kendisidir. Gerçek iletişim bilgisi burada, `profiles` içinde
-- yaşıyor ve yalnızca **kurtarma kanalı** olarak kullanılıyor.
-- Bkz. `DECISION_LOG.md` — "Auth e-postası hiç değişmez".

alter table public.profiles
  add column phone text
    check (phone is null or char_length(trim(phone)) between 7 and 30);

alter table public.profiles
  add column recovery_email text
    check (recovery_email is null or recovery_email like '%_@_%._%');

comment on column public.profiles.phone is
  'İletişim telefonu. Doğrulanmaz ve kurtarma kanalı DEĞİLDİR; yalnızca kurumun kişiye ulaşması içindir.';

comment on column public.profiles.recovery_email is
  'Doğrulanmış kurtarma adresi. Yalnızca sunucu yazar; kullanıcı doğrudan yazamaz. NULL ise kişinin kendi kendine kurtarma yolu yoktur.';

-- ---------------------------------------------------------------------------
-- Sütun yetkileri — asıl güvenlik sınırı burada
-- ---------------------------------------------------------------------------
--
-- RLS satır düzeyindedir, sütun düzeyinde değildir: `profiles_update_self`
-- politikası kişinin kendi satırını güncellemesine izin veriyor ve tek başına
-- hangi sütuna dokunabileceğini sınırlayamaz. Sınır GRANT'tan gelir.
--
-- `phone` kullanıcıya açık: doğrulanmıyor, kurtarma kanalı değil, yanlış
-- yazılması kimseye erişim kazandırmıyor.
--
-- `recovery_email` KAPALI ve bu kararın tamamı burada:
--
--   Doğrulama, adresin gerçekten o kişiye ait olduğunu kanıtlamak içindir.
--   Kullanıcı bu sütunu doğrudan yazabilseydi doğrulama tamamen anlamsız
--   kalırdı — ve daha somutu, hesaba kısa süreliğine erişen biri (açık
--   bırakılmış oturum, omuz sörfü, ödünç verilmiş cihaz) kendi adresini
--   yazıp **kalıcı bir arka kapı** bırakabilirdi. Şifre değişse bile kurtarma
--   adresi onda kalırdı.
--
-- Sütunu yalnızca `service_role` üzerinden çalışan doğrulama akışı doldurur;
-- o akış E4'ün ikinci yarısında geliyor. Bugün sütun her hesapta NULL'dır ve
-- arayüz bunu "kurtarma yöntemin yok" uyarısıyla gösterir.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Kişinin kendi kurtarma kanalı var mı
-- ---------------------------------------------------------------------------
--
-- Arayüz bu bilgiyi kendi profil satırından da okuyabilir; fonksiyon,
-- politikalardan ve sunucu tarafından da aynı soruyu tek bir tanımla
-- sorabilmek için var.
--
-- Telefon bilinçli olarak sayılmıyor: doğrulanmıyor ve üzerinden kod
-- gönderilmiyor. "Kurtarma kanalı" yalnızca doğrulanmış e-posta demektir;
-- telefonu dolu olan birine "kurtarma yolun var" demek yanlış olurdu.
create or replace function public.current_user_has_recovery_channel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select profile.recovery_email is not null
      from public.profiles as profile
      where profile.id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.current_user_has_recovery_channel() is
  'Kişinin doğrulanmış kurtarma adresi var mı. Telefon sayılmaz — doğrulanmıyor ve kod gönderilmiyor.';

-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.current_user_has_recovery_channel()
  from public, anon, authenticated;
grant execute on function public.current_user_has_recovery_channel()
  to authenticated;
