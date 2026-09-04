-- v1.2-02 — Sınıflar, dersler ve öğretmen atamaları.
--
-- Bu dilim, öğretmene sistemde **ilk kez gerçek bir kapsam** veriyor. v1.2-01
-- öğretmeni bilinçli olarak boşta bırakmıştı: kapsamı sınıf atamasından
-- gelecekti ve atama tablosu yoktu, dolayısıyla kapalı tarafta kalınmıştı.
-- Kapı burada açılıyor.
--
-- **Atama üyeliğe bağlanır, role değil.** `class_teachers.membership_id`
-- `organization_memberships`'e gider ve `role = 'teacher'` diye bir kısıt
-- YOKTUR. Bu bilinçli: "Ders vermek bir atama, rol değildir" kararı
-- (2026-08-25), küçük bir dershanenin sahibinin hem yönetip hem ders verdiği
-- gerçek durumdan çıktı. Rolü `admin` olan biri de ders verebilmeli ve bunun
-- için ikinci bir üyeliğe ihtiyaç duymamalı. FK'yi role kısıtlamak o kararı
-- veri düzeyinde delerdi.
--
-- **Rehber öğretmen ile ders veren öğretmen iki ayrı ilişkidir.** Rehberlik
-- bir sınıfta tek kişidir ve `classes.mentor_membership_id` sütununda yaşar —
-- "en fazla bir rehber" kuralı böylece sütunun kendisinden gelir, ayrıca
-- yazılması gereken bir kısıt olmaz. Ders vermek çoka-çoktur ve kendi
-- tablosunda yaşar. Arayüz de ikisini ayrı gösteriyor (`ClassGroup.mentor` ve
-- `ScheduleItem.teacher`); model ürünü takip ediyor.
--
-- **Dönem/akademik yıl tablosu yok.** Yeni öğretim yılı yeni `classes` satırı
-- açar, eskisi `archived_at` ile arşivlenir; `organizations` ve `branches` ile
-- aynı kalıp. Benzersizlik kısmi indeksle kurulduğu için "YKS 12-A" adı her yıl
-- yeniden kullanılabilir. Yoklama ve sınav kayıtları sınıf **satırına**
-- bağlanacağı için geçmiş karışmaz: geçen yılın 12-A'sı ayrı bir satırdır.

-- Bileşik yabancı anahtarların hedefi olabilmeleri için (id, organization_id)
-- ikilisi benzersiz olmalı. `branches` bunu en baştan taşıyordu
-- (`branches_id_organization_key`); aynı desen buraya da geliyor.
--
-- Neden gerekli: tek sütunlu bir `class_id` FK'si, BAŞKA bir kurumun sınıfını
-- kabul ederdi. Bileşik FK ile "aynı kuruma ait olmak" veri düzeyinde,
-- RLS'ten bağımsız olarak zorlanır.
alter table public.organization_memberships
  add constraint organization_memberships_id_organization_key
  unique (id, organization_id);

alter table public.students
  add constraint students_id_organization_key
  unique (id, organization_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_check check (
    char_length(trim(both from name)) >= 1
    and char_length(trim(both from name)) <= 80
  ),
  constraint subjects_id_organization_key unique (id, organization_id)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  branch_id uuid,
  name text not null,
  -- "YKS", "LGS", "Destek" gibi. Serbest metin: Türkiye'de program adları
  -- değişiyor ve enum, her değişiklikte migration gerektirirdi.
  program text,
  -- Sınıfın rehber öğretmeni. Opsiyonel: her sınıfın rehberi olmak zorunda
  -- değil ve kurum bunu kullanmayabilir.
  mentor_membership_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_name_check check (
    char_length(trim(both from name)) >= 1
    and char_length(trim(both from name)) <= 120
  ),
  constraint classes_id_organization_key unique (id, organization_id),
  constraint classes_branch_organization_fkey
    foreign key (branch_id, organization_id)
    references public.branches (id, organization_id) on delete restrict,
  constraint classes_mentor_organization_fkey
    foreign key (mentor_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  class_id uuid not null,
  student_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_enrollments_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint class_enrollments_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id) on delete restrict
);

create table public.class_teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  class_id uuid not null,
  membership_id uuid not null,
  -- Hangi ders. Opsiyonel değil: "bu sınıfa ders veriyor ama hangi dersi
  -- bilinmiyor" anlamlı bir kayıt değil ve ders programı (v1.2-07) buna
  -- dayanacak.
  subject_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_teachers_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint class_teachers_membership_organization_fkey
    foreign key (membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict,
  constraint class_teachers_subject_organization_fkey
    foreign key (subject_id, organization_id)
    references public.subjects (id, organization_id) on delete restrict
);

comment on table public.subjects is
  'Kurumun ders kataloğu. Kuruma aittir; ortak katalog tenant sınırını delerdi.';
comment on table public.classes is
  'Bir öğretim yılına ait sınıf/grup. Yeni yıl yeni satır açar, eskisi arşivlenir.';
comment on table public.class_enrollments is
  'Öğrencinin sınıfa kaydı.';
comment on table public.class_teachers is
  'Öğretmen atamasi: kim, hangi sınıfa, hangi dersi. Üyeliğe bağlanır; rolü admin olan biri de atanabilir.';
comment on column public.classes.mentor_membership_id is
  'Sınıfın rehber öğretmeni. Ders vermekten AYRI bir ilişkidir; ders atamaları class_teachers tablosundadır.';

create index subjects_organization_idx on public.subjects (organization_id, archived_at);
create index classes_organization_idx on public.classes (organization_id, archived_at);
create index classes_branch_idx on public.classes (branch_id, organization_id);
create index classes_mentor_idx on public.classes (mentor_membership_id);
create index class_enrollments_class_idx on public.class_enrollments (class_id, archived_at);
create index class_enrollments_student_idx on public.class_enrollments (student_id, archived_at);
create index class_enrollments_organization_idx on public.class_enrollments (organization_id);
create index class_teachers_class_idx on public.class_teachers (class_id, archived_at);
create index class_teachers_membership_idx on public.class_teachers (membership_id, archived_at);
create index class_teachers_subject_idx on public.class_teachers (subject_id);
create index class_teachers_organization_idx on public.class_teachers (organization_id);

-- Benzersizlik yalnızca ARŞİVLENMEMİŞ satırlarda geçerli. Kısmi olmasının
-- sebebi dönem tablosunun olmaması: "YKS 12-A" adı her öğretim yılında yeniden
-- kullanılabilmeli, ama aynı anda iki tane olmamalı.
create unique index subjects_organization_name_idx
  on public.subjects (organization_id, name) where archived_at is null;
create unique index classes_organization_name_idx
  on public.classes (organization_id, name) where archived_at is null;
create unique index class_enrollments_class_student_idx
  on public.class_enrollments (class_id, student_id) where archived_at is null;
create unique index class_teachers_class_membership_subject_idx
  on public.class_teachers (class_id, membership_id, subject_id) where archived_at is null;

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

create trigger class_enrollments_set_updated_at
before update on public.class_enrollments
for each row execute function public.set_updated_at();

create trigger class_teachers_set_updated_at
before update on public.class_teachers
for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.class_teachers enable row level security;

-- ---------------------------------------------------------------------------
-- Kapsam yardımcıları
-- ---------------------------------------------------------------------------
--
-- Öğretmenin kapsamı üç tabloyu dolaşarak bulunuyor: atama → sınıf → kayıt →
-- öğrenci. Bu zinciri politikanın içine gömmek İKİ ayrı soruna yol açardı.
--
-- Birincisi özyineleme: RLS politikasının içinden RLS'li bir tabloyu sorgulamak,
-- o tablonun politikasını da tetikler ve politikalar birbirine bakarsa sorgu
-- sonsuza girer. `SECURITY DEFINER` fonksiyon bu zinciri kırar.
--
-- İkincisi tekrar: aynı zincir dört politikada yeniden yazılırdı ve biri
-- güncellenip diğerleri unutulurdu (K-06).
--
-- `current_user_administers_person` ile aynı kalıp: STABLE, SECURITY DEFINER,
-- `search_path = ''`, ve içeride `auth.uid()` kullandığı için çağıran yalnızca
-- KENDİ kapsamını sorgulayabilir — fonksiyonu `authenticated`'a açmak veri
-- sızdırmaz, yalnızca "ben bu sınıfa giriyor muyum" sorusunu cevaplar.

-- Rehber öğretmenlik de "ders veriyor" sayılır: sınıfın rehberi, o sınıfın
-- öğrencilerini görebilmeli. Ayrı bir yetki kavramı yaratmak yerine kapsam
-- sorusu tek yerde birleştiriliyor.
create or replace function public.current_user_teaches_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_teachers as assignment
    join public.organization_memberships as membership
      on membership.id = assignment.membership_id
    where assignment.class_id = target_class_id
      and assignment.archived_at is null
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
  or exists (
    select 1
    from public.classes as class_row
    join public.organization_memberships as membership
      on membership.id = class_row.mentor_membership_id
    where class_row.id = target_class_id
      and class_row.archived_at is null
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function public.current_user_attends_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_enrollments as enrollment
    join public.students as student
      on student.id = enrollment.student_id
    where enrollment.class_id = target_class_id
      and enrollment.archived_at is null
      and student.auth_user_id = (select auth.uid())
  );
$$;

create or replace function public.current_user_teaches_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_enrollments as enrollment
    join public.classes as class_row
      on class_row.id = enrollment.class_id
    where enrollment.student_id = target_student_id
      and enrollment.archived_at is null
      and class_row.archived_at is null
      and public.current_user_teaches_class(class_row.id)
  );
$$;

comment on function public.current_user_teaches_class(uuid) is
  'Çağıran bu sınıfa ders veriyor veya rehberi mi. Yalnızca çağıranın kendi kapsamını döndürür.';
comment on function public.current_user_attends_class(uuid) is
  'Çağıranın öğrenci kaydı bu sınıfa kayıtlı mı. Yalnızca çağıranın kendi kapsamını döndürür.';
comment on function public.current_user_teaches_student(uuid) is
  'Çağıran bu öğrencinin girdiği bir sınıfa ders veriyor mu. Yalnızca çağıranın kendi kapsamını döndürür.';

revoke all on function public.current_user_teaches_class(uuid) from public, anon, authenticated;
revoke all on function public.current_user_attends_class(uuid) from public, anon, authenticated;
revoke all on function public.current_user_teaches_student(uuid) from public, anon, authenticated;

grant execute on function public.current_user_teaches_class(uuid) to authenticated;
grant execute on function public.current_user_attends_class(uuid) to authenticated;
grant execute on function public.current_user_teaches_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS politikaları
-- ---------------------------------------------------------------------------
--
-- Kilit koşulu (`not current_user_must_change_password()`) v1.2-01'de kural
-- hâline geldi ve burada da her politikada var.
--
-- **Veli hâlâ hiçbir şey göremiyor.** Kapsamı `student_guardians` bağından
-- gelecek ve o tablo v1.2-03'te. v1.2-01'de öğretmen için yaptığımızın aynısı:
-- kapsamı olmayan role geçici olarak geniş erişim vermek, sonra daraltmayı
-- hatırlamayı gerektirir; hatırlanmazsa açık kalıcı olur (K-04).

create policy subjects_select_member on public.subjects
for select to authenticated
using (
  public.current_user_has_membership(organization_id)
  and not (select public.current_user_must_change_password())
);

create policy subjects_insert_admin on public.subjects
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy subjects_update_admin on public.subjects
for update to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy classes_select_admin on public.classes
for select to authenticated
using (
  public.current_user_has_membership(organization_id, branch_id, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy classes_select_teacher on public.classes
for select to authenticated
using (
  public.current_user_teaches_class(id)
  and not (select public.current_user_must_change_password())
);

create policy classes_select_student on public.classes
for select to authenticated
using (
  public.current_user_attends_class(id)
  and not (select public.current_user_must_change_password())
);

create policy classes_insert_admin on public.classes
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, branch_id, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy classes_update_admin on public.classes
for update to authenticated
using (
  public.current_user_has_membership(organization_id, branch_id, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, branch_id, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_select_admin on public.class_enrollments
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_select_teacher on public.class_enrollments
for select to authenticated
using (
  public.current_user_teaches_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_select_student on public.class_enrollments
for select to authenticated
using (
  public.current_user_attends_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_insert_admin on public.class_enrollments
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_update_admin on public.class_enrollments
for update to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy class_teachers_select_admin on public.class_teachers
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

-- Öğretmen kendi atamalarını görür. Meslektaşlarının atamalarını görmesi bu
-- dilimde gerekmiyor; gerektiğinde açmak, açığı sonradan kapatmaktan kolaydır.
create policy class_teachers_select_self on public.class_teachers
for select to authenticated
using (
  exists (
    select 1 from public.organization_memberships as membership
    where membership.id = class_teachers.membership_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
  and not (select public.current_user_must_change_password())
);

create policy class_teachers_insert_admin on public.class_teachers
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy class_teachers_update_admin on public.class_teachers
for update to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- v1.2-01'in öğrenci politikasının genişlemesi (K-11)
-- ---------------------------------------------------------------------------
--
-- v1.2-01 şunu yazmıştı: "Öğretmen ve veli bu dilimde HİÇBİR ŞEY göremez.
-- Öğretmenin kapsamı sınıf atamasından gelir, atama tablosu v1.2-02'de."
-- O cümle bu satırla karşılığını buluyor. Kayıt `ROADMAP.md` ve
-- `DECISION_LOG.md`'ye de düşüldü.
--
-- Öğretmen öğrenciyi yalnızca OKUR. Yazma yetkisi verilmiyor: "Öğretmen
-- öğrenci ekleyemez" (2026-08-29 kararı, ROADMAP v1.4-01).
create policy students_select_teacher on public.students
for select to authenticated
using (
  public.current_user_teaches_student(id)
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- v1.2-01'de kurulan desen: okuma açık, yazma sütun düzeyinde kesilmiş,
-- DELETE hiç yok. `organization_id` hiçbir UPDATE yetkisinde değil — kaydı
-- başka kuruma taşımak bir güncelleme değil, tenant sınırını geçmektir.
--
-- Kayıt ve atama satırlarında UPDATE yalnızca `archived_at`: bir öğrenciyi
-- sınıftan sınıfa "taşımak" yerine kaydı arşivleyip yenisini açmak, yoklama ve
-- sınav geçmişinin hangi sınıfa ait olduğunu bozmaz.
revoke all on public.subjects from anon, authenticated;
revoke all on public.classes from anon, authenticated;
revoke all on public.class_enrollments from anon, authenticated;
revoke all on public.class_teachers from anon, authenticated;

grant select on public.subjects to authenticated;
grant insert (organization_id, name) on public.subjects to authenticated;
grant update (name, archived_at) on public.subjects to authenticated;

grant select on public.classes to authenticated;
grant insert (organization_id, branch_id, name, program, mentor_membership_id)
  on public.classes to authenticated;
grant update (name, program, branch_id, mentor_membership_id, archived_at)
  on public.classes to authenticated;

grant select on public.class_enrollments to authenticated;
grant insert (organization_id, class_id, student_id) on public.class_enrollments to authenticated;
grant update (archived_at) on public.class_enrollments to authenticated;

grant select on public.class_teachers to authenticated;
grant insert (organization_id, class_id, membership_id, subject_id)
  on public.class_teachers to authenticated;
grant update (archived_at) on public.class_teachers to authenticated;

grant all on public.subjects to service_role;
grant all on public.classes to service_role;
grant all on public.class_enrollments to service_role;
grant all on public.class_teachers to service_role;
