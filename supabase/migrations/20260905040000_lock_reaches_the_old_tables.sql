-- v1.2-11 — Zorunlu şifre değişimi kilidi eski tablolara da ulaşıyor.
--
-- v1.2-01'den itibaren yazılan on sekiz iş tablosunun politikalarında koşul
-- zaten var. Bu dilimin işi, 2026-09-04'ten önce yazılmış tabloları taramaktı.
--
-- ⚠️ **Ve tarama, dilimin beyan ettiği kapsamı çürüttü.**
--
-- `ROADMAP.md` "kalan iş beş tabloyu taramak" diyordu: `profiles`,
-- `organizations`, `branches`, `organization_memberships`, `audit_events`.
-- Açılışta `client/src/auth/authService.ts` okundu ve bunlardan **dördünün
-- kilitlenemeyeceği** görüldü — çünkü kilitli kullanıcı, kilitli olduğunu tam
-- olarak o tabloları okuyarak öğreniyor:
--
--   * `profiles` → `must_change_password` oradan okunuyor. Kilitlenseydi
--     `passwordLock` "unresolved" olurdu ve kullanıcı "şifreni değiştir" yerine
--     "okunamadı" ekranını görürdü. **K-09'un tarif ettiği hatanın tam olarak
--     kendisi** — ve kullanıcı o ekrandan asla çıkamazdı.
--   * `organization_memberships` (kendi satırı) → kimlik çözümlemesinin ilk
--     adımı. Kilitlenseydi `loadAuthenticatedIdentity` "aktif üyelik
--     bulunamadı" diye **yanlış bir hata** fırlatırdı.
--   * `organizations` ve `branches` → aynı akışın devamı, üstelik `.single()`
--     ile okunuyor: RLS sıfır satır döndürdüğünde sorgu hata veriyor ve
--     kullanıcı "Kurum veya şube bilgisi güvenli şekilde yüklenemedi" mesajıyla
--     oturumdan atılıyor.
--   * `platform_operators` → operatör kimliğinin aynı hikâyesi.
--
-- **Doğru sınır bu yüzden tablo değil, sorunun kendisi:** kilit, kullanıcının
-- sistemi **kullanmasını** durdurur, kendini **tanıtmasını** değil. Kimlik
-- katmanı kilitten muaftır çünkü kilitten çıkış yolu oradan geçer.
--
-- Bu dilimde kilitlenenler, kimlik çözümlemesinde okunmayan ve gerçekten iş
-- verisi olan okumalardır: kurumun denetim kaydı, platformun denetim kaydı,
-- başkalarının profilleri ve başkalarının üyelikleri.

-- ---------------------------------------------------------------------------
-- 1) Kurum denetim kaydı
-- ---------------------------------------------------------------------------

drop policy audit_events_select_admin on public.audit_events;

create policy audit_events_select_admin on public.audit_events
for select to authenticated
using (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- 2) Platform denetim kaydı
-- ---------------------------------------------------------------------------

drop policy platform_audit_events_select_operator on public.platform_audit_events;

create policy platform_audit_events_select_operator on public.platform_audit_events
for select to authenticated
using (
  public.current_user_is_platform_operator()
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- 3) BAŞKALARININ profilleri
-- ---------------------------------------------------------------------------
--
-- `profiles_select_self` ve `profiles_update_self` **dokunulmadan bırakılıyor.**
-- İlki kilidin okunduğu yer; ikincisi ilk giriş akışının parçası (kurtarma
-- e-postası orada ekleniyor) ve kapatmak o akışı kırabilirdi. Kilitlenen,
-- yalnızca kullanıcının **başkaları** hakkında yaptığı okumalar.

drop policy profiles_select_organization_admin on public.profiles;

create policy profiles_select_organization_admin on public.profiles
for select to authenticated
using (
  public.current_user_administers_person(id)
  and not (select public.current_user_must_change_password())
);

drop policy profiles_select_platform_operator on public.profiles;

create policy profiles_select_platform_operator on public.profiles
for select to authenticated
using (
  public.current_user_is_platform_operator()
  and exists (
    select 1
    from public.platform_operators as operator
    where operator.user_id = profiles.id
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- 4) BAŞKALARININ üyelikleri — politika ikiye ayrılıyor
-- ---------------------------------------------------------------------------
--
-- `memberships_select_self_or_admin` tek bir politikada iki farklı soruyu
-- cevaplıyordu: "bu benim üyeliğim mi" ve "ben bu kurumun yöneticisi miyim".
-- Birincisi kimlik, ikincisi iş verisi — ve kilit yalnızca ikincisine
-- uygulanmalı. Tek politikada bunu ifade etmenin yolu yok, o yüzden ikiye
-- bölünüyor.
--
-- (v1.2-10'da öğrenilen dersin aynısı: tek bir ifade iki farklı soruya cevap
-- veriyorsa, birini değiştirmek diğerini bozar. Orada bir `return` idi,
-- burada bir politika.)

drop policy memberships_select_self_or_admin on public.organization_memberships;

-- Kimlik: kilitten MUAF. Kullanıcı kendi üyeliğini her hâlükârda okuyabilmeli,
-- yoksa giriş akışı kilidi hiç göremez.
create policy memberships_select_self on public.organization_memberships
for select to authenticated
using (user_id = (select auth.uid()));

-- İş verisi: kilit uygulanır. Kilitli bir yönetici kurumun üye listesini
-- göremez.
create policy memberships_select_admin on public.organization_memberships
for select to authenticated
using (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- 5) Operatörün kurum listesi
-- ---------------------------------------------------------------------------
--
-- `organizations_select_member` dokunulmuyor: kimlik çözümlemesi kurum adını
-- oradan okuyor. Operatörün **platform panelindeki kurum listesi** ise kimlik
-- değil iş verisi ve kilitlenebilir. Üyeliği de olan bir operatör kendi
-- kurumunu yine görür — politikalar OR'lanıyor ve üyelik politikası açık.

drop policy organizations_select_platform_operator on public.organizations;

create policy organizations_select_platform_operator on public.organizations
for select to authenticated
using (
  public.current_user_is_platform_operator()
  and not (select public.current_user_must_change_password())
);

comment on policy memberships_select_self on public.organization_memberships is
  'Kimlik okuması. Zorunlu şifre değişimi kilidinden MUAF: kullanıcı kilitli olduğunu bu satırı okuyarak öğreniyor.';
