-- Ölçüm kurumu (kod 1000) kullanıcıları: rol karması ~ %60 öğrenci, %25 veli, %12 öğretmen, %3 yönetici
with kurum as (select id from public.organizations where code = 1000)
select json_agg(json_build_object('id', u.id, 'email', u.email, 'orbitRole', m.role, 'org', m.organization_id, 'membership', m.id))
from public.organization_memberships m join auth.users u on u.id = m.user_id, kurum
where m.organization_id = kurum.id and m.status = 'active';
