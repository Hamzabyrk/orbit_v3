-- Geçici şifrenin süresi sunucu tarafında anlam kazanır.
--
-- Sorun: `password_expires_at` yazılıyordu ama hiçbir yerde okunmuyordu.
-- Süre yalnızca kilit ekranında hesaplanıyordu; istemciyi yok sayan biri —
-- veya ekranı açık tutup süre dolduktan sonra gönderen biri — 7 gün önce
-- kâğıda basılmış bir geçici şifreyle sisteme girip kilidi kaldırabiliyordu.
-- Yani "7 gün" bir vaatti, sistem onu tutmuyordu. (Issue #80 · B06)
--
-- Bu migration iki yeri düzeltir: tetikleyici ve yardımcı fonksiyon.

-- ---------------------------------------------------------------------------
-- 1) Süresi dolmuş kilit, şifre değiştirilerek kaldırılamaz
-- ---------------------------------------------------------------------------
--
-- Önceki hâli her şifre değişiminde bayrağı düşürüyordu. Sonuç: süresi dolmuş
-- bir kullanıcı şifresini değiştirip tam erişim kazanıyordu ve süre hiçbir şey
-- ifade etmiyordu.
--
-- Artık süresi dolmuşsa bayrak DÜŞMEZ. Kullanıcının şifresi değişir (zararsız),
-- ancak kilitli kalır ve yeni bir geçici şifreyi kurumdan/operatörden almak
-- zorundadır. Kurtarma yolu budur ve bilinçlidir.
--
-- ⚠️ **E6 için bağlayıcı ön koşul.** Bugün hesabı olan tek rol kurum
-- yöneticisidir ve `reset-admin-password` ona yeni geçici şifre üretebiliyor —
-- yani çıkmaz sokak yok. E6 öğretmen/öğrenci/veli hesaplarını açtığında, o
-- roller için de kullanıcı başına "yeni geçici şifre üret" işlemi **aynı
-- sürümde** gelmelidir. Gelmezse süresi dolan bir öğrenci kalıcı olarak
-- kilitlenir ve kurtarılamaz.
create or replace function public.handle_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lock_expired boolean;
begin
  select
    profile.must_change_password
    and profile.password_expires_at is not null
    and profile.password_expires_at <= now()
  into lock_expired
  from public.profiles as profile
  where profile.id = new.id;

  -- Süresi dolmuş kilit yerinde bırakılır. `coalesce`, profil satırı
  -- bulunamadığında (olmaması gereken durum) bayrağı düşürmemeyi seçer:
  -- bilinmeyende kilidi açmak, kilidi tek bir veri tutarsızlığıyla
  -- atlanabilir kılardı.
  if coalesce(lock_expired, true) then
    return new;
  end if;

  update public.profiles
  set must_change_password = false,
      password_expires_at = null
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.handle_password_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Yardımcı fonksiyon süreyi okur ve bilinmeyende KİLİTLİ tarafta kalır
-- ---------------------------------------------------------------------------
--
-- İki değişiklik:
--
-- **Süre okunuyor.** Önceden yalnızca `must_change_password` bakılıyordu.
-- Süresi dolmuş bir kayıt artık kilitli sayılır; v1.2'de iş tablolarının
-- politikalarına `and not public.current_user_must_change_password()` olarak
-- girdiğinde süre kendiliğinden anlam kazanır.
--
-- **Fail-closed.** Önceki hâli `coalesce(..., false)` ile profil bulunamazsa
-- kilidi AÇIK sayıyordu. İstemci tarafı (`authService.ts`) tam tersini yapıyor:
-- profil okunamazsa kilidi VARSAYIYOR. Aynı soruya iki zıt cevap veren bir
-- sistem, hangisinin devrede olduğuna göre farklı davranır. İkisi de artık
-- güvenli tarafta: bilinmeyen durum = kilitli. Bkz. `AGENT_WORKFLOW.md` K-04.
create or replace function public.current_user_must_change_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        profile.must_change_password
        or (
          profile.password_expires_at is not null
          and profile.password_expires_at <= now()
        )
      from public.profiles as profile
      where profile.id = (select auth.uid())
    ),
    true
  );
$$;

comment on function public.current_user_must_change_password() is
  'Kullanıcı geçici şifresini değiştirmek zorunda mı. Süresi dolmuş kayıt da kilitli sayılır. Profil bulunamazsa KİLİTLİ döner (fail-closed). v1.2 iş tablolarının RLS politikalarına koşul olarak girer.';

-- `authenticated` yetkisi KORUNUR: fonksiyon RLS politikalarından çağrılacak
-- ve policy ifadeleri çağıran rolün ayrıcalıklarıyla değerlendirilir.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.current_user_must_change_password()
  from public, anon, authenticated;
grant execute on function public.current_user_must_change_password()
  to authenticated;
