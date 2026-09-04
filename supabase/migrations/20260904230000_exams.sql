-- v1.2-05 — Sınavlar, sonuçlar ve güvenli sıralama.
--
-- Bu dilim, RLS'in **tek başına çözemediği** ilk problemi taşıyor.
--
-- Soru 6'nın onaylı cevabı: _"Admin ve yetkili öğretmen, sorumlu oldukları
-- kapsamda öğrenci isimleriyle tam sıralamayı görebilecek. Öğrenci ve veli
-- yalnızca kendi/bağlı öğrencisinin sonucunu ve sırasını görecek; diğer
-- öğrencilerin kimlikleri anonim olacak."_
--
-- Dikkat: öğrenci **tüm sıralamayı** görmeli — kaçıncı olduğunu bilmesi için
-- kaç kişinin önünde olduğunu görmesi gerekiyor — ama diğer isimleri
-- görmemeli. RLS satır gizler; burada gizlenmesi gereken şey **aynı satırın
-- bazı sütunları**. Politikayla ifade edilemez.
--
-- Çözüm `platform_organization_stats` ile aynı kalıp: `SECURITY DEFINER` bir
-- fonksiyon, içeride yetkiyi kendisi çözüyor ve yetkisiz çağırana **veri değil
-- boş küme** dönüyor. Fark şu ki bu fonksiyon satır bazında maskeliyor: her
-- satır için "çağıran bu öğrenciyi görebilir mi" sorusu ayrı soruluyor ve
-- cevabı hayırsa isim ve kimlik `null` dönüyor, sıra ve puan duruyor.
--
-- Maskeleme sorusu yeni bir yetki kavramı getirmiyor — v1.2-01…04'te kurulmuş
-- dört kapsamın birleşimi: yönetici, öğrenciyi okutan öğretmen, öğrencinin
-- kendisi, öğrencinin velisi.

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  -- Opsiyonel: dolu = sınıf sınavı, boş = kurum geneli (deneme). Yoklamadaki
  -- `subject_id` ile aynı kalıp; dershanede deneme sınavı kurum genelidir ve
  -- sıralamanın anlamı da oradan gelir.
  class_id uuid,
  -- Opsiyonel: dolu = tek ders sınavı, boş = çok dersli deneme.
  subject_id uuid,
  name text not null,
  exam_date date not null,
  max_score numeric(6, 2),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_name_check check (
    char_length(trim(both from name)) >= 1
    and char_length(trim(both from name)) <= 160
  ),
  constraint exams_id_organization_key unique (id, organization_id),
  constraint exams_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint exams_subject_organization_fkey
    foreign key (subject_id, organization_id)
    references public.subjects (id, organization_id) on delete restrict
);

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  exam_id uuid not null,
  student_id uuid not null,
  -- Alt sınır YOK ve bu bilinçli: Türkiye'deki deneme sınavlarında net puan
  -- `doğru - yanlış/4` ile hesaplanır ve **negatif olabilir**. `check (score >= 0)`
  -- yazmak, gerçek bir sonucu veritabanına yazılamaz hâle getirirdi.
  score numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_results_exam_organization_fkey
    foreign key (exam_id, organization_id)
    references public.exams (id, organization_id) on delete restrict,
  constraint exam_results_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id) on delete restrict,
  constraint exam_results_exam_student_key unique (exam_id, student_id)
);

comment on table public.exams is
  'Sınav tanımı. class_id boşsa kurum geneli (deneme), subject_id boşsa çok dersli.';
comment on table public.exam_results is
  'Bir öğrencinin sınav sonucu. Sıralama için public.exam_ranking() kullanılır; tabloyu doğrudan okumak yalnızca görme yetkisi olan satırları verir.';
comment on column public.exam_results.score is
  'Net puan. Negatif olabilir (doğru - yanlış/4).';

create index exams_organization_idx on public.exams (organization_id, exam_date desc);
create index exams_class_idx on public.exams (class_id);
create index exams_subject_idx on public.exams (subject_id);
create index exam_results_exam_score_idx on public.exam_results (exam_id, score desc);
create index exam_results_student_idx on public.exam_results (student_id, created_at desc);
create index exam_results_organization_idx on public.exam_results (organization_id);

create unique index exams_organization_name_date_idx
  on public.exams (organization_id, name, exam_date) where archived_at is null;

create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

create trigger exam_results_set_updated_at
before update on public.exam_results
for each row execute function public.set_updated_at();

alter table public.exams enable row level security;
alter table public.exam_results enable row level security;

-- ---------------------------------------------------------------------------
-- Güvenli sıralama
-- ---------------------------------------------------------------------------
--
-- Yetkisiz çağırana **boş küme** döner, hata değil: sıralamayı görmeye hakkı
-- olmayan biri "bu sınav var ama göremiyorsun" bilgisini de almamalı.
--
-- Sıralamayı görme koşulu: çağıran sınavda **en az bir öğrenciyi görebiliyor**
-- olmalı. Yönetici hepsini görür; öğretmen okuttuğu öğrenciyi; öğrenci ve veli
-- kendisininkini. Sınava girmemiş ve orada kimseyi okutmayan biri hiçbir şey
-- görmez — puan dağılımı isimsiz bile olsa o kişiye ait bir bilgi değil.
--
-- `order by ... , s.ogrenci` bilinçli: eşit puanlıları isme göre sıralamak,
-- anonim satırların alfabetik yerini ele verirdi. UUID sıralaması bilgi
-- taşımaz.
create or replace function public.exam_ranking(target_exam_id uuid)
returns table (
  rank_position bigint,
  score numeric,
  student_id uuid,
  student_name text,
  is_own boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with sinav as (
    select exam.id, exam.organization_id
    from public.exams as exam
    where exam.id = target_exam_id
      and exam.archived_at is null
      and public.current_user_has_membership(exam.organization_id)
      and not public.current_user_must_change_password()
  ),
  satirlar as (
    select
      result.student_id as ogrenci,
      result.score as puan,
      rank() over (order by result.score desc) as sira,
      (
        public.current_user_owns_student_record(result.student_id)
        or public.current_user_guards_student(result.student_id)
      ) as kendi,
      (
        public.current_user_has_membership(
          sinav.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_student(result.student_id)
        or public.current_user_owns_student_record(result.student_id)
        or public.current_user_guards_student(result.student_id)
      ) as gorebilir
    from public.exam_results as result
    join sinav on sinav.id = result.exam_id
  )
  select
    satir.sira,
    satir.puan,
    case when satir.gorebilir then satir.ogrenci end,
    case when satir.gorebilir then ogrenci_kaydi.full_name end,
    satir.kendi
  from satirlar as satir
  join public.students as ogrenci_kaydi on ogrenci_kaydi.id = satir.ogrenci
  where exists (select 1 from satirlar as kontrol where kontrol.gorebilir)
  order by satir.sira, satir.ogrenci;
$$;

comment on function public.exam_ranking(uuid) is
  'Sınav sıralaması. Sıra ve puan herkese açık, kimlik yalnızca çağıranın görmeye yetkili olduğu öğrenciler için dolu. Yetkisiz çağırana boş küme döner.';

revoke all on function public.exam_ranking(uuid) from public, anon, authenticated;
grant execute on function public.exam_ranking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Politikalar
-- ---------------------------------------------------------------------------
--
-- **Sınav tanımı kurumun her üyesine açık.** Sınavın adı ve tarihi kişisel veri
-- değil; öğrencinin "12 Eylül'de deneme var" bilgisini görmesi gerekiyor.
-- Kişisel olan sonuçtur ve o `exam_results`'ta korunuyor.

create policy exams_select_member on public.exams
for select to authenticated
using (
  public.current_user_has_membership(organization_id)
  and not (select public.current_user_must_change_password())
);

-- Sınav açmak: yönetici her sınavı açar; öğretmen yalnızca **okuttuğu sınıfın**
-- sınavını açar. Kurum geneli sınav (`class_id is null`) yalnızca yöneticiye
-- ait — kurumun tamamını ilgilendiren bir işlem tek bir öğretmenin kararı
-- olmamalı.
create policy exams_insert_authorized on public.exams
for insert to authenticated
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
);

create policy exams_update_authorized on public.exams
for update to authenticated
using (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
)
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
);

-- Sonuç tablosuna DOĞRUDAN erişim, sıralama fonksiyonundan bağımsızdır ve
-- daha dardır: burada maskeleme yok, yalnızca görme yetkisi olan satırlar
-- geliyor. Sıralamayı isimsiz görmek isteyen `exam_ranking()` çağırır.
create policy exam_results_select_admin on public.exam_results
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy exam_results_select_teacher on public.exam_results
for select to authenticated
using (
  public.current_user_teaches_student(student_id)
  and not (select public.current_user_must_change_password())
);

create policy exam_results_select_student on public.exam_results
for select to authenticated
using (
  public.current_user_owns_student_record(student_id)
  and not (select public.current_user_must_change_password())
);

create policy exam_results_select_guardian on public.exam_results
for select to authenticated
using (
  public.current_user_guards_student(student_id)
  and not (select public.current_user_must_change_password())
);

create policy exam_results_insert_authorized on public.exam_results
for insert to authenticated
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_student(student_id)
  )
  and not (select public.current_user_must_change_password())
);

create policy exam_results_update_authorized on public.exam_results
for update to authenticated
using (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_student(student_id)
  )
  and not (select public.current_user_must_change_password())
)
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_student(student_id)
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- Sınav sonucu, sistemdeki en hassas veri: bir çocuğun akademik başarısı.
-- Desen aynı — DELETE yok, `organization_id` hiçbir UPDATE'te yok, yazma
-- sütunları sayılı.
revoke all on public.exams from anon, authenticated;
revoke all on public.exam_results from anon, authenticated;

grant select on public.exams to authenticated;
grant insert (organization_id, class_id, subject_id, name, exam_date, max_score)
  on public.exams to authenticated;
grant update (class_id, subject_id, name, exam_date, max_score, archived_at)
  on public.exams to authenticated;

grant select on public.exam_results to authenticated;
grant insert (organization_id, exam_id, student_id, score)
  on public.exam_results to authenticated;
grant update (score) on public.exam_results to authenticated;

grant all on public.exams to service_role;
grant all on public.exam_results to service_role;
