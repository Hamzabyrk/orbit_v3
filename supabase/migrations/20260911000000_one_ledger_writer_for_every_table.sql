-- v1.4-02 · Sınıf kontenjanı ve defteri yazan tek fonksiyon (#266)
--
-- =========================================================================
-- 1. Kontenjan — sınıfın kendi özelliği
-- =========================================================================
--
-- `PROJECT_STATE`'in MVP kapsamı "…mentor öğretmen, **öğrenci kapasitesi** ve
-- **derslik** organizasyonu" diyor; şemada ikisi de yoktu ve arayüz ikisini de
-- vaat etmiyordu. Yani söz yalnız belgede duruyordu.
--
-- **Kontenjan geliyor, derslik gelmiyor** ve ayrım bilinçli: kontenjan sınıfın
-- kendi özelliğidir ve zaman içinde değişmez; derslik ise **ders programına**
-- aittir — aynı sınıf farklı saatlerde farklı derslikte olabilir. `classes`
-- satırına tek bir derslik yazmak, ders programı geldiğinde ya çelişecek ya
-- taşınacak bir alan üretirdi. Karşılığı **v1.4-11**'e çapalandı ve MVP kapsam
-- cümlesi bu dilimde düzeltildi.
--
-- **İsteğe bağlı:** kontenjan takmayan kurum var. Zorunlu kılmak, kontenjanı
-- olmayan kurumu sayı uydurmaya zorlardı.
--
-- Üst sınır 1000: kontenjan bir dershane sınıfının kapasitesidir; dört haneli
-- bir değer veri girişi hatasıdır, kural değil. Alt sınır 1, çünkü sıfır
-- kontenjanlı sınıf "arşivlenmiş sınıf" demenin dolambaçlı yoludur ve bu
-- sistemde arşivlemenin kendi alanı var.

alter table public.classes
  add column capacity integer;

alter table public.classes
  add constraint classes_capacity_check check (
    capacity is null or (capacity >= 1 and capacity <= 1000)
  );

comment on column public.classes.capacity is
  'Sınıfın öğrenci kontenjanı. İsteğe bağlıdır. Derslik BU SÜTUNDA DEĞİL: derslik ders programına aittir (v1.4-11).';

grant insert (capacity) on public.classes to authenticated;
grant update (capacity) on public.classes to authenticated;

-- =========================================================================
-- 2. Defteri yazan tek fonksiyon
-- =========================================================================
--
-- v1.4-01 `students` için `audit_student_change()` yazmıştı ve gerekçesi
-- değişmedi: `audit_events` `authenticated` için salt okunur, dolayısıyla iz
-- tetikleyiciyle düşmek zorunda; ve her mutasyon yolunun kaydı ayrı yazsaydı,
-- yazılmayan ilk yol sessizce izsiz kalırdı.
--
-- **Değişen, o fonksiyonun tabloya özgü olması.** v1.4 boyunca en az altı
-- tablo daha aynı şeyi isteyecek (yoklama, sınav, ödev, ödeme, program, akış).
-- Üç tablodayken genelleştirmek, sekiz tablodayken genelleştirmekten ucuz —
-- ve sekiz neredeyse aynı fonksiyon, aralarındaki farkın **kasıtlı mı hata mı**
-- olduğunu okuyana bırakırdı.
--
-- Sözleşme: `tg_argv[0]` varlık adı, kalanı **izlenen sütunlar**.
--
--   * Her kayıtta izlenen sütunların **güncel değerleri** yazılır.
--   * `INSERT` → `<varlık>.created`
--   * `archived_at` null → dolu ise `<varlık>.archived`, tersi `<varlık>.restored`
--   * İzlenen sütunlardan biri değiştiyse `<varlık>.updated` ve `changed`
--     dizisinde **değişen alanların adları** — eski değerleri DEĞİL. Denetim
--     defteri bir yedek değil; eski değeri saklamak, silinmiş sanılan veriyi
--     ikinci bir yerde tutmak olurdu.
--   * İzlenen hiçbir sütun değişmediyse **hiçbir şey yazılmaz.** Bir şey
--     olmadığında defterde bir şey görünmemeli.
--
-- İzlenen sütun listesi aynı zamanda **kapsam beyanıdır**: listede olmayan bir
-- sütunun değişmesi iz bırakmaz. `students.auth_user_id` tam olarak bu yüzden
-- listede yok — onu v1.4-00'ın bağlama fonksiyonları kendi kayıtlarıyla
-- yazıyor ve iki kez yazılsaydı tek işlem için defterde iki satır görünürdü.
--
-- `branch_id` tabloda yoksa `to_jsonb` o anahtarı hiç üretmez ve kayıt NULL
-- şube ile düşer; `class_enrollments` tam olarak böyle.

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  varlik text := tg_argv[0];
  izlenen text[] := tg_argv[1:];
  yeni jsonb := to_jsonb(new);
  eski jsonb;
  eylem text;
  ayrinti jsonb := '{}'::jsonb;
  degisen text[] := array[]::text[];
  alan text;
begin
  foreach alan in array izlenen loop
    ayrinti := ayrinti || jsonb_build_object(alan, yeni -> alan);
  end loop;

  if tg_op = 'INSERT' then
    eylem := varlik || '.created';
  else
    eski := to_jsonb(old);

    if eski ->> 'archived_at' is null and yeni ->> 'archived_at' is not null then
      eylem := varlik || '.archived';
    elsif eski ->> 'archived_at' is not null and yeni ->> 'archived_at' is null then
      eylem := varlik || '.restored';
    else
      foreach alan in array izlenen loop
        if (eski -> alan) is distinct from (yeni -> alan) then
          degisen := degisen || alan;
        end if;
      end loop;

      if cardinality(degisen) = 0 then
        return null;
      end if;

      eylem := varlik || '.updated';
      ayrinti := ayrinti || jsonb_build_object('changed', to_jsonb(degisen));
    end if;
  end if;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    (yeni ->> 'organization_id')::uuid,
    (yeni ->> 'branch_id')::uuid,
    auth.uid(),
    eylem,
    varlik,
    (yeni ->> 'id')::uuid,
    ayrinti
  );

  return null;
end;
$$;

comment on function public.audit_row_change() is
  'Kiracılı bir tablonun oluşturma/güncelleme/arşivleme/geri alma işlemlerini audit_events''e yazar. tg_argv[0] varlık adı, kalanı izlenen sütunlar. İzlenmeyen sütunun değişmesi iz bırakmaz — liste bir kapsam beyanıdır.';

revoke all on function public.audit_row_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Öğrenci tetikleyicileri genel fonksiyona taşınıyor
-- ---------------------------------------------------------------------------
--
-- Davranış değişmiyor: aynı dört eylem adı, aynı izlenen sütunlar, aynı
-- "değişmeyen güncelleme iz bırakmaz" kuralı. v1.4-01'in 23 pgTAP iddiası
-- bunu olduğu gibi doğrulamaya devam ediyor — genelleştirmenin doğru olduğunun
-- kanıtı da bu: testler fonksiyonun adını değil **davranışını** ölçüyordu.

drop trigger if exists students_audit_insert on public.students;
drop trigger if exists students_audit_update on public.students;
drop function if exists public.audit_student_change();

create trigger students_audit_insert
  after insert on public.students
  for each row execute function public.audit_row_change(
    'student', 'full_name', 'student_number', 'branch_id'
  );

create trigger students_audit_update
  after update on public.students
  for each row execute function public.audit_row_change(
    'student', 'full_name', 'student_number', 'branch_id'
  );

-- ---------------------------------------------------------------------------
-- Sınıf ve sınıfa kayıt
-- ---------------------------------------------------------------------------
--
-- `class_enrollments` bir bağ satırı; izlenen sütunları `class_id` ve
-- `student_id`. İkisi de pratikte hiç değişmiyor (kısmi tekillik indeksi zaten
-- aynı bağın ikincisini reddediyor), dolayısıyla o tabloda gerçekte yalnız
-- `created` / `archived` / `restored` görünecek. Yine de izleniyorlar: bir gün
-- değişirlerse iz bırakmadan değişmemeliler.

create trigger classes_audit_insert
  after insert on public.classes
  for each row execute function public.audit_row_change(
    'class', 'name', 'program', 'branch_id', 'mentor_membership_id', 'capacity'
  );

create trigger classes_audit_update
  after update on public.classes
  for each row execute function public.audit_row_change(
    'class', 'name', 'program', 'branch_id', 'mentor_membership_id', 'capacity'
  );

create trigger class_enrollments_audit_insert
  after insert on public.class_enrollments
  for each row execute function public.audit_row_change(
    'class_enrollment', 'class_id', 'student_id'
  );

create trigger class_enrollments_audit_update
  after update on public.class_enrollments
  for each row execute function public.audit_row_change(
    'class_enrollment', 'class_id', 'student_id'
  );
