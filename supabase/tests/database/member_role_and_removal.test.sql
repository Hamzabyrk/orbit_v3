-- v1.4-07 — Bir üyeliğin rolü değişebilir, üyelik sona erebilir (#280).
--
-- Bu dilimin riski yetki sınırlarında ve **çıkarmanın role göre farklı iş
-- yapmasında**. Dört iddia kümesi:
--
--   1. Yetki: yalnız hedefin kurumundaki aktif yönetici; kendini ve bir
--      yöneticiyi hedef almak reddedilir (v1.4-08'in işi).
--   2. `ORB03` yutulmuyor: ayakta duran ders ataması varken rol değişmiyor ve
--      hata tetikleyiciden olduğu gibi geliyor.
--   3. Çıkarma personelde yalnız `status` yazıyor; öğrenci ve velide **bağı da
--      koparıyor** — ve asıl ölçüm bu: bağ koptuktan sonra erişim gerçekten
--      bitiyor mu (K-13, mekanizma değil sonuç).
--   4. İki işlem de kendi denetim kaydını yazıyor ve faili doğru söylüyor —
--      `service_role` bağlamında `auth.uid()` boş olduğu için bu kolay
--      kaybedilecek bir şey.

begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'uye-yonetici@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'uye-ogretmen@example.test', '', now(), now()),
  ('a3000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'uye-ogrenci@example.test', '', now(), now()),
  ('a4000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'uye-veli@example.test', '', now(), now()),
  ('a5000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baska-kurum-yonetici@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values
  ('ad000000-0000-0000-0000-0000000000ad', 'Kurum Uye', 'kurum-uye-v1407', 7801),
  ('ae000000-0000-0000-0000-0000000000ae', 'Baska Kurum', 'baska-kurum-v1407', 7802);

insert into public.branches (id, organization_id, name, is_default)
values
  ('ad100000-0000-0000-0000-0000000011ad', 'ad000000-0000-0000-0000-0000000000ad', 'Uye Merkez', true),
  ('ae100000-0000-0000-0000-0000000011ae', 'ae000000-0000-0000-0000-0000000000ae', 'Baska Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('39000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-0000000000ad', null,
   'a1000000-0000-0000-0000-0000000000a1', 'admin', 'active', 1500),
  ('39000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-0000000000ad',
   'ad100000-0000-0000-0000-0000000011ad', 'a2000000-0000-0000-0000-0000000000a2',
   'teacher', 'active', 1501),
  ('39000000-0000-0000-0000-000000000003', 'ad000000-0000-0000-0000-0000000000ad',
   'ad100000-0000-0000-0000-0000000011ad', 'a3000000-0000-0000-0000-0000000000a3',
   'student', 'active', 1502),
  ('39000000-0000-0000-0000-000000000004', 'ad000000-0000-0000-0000-0000000000ad',
   'ad100000-0000-0000-0000-0000000011ad', 'a4000000-0000-0000-0000-0000000000a4',
   'parent', 'active', 1503),
  ('39000000-0000-0000-0000-000000000005', 'ae000000-0000-0000-0000-0000000000ae', null,
   'a5000000-0000-0000-0000-0000000000a5', 'admin', 'active', 1504);

insert into public.subjects (id, organization_id, name)
values ('a9000000-0000-0000-0000-000000000009', 'ad000000-0000-0000-0000-0000000000ad', 'Fizik');

insert into public.classes (id, organization_id, branch_id, name)
values ('ab000000-0000-0000-0000-0000000000b1', 'ad000000-0000-0000-0000-0000000000ad',
        'ad100000-0000-0000-0000-0000000011ad', 'Uye Sinifi');

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values ('5b000000-0000-0000-0000-00000000b001', 'ad000000-0000-0000-0000-0000000000ad',
        'ad100000-0000-0000-0000-0000000011ad', 'a3000000-0000-0000-0000-0000000000a3', 'Bagli Ogrenci');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values ('9d000000-0000-0000-0000-00000000d001', 'ad000000-0000-0000-0000-0000000000ad',
        'a4000000-0000-0000-0000-0000000000a4', 'Bagli Veli');

insert into public.student_guardians (organization_id, student_id, guardian_id)
values ('ad000000-0000-0000-0000-0000000000ad', '5b000000-0000-0000-0000-00000000b001',
        '9d000000-0000-0000-0000-00000000d001');

insert into public.class_enrollments (organization_id, class_id, student_id)
values ('ad000000-0000-0000-0000-0000000000ad', 'ab000000-0000-0000-0000-0000000000b1',
        '5b000000-0000-0000-0000-00000000b001');

-- =========================================================================
-- Yetki sınırları — her biri ayrı bir kapı
-- =========================================================================

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a5000000-0000-0000-0000-0000000000a5',
    '39000000-0000-0000-0000-000000000003',
    'parent'
  )$sql$,
  '42501',
  null,
  'an administrator of ANOTHER organization cannot change this role'
);

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a2000000-0000-0000-0000-0000000000a2',
    '39000000-0000-0000-0000-000000000003',
    'parent'
  )$sql$,
  '42501',
  null,
  'a teacher cannot change roles'
);

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000001',
    'teacher'
  )$sql$,
  -- ⚠️ Bu iddianın KODU 2026-09-13'te değişti (v1.4-08, #282), sonucu değil.
  --
  -- v1.4-07'de reddin sebebi `42501` idi: "admin rolleri burada ele alınmaz".
  -- v1.4-08 o kapıyı kaldırdı — yönetici devri tam olarak bunu gerektiriyor.
  -- Yerine gelen kural bir SAYIM: işlem sonrası kurumda sıfır aktif yönetici
  -- kalacaksa reddet (`ORB06`).
  --
  -- Bu kurguda çağıran kurumun TEK yöneticisi, dolayısıyla kendini indirmesi
  -- hâlâ reddediliyor — ama artık "kendisi olduğu için" değil, "son yönetici
  -- olduğu için". İkinci bir yönetici olsaydı GEÇERDİ ve bu istenen davranış:
  -- devir budur (`last_administrator.test.sql`).
  'ORB06',
  null,
  'the last administrator cannot demote themselves — refused by the count, not by a self-ban'
);

-- ⚠️ Bu iddia 2026-09-13'te TERSİNE döndü (v1.4-08, #282). v1.4-07'de terfi
-- reddediliyordu ("kapsamı v1.4-08"); artık serbest ve sayımı ARTIRDIĞI için
-- hiçbir zaman reddedilmiyor.
select lives_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000003',
    'admin'
  )$sql$,
  'promoting a member to administrator is allowed since v1.4-08'
);

-- Kurgu geri alınıyor ki sonraki iddialar bu terfiden etkilenmesin. pgTAP
-- dosyası tek bir işlemde koşuyor ve durum taşınır; bunu yapmazsak aşağıdaki
-- ORB04 iddiası "öğrenci" yerine "yönetici" bir satıra bakar ve yanlış
-- sebeple kırmızıya döner (ilk koşumda tam olarak bu oldu).
select public.internal_change_member_role(
  'a1000000-0000-0000-0000-0000000000a1',
  '39000000-0000-0000-0000-000000000003',
  'student'
);

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000003',
    'student'
  )$sql$,
  'ORB04',
  null,
  'setting the role it already has is refused, not silently accepted'
);

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-00000000ffff',
    'parent'
  )$sql$,
  '23503',
  null,
  'a membership that does not exist is refused with a distinct code'
);

-- =========================================================================
-- ORB03 yutulmuyor — şemanın kuralı olduğu gibi çağırana gidiyor
-- =========================================================================

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('ad000000-0000-0000-0000-0000000000ad', 'ab000000-0000-0000-0000-0000000000b1',
        '39000000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-000000000009');

select throws_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000002',
    'parent'
  )$sql$,
  'ORB03',
  null,
  'a teacher with a standing class assignment cannot be demoted — ORB03 is not swallowed'
);

select is(
  (select role::text from public.organization_memberships
   where id = '39000000-0000-0000-0000-000000000002'),
  'teacher',
  'and the role really did not change'
);

-- Atama arşivlenince yol açılıyor: kural bir duvar değil, bir sıra.
update public.class_teachers
set archived_at = now()
where membership_id = '39000000-0000-0000-0000-000000000002';

select lives_ok(
  $sql$select public.internal_change_member_role(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000002',
    'parent'
  )$sql$,
  'once the assignment is archived the same change succeeds'
);

select is(
  (select role::text from public.organization_memberships
   where id = '39000000-0000-0000-0000-000000000002'),
  'parent',
  'the new role is stored'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '39000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'),
  1::bigint,
  'changing a role leaves a trace'
);

select is(
  (select actor_user_id from public.audit_events
   where entity_id = '39000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'),
  'a1000000-0000-0000-0000-0000000000a1'::uuid,
  'and the trace names the real actor — auth.uid() is empty under service_role'
);

select is(
  (select metadata ->> 'from' from public.audit_events
   where entity_id = '39000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'),
  'teacher',
  'the trace says which role it was'
);

select is(
  (select metadata ->> 'to' from public.audit_events
   where entity_id = '39000000-0000-0000-0000-000000000002'
     and action = 'membership.role_changed'),
  'parent',
  'and which role it became'
);

-- =========================================================================
-- Çıkarma — personel tarafı
-- =========================================================================

select throws_ok(
  $sql$select public.internal_remove_member(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000001'
  )$sql$,
  -- Aynı değişiklik çıkarma tarafında (v1.4-08): sebep `42501` değil `ORB06`.
  -- Çağıran kurumun tek yöneticisi olduğu için çıkarılamıyor; iki yönetici
  -- olsaydı çıkarılabilirdi.
  'ORB06',
  null,
  'the last administrator cannot remove themselves — refused by the count'
);

select throws_ok(
  $sql$select public.internal_remove_member(
    'a5000000-0000-0000-0000-0000000000a5',
    '39000000-0000-0000-0000-000000000003'
  )$sql$,
  '42501',
  null,
  'an administrator of another organization cannot remove this member'
);

-- =========================================================================
-- Çıkarma — öğrenci: status DEĞİŞİR ve bağ KOPAR
-- =========================================================================

select is(
  (select auth_user_id from public.students
   where id = '5b000000-0000-0000-0000-00000000b001'),
  'a3000000-0000-0000-0000-0000000000a3'::uuid,
  'before removal the student record is linked to the account'
);

select is(
  (select public.internal_remove_member(
     'a1000000-0000-0000-0000-0000000000a1',
     '39000000-0000-0000-0000-000000000003'
   ) ->> 'unlinked_student_id'),
  '5b000000-0000-0000-0000-00000000b001',
  'removing a student reports WHICH record was unlinked — the screen must be able to say so'
);

select is(
  (select status::text from public.organization_memberships
   where id = '39000000-0000-0000-0000-000000000003'),
  'suspended',
  'the membership is suspended, not deleted'
);

select is(
  (select auth_user_id from public.students
   where id = '5b000000-0000-0000-0000-00000000b001'),
  null::uuid,
  'and the link is broken — this is the only thing that cuts a student off'
);

-- K-13: mekanizma değil SONUÇ. Bağ koptuktan sonra öğrenci gerçekten
-- göremiyor mu? `suspended` tek başına bunu yapmıyordu — ölçüm buydu.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a3000000-0000-0000-0000-0000000000a3', true);

select is(
  (select count(*) from public.students),
  0::bigint,
  'the removed student can no longer see their own record'
);

select is(
  (select count(*) from public.classes),
  0::bigint,
  'and no longer sees the class they attended'
);

reset role;

select is(
  (select count(*) from public.audit_events
   where entity_id = '5b000000-0000-0000-0000-00000000b001'
     and action = 'student.account_unlinked'),
  1::bigint,
  'the broken link is its own event, in the SAME vocabulary as unlink_student_account'
);

select is(
  (select metadata ->> 'reason' from public.audit_events
   where entity_id = '5b000000-0000-0000-0000-00000000b001'
     and action = 'student.account_unlinked'),
  'membership.removed',
  'and it says why the link was broken'
);

-- =========================================================================
-- Çıkarma — veli tarafı ve tekrarlanan istek
-- =========================================================================

select is(
  (select public.internal_remove_member(
     'a1000000-0000-0000-0000-0000000000a1',
     '39000000-0000-0000-0000-000000000004'
   ) ->> 'unlinked_guardian_id'),
  '9d000000-0000-0000-0000-00000000d001',
  'removing a guardian unlinks the guardian record too'
);

select throws_ok(
  $sql$select public.internal_remove_member(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000004'
  )$sql$,
  'ORB04',
  null,
  'removing an already-removed member is refused with a distinct code, not silently repeated'
);

-- Personel çıkarmada bağ diye bir şey yok; yalnız status değişir.
select lives_ok(
  $sql$select public.internal_remove_member(
    'a1000000-0000-0000-0000-0000000000a1',
    '39000000-0000-0000-0000-000000000002'
  )$sql$,
  'a staff membership can be removed as well'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '39000000-0000-0000-0000-000000000002'
     and action = 'membership.removed'),
  1::bigint,
  'and that leaves its own trace'
);

select * from finish();
rollback;
