-- v1.4-15 · Getirilen ödev bir satırdır
--
-- v1.4-05 üç şeyi **kaldırmıştı** ve gerekçesi kayıtlı:
--
--   > "Bir ödevin tamamlandığını sistem bilemez: ödev sınıfa veriliyor ve
--   >  teslim tablosu yok. Kart ve etiket, olmayan bir bilgiyi varmış gibi
--   >  gösteriyordu."
--
-- Gidenler: `Student.homework` ("7/9"), ödev durumunda "Tamamlandı", ve rapor
-- ekranının ödev kartı. Bu migration o bilgiyi **var** ediyor.
--
-- Ölçüldü (üretim, 2026-09-13): teslim tablosu yok, `homework_assignments`'ta
-- 0 satır.
--
-- =========================================================================
-- Tasarımın iki kararı
-- =========================================================================
--
-- **1. Teslimi ÖĞRETMEN işaretler** (karar, Arda Bülent, 2026-09-13).
--
-- Ölçüldü: bu sistemde öğrencinin **hiçbir yazma yolu yok** — yazılabilir 20
-- tablonun hepsinde yazma politikası admin ya da öğretmen. Öğrencinin kendi
-- teslimini işaretlemesi sistemin **ilk öğrenci yazma yolu** olurdu ve bu tek
-- başına bir güvenlik kararıdır; açılmadı. Öğrenci ve veli **okur**.
--
-- **2. Satırın VARLIĞI teslimi anlatır.** İşaret kaldırılırsa satır arşivlenir,
-- silinmez — deponun her yerindeki desen. Kısmi tekil indeks aynı ödev-öğrenci
-- çiftinin ikinci kez açılmasını engelliyor ama arşivlenmiş satır yolu serbest
-- bırakıyor (`installments`, `class_teachers`, `student_guardians` ile aynı).
--
-- =========================================================================
-- ⚠️ Tabloda `submitted_at` YOK ve bu bilinçli
-- =========================================================================
--
-- Öğretmen ödevi bir hafta sonra işaretleyebilir. `created_at` "ne zaman
-- işaretlendi"yi söyler; "ne zaman getirildi"yi **kimse bilmiyor**.
--
-- `submitted_at` diye bir alan açmak, sistemin bilmediği bir şeyi alan adıyla
-- iddia etmek olurdu — ve o alan bir gün "geç teslim" hesabına girerdi
-- (**K-03**: çözümlenemeyen veri uydurulmuş değerle gösterilmez). Geç teslim
-- bu dilimde **iddia edilmiyor**; gerekirse kendi kararıyla, kendi alanıyla
-- açılır.
--
-- =========================================================================
-- 1. Bileşik anahtar — `homework_assignments` eksikti
-- =========================================================================
--
-- Ölçüldü: `classes` ve `students` `(id, organization_id)` tekilliğini
-- taşıyor, `homework_assignments` **taşımıyor**. Bileşik yabancı anahtar
-- (kiracılığı FK'nin kendisine doğrulatan desen) bunu gerektiriyor.

alter table public.homework_assignments
  add constraint homework_assignments_id_organization_key
  unique (id, organization_id);

-- =========================================================================
-- 2. Tablo
-- =========================================================================

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  homework_id uuid not null,
  student_id uuid not null,
  -- Kim işaretledi. İstemci göndermez; tetikleyici doldurur (aşağıya bakın).
  recorded_by_membership_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Üç bileşik yabancı anahtar: kiracılık FK'nin kendisinde doğrulanıyor,
  -- yani başka kurumun ödevine/öğrencisine satır yazılamaz.
  constraint homework_submissions_homework_organization_fkey
    foreign key (homework_id, organization_id)
    references public.homework_assignments (id, organization_id)
    on delete restrict,
  constraint homework_submissions_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id)
    on delete restrict,
  constraint homework_submissions_recorder_organization_fkey
    foreign key (recorded_by_membership_id, organization_id)
    references public.organization_memberships (id, organization_id)
    on delete restrict
);

comment on table public.homework_submissions is
  'Getirilen ödev. Satırın VARLIĞI teslimi anlatır; işaret kaldırılırsa satır arşivlenir. `submitted_at` BİLEREK yok: öğretmen sonradan işaretleyebilir, dolayısıyla "ne zaman getirildi" bilinmiyor ve iddia edilmiyor (K-03).';

-- Aynı ödev-öğrenci çifti bir kez açık olabilir; arşivlenmiş satır yolu
-- serbest bırakır (yanlış işaretlenip kaldırılan bir teslim yeniden
-- işaretlenebilsin).
create unique index homework_submissions_active_idx
  on public.homework_submissions (homework_id, student_id)
  where archived_at is null;

create index homework_submissions_homework_idx
  on public.homework_submissions (homework_id, archived_at);

create index homework_submissions_student_idx
  on public.homework_submissions (student_id, archived_at);

create index homework_submissions_organization_idx
  on public.homework_submissions (organization_id);

-- =========================================================================
-- 3. İşaretleyeni sunucu yazar
-- =========================================================================
--
-- `daily_feed_posts`'un `set_feed_post_author` deseni. İstemci bu sütunu
-- gönderemez (yetkide yok) ve gönderse de tetikleyici üzerine yazar.
-- Çözülemezse satır **yazılmaz**: `recorded_by_membership_id` NOT NULL ve
-- kimliği çözülmemiş bir yazmanın geçmesi doğru olmaz (**K-04**).

create or replace function public.set_homework_submission_recorder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select membership.id
  into new.recorded_by_membership_id
  from public.organization_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.organization_id = new.organization_id
    and membership.status = 'active'
  limit 1;

  return new;
end;
$$;

comment on function public.set_homework_submission_recorder() is
  'Teslimi kimin işaretlediğini sunucu yazar; istemci gönderemez. Çözülemezse NOT NULL kısıtı satırı reddeder — kimliği çözülmemiş bir yazma geçmez.';

revoke all on function public.set_homework_submission_recorder()
  from public, anon, authenticated;

create trigger homework_submissions_set_recorder
  before insert on public.homework_submissions
  for each row execute function public.set_homework_submission_recorder();

create trigger homework_submissions_set_updated_at
  before update on public.homework_submissions
  for each row execute function public.set_updated_at();

-- =========================================================================
-- 4. `ORB02` — teslim, ödevin sınıfına kayıtlı bir öğrenciye yazılır
-- =========================================================================
--
-- v1.2-14'ün yoklama kuralının aynısı. Yabancı anahtar öğrencinin **var**
-- olduğunu ve **aynı kuruma** ait olduğunu garanti eder; o ödevin sınıfıyla
-- ilgisi olduğunu **asla** (**K-18**).
--
-- ⚠️ **Arşivlenmiş sınıf kaydı da ilişkinin kanıtı sayılıyor** ve bu, yoklama
-- kuralından kopyalanmış bilinçli bir ayrıntı: aktif kayıt şartı koşulsaydı,
-- sınıftan ayrılmış bir öğrencinin geçmiş teslimi **düzeltilemez** hâle
-- gelirdi. Aranan özellik "bu öğrencinin bu sınıfla bir ilişkisi var mı" ve
-- arşivlenmiş kayıt da onun kanıtıdır. Hiç kaydı olmayan öğrenci her hâlükârda
-- reddediliyor.

create or replace function public.enforce_homework_submission_matches_class()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  odevin_sinifi uuid;
begin
  select odev.class_id
  into odevin_sinifi
  from public.homework_assignments as odev
  where odev.id = new.homework_id;

  if not exists (
    select 1
    from public.class_enrollments as kayit
    where kayit.student_id = new.student_id
      and kayit.class_id = odevin_sinifi
  ) then
    raise exception 'Öğrenci bu ödevin sınıfına kayıtlı değil.'
      using errcode = 'ORB02',
            detail = format(
              'student_id=%s ödevin class_id=%s', new.student_id, odevin_sinifi
            ),
            hint = 'Önce öğrenciyi sınıfa kaydedin (class_enrollments).';
  end if;

  return new;
end;
$$;

comment on function public.enforce_homework_submission_matches_class() is
  'Teslim, ödevin sınıfına kayıtlı bir öğrenciye yazılır (ORB02). Arşivlenmiş sınıf kaydı da kanıt sayılır: aktif kayıt şart koşulsaydı sınıftan ayrılmış öğrencinin geçmiş teslimi düzeltilemezdi. v1.2-14 yoklama kuralının aynısı.';

revoke all on function public.enforce_homework_submission_matches_class()
  from public, anon, authenticated;

-- ⚠️ **Yalnız INSERT** ve bu bir ölçümün sonucu. İlk yazımda `insert or update`
-- idi; K-23 mutasyonu (arşivlenmiş kaydı kanıt saymayı bırakmak) testi
-- okunabilir bir kırmızı yerine **çökertti** ve sebebi şuydu: tetikleyici
-- UPDATE'te de koştuğu için **işareti kaldırmak** sınıf kaydının durumuna
-- bağlanıyordu.
--
-- Gereksiz olduğu da ayrıca doğru: `homework_id` ve `student_id` UPDATE
-- yetkisinde **yok**, yani güncellenemezler — kontrol, değişemeyecek bir şeyi
-- sınıyordu. v1.2-14 aynı gerekçeyle aynı kararı vermiş: _"`student_id` hiçbir
-- `grant update`'te yok, dolayısıyla INSERT'i korumak yeterli."_
create trigger homework_submissions_matches_class
  before insert on public.homework_submissions
  for each row execute function public.enforce_homework_submission_matches_class();

-- =========================================================================
-- 5. Yetki yardımcısı
-- =========================================================================
--
-- `current_user_can_record_attendance`'ın aynısı, konusu ödev.
--
-- ⚠️ `security definer` **ve** `authenticated`'a açık olmak zorunda: RLS
-- politikası içinden başka bir tablonun satırına bakmak gerekiyor ve
-- politikanın kendisi o tablonun RLS'ine tabi olurdu. Yoklamanınki de bu
-- yüzden böyle. **Advisor sayısı 29'dan 30'a çıkacak ve bu bilinçli.**

create or replace function public.current_user_can_record_homework(
  target_homework_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.homework_assignments as odev
    where odev.id = target_homework_id
      and odev.archived_at is null
      and (
        public.current_user_has_membership(
          odev.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_class(odev.class_id)
      )
  );
$$;

comment on function public.current_user_can_record_homework(uuid) is
  'Ödev teslimini işaretleyebilir mi: kurum yöneticisi veya ödevin sınıfını okutan öğretmen. current_user_can_record_attendance''ın aynısı. Arşivlenmiş ödeve teslim işaretlenmez.';

revoke all on function public.current_user_can_record_homework(uuid)
  from public, anon;
grant execute on function public.current_user_can_record_homework(uuid) to authenticated;

-- =========================================================================
-- 6. RLS
-- =========================================================================
--
-- Okuma `homework_assignments`'ın dört okuma politikasını aynalıyor: yönetici,
-- sınıfı okutan öğretmen, sınıfa devam eden öğrenci, o sınıfı gözeten veli.
-- Yazma yalnız işaretleyebilenlerde.

alter table public.homework_submissions enable row level security;

create policy homework_submissions_select_admin
  on public.homework_submissions for select to authenticated
  using (
    public.current_user_has_membership(
      organization_id, null, array['admin']::public.app_role[]
    )
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_select_teacher
  on public.homework_submissions for select to authenticated
  using (
    exists (
      select 1 from public.homework_assignments as odev
      where odev.id = homework_id
        and public.current_user_teaches_class(odev.class_id)
    )
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_select_student
  on public.homework_submissions for select to authenticated
  using (
    public.current_user_owns_student_record(student_id)
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_select_guardian
  on public.homework_submissions for select to authenticated
  using (
    public.current_user_guards_student(student_id)
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_insert_recorder
  on public.homework_submissions for insert to authenticated
  with check (
    public.current_user_can_record_homework(homework_id)
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_update_recorder
  on public.homework_submissions for update to authenticated
  using (
    public.current_user_can_record_homework(homework_id)
    and not (select public.current_user_must_change_password())
  )
  with check (
    public.current_user_can_record_homework(homework_id)
    and not (select public.current_user_must_change_password())
  );

-- =========================================================================
-- 7. Yetkiler — önce revoke, sonra sütun bazında grant
-- =========================================================================
--
-- `id` ve `recorded_by_membership_id` yazılamaz: ilki veritabanının, ikincisi
-- tetikleyicinin işi. UPDATE yalnız `archived_at` — bir teslim "düzenlenmez",
-- ya vardır ya kaldırılır.

revoke all on public.homework_submissions from public, anon, authenticated;

grant select (
  id, organization_id, homework_id, student_id,
  recorded_by_membership_id, archived_at, created_at, updated_at
) on public.homework_submissions to authenticated;

grant insert (organization_id, homework_id, student_id)
  on public.homework_submissions to authenticated;

grant update (archived_at)
  on public.homework_submissions to authenticated;

-- =========================================================================
-- 8. İz ve yayın
-- =========================================================================
--
-- `every_write_leaves_a_trace.test.sql` bunu zaten zorunlu kılıyor (v1.4-14).
-- İzlenen alanlar `homework_id` ve `student_id`; arşive geçiş ve dönüş
-- `audit_row_change` tarafından ayrıca yazılıyor.

create trigger homework_submissions_audit_insert
  after insert on public.homework_submissions
  for each row execute function public.audit_row_change(
    'homework_submission', 'homework_id', 'student_id'
  );

create trigger homework_submissions_audit_update
  after update on public.homework_submissions
  for each row execute function public.audit_row_change(
    'homework_submission', 'homework_id', 'student_id'
  );

create trigger homework_submissions_broadcast_insert
  after insert on public.homework_submissions
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger homework_submissions_broadcast_update
  after update on public.homework_submissions
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger homework_submissions_broadcast_delete
  after delete on public.homework_submissions
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();
