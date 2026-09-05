-- v1.2-14 · Politika bütünlüğü — bir kayıt iki ucuna birden aittir
--
-- 2026-09-05 kapsam turu iki ayna açık buldu:
--
--   * `attendance_records` **oturumu** soruyordu, **öğrenciyi** sormuyordu.
--     12-A öğretmeni, 12-A oturumuna 12-B öğrencisinin yoklamasını yazabiliyordu.
--   * `exam_results` **öğrenciyi** soruyordu, **sınavı** sormuyordu.
--     12-B öğretmeni, kendi öğrencisinin sonucunu 12-A'nın sınavına yazabiliyordu.
--
-- İkisinin tam ayna olması, bunun dalgınlık değil **eksik bir soru** olduğunu
-- gösteriyor: iki politikayı yazan da "bana bu yazma hakkını ne veriyor?"
-- sorusunu cevaplamış, "bağladığım iki uç birbirine ait mi?" sorusunu hiç
-- sormamıştı. Kural olarak **K-17**'ye yazıldı.
--
-- Yoklamadaki açığın ağırlığı okuma tarafından geliyor: öğretmen yazdığı sahte
-- kaydı GERİ OKUYAMIYOR (okuma öğrenci kapsamına bağlı), ama o çocuğun velisi
-- ve kurum yöneticisi okuyor. Yani başka bir ailenin kaydına tek yönlü bir
-- enjeksiyon.
--
-- =========================================================================
-- Neden RLS politikası değil de trigger
-- =========================================================================
--
-- Üç sebep, üçü de bağlayıcı:
--
--   1. **`service_role` RLS'i atlar.** İki tabloda da `grant all ... to
--      service_role` var ve Edge Function'lar bu rolle yazıyor. Politikaya
--      yazılan bir kural onlar için hiç var olmazdı.
--   2. **Bu bir yetki sorusu değil, bir veri kuralı.** "Kim yazabilir" RLS'in
--      işi ve doğru çalışıyor; "yazılan satır tutarlı mı" şemanın işi. Aynı
--      ayrım, bileşik yabancı anahtarların tenant sınırını RLS'ten bağımsız
--      tutmasında zaten yapılmış durumda.
--   3. **Politikalar OLD ile NEW'i karşılaştıramaz.** Aşağıdaki üçüncü ve
--      dördüncü koruma tam olarak bunu gerektiriyor.
--
-- =========================================================================
-- Kayıtlı öğrenci ölçütü: `archived_at` KASITLI olarak yok sayılıyor
-- =========================================================================
--
-- Aranan şey "öğrenci bu sınıfa **kayıtlıydı**", "**şu anda** kayıtlı" değil.
-- Sebebi v1.2-04'te yazılmış bir karar: geçmişe dönük düzeltme bilinçli olarak
-- kısıtlanmadı, çünkü tek yöneticili küçük bir kurumda dünkü yoklamayı
-- düzeltecek başka kimse olmayabilir. Aktif kayıt şartı koşulsaydı, sınıftan
-- ayrılmış bir öğrencinin geçmiş yoklaması **düzeltilemez** hâle gelirdi ve
-- beyan edilmiş bir davranış sessizce bozulurdu.
--
-- Güvenlik açısından aranan özellik zaten "bu öğrencinin bu sınıfla bir
-- ilişkisi var mı" — arşivlenmiş bir kayıt da o ilişkinin kanıtıdır. Hiç
-- kaydı olmayan öğrenci ise her hâlükârda reddediliyor.
--
-- `ORB02`: standart bir SQLSTATE sınıfı değil; `ORB01` (dolu kurum silinemez)
-- ile aynı gerekçeyle seçildi — çağıranın bu reddi diğer hatalardan ayırt
-- edebilmesi için.

-- ---------------------------------------------------------------------------
-- 1. Yoklama kaydı, oturumun sınıfına ait bir öğrenciye yazılır
-- ---------------------------------------------------------------------------

create or replace function public.enforce_attendance_record_belongs_to_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  oturumun_sinifi uuid;
begin
  select oturum.class_id
  into oturumun_sinifi
  from public.attendance_sessions as oturum
  where oturum.id = new.session_id;

  -- Oturum bulunamadıysa burada bir şey söylemiyoruz: yabancı anahtar zaten
  -- reddedecek ve onun mesajı bu durumu bizimkinden daha iyi anlatıyor. Aynı
  -- olguyu iki yerde kontrol etmek, birinin eskimesi demektir (K-06).
  if oturumun_sinifi is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.class_enrollments as kayit
    where kayit.student_id = new.student_id
      and kayit.class_id = oturumun_sinifi
  ) then
    raise exception 'Öğrenci bu yoklama oturumunun sınıfına kayıtlı değil.'
      using errcode = 'ORB02',
            detail = format(
              'student_id=%s oturumun class_id=%s', new.student_id, oturumun_sinifi
            ),
            hint = 'Önce öğrenciyi sınıfa kaydedin (class_enrollments).';
  end if;

  return new;
end;
$$;

comment on function public.enforce_attendance_record_belongs_to_session() is
  'Yoklama kaydının öğrencisi, oturumun sınıfına kayıtlı olmalıdır (K-17). Arşivlenmiş kayıt da sayılır: geçmişe dönük düzeltme bilinçli olarak açık.';

revoke all on function public.enforce_attendance_record_belongs_to_session()
  from public, anon, authenticated;

create trigger attendance_records_belong_to_session
before insert on public.attendance_records
for each row execute function public.enforce_attendance_record_belongs_to_session();

-- ---------------------------------------------------------------------------
-- 2. Sınav sonucu, sınavın sınıfına ait bir öğrenciye yazılır
-- ---------------------------------------------------------------------------
--
-- `exams.class_id` **opsiyonel** ve bu tasarım gereği: boşsa sınav kurum
-- geneli bir denemedir ve kurumun her öğrencisi uygundur — sıralamanın anlamı
-- da oradan gelir. Dolayısıyla kural yalnızca sınıf bağlı sınavlarda işler.

create or replace function public.enforce_exam_result_belongs_to_exam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sinavin_sinifi uuid;
  sinav_var boolean;
begin
  select sinav.class_id, true
  into sinavin_sinifi, sinav_var
  from public.exams as sinav
  where sinav.id = new.exam_id;

  -- Sınav yoksa yabancı anahtara bırak; kurum geneli sınavda (class_id boş)
  -- kurumun her öğrencisi uygundur.
  if sinav_var is null or sinavin_sinifi is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.class_enrollments as kayit
    where kayit.student_id = new.student_id
      and kayit.class_id = sinavin_sinifi
  ) then
    raise exception 'Öğrenci bu sınavın sınıfına kayıtlı değil.'
      using errcode = 'ORB02',
            detail = format(
              'student_id=%s sınavın class_id=%s', new.student_id, sinavin_sinifi
            ),
            hint = 'Sınav kurum geneliyse class_id boş bırakılmalıdır.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_exam_result_belongs_to_exam() is
  'Sınıf bağlı bir sınavın sonucu, yalnızca o sınıfa kayıtlı öğrenciye yazılabilir (K-17). Kurum geneli sınavda (class_id boş) kısıt yoktur.';

revoke all on function public.enforce_exam_result_belongs_to_exam()
  from public, anon, authenticated;

create trigger exam_results_belong_to_exam
before insert on public.exam_results
for each row execute function public.enforce_exam_result_belongs_to_exam();

-- ---------------------------------------------------------------------------
-- 3. Sınavın sınıfı, mevcut sonuçları dışarıda bırakacak şekilde değiştirilemez
-- ---------------------------------------------------------------------------
--
-- INSERT'i korumak tek başına yetmiyor. `exams.class_id` yazma yetkisinde
-- (`grant update`) ve güncellenebilir; yani kurum geneli bir sınav açılıp
-- herkese sonuç girildikten SONRA sınıfa bağlanabilirdi. Kural o anda
-- geriye dönük olarak bozulmuş olurdu.
--
-- `attendance_records`'ta bu delik yok: `attendance_sessions.class_id` hiçbir
-- yazma yetkisinde değil. Yine de 4. adımda simetrik olarak korunuyor, çünkü
-- `service_role` yetki listesini de atlar.

create or replace function public.enforce_exam_class_change_keeps_results()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  disarida_kalan integer;
begin
  -- Sınıfın kaldırılması (boşa çekilmesi) kuralı gevşetir, kontrole gerek yok.
  if new.class_id is not distinct from old.class_id or new.class_id is null then
    return new;
  end if;

  select count(*)
  into disarida_kalan
  from public.exam_results as sonuc
  where sonuc.exam_id = new.id
    and not exists (
      select 1
      from public.class_enrollments as kayit
      where kayit.student_id = sonuc.student_id
        and kayit.class_id = new.class_id
    );

  if disarida_kalan > 0 then
    raise exception 'Sınav bu sınıfa taşınamaz: mevcut sonuçların bir kısmı sınıfın dışında kalıyor.'
      using errcode = 'ORB02',
            detail = format('%s sonuç yeni sınıfa ait değil', disarida_kalan),
            hint = 'Önce ilgili sonuçları kaldırın veya sınavı kurum geneli bırakın.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_exam_class_change_keeps_results() is
  'Bir sınav, mevcut sonuçlarını dışarıda bırakacak bir sınıfa taşınamaz (K-17). INSERT korumasının tek başına yeterli olmamasının sebebi: exams.class_id güncellenebilir.';

revoke all on function public.enforce_exam_class_change_keeps_results()
  from public, anon, authenticated;

create trigger exams_class_change_keeps_results
before update on public.exams
for each row execute function public.enforce_exam_class_change_keeps_results();

-- ---------------------------------------------------------------------------
-- 4. Yoklama oturumunun sınıfı, mevcut kayıtları dışarıda bırakacak şekilde
--    değiştirilemez
-- ---------------------------------------------------------------------------
--
-- `class_id` bugün `authenticated` için yazılabilir değil, yani bu yol normal
-- kullanıcıya kapalı. Yine de korunuyor: `service_role` hem RLS'i hem sütun
-- yetkilerini atlar ve kural, yazanın kim olduğundan bağımsız olarak
-- geçerli olmalıdır — 2. maddede sayılan gerekçenin aynısı.

create or replace function public.enforce_session_class_change_keeps_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  disarida_kalan integer;
begin
  if new.class_id is not distinct from old.class_id then
    return new;
  end if;

  select count(*)
  into disarida_kalan
  from public.attendance_records as kayit_satiri
  where kayit_satiri.session_id = new.id
    and not exists (
      select 1
      from public.class_enrollments as kayit
      where kayit.student_id = kayit_satiri.student_id
        and kayit.class_id = new.class_id
    );

  if disarida_kalan > 0 then
    raise exception 'Oturum bu sınıfa taşınamaz: mevcut kayıtların bir kısmı sınıfın dışında kalıyor.'
      using errcode = 'ORB02',
            detail = format('%s yoklama kaydı yeni sınıfa ait değil', disarida_kalan);
  end if;

  return new;
end;
$$;

comment on function public.enforce_session_class_change_keeps_records() is
  'Bir yoklama oturumu, mevcut kayıtlarını dışarıda bırakacak bir sınıfa taşınamaz (K-17). Bugün yalnızca service_role bu yolu kullanabilir.';

revoke all on function public.enforce_session_class_change_keeps_records()
  from public, anon, authenticated;

create trigger attendance_sessions_class_change_keeps_records
before update on public.attendance_sessions
for each row execute function public.enforce_session_class_change_keeps_records();
