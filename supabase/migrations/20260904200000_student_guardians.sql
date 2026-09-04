-- v1.2-03 — Veli–öğrenci bağı.
--
-- Bu dilim, sistemde kapsamı hâlâ tamamen boş kalan **son rolü** dolduruyor.
-- v1.2-01 velinin hiçbir öğrenciyi göremediğini yazmış ve sebebini de yazmıştı:
-- kapsamı bağlantıdan gelecekti, bağlantı tablosu yoktu. v1.2-02 aynı cümleyi
-- sınıflar için tekrarladı. Tablo burada geliyor.
--
-- **Rol ile kapsamın ayrımı burada en görünür hâlini alıyor.** `parent` bir rol
-- OLARAK KALIR — hangi panelin açılacağını o belirler. Ama hangi öğrencinin
-- görüleceğini rol DEĞİL, `student_guardians` bağı belirler. Rolü `parent` olup
-- hiçbir öğrenciye bağlı olmayan bir hesap hiçbir şey göremez, ve bu doğrudur:
-- rol bir kapı, bağlantı bir anahtar (`DECISION_LOG` 2026-08-25).
--
-- **Öğrencinin hesabı olmayabilir ve asıl senaryo budur.** Soru 4'ün onaylı
-- cevabı: "Öğrencinin hesabı yoksa bağlı veli kendi hesabından yalnızca izin
-- verilen öğrenci verisini görecek." Bağ tablosu `students`'a gider,
-- `auth.users`'a değil — çünkü bağlanan şey öğrencinin **kaydı**, hesabı değil.

-- `students`'a v1.2-02'de eklenmişti; `guardians` bileşik FK'lere hedef
-- olabilmek için aynı kısıta ihtiyaç duyuyor.
alter table public.guardians
  add constraint guardians_id_organization_key
  unique (id, organization_id);

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  student_id uuid not null,
  guardian_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Bileşik FK'ler: öğrenci ve veli AYNI kuruma ait olmak zorunda. Tek sütunlu
  -- FK'ler başka bir kurumun velisini bir öğrenciye bağlayabilirdi ve bu,
  -- tenant sınırını RLS'in hiç göremeyeceği bir yerden delerdi.
  constraint student_guardians_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id) on delete restrict,
  constraint student_guardians_guardian_organization_fkey
    foreign key (guardian_id, organization_id)
    references public.guardians (id, organization_id) on delete restrict
);

comment on table public.student_guardians is
  'Veli–öğrenci bağı. Velinin kapsamı bu tablodan gelir; rolü değil bu bağ belirler kimi göreceğini.';

create index student_guardians_student_idx
  on public.student_guardians (student_id, archived_at);
create index student_guardians_guardian_idx
  on public.student_guardians (guardian_id, archived_at);
create index student_guardians_organization_idx
  on public.student_guardians (organization_id);

-- Bir veli bir öğrenciye bir kez bağlanır. Kısmi: bağ koparılıp (arşivlenip)
-- sonra yeniden kurulabilmeli — velayet değişiklikleri gerçek bir durumdur.
create unique index student_guardians_student_guardian_idx
  on public.student_guardians (student_id, guardian_id) where archived_at is null;

create trigger student_guardians_set_updated_at
before update on public.student_guardians
for each row execute function public.set_updated_at();

alter table public.student_guardians enable row level security;

-- ---------------------------------------------------------------------------
-- Kapsam yardımcıları
-- ---------------------------------------------------------------------------
--
-- v1.2-02'deki öğretmen yardımcılarıyla aynı kalıp: STABLE, SECURITY DEFINER,
-- `search_path = ''`, ve içeride `auth.uid()` kullandıkları için çağıran
-- yalnızca KENDİ kapsamını sorgulayabilir.
--
-- `archived_at is null` koşulu hem bağda hem veli kaydında aranıyor: arşivlenmiş
-- bir veli kaydı üzerinden erişim, kapatıldı sanılan bir kapının açık kalması
-- demek olurdu.

create or replace function public.current_user_guards_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_guardians as link
    join public.guardians as guardian
      on guardian.id = link.guardian_id
    where link.student_id = target_student_id
      and link.archived_at is null
      and guardian.archived_at is null
      and guardian.auth_user_id = (select auth.uid())
  );
$$;

create or replace function public.current_user_guards_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_enrollments as enrollment
    where enrollment.class_id = target_class_id
      and enrollment.archived_at is null
      and public.current_user_guards_student(enrollment.student_id)
  );
$$;

comment on function public.current_user_guards_student(uuid) is
  'Çağıran bu öğrencinin velisi mi. Yalnızca çağıranın kendi kapsamını döndürür.';
comment on function public.current_user_guards_class(uuid) is
  'Çağıranın velisi olduğu bir öğrenci bu sınıfa kayıtlı mı. Yalnızca çağıranın kendi kapsamını döndürür.';

revoke all on function public.current_user_guards_student(uuid) from public, anon, authenticated;
revoke all on function public.current_user_guards_class(uuid) from public, anon, authenticated;

grant execute on function public.current_user_guards_student(uuid) to authenticated;
grant execute on function public.current_user_guards_class(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Bağ tablosunun politikaları
-- ---------------------------------------------------------------------------

create policy student_guardians_select_admin on public.student_guardians
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

-- Veli yalnızca KENDİ bağlarını görür. Aynı öğrencinin diğer velisini (örneğin
-- ayrı yaşayan diğer ebeveyni) görmez: bu bilgi ona ait değil ve velayet
-- durumlarında zararlı olabilir.
create policy student_guardians_select_guardian on public.student_guardians
for select to authenticated
using (
  exists (
    select 1 from public.guardians as guardian
    where guardian.id = student_guardians.guardian_id
      and guardian.auth_user_id = (select auth.uid())
      and guardian.archived_at is null
  )
  and not (select public.current_user_must_change_password())
);

create policy student_guardians_insert_admin on public.student_guardians
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy student_guardians_update_admin on public.student_guardians
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
-- v1.2-01 ve v1.2-02'nin açık bıraktığı yerler kapanıyor (K-11)
-- ---------------------------------------------------------------------------
--
-- v1.2-01: "Öğretmen ve veli bu dilimde HİÇBİR ŞEY göremez." Öğretmen yarısı
-- v1.2-02'de kapandı; veli yarısı burada kapanıyor.
-- v1.2-02: "Veli hâlâ hiçbir şey göremiyor; kapsamı v1.2-03'te."
--
-- Veli **yalnızca okur.** Yazma yetkisi hiçbir tabloda yok: veli ne öğrenci
-- kaydını, ne sınıfını, ne bağını değiştirebilir. Kurum kaydı kurum tutar.

create policy students_select_guardian on public.students
for select to authenticated
using (
  public.current_user_guards_student(id)
  and not (select public.current_user_must_change_password())
);

create policy classes_select_guardian on public.classes
for select to authenticated
using (
  public.current_user_guards_class(id)
  and not (select public.current_user_must_change_password())
);

create policy class_enrollments_select_guardian on public.class_enrollments
for select to authenticated
using (
  public.current_user_guards_student(student_id)
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- v1.2-01'de kurulan desen: DELETE yok, `organization_id` hiçbir UPDATE
-- yetkisinde değil, UPDATE yalnızca `archived_at`'e açık.
--
-- Bağın kendisi güncellenmez — bir bağ ya vardır ya arşivlenmiştir. `student_id`
-- veya `guardian_id` güncellenebilseydi, bir veliyi başka bir öğrenciye
-- "taşımak" tek satırlık bir UPDATE olurdu ve geçmişte o bağın kime ait olduğu
-- kaybolurdu.
revoke all on public.student_guardians from anon, authenticated;

grant select on public.student_guardians to authenticated;
grant insert (organization_id, student_id, guardian_id)
  on public.student_guardians to authenticated;
grant update (archived_at) on public.student_guardians to authenticated;

grant all on public.student_guardians to service_role;
