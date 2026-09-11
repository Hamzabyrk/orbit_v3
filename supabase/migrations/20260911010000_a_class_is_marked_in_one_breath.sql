-- v1.4-03 · Yoklama tek nefeste kaydedilir (#268)
--
-- =========================================================================
-- 1. Neden bir RPC — ölçüldü
-- =========================================================================
--
-- Yoklama kaydetmek bir **upsert**: `attendance_records` üzerinde
-- `unique (session_id, student_id)` var, `archived_at` yok, DELETE ne yetki ne
-- politika olarak var. Yani öğrenci başına oturumda tek satır; ikinci kayıt
-- güncellemedir.
--
-- İstemcinin düz upsert'i **çalışmıyor** ve bu varsayım değil, ölçüm. v1.2-04
-- `authenticated`'a `attendance_records` üzerinde yalnız `status` sütununda
-- UPDATE yetkisi verdi — bilinçli olarak, çünkü bir kaydı başka bir öğrenciye
-- taşımak yoklamayı tahrif etmektir. PostgREST'in ürettiği upsert ise yükün
-- **her** sütununu `SET` eder. Yerel yığında üç deneme:
--
--   düz insert ......................................... geçti
--   tam upsert (her sütunu SET eder) ................... 42501 permission denied
--   yalnız `status` SET eden upsert .................... geçti
--
-- **Reddedilen alternatif:** istemcinin "önce oku, eksikleri ekle, değişenleri
-- güncelle" yapması. Mevcut yetkilerle çalışırdı ama bir sınıfın yoklaması
-- **tek bir işlemdir**: otuz öğrenci için otuza yakın ayrı istek, ve ortada
-- kesilirse yarısı kaydedilmiş bir yoklama kalır. Yarım yoklama, hiç
-- alınmamış yoklamadan kötüdür — çünkü alınmış görünür.
--
-- Bu fonksiyon tek turda, tek işlemde ve kaydedici kontrolünü **bir kez**
-- yaparak yazar.
--
-- =========================================================================
-- 2. Neyi kontrol ediyor, neyi etmiyor
-- =========================================================================
--
-- Kontrol ettiği: çağıranın bu oturuma yoklama yazabilmesi
-- (`current_user_can_record_attendance` — kurum yöneticisi **veya o sınıfın
-- öğretmeni**) ve şifre değişimi kilidinin kapalı olması.
--
-- Kontrol ETMEDİĞİ, çünkü şema zaten ediyor:
--
--   * Öğrencinin oturumun sınıfına kayıtlı olması →
--     `enforce_attendance_record_belongs_to_session` (`ORB02`)
--   * Durumun geçerli bir değer olması → `attendance_status` enum'u (`22P02`)
--   * Kiracı bütünlüğü → bileşik yabancı anahtarlar
--
-- Aynı kuralı iki yerde tutmak, birinin sessizce eskimesi demek (**K-06**).
-- Tetikleyicinin hatası zaten Türkçe, `detail` ve `hint` taşıyor; RPC onu
-- yutmuyor, olduğu gibi çağırana bırakıyor.

create or replace function public.record_attendance(
  target_session_id uuid,
  entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  oturum public.attendance_sessions;
  yazilan integer;
begin
  select * into oturum
  from public.attendance_sessions as session_row
  where session_row.id = target_session_id
    and session_row.archived_at is null;

  if not found then
    raise exception 'Yoklama oturumu bulunamadı.' using errcode = '23503';
  end if;

  if not public.current_user_can_record_attendance(target_session_id)
     or public.current_user_must_change_password() then
    raise exception 'Bu yoklamayı kaydetme yetkiniz yok.'
      using errcode = '42501',
            hint = 'Yoklamayı kurum yöneticisi veya sınıfın öğretmeni kaydedebilir.';
  end if;

  if jsonb_typeof(entries) is distinct from 'array' then
    raise exception 'Yoklama listesi bir dizi olmalı.' using errcode = '22023';
  end if;

  -- Boş dizi hata değil: bir sınıfta o gün hiç öğrenci olmayabilir ve
  -- "kaydet"e basmak yine de meşru bir işlem. Sıfır döner, bir şey yazmaz.
  with girdiler as (
    select
      (girdi ->> 'student_id')::uuid as student_id,
      (girdi ->> 'status')::public.attendance_status as status
    from jsonb_array_elements(entries) as girdi
  ),
  yazim as (
    insert into public.attendance_records (
      organization_id, session_id, student_id, status
    )
    select oturum.organization_id, target_session_id, girdiler.student_id, girdiler.status
    from girdiler
    on conflict (session_id, student_id) do update
      -- **Yalnız `status`.** Diğer sütunları da SET etmek yetki hatası verirdi
      -- (ölçüldü) ve zaten yanlış olurdu: bir kaydı başka bir öğrenciye
      -- taşımak yoklamayı tahrif etmektir.
      set status = excluded.status
    returning 1
  )
  select count(*) into yazilan from yazim;

  return yazilan;
end;
$$;

comment on function public.record_attendance(uuid, jsonb) is
  'Bir yoklama oturumunun kayıtlarını tek işlemde yazar. entries: [{"student_id": uuid, "status": present|late|absent|excused}]. Var olan kayıtta yalnız status güncellenir. Öğrencinin sınıfa kayıtlı olduğunu şema tetikleyicisi doğrular (ORB02).';

revoke all on function public.record_attendance(uuid, jsonb) from public, anon;
grant execute on function public.record_attendance(uuid, jsonb) to authenticated;

-- =========================================================================
-- 3. Denetim izi — hacme göre kesildi
-- =========================================================================
--
-- v1.4-02'nin `audit_row_change` fonksiyonu burada da kullanılıyor; yeni bir
-- yazıcı yazılmıyor. Değişen şey **kapsam**.
--
-- `attendance_sessions` tam denetleniyor: oturum açmak ve tarihini/dersini
-- değiştirmek seyrek ve anlamlı işlemler.
--
-- `attendance_records` ise **yalnız UPDATE**'te iz bırakıyor ve bu, v1.4'te
-- ilk kez bilinçli olarak dar tutulan denetim kapsamı. Gerekçe §4.12'de
-- ölçülü: bu tablo ölçekte yılda ~90.000.000 satır (öğrenci × ders oturumu) ve
-- her kayda bir denetim satırı, defteri tek başına sistemin en büyük tablosu
-- yapardı.
--
-- Kesme yeri rastgele değil: **ilk yoklama girişi toplu ve beklenen olaydır**;
-- öğretmen o gün sınıfa girmiş ve listeyi doldurmuştur. Denetime değer olan,
-- sonradan tek bir öğrencinin durumunun değiştirilmesidir — "yok" iken
-- "izinli" olması. Velinin itiraz edeceği işlem tam olarak odur ve **o**
-- iz bırakıyor.
--
-- ⚠️ Bunun bedeli açıkça yazılıyor: ilk girişte kimin ne yazdığı
-- `attendance_records` üzerinden değil, oturumun `recorded_by_membership_id`
-- alanından okunur. O alan da tetikleyiciyle dolduğu için güvenilir.

create trigger attendance_sessions_audit_insert
  after insert on public.attendance_sessions
  for each row execute function public.audit_row_change(
    'attendance_session', 'class_id', 'session_date', 'starts_at', 'subject_id'
  );

create trigger attendance_sessions_audit_update
  after update on public.attendance_sessions
  for each row execute function public.audit_row_change(
    'attendance_session', 'class_id', 'session_date', 'starts_at', 'subject_id'
  );

-- INSERT tetikleyicisi BİLEREK yok — yukarıdaki gerekçe.
create trigger attendance_records_audit_update
  after update on public.attendance_records
  for each row execute function public.audit_row_change(
    'attendance_record', 'status', 'student_id', 'session_id'
  );
