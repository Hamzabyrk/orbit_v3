-- v1.4-04 — Puanın tavanı ve sonuçların tek nefeste girilmesi (#270).
--
-- Bu dosya iki şeyi kilitliyor:
--
--   1. **Puanın tavanı var.** Ölçülen açık buydu: 100'lük sınava 500 yazmak
--      kabul ediliyordu. Tavan `max_score` boşken UYGULANMAZ ve o da ayrıca
--      sınanıyor — "tavan bilinmiyorsa uydurulmaz" bir karar, yan etki değil.
--   2. **Denetim burada TAM.** v1.4-03 yoklamada ilk girişi izsiz bırakmıştı;
--      sınavda bırakmıyor. Farkın sebebi `exams`'ta bir "kaydeden" alanının
--      olmaması, ve bu ayrım testle de görünür olmalı.

begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yonetici@example.test', '', now(), now()),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sinifin-ogretmeni@example.test', '', now(), now()),
  ('13000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'baska-ogretmen@example.test', '', now(), now());

insert into public.organizations (id, name, slug, code)
values ('10000000-0000-0000-0000-0000000000aa', 'Kurum G', 'kurum-g-v144', 7501);

insert into public.branches (id, organization_id, name, is_default)
values ('11100000-0000-0000-0000-000000000111', '10000000-0000-0000-0000-0000000000aa', 'G Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('35000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000aa', null,
   '11000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('35000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000aa',
   '11100000-0000-0000-0000-000000000111', '12000000-0000-0000-0000-000000000002',
   'teacher', 'active', 1001),
  ('35000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-0000000000aa',
   '11100000-0000-0000-0000-000000000111', '13000000-0000-0000-0000-000000000003',
   'teacher', 'active', 1002);

insert into public.subjects (id, organization_id, name)
values ('19000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-0000000000aa', 'Matematik');

insert into public.classes (id, organization_id, branch_id, name)
values ('1c000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000aa',
        '11100000-0000-0000-0000-000000000111', 'Sınav Sınıfı');

insert into public.class_teachers (organization_id, class_id, membership_id, subject_id)
values ('10000000-0000-0000-0000-0000000000aa', '1c000000-0000-0000-0000-0000000000c1',
        '35000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000009');

insert into public.students (id, organization_id, branch_id, full_name)
values
  ('15000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000aa',
   '11100000-0000-0000-0000-000000000111', 'Sınava Giren'),
  ('15000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000aa',
   '11100000-0000-0000-0000-000000000111', 'Sınıfa Kayıtsız');

insert into public.class_enrollments (organization_id, class_id, student_id)
values ('10000000-0000-0000-0000-0000000000aa', '1c000000-0000-0000-0000-0000000000c1',
        '15000000-0000-0000-0000-000000000001');

insert into public.exams (id, organization_id, class_id, name, exam_date, max_score)
values
  ('1e000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000aa',
   '1c000000-0000-0000-0000-0000000000c1', 'TYT Deneme 1', current_date, 100),
  ('1e000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000aa',
   '1c000000-0000-0000-0000-0000000000c1', 'Tavansız Sınav', current_date, null);

-- Sınav açmak iz bırakır — ve adı taşır ---------------------------------------

select is(
  (select metadata ->> 'name' from public.audit_events
   where entity_id = '1e000000-0000-0000-0000-0000000000e1' and action = 'exam.created'),
  'TYT Deneme 1',
  'creating an exam leaves a trace that carries its name'
);

-- Puanın tavanı ----------------------------------------------------------------

select throws_ok(
  $sql$insert into public.exam_results (organization_id, exam_id, student_id, score)
    values ('10000000-0000-0000-0000-0000000000aa', '1e000000-0000-0000-0000-0000000000e1',
            '15000000-0000-0000-0000-000000000001', 500)$sql$,
  'ORB05',
  null,
  'a score above the exam ceiling is refused — this was the measured hole'
);

-- ⚠️ Taban YOK. İlk yazımda negatif puan da reddediliyordu; v1.2-05'in
-- iddiası ("a negative net score is storable") bunu yakaladı. Net puanlamada
-- yanlış doğruyu götürür, dolayısıyla eksi bir net geçerli bir değerdir.
select lives_ok(
  $sql$insert into public.exam_results (organization_id, exam_id, student_id, score)
    values ('10000000-0000-0000-0000-0000000000aa', '1e000000-0000-0000-0000-0000000000e1',
            '15000000-0000-0000-0000-000000000001', -5.25)$sql$,
  'a negative net score is still storable — the ceiling is a ceiling, not a range'
);

delete from public.exam_results where exam_id = '1e000000-0000-0000-0000-0000000000e1';

select lives_ok(
  $sql$insert into public.exam_results (organization_id, exam_id, student_id, score)
    values ('10000000-0000-0000-0000-0000000000aa', '1e000000-0000-0000-0000-0000000000e1',
            '15000000-0000-0000-0000-000000000001', 100)$sql$,
  'exactly the ceiling is a valid score'
);

select throws_ok(
  $sql$update public.exam_results set score = 101
    where exam_id = '1e000000-0000-0000-0000-0000000000e1'$sql$,
  'ORB05',
  null,
  'the ceiling also holds on update, not only on insert'
);

select lives_ok(
  $sql$insert into public.exam_results (organization_id, exam_id, student_id, score)
    values ('10000000-0000-0000-0000-0000000000aa', '1e000000-0000-0000-0000-0000000000e2',
            '15000000-0000-0000-0000-000000000001', 4000)$sql$,
  'an exam without a max_score has no ceiling — an unknown ceiling is not invented'
);

-- Denetim: sınavda ilk giriş DE iz bırakır -------------------------------------
--
-- v1.4-03'ten kasıtlı fark. Yoklamada ilk giriş izsizdi çünkü kimin yazdığı
-- oturumdan okunabiliyordu; burada öyle bir alan yok.

-- Sayı belirli bir sınava bağlanıyor: fikstür sırası değişirse kırılan bir
-- iddia, olguyu değil kendi kurgusunu ölçer.
select is(
  (select count(*) from public.audit_events
   where action = 'exam_result.created'
     and metadata ->> 'exam_id' = '1e000000-0000-0000-0000-0000000000e2'),
  1::bigint,
  'entering a result leaves a trace — unlike attendance, the first entry is audited too'
);

select is(
  (select (metadata ->> 'score')::numeric from public.audit_events
   where action = 'exam_result.created'
     and metadata ->> 'exam_id' = '1e000000-0000-0000-0000-0000000000e2'),
  4000::numeric,
  'the creation event carries the score'
);

update public.exam_results
set score = 90
where exam_id = '1e000000-0000-0000-0000-0000000000e1';

select is(
  (select metadata -> 'changed' from public.audit_events
   where action = 'exam_result.updated'),
  '["score"]'::jsonb,
  'changing a grade names the changed field'
);

-- RPC: yetki sınırları ----------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000003', true);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '[{"student_id": "15000000-0000-0000-0000-000000000001", "score": 70}]'::jsonb
  )$sql$,
  '42501',
  null,
  'a teacher who does not teach this class cannot enter its results'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

select is(
  (select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '[{"student_id": "15000000-0000-0000-0000-000000000001", "score": 75}]'::jsonb
  )),
  1,
  'the class teacher enters results — the writer is not only the admin'
);

select is(
  (select score from public.exam_results
   where exam_id = '1e000000-0000-0000-0000-0000000000e1'),
  75::numeric,
  'the score is updated in place, not duplicated'
);

select is(
  (select count(*) from public.exam_results
   where exam_id = '1e000000-0000-0000-0000-0000000000e1'),
  1::bigint,
  'and no second row appears for the same student'
);

-- RPC: şemanın kuralları tekrarlanmıyor, olduğu gibi geçiyor ---------------------

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '[{"student_id": "15000000-0000-0000-0000-000000000002", "score": 60}]'::jsonb
  )$sql$,
  'ORB02',
  null,
  'a student who is not enrolled in the exam class is refused by the schema'
);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '[{"student_id": "15000000-0000-0000-0000-000000000001", "score": 120}]'::jsonb
  )$sql$,
  'ORB05',
  null,
  'the ceiling holds through the RPC as well — the rule lives in one place'
);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '{"student_id": "15000000-0000-0000-0000-000000000001"}'::jsonb
  )$sql$,
  '22023',
  null,
  'the entry list must be an array'
);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000ff',
    '[]'::jsonb
  )$sql$,
  '23503',
  null,
  'an exam that does not exist is refused'
);

select is(
  (select public.record_exam_results('1e000000-0000-0000-0000-0000000000e1', '[]'::jsonb)),
  0,
  'an empty list is a legitimate call that writes nothing'
);

-- Sınıfsız sınav: yalnız yönetici ------------------------------------------------

reset role;

insert into public.exams (id, organization_id, class_id, name, exam_date, max_score)
values ('1e000000-0000-0000-0000-0000000000e3', '10000000-0000-0000-0000-0000000000aa',
        null, 'Kurum Geneli Deneme', current_date, 100);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e3',
    '[{"student_id": "15000000-0000-0000-0000-000000000001", "score": 50}]'::jsonb
  )$sql$,
  '42501',
  null,
  'an exam without a class belongs to the institution — only an admin writes it'
);

-- Şifre kilidi ------------------------------------------------------------------

reset role;
update public.profiles
set must_change_password = true
where id = '12000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $sql$select public.record_exam_results(
    '1e000000-0000-0000-0000-0000000000e1',
    '[{"student_id": "15000000-0000-0000-0000-000000000001", "score": 55}]'::jsonb
  )$sql$,
  '42501',
  null,
  'a teacher who must change their password cannot enter results either'
);

select throws_ok(
  $sql$select public.enforce_exam_score_within_max()$sql$,
  '42501',
  null,
  'the ceiling trigger function is not callable by authenticated'
);

select * from finish();
rollback;
