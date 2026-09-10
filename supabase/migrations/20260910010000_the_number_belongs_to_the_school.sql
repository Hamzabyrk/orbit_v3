-- v1.4-01 · Öğrenci numarası ve CRUD'un denetim izi (#264)
--
-- =========================================================================
-- 1. Öğrenci numarası — kurumun defterindeki numara
-- =========================================================================
--
-- Arayüzün `Student` tipinde `code` alanı **vardı**, arama kutusu "Öğrenci
-- adı, kodu veya sınıf ara…" diyordu ve `studentService` alanı
-- `code: v1.4-01'de gelecek` yorumuyla boş bırakıyordu. Yani arama bugüne
-- kadar **hep boş olan** bir alanda arıyordu.
--
-- **Elle girilir, otomatik üretilmez.** Dershanenin kendi defterinde zaten bir
-- numarası var; sunucunun ürettiği ikinci bir numara kağıtla ekranı
-- ayrıştırır ve sahada karışıklık üretir. Karşılığında çakışma sorumluluğu
-- bize düşüyor — kısmi tekillik indeksi onu üstleniyor.
--
-- **İsteğe bağlı.** Numarasız çalışan kurum var; zorunlu kılmak, numarası
-- olmayan kurumu uydurmaya zorlardı.
--
-- **Tekillik kurum içinde.** `auth_user_id`'nin küresel tekilliğinden farkı
-- bilinçli: giriş hesabı bütün sistemde bir kişiyi işaret eder, öğrenci
-- numarası ise **kurumun kendi defterindeki** sıradır. İki dershanenin
-- ikisinde de "101" numaralı öğrenci olması son derece normaldir.
--
-- Arşivlenmiş kayıt indekse **dahil**: numara serbest kalmıyor. Aksi hâlde
-- ayrılan bir öğrencinin numarası yenisine verilir ve geçmiş kayıtlar iki
-- kişiye birden işaret ederdi.

alter table public.students
  add column student_number text;

alter table public.students
  add constraint students_student_number_check check (
    student_number is null
    or (
      char_length(trim(both from student_number)) >= 1
      and char_length(trim(both from student_number)) <= 32
      and student_number = trim(both from student_number)
    )
  );

comment on column public.students.student_number is
  'Kurumun kendi defterindeki öğrenci numarası. Elle girilir, isteğe bağlıdır, kurum içinde tekildir. Giriş numarasıyla (kurum kodu + person_code) ilgisi yoktur.';

create unique index students_organization_number_idx
  on public.students (organization_id, student_number)
  where student_number is not null;

-- Yazma yetkisi: v1.2-01'in sütun listesine ekleniyor. `full_name` ile aynı
-- sınıfta bir alan — yönetici girer, yönetici düzeltir.
grant insert (student_number) on public.students to authenticated;
grant update (student_number) on public.students to authenticated;

-- =========================================================================
-- 2. CRUD'un denetim izi — tetikleyiciyle, çünkü istemci yazamıyor
-- =========================================================================
--
-- Ölçüldü: `audit_events` `authenticated` rolü için **salt okunur**. Yani
-- istemcinin denetim kaydı yazması teknik olarak mümkün değil; iz ya bir
-- tetikleyiciyle ya bir RPC ile düşer.
--
-- **Tetikleyici seçildi.** Sebebi K-19'un iki kez ölçtüğü şey: hatırlatma
-- kapı değildir. Denetim kaydını her mutasyon yolunun ayrı ayrı yazması
-- gerekseydi, yazılmayan ilk yol sessizce izsiz kalırdı — ve izsiz kalan bir
-- yolu fark etmenin yolu yoktur, çünkü eksik bir satır hata vermez.
--
-- v1.4-14'e kalan: Zod doğrulaması ve **özel metadata** isteyen mutasyonlar.
-- Bu tetikleyici "ne oldu"yu yazar; "hangi niyetle" bilgisini taşıyamaz,
-- çünkü tetikleyici çağıranın niyetini görmez.
--
-- ⚠️ **`auth_user_id` değişimi bu tetikleyicinin işi DEĞİL.** Onu v1.4-00'ın
-- bağlama fonksiyonları kendi kayıtlarıyla (`student.account_linked` /
-- `student.account_unlinked`) zaten yazıyor. Burada tekrar yazılsaydı tek bir
-- işlem için defterde **iki** satır görünürdü.

create or replace function public.audit_student_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eylem text;
  ayrinti jsonb;
begin
  if tg_op = 'INSERT' then
    eylem := 'student.created';
    ayrinti := jsonb_build_object(
      'full_name', new.full_name,
      'student_number', new.student_number
    );
  elsif old.archived_at is null and new.archived_at is not null then
    eylem := 'student.archived';
    ayrinti := jsonb_build_object('full_name', new.full_name);
  elsif old.archived_at is not null and new.archived_at is null then
    eylem := 'student.restored';
    ayrinti := jsonb_build_object('full_name', new.full_name);
  elsif old.full_name is distinct from new.full_name
     or old.branch_id is distinct from new.branch_id
     or old.student_number is distinct from new.student_number then
    eylem := 'student.updated';
    -- Değişen **alanların adları** yazılıyor, eski değerleri değil. Denetim
    -- defteri bir yedek değil; eski değeri saklamak, silinmiş sanılan veriyi
    -- ikinci bir yerde tutmak olurdu.
    ayrinti := jsonb_build_object(
      'full_name', new.full_name,
      'changed', (
        select coalesce(jsonb_agg(alan), '[]'::jsonb)
        from (
          select 'full_name' as alan where old.full_name is distinct from new.full_name
          union all
          select 'branch_id' where old.branch_id is distinct from new.branch_id
          union all
          select 'student_number' where old.student_number is distinct from new.student_number
        ) as degisenler
      )
    );
  else
    -- İzlenen hiçbir alan değişmedi (örneğin yalnız `auth_user_id`): kayıt
    -- yazılmıyor. Bir şey olmadığında defterde bir şey görünmemeli.
    return null;
  end if;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    new.organization_id,
    new.branch_id,
    auth.uid(),
    eylem,
    'student',
    new.id,
    ayrinti
  );

  return null;
end;
$$;

comment on function public.audit_student_change() is
  'Öğrenci kaydının oluşturulmasını, düzenlenmesini, arşivlenmesini ve geri alınmasını audit_events''e yazar. auth_user_id değişimini BİLEREK atlar: onu v1.4-00''ın bağlama fonksiyonları kendi kayıtlarıyla yazıyor.';

-- Tetikleyici fonksiyonu hiç kimse doğrudan çağırmamalı — ev kuralı
-- (`20260909020000`). Postgres EXECUTE yetkisini tetikleyici KURULURKEN
-- denetliyor, ateşlenirken değil; dolayısıyla revoke tetikleyiciyi kırmıyor.
revoke all on function public.audit_student_change() from public, anon, authenticated;

create trigger students_audit_insert
  after insert on public.students
  for each row execute function public.audit_student_change();

create trigger students_audit_update
  after update on public.students
  for each row execute function public.audit_student_change();
