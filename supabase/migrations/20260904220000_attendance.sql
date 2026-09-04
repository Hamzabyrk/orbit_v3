-- v1.2-04 — Yoklama.
--
-- Bu dilim iki bakımdan öncekilerden farklı.
--
-- **Birincisi: kapsam kurmuyor, kurulmuş kapsamın üzerine yazıyor.** v1.2-01…03
-- dört rolün de kapsamını tanımladı; burada yeni bir "kim kimi görür" sorusu
-- yok, mevcut yardımcılar yeniden kullanılıyor. Yoklama kaydını yönetici, dersi
-- veren öğretmen, öğrencinin kendisi ve velisi görür — dördü de zaten tanımlı
-- kapsamlardan.
--
-- **İkincisi: öğretmen ilk kez YAZIYOR.** Bugüne kadar öğretmen her tabloda
-- salt okurdu. Yoklama, öğretmenin kurumdaki asıl işi olduğu için burası doğal
-- sınır: dersini verdiği sınıfın yoklamasını alır, başka hiçbir şeye
-- dokunamaz. Yazma yetkisi role değil **atamaya** bağlı — rolü `teacher` olup
-- o sınıfa atanmamış biri yoklama alamaz.
--
-- **Ders yoklaması ve günlük yoklama birlikte destekleniyor.** `subject_id`
-- doluysa ders yoklamasıdır (arayüzün bugünkü hâli: "TYT Matematik · YKS 12-A ·
-- 15 Ağustos, 09:00"), boşsa günlük yoklamadır. Kurum kendi çalışma biçimini
-- seçer; şema ikisini de aynı tabloda taşır ve benzersizlik iki ayrı kısmi
-- indeksle korunur.

create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');

comment on type public.attendance_status is
  'Yoklama durumu. Arayüzdeki Türkçe karşılıkları (Katıldı/Geç kaldı/Gelmedi/İzinli) istemcide eşlenir; veritabanı değerleri diğer enum''lar gibi İngilizce tanımlayıcıdır.';

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  class_id uuid not null,
  -- Opsiyonel: dolu = ders yoklaması, boş = günlük yoklama.
  subject_id uuid,
  session_date date not null,
  -- Ders saati. Aynı sınıfın aynı dersi bir günde iki kez işlenebilir; saat
  -- bu iki oturumu ayırır.
  starts_at time,
  -- Yoklamayı kimin aldığı. İstemci bu sütunu YAZAMAZ (yetkisi yok); trigger
  -- çağıranın üyeliğinden dolduruyor. Yazılabilir olsaydı bir öğretmen
  -- yoklamayı başkasının aldığını iddia edebilirdi ve izlenebilirliğin anlamı
  -- kalmazdı.
  recorded_by_membership_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_id_organization_key unique (id, organization_id),
  constraint attendance_sessions_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint attendance_sessions_subject_organization_fkey
    foreign key (subject_id, organization_id)
    references public.subjects (id, organization_id) on delete restrict,
  constraint attendance_sessions_recorder_organization_fkey
    foreign key (recorded_by_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  session_id uuid not null,
  student_id uuid not null,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_session_organization_fkey
    foreign key (session_id, organization_id)
    references public.attendance_sessions (id, organization_id) on delete restrict,
  constraint attendance_records_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id) on delete restrict,
  -- Bir öğrencinin bir oturumda tek kaydı olur. Kısmi değil tam benzersizlik:
  -- kaydın arşivlenmesi diye bir şey yok, yanlış girilen durum düzeltilir.
  constraint attendance_records_session_student_key unique (session_id, student_id)
);

comment on table public.attendance_sessions is
  'Bir yoklama oturumu. subject_id doluysa ders yoklaması, boşsa günlük yoklama.';
comment on table public.attendance_records is
  'Oturumdaki bir öğrencinin durumu.';
comment on column public.attendance_sessions.recorded_by_membership_id is
  'Yoklamayı alan üyelik. Trigger doldurur; istemciye yazma yetkisi verilmez.';

create index attendance_sessions_class_date_idx
  on public.attendance_sessions (class_id, session_date desc);
create index attendance_sessions_organization_idx
  on public.attendance_sessions (organization_id, session_date desc);
create index attendance_sessions_subject_idx
  on public.attendance_sessions (subject_id);
create index attendance_sessions_recorder_idx
  on public.attendance_sessions (recorded_by_membership_id);
create index attendance_records_session_idx
  on public.attendance_records (session_id);
create index attendance_records_student_idx
  on public.attendance_records (student_id, created_at desc);
create index attendance_records_organization_idx
  on public.attendance_records (organization_id);

-- Aynı yoklama iki kez açılamaz. İki ayrı indeks gerekiyor çünkü `subject_id`
-- opsiyonel: tek indekste NULL'lar birbirine eşit sayılmadığı için günlük
-- yoklama sınırsız kez açılabilirdi.
--
-- `coalesce(starts_at, '00:00')` saatsiz oturumları tek bir değere indirger;
-- aksi halde saati girilmemiş iki oturum da birbirinden farklı sayılırdı.
create unique index attendance_sessions_lesson_idx
  on public.attendance_sessions
     (class_id, subject_id, session_date, coalesce(starts_at, '00:00'::time))
  where subject_id is not null and archived_at is null;

create unique index attendance_sessions_daily_idx
  on public.attendance_sessions
     (class_id, session_date, coalesce(starts_at, '00:00'::time))
  where subject_id is null and archived_at is null;

create trigger attendance_sessions_set_updated_at
before update on public.attendance_sessions
for each row execute function public.set_updated_at();

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

-- Yoklamayı kimin aldığı, istemcinin söylediği değil oturumun sahibi olan
-- kimlikten türetiliyor. `service_role` üzerinden gelen bir yazma (ileride
-- toplu aktarım) `auth.uid()` taşımaz; o durumda sütun boş kalır ve zorlanmaz.
create or replace function public.set_attendance_recorder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recorded_by_membership_id is null and (select auth.uid()) is not null then
    select membership.id
    into new.recorded_by_membership_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = new.organization_id
      and membership.status = 'active';
  end if;

  return new;
end;
$$;

comment on function public.set_attendance_recorder() is
  'Yoklamayı alan üyeliği çağıranın kimliğinden doldurur; istemcinin iddiasına güvenmez.';

revoke all on function public.set_attendance_recorder() from public, anon, authenticated;

create trigger attendance_sessions_set_recorder
before insert on public.attendance_sessions
for each row execute function public.set_attendance_recorder();

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- ---------------------------------------------------------------------------
-- Kapsam yardımcıları
-- ---------------------------------------------------------------------------

-- Öğrencinin kendisi. v1.2-01 ve v1.2-02'de bu kontrol doğrudan `auth_user_id`
-- sütununa bakılarak yapılıyordu çünkü sütun oradaydı; `attendance_records`'ta
-- yok, bu yüzden aynı soru bir fonksiyona taşınıyor. v1.2-05'ten itibaren sınav
-- sonucu gibi öğrenciye bağlı her tablo bunu yeniden kullanacak.
create or replace function public.current_user_owns_student_record(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students as student
    where student.id = target_student_id
      and student.auth_user_id = (select auth.uid())
  );
$$;

-- Yoklama YAZMA yetkisi. Okuma kapsamından daha dar olduğu için ayrı bir
-- fonksiyon: bir öğretmen öğrencisinin bütün yoklamalarını OKUYABİLİR (devamsızlık
-- örüntüsünü görmesi gerekir), ama yalnızca kendi dersinin oturumuna YAZABİLİR.
create or replace function public.current_user_can_record_attendance(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_sessions as session_row
    where session_row.id = target_session_id
      and session_row.archived_at is null
      and (
        public.current_user_has_membership(
          session_row.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_class(session_row.class_id)
      )
  );
$$;

comment on function public.current_user_owns_student_record(uuid) is
  'Çağıranın giriş hesabı bu öğrenci kaydına mı bağlı. Yalnızca çağıranın kendi kapsamını döndürür.';
comment on function public.current_user_can_record_attendance(uuid) is
  'Çağıran bu oturuma yoklama yazabilir mi: kurum yöneticisi veya sınıfın atanmış öğretmeni.';

revoke all on function public.current_user_owns_student_record(uuid) from public, anon, authenticated;
revoke all on function public.current_user_can_record_attendance(uuid) from public, anon, authenticated;

grant execute on function public.current_user_owns_student_record(uuid) to authenticated;
grant execute on function public.current_user_can_record_attendance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Oturum politikaları
-- ---------------------------------------------------------------------------

create policy attendance_sessions_select_admin on public.attendance_sessions
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy attendance_sessions_select_teacher on public.attendance_sessions
for select to authenticated
using (
  public.current_user_teaches_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_sessions_select_student on public.attendance_sessions
for select to authenticated
using (
  public.current_user_attends_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_sessions_select_guardian on public.attendance_sessions
for select to authenticated
using (
  public.current_user_guards_class(class_id)
  and not (select public.current_user_must_change_password())
);

-- **Öğretmenin ilk yazma yetkisi.** Rolüne değil atamasına bağlı: rolü
-- `teacher` olup bu sınıfa atanmamış biri oturum açamaz, rolü `admin` olup
-- atanmış biri açabilir.
create policy attendance_sessions_insert_recorder on public.attendance_sessions
for insert to authenticated
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_class(class_id)
  )
  and not (select public.current_user_must_change_password())
);

create policy attendance_sessions_update_recorder on public.attendance_sessions
for update to authenticated
using (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_class(class_id)
  )
  and not (select public.current_user_must_change_password())
)
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_class(class_id)
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Kayıt politikaları
-- ---------------------------------------------------------------------------
--
-- Okuma öğrenciye, yazma oturuma bağlanıyor ve bu asimetri bilinçli.
-- Öğretmen, dersini verdiği öğrencinin bütün yoklama geçmişini görebilmeli —
-- devamsızlık bir örüntüdür ve tek derse bakarak anlaşılmaz. Ama yazarken
-- yalnızca kendi oturumuna yazabilir.

create policy attendance_records_select_admin on public.attendance_records
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy attendance_records_select_teacher on public.attendance_records
for select to authenticated
using (
  public.current_user_teaches_student(student_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_records_select_student on public.attendance_records
for select to authenticated
using (
  public.current_user_owns_student_record(student_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_records_select_guardian on public.attendance_records
for select to authenticated
using (
  public.current_user_guards_student(student_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_records_insert_recorder on public.attendance_records
for insert to authenticated
with check (
  public.current_user_can_record_attendance(session_id)
  and not (select public.current_user_must_change_password())
);

create policy attendance_records_update_recorder on public.attendance_records
for update to authenticated
using (
  public.current_user_can_record_attendance(session_id)
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_can_record_attendance(session_id)
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- `recorded_by_membership_id` hiçbir yazma yetkisinde YOK — trigger dolduruyor.
-- `organization_id` yine hiçbir UPDATE yetkisinde yok. DELETE hiç yok:
-- yanlış açılmış bir oturum arşivlenir, yanlış girilmiş bir durum düzeltilir.
--
-- **Geçmişe dönük düzeltme kısıtlanmadı** ve bu bilinçli. Tek yöneticili küçük
-- bir kurumda dünkü yoklamayı düzeltecek başka kimse olmayabilir; kısıtlamak
-- sistemi kullanılamaz hâle getirir. Karşılığı erişim kısıtı değil
-- **izlenebilirlik**tir (`DECISION_LOG` 2026-08-25) ve denetim kaydı yazma işi
-- v1.4'te CRUD akışlarıyla birlikte gelir. `recorded_by_membership_id` o
-- izlenebilirliğin veri tarafındaki ilk parçasıdır.
revoke all on public.attendance_sessions from anon, authenticated;
revoke all on public.attendance_records from anon, authenticated;

grant select on public.attendance_sessions to authenticated;
grant insert (organization_id, class_id, subject_id, session_date, starts_at)
  on public.attendance_sessions to authenticated;
grant update (subject_id, session_date, starts_at, archived_at)
  on public.attendance_sessions to authenticated;

grant select on public.attendance_records to authenticated;
grant insert (organization_id, session_id, student_id, status)
  on public.attendance_records to authenticated;
grant update (status) on public.attendance_records to authenticated;

grant all on public.attendance_sessions to service_role;
grant all on public.attendance_records to service_role;
