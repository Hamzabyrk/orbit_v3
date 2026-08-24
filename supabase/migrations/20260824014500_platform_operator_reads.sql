-- Issue #41 — Platform panelinin okuma yolu.
--
-- Panel iki listeyi gösterecek: kurumlar ve operatörler. İkisi de bugün boş
-- dönüyor, çünkü:
--
--   * `organizations_select_member` kurum üyeliği istiyor; operatörün tasarım
--     gereği üyeliği yok.
--   * `profiles_select_self` yalnızca kişinin kendi kaydını gösteriyor; operatör
--     listesi diğer operatörlerin adını çözemiyor, yalnızca UUID görüyor.
--
-- ⚠️ Bu migration, `platform_operators.test.sql` içindeki
-- "platform operator cannot read any organization" iddiasını bilinçli olarak
-- gevşetir. Gevşetmenin sınırı önemlidir, o yüzden açıkça yazıyorum:
--
-- KVKK taahhüdü kurumun **içeriği** hakkındaydı — öğrenci, not, yoklama, ödeme.
-- Kurumun kendisi bir kayıt değil bir **kap**tır: ad, slug, kod, kuruluş tarihi.
-- Kişisel veri içermez ve zaten operatörün kendi oluşturduğu şeydir. Operatör
-- kurduğu kurumu listeleyemiyorsa panel işlevsizdir.
--
-- Kapalı kalanlar bilinçlidir ve testlerle sabitlenir:
--   * `branches`          — panel şube listelemiyor; yalnızca varsayılan şubeyi
--                            oluşturuyor ve oluşturma `service_role` ile yapılıyor.
--   * `organization_memberships` — kimin hangi kurumda kim olduğu operatörü
--                            ilgilendirmez.
--   * `audit_events`      — kurum içi denetim kaydı kuruma aittir; operatör
--                            kendi ekseninin kaydını `platform_audit_events`
--                            üzerinden okur.
--
-- Yani operatör bir kurumun **var olduğunu** görür, **içinde ne olduğunu**
-- görmez. İleride şube listesi gerekirse ayrı bir kararla ve ayrı bir
-- migration'la açılmalıdır; buraya sessizce eklenmemelidir.

-- Mevcut `organizations_select_member` politikasına dokunulmuyor. Postgres
-- birden fazla permissive politikayı OR'lar; ayrı politika, hangi erişimin
-- hangi gerekçeyle var olduğunu okunur tutar.
create policy organizations_select_platform_operator
on public.organizations for select
to authenticated
using (public.current_user_is_platform_operator());

-- Yalnızca operatörlerin profilleri. `using` ifadesinin iki yanı da gerekli:
-- soldaki çağıranın operatör olmasını, sağdaki ise okunan satırın bir operatöre
-- ait olmasını şart koşar. Sağdaki koşul olmasaydı operatör, sistemdeki her
-- öğrencinin ve velinin adını okuyabilirdi.
create policy profiles_select_platform_operator
on public.profiles for select
to authenticated
using (
  public.current_user_is_platform_operator()
  and exists (
    select 1
    from public.platform_operators as operator
    where operator.user_id = profiles.id
  )
);
