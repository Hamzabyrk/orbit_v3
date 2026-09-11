-- v1.4-04 · Puanın tavanı vardır; sonuçlar tek nefeste girilir (#270)
--
-- =========================================================================
-- 1. Puan tavanı — ölçülen açık
-- =========================================================================
--
-- `exams.max_score` sütunu v1.2-05'ten beri duruyor ama onu **zorlayan hiçbir
-- şey yoktu**: `exam_results` üzerinde puanla ilgili sıfır kısıt, sıfır
-- tetikleyici. Yerel yığında denendi ve kabul edildi:
--
--     update exam_results set score = 500  →  100 puanlık sınavda geçti
--
-- **Taban YOK ve bu bilinçli.** İlk yazımda negatif puanı da reddetmiştim;
-- v1.2-05'in pgTAP iddiası bunu yakaladı ve haklıydı:
--
--   > 'a negative net score is storable — wrong answers can outweigh right ones'
--
-- Türkiye'de net puanlamada yanlış, doğruyu götürür; net eksiye düşebilir.
-- `max_score` bir **tavan** belgeliyor, taban belgelemiyor — olmayan bir kuralı
-- şemaya yazmak, veriyi korumak değil reddetmek olurdu.
--
-- **Neden şemada, neden yalnız RPC'de değil:** yanlış bir puan yalnız o satırı
-- bozmuyor. `student_latest_exam_scores` onu "son puan" olarak öğrenci
-- listesine taşıyor, ders ortalamasına giriyor ve veliye gidiyor. Kural RPC'de
-- kalsaydı `service_role` veya ileride yazılacak başka bir yol onu atlardı;
-- bütünlük şemada durur (v1.2-14 kararı).
--
-- **`max_score` boşken kural yok** ve bu bilinçli: tavan bilinmiyorsa
-- uydurulmaz. Sınavın 100 üzerinden olduğunu varsaymak, tam olarak #237'nin
-- "100 üzerinden uydurma olur" uyarısıdır.
--
-- `ORB05`: aileye yeni giren kod. `ORB01` (dolu kurum silinemez), `ORB02`
-- (kayıt iki ucuna ait değil), `ORB03` (satır bu iş için uygun değil) ve
-- `ORB04` (bağ zaten kurulu) ile aynı ailede: **"değer izin verilen aralığın
-- dışında"**. `23514`'ten ayrıldı çünkü istemcinin cevabı farklı — `23514`
-- "biçim yanlış" der, `ORB05` "tavanı aştın, tavan şu" der.

create or replace function public.enforce_exam_score_within_max()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tavan numeric;
begin
  select sinav.max_score into tavan
  from public.exams as sinav
  where sinav.id = new.exam_id;

  if tavan is not null and new.score > tavan then
    raise exception 'Puan sınavın tavanını aşıyor.'
      using errcode = 'ORB05',
            detail = format('girilen puan=%s, sınavın tavanı=%s', new.score, tavan),
            hint = 'Sınavın tam puanını değiştirmek gerekiyorsa sınav kaydını düzenleyin.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_exam_score_within_max() is
  'Puanı sınavın max_score değerine karşı sınar. max_score boşsa üst sınır uygulanmaz (tavan bilinmiyorsa uydurulmaz). Taban yoktur: net puanlamada yanlış doğruyu götürür ve net eksiye düşebilir (v1.2-05). ORB05.';

revoke all on function public.enforce_exam_score_within_max()
  from public, anon, authenticated;

create trigger exam_results_score_within_max_insert
  before insert on public.exam_results
  for each row execute function public.enforce_exam_score_within_max();

create trigger exam_results_score_within_max_update
  before update on public.exam_results
  for each row execute function public.enforce_exam_score_within_max();

-- =========================================================================
-- 2. Sonuçlar tek nefeste girilir
-- =========================================================================
--
-- Gerekçe v1.4-03 ile birebir aynı ve yine ölçüldü: `exam_results` üzerinde
-- `authenticated` yalnız `score` sütununda UPDATE yetkisine sahip, PostgREST'in
-- ürettiği upsert ise yükün her sütununu `SET` ediyor.
--
--     düz insert ........................... geçti
--     tam upsert ........................... 42501 permission denied
--     yalnız `score` SET eden upsert ....... geçti
--
-- Bir sınıfın sonuçları da tek bir işlemdir; yarısı girilmiş bir sınav,
-- girilmemiş sınavdan kötüdür çünkü girilmiş görünür.
--
-- **Yetki sınav düzeyinde sorulur.** Satır politikası (`exam_results_*_authorized`)
-- öğrenci başına `current_user_teaches_student` soruyor; bu fonksiyon
-- `security definer` olduğu için RLS koşmuyor ve kontrolü kendisi yapmak
-- zorunda. Sınıfın öğretmeni olmak ile o sınıftaki öğrencinin öğretmeni olmak
-- burada **aynı kapıya çıkıyor**: `enforce_exam_result_belongs_to_exam` zaten
-- öğrencinin sınavın sınıfına kayıtlı olmasını şart koşuyor. Dolayısıyla
-- "sınıfı okutuyor" + "öğrenci o sınıfta" ⇒ "öğrenciyi okutuyor".
--
-- Sınıfı olmayan sınav (`class_id is null`) kurum geneli bir sınavdır ve ona
-- yalnız yönetici yazabilir — `exams_insert_authorized` da aynı şeyi söylüyor.

create or replace function public.record_exam_results(
  target_exam_id uuid,
  entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sinav public.exams;
  yetkili boolean;
  yazilan integer;
begin
  select * into sinav
  from public.exams as exam_row
  where exam_row.id = target_exam_id
    and exam_row.archived_at is null;

  if not found then
    raise exception 'Sınav bulunamadı.' using errcode = '23503';
  end if;

  yetkili := public.current_user_has_membership(
               sinav.organization_id, null, array['admin']::public.app_role[]
             )
             or (sinav.class_id is not null
                 and public.current_user_teaches_class(sinav.class_id));

  if not yetkili or public.current_user_must_change_password() then
    raise exception 'Bu sınavın sonuçlarını girme yetkiniz yok.'
      using errcode = '42501',
            hint = 'Sonuçları kurum yöneticisi veya sınavın sınıfını okutan öğretmen girebilir.';
  end if;

  if jsonb_typeof(entries) is distinct from 'array' then
    raise exception 'Sonuç listesi bir dizi olmalı.' using errcode = '22023';
  end if;

  with girdiler as (
    select
      (girdi ->> 'student_id')::uuid as student_id,
      (girdi ->> 'score')::numeric as score
    from jsonb_array_elements(entries) as girdi
  ),
  yazim as (
    insert into public.exam_results (organization_id, exam_id, student_id, score)
    select sinav.organization_id, target_exam_id, girdiler.student_id, girdiler.score
    from girdiler
    -- Yalnız `score`. Diğer sütunları SET etmek hem yetki hatası verirdi
    -- (ölçüldü) hem de yanlış olurdu: bir sonucu başka bir öğrenciye taşımak
    -- notu tahrif etmektir.
    on conflict (exam_id, student_id) do update
      set score = excluded.score
    returning 1
  )
  select count(*) into yazilan from yazim;

  return yazilan;
end;
$$;

comment on function public.record_exam_results(uuid, jsonb) is
  'Bir sınavın sonuçlarını tek işlemde yazar. entries: [{"student_id": uuid, "score": numeric}]. Var olan sonuçta yalnız score güncellenir. Öğrencinin sınavın sınıfına kayıtlı olduğunu (ORB02) ve puanın tavanı aşmadığını (ORB05) şema tetikleyicileri doğrular.';

revoke all on function public.record_exam_results(uuid, jsonb) from public, anon;
grant execute on function public.record_exam_results(uuid, jsonb) to authenticated;

-- =========================================================================
-- 3. Denetim izi — burada TAM
-- =========================================================================
--
-- v1.4-03 yoklamada ilk girişi bilerek izsiz bırakmıştı. **O gerekçe burada
-- geçerli değil** ve bu ayrım kayda değer:
--
--   * Yoklamada ilk girişi kimin yaptığı `attendance_sessions.recorded_by_membership_id`
--     alanından okunabiliyordu. `exams` tablosunda öyle bir alan **yok**.
--   * Hacim bir büyüklük küçük: §4.12'nin tahmini `exam_results` için
--     ~9.000.000 satır/yıl, `attendance_records` için ~90.000.000.
--
-- Bir notun ilk kez kim tarafından girildiği, velinin soracağı ilk sorudur.

create trigger exams_audit_insert
  after insert on public.exams
  for each row execute function public.audit_row_change(
    'exam', 'name', 'exam_date', 'max_score', 'class_id', 'subject_id'
  );

create trigger exams_audit_update
  after update on public.exams
  for each row execute function public.audit_row_change(
    'exam', 'name', 'exam_date', 'max_score', 'class_id', 'subject_id'
  );

create trigger exam_results_audit_insert
  after insert on public.exam_results
  for each row execute function public.audit_row_change(
    'exam_result', 'score', 'student_id', 'exam_id'
  );

create trigger exam_results_audit_update
  after update on public.exam_results
  for each row execute function public.audit_row_change(
    'exam_result', 'score', 'student_id', 'exam_id'
  );
