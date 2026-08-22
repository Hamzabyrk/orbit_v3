-- Issue #18 — SECURITY DEFINER fonksiyonlarındaki anon/authenticated EXECUTE
-- yetkilerinin kaldırılması.
--
-- Bağlam: 20260821183000_auth_tenant_foundation.sql, fonksiyon yetkilerini
-- `revoke all on function ... from public` ile kaldırıyordu. Supabase, `public`
-- şemasında oluşturulan her fonksiyona `anon` ve `authenticated` rolleri için
-- AYRI bir default EXECUTE grant'ı verir; `from public` revoke'u bu grant'ları
-- kaldırmaz. Sonuç olarak `internal_bootstrap_organization`, tarayıcıda herkese
-- açık olan anon anahtarıyla `/rest/v1/rpc/...` üzerinden çağrılabiliyordu ve
-- `bootstrap-organization` Edge Function'ındaki operatör kontrolü baypas
-- edilebiliyordu.

-- 1) Atomik tenant kurulum RPC'si yalnızca service_role tarafından çağrılabilir.
--    Edge Function service_role ile çalıştığı için tasarlanan akış etkilenmez.
revoke execute on function public.internal_bootstrap_organization(text, text, text, uuid, uuid) from anon, authenticated;

-- 2) Trigger fonksiyonu; `auth.users` insert'inde profil oluşturur. Doğrudan
--    çağrılması gerekmez. Trigger tetiklenmesi çağıran rolün EXECUTE yetkisine
--    bakmadığı için bu revoke trigger'ı etkilemez; regresyon testiyle
--    doğrulanmıştır (supabase/tests/database/function_grants.test.sql).
revoke execute on function public.handle_new_auth_user() from anon, authenticated;

-- 3) current_user_has_membership: yalnızca `anon` yetkisi kaldırılır.
--
--    DİKKAT — `authenticated` yetkisi KORUNMALIDIR. RLS policy ifadeleri
--    çağıran rolün ayrıcalıklarıyla değerlendirilir ve bu fonksiyon
--    organizations / branches / organization_memberships / audit_events
--    policy'lerinin tamamında kullanılır. `authenticated`'dan kaldırılırsa tüm
--    tenant okuma akışı ve dolayısıyla giriş sonrası kimlik çözümlemesi kırılır.
--
--    Fonksiyon SECURITY DEFINER olsa da içeride `auth.uid()` kullanır; çağıran
--    yalnızca kendi üyeliğini sorgulayabilir, yetki artışı oluşmaz.
revoke execute on function public.current_user_has_membership(uuid, uuid, public.app_role[]) from anon;

-- 4) workspace_documents üzerinde RLS açık ve hiçbir policy yok, ancak tablo
--    yetkileri hâlâ tam DML (SELECT/INSERT/UPDATE/DELETE/TRUNCATE). Tabloyu
--    koruyan tek şey policy bulunmaması; ileride tek bir izin veren policy
--    eklenmesi anon'a doğrudan yazma hakkı verirdi. Derinlemesine savunma
--    gereği tablo yetkileri de kaldırılır.
revoke all on public.workspace_documents from anon, authenticated;

-- Amaçlanan yetkiler idempotent biçimde yeniden bildirilir.
grant execute on function public.internal_bootstrap_organization(text, text, text, uuid, uuid) to service_role;
grant execute on function public.current_user_has_membership(uuid, uuid, public.app_role[]) to authenticated;

-- Kapsam dışı bırakılan: public.set_updated_at()
--
-- Bu fonksiyon SECURITY DEFINER değildir ve `trigger` tipi döndürdüğü için
-- trigger bağlamı dışında doğrudan çağrılamaz; anon'a açık kalması bir güvenlik
-- riski oluşturmaz. Acil bir güvenlik düzeltmesinde gereksiz yüzey
-- değiştirmemek için bilinçli olarak dokunulmadı.
