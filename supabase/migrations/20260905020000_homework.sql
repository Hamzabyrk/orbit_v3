-- v1.2-08 — Ödevler.
--
-- ⚠️ **Bu dilimin beyan ettiği varsayım YANLIŞ çıktı ve kapsama dahil edildi.**
--
-- `ROADMAP.md` §4.6, v1.2-08'in dayandığı varsayımı şöyle yazmıştı:
-- "`HomeworkCreateDialog` fail-closed çalışıyor." Açılışta koda bakıldı ve
-- tersi bulundu: diyalog üretimde `toast.success("Ödev oluşturuldu")` diyor,
-- kaydı yalnızca React state'ine ekliyor ve ilk sayfa yenilemesinde kayıt
-- kayboluyordu. Üretimde `writeDemoData` no-op, `initialHomework` boş dizi.
--
-- Karşılaştırma net: `AttendancePage` aynı durumda doğruyu söylüyor ("şu an
-- bir kayıt oluşturulmadı"). Ödev diyaloğu söylemiyordu. #131 ve #134 ile aynı
-- aile — ekran, arkasında karşılığı olmayan bir şeyi olmuş gibi gösteriyor.
--
-- K-10 gereği bu bir engel değil kapsamın parçası: diyalog aynı PR'da
-- düzeltildi ve varsayım kaydı ROADMAP'te ileriye doğru düzeltildi.
--
-- **Ödev vermek yürütmedir, planlama değil.** v1.2-07'de kurulan ayrım burada
-- da geçerli: programı kurum kurar (paylaşılan kaynak bağlar), ödevi öğretmen
-- verir (yalnızca kendi dersini bağlar). Bu yüzden yazma yetkisi yoklamadaki
-- gibi atanmış öğretmene açık.

create table public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  class_id uuid not null,
  -- Opsiyonel: "genel tekrar" gibi tek derse bağlanmayan ödevler var.
  subject_id uuid,
  title text not null,
  description text,
  -- Ödevi kimin verdiği. İstemci bu sütunu YAZAMAZ; trigger çağıranın
  -- üyeliğinden dolduruyor — yoklamadaki `recorded_by_membership_id` ile aynı
  -- gerekçe: yazılabilir olsaydı bir öğretmen ödevi başkasının verdiğini
  -- iddia edebilirdi.
  assigned_by_membership_id uuid,
  assigned_on date not null default current_date,
  due_date date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_assignments_title_check check (
    char_length(trim(both from title)) >= 1
    and char_length(trim(both from title)) <= 200
  ),
  -- Teslim tarihi verildiği günden önce olamaz. Aynı gün olabilir: "bugün
  -- akşama kadar" gerçek bir ödevdir.
  constraint homework_assignments_due_check check (due_date >= assigned_on),
  constraint homework_assignments_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint homework_assignments_subject_organization_fkey
    foreign key (subject_id, organization_id)
    references public.subjects (id, organization_id) on delete restrict,
  constraint homework_assignments_assigner_organization_fkey
    foreign key (assigned_by_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

comment on table public.homework_assignments is
  'Sınıfa verilen ödev. Öğrenci bazında teslim takibi kapsam dışı; ödev sınıfa verilir.';
comment on column public.homework_assignments.assigned_by_membership_id is
  'Ödevi veren üyelik. Trigger doldurur; istemciye yazma yetkisi verilmez.';

create index homework_assignments_class_idx
  on public.homework_assignments (class_id, due_date desc);
create index homework_assignments_organization_idx
  on public.homework_assignments (organization_id, due_date desc);
create index homework_assignments_assigner_idx
  on public.homework_assignments (assigned_by_membership_id);
create index homework_assignments_subject_idx
  on public.homework_assignments (subject_id);

create trigger homework_assignments_set_updated_at
before update on public.homework_assignments
for each row execute function public.set_updated_at();

-- Yoklamadaki `set_attendance_recorder` ile aynı işi başka bir sütun için
-- yapıyor. Tek bir genel fonksiyona (sütun adını `tg_argv`'den alan, `jsonb`
-- ile alan atayan) indirgemek mümkündü ve BİLİNÇLİ OLARAK YAPILMADI: bu kod
-- `SECURITY DEFINER` ve okunabilirliği bir güvenlik özelliği. Sekiz satırlık
-- açık bir fonksiyon, dinamik alan atayan bir fonksiyondan daha kolay
-- denetlenir. Üçüncü bir kopya gerekirse genelleştirme o zaman yapılır.
create or replace function public.set_homework_assigner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_by_membership_id is null and (select auth.uid()) is not null then
    select membership.id
    into new.assigned_by_membership_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = new.organization_id
      and membership.status = 'active';
  end if;

  return new;
end;
$$;

comment on function public.set_homework_assigner() is
  'Ödevi veren üyeliği çağıranın kimliğinden doldurur; istemcinin iddiasına güvenmez.';

revoke all on function public.set_homework_assigner() from public, anon, authenticated;

create trigger homework_assignments_set_assigner
before insert on public.homework_assignments
for each row execute function public.set_homework_assigner();

alter table public.homework_assignments enable row level security;

-- ---------------------------------------------------------------------------
-- Politikalar
-- ---------------------------------------------------------------------------
--
-- Yazma, yoklamadaki kalıbın aynısı: yönetici veya sınıfa **atanmış** öğretmen.
-- Rolü `teacher` olup o sınıfa atanmamış biri ödev veremez.

create policy homework_assignments_select_admin on public.homework_assignments
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy homework_assignments_select_teacher on public.homework_assignments
for select to authenticated
using (
  public.current_user_teaches_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy homework_assignments_select_student on public.homework_assignments
for select to authenticated
using (
  public.current_user_attends_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy homework_assignments_select_guardian on public.homework_assignments
for select to authenticated
using (
  public.current_user_guards_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy homework_assignments_insert_authorized on public.homework_assignments
for insert to authenticated
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or public.current_user_teaches_class(class_id)
  )
  and not (select public.current_user_must_change_password())
);

create policy homework_assignments_update_authorized on public.homework_assignments
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
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
revoke all on public.homework_assignments from anon, authenticated;

grant select on public.homework_assignments to authenticated;
grant insert (organization_id, class_id, subject_id, title, description,
              assigned_on, due_date)
  on public.homework_assignments to authenticated;
grant update (subject_id, title, description, due_date, archived_at)
  on public.homework_assignments to authenticated;

grant all on public.homework_assignments to service_role;
