-- v1.4-06 · Yanlış girilmiş taksit geri alınabilir (#277)
--
-- =========================================================================
-- 1. Ölçülen açık
-- =========================================================================
--
-- Ödeme yazma yüzeyi **v1.2-06'dan beri tamamen açık**: `payment_plans` ve
-- `installments` üzerinde INSERT ve UPDATE yetkileri sütun bazında verilmiş,
-- politikalar yalnız `admin`. Eksik olan ekran, şema değil.
--
-- Ama bir şey **gerçekten** eksikti ve v1.4-06 açılırken ölçüldü:
-- **yanlış girilmiş bir taksiti kaldırmanın hiçbir yolu yoktu.**
--
--   `installments` üzerinde `archived_at` ................... YOK
--   `authenticated` için DELETE yetkisi .................... YOK
--   DELETE politikası ...................................... YOK
--
-- Tutarı düzeltmek mümkündü (`UPDATE amount`), ama fazladan girilmiş bir
-- taksit defterde kalıyor ve **planın toplamı kalıcı olarak yanlış** oluyordu.
--
-- =========================================================================
-- 2. Bu, yazılı bir nota bilinçli aykırılıktır
-- =========================================================================
--
-- 20260908050000 şunu yazmıştı:
--
--   > "Arşiv `payment_plans`'tedir: `installments` tablosunda `archived_at`
--   >  sütunu YOK — `attendance_records` ve `exam_results` ile aynı kalıp."
--
-- **Kalıp o iki tablo için doğru.** Onlar öğrenci başına **ölçümlerdir** ve
-- varlıkları bir oturuma veya sınava bağlıdır: oturum yanlış açıldıysa
-- oturum arşivlenir, tek tek yoklama satırları değil.
--
-- **Taksit öyle değil.** Doğru bir planın içindeki **tek yanlış satırdır**;
-- planın tamamını arşivlemek, bir harfi düzeltmek için sayfayı yırtmaktır.
-- Ve finansal bir defterde DELETE de doğru cevap değil — kayıt kalmalı,
-- yalnız hesaba katılmamalı.
--
-- Karar 2026-09-12'de Arda Bülent tarafından verildi; kalıptan ayrışmanın
-- bedeli bu yorumla ödeniyor (`DECISION_LOG`).
--
-- =========================================================================
-- 3. Asıl iş sütun değil — üç okuma yolu
-- =========================================================================
--
-- Ölçüldü: taksitleri okuyan **üç** fonksiyon var ve hiçbiri arşiv süzmüyor
-- (o gün süzecek bir şey yoktu). Sütunu ekleyip burada durmak, düzeltmenin
-- **hiçbir şeyi düzeltmemesi** olurdu: arşivlenmiş taksit borç olarak
-- sayılmaya devam ederdi ve veli hâlâ "vadesi geçmiş ödemeniz var" görürdü.
--
-- Üçü de aşağıda yeniden yazılıyor. Değişen tek şey arşiv süzgeci; gerekçe
-- yorumları ve `orbit_today()` kullanımı olduğu gibi korunuyor.

alter table public.installments
  add column archived_at timestamptz;

comment on column public.installments.archived_at is
  'Yanlış girilmiş taksit arşivlenir, silinmez. Arşivli taksit HİÇBİR hesaba katılmaz: ne borç, ne tahsilat, ne "sonraki taksit". Bu sütun attendance_records ve exam_results kalıbından bilinçli bir ayrılıştır — taksit bir ölçüm değil, doğru bir planın içindeki tek satırdır (v1.4-06 kararı).';

revoke all (archived_at) on public.installments from public, anon, authenticated;
grant select (archived_at) on public.installments to authenticated;
grant update (archived_at) on public.installments to authenticated;

-- =========================================================================
-- 4. Sıra numarası tuzağı — ölçüldü
-- =========================================================================
--
-- `installments_plan_sequence_key` **tam** bir `UNIQUE (plan_id, sequence_no)`
-- idi. Arşivlenmiş taksit sıra numarasını sonsuza dek tutacağı için,
-- 3. taksit arşivlenip yerine yeni bir 3. taksit girilmek istendiğinde
-- `23505` ile çarpışırdı — yani arşiv özelliği ilk kullanışta kendini
-- kilitlerdi.
--
-- Kısmi tekillik indeksine çevriliyor: `student_guardians` ve
-- `students.student_number`'ın aynı deseni. Arşivlenen satır numarasını
-- **bırakır**; aktif taksitler arasında numara yine tekildir.

alter table public.installments
  drop constraint installments_plan_sequence_key;

create unique index installments_plan_sequence_active_idx
  on public.installments (plan_id, sequence_no)
  where archived_at is null;

comment on index public.installments_plan_sequence_active_idx is
  'Aktif taksitler arasında sıra numarası tekildir. Kısmi olması zorunlu: tam bir UNIQUE, arşivlenen taksitin numarasını sonsuza dek tutar ve yerine yenisi girilemez.';

-- Vade indeksi de arşivi dışlıyor: "vadesi geçmiş ödenmemiş taksit"
-- sorgusunun kapsamı artık üç koşullu.
drop index if exists public.installments_due_idx;

create index installments_due_idx
  on public.installments (organization_id, due_date)
  where paid_at is null and archived_at is null;

-- =========================================================================
-- 5. Üç okuma yolu — arşiv süzgeci eklendi
-- =========================================================================

create or replace function public.student_payment_summaries(
  target_student_ids uuid[]
)
returns table (
  student_id uuid,
  overdue_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    plan.student_id,
    count(installment.id) filter (
      where installment.paid_at is null
        and installment.archived_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count
  from public.payment_plans as plan
  left join public.installments as installment
    on installment.plan_id = plan.id
  where plan.student_id = any(target_student_ids)
    and plan.archived_at is null
  group by plan.student_id;
$$;

comment on function public.student_payment_summaries(uuid[]) is
  'Öğrenci başına vadesi geçmiş ödenmemiş taksit sayısı. Arşivlenmiş taksit sayılmaz (v1.4-06). Satır dönmesi "görülebilir bir ödeme planı var" demektir; planı olmayan ya da ödemeyi görmeye yetkisi olmayan için satır DÖNMEZ ve rozet çizilmez ("Güncel" değil). `security definer` DEĞİLDİR: ödeme yalnızca yönetici ve velinindir, definer olsaydı öğretmene açılırdı.';

create or replace function public.payment_plan_summaries(
  target_plan_ids uuid[]
)
returns table (
  plan_id uuid,
  overdue_count bigint,
  next_due_date date,
  next_due_amount numeric
)
language sql
stable
set search_path = ''
as $$
  select
    plan.id as plan_id,
    count(installment.id) filter (
      where installment.paid_at is null
        and installment.archived_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count,
    min(installment.due_date) filter (
      where installment.paid_at is null
        and installment.archived_at is null
    ) as next_due_date,
    (
      array_agg(installment.amount order by installment.due_date, installment.sequence_no)
      filter (where installment.paid_at is null and installment.archived_at is null)
    )[1] as next_due_amount
  from public.payment_plans as plan
  left join public.installments as installment
    on installment.plan_id = plan.id
  where plan.id = any(target_plan_ids)
    and plan.archived_at is null
  group by plan.id;
$$;

comment on function public.payment_plan_summaries(uuid[]) is
  'Plan başına: vadesi geçmiş ödenmemiş taksit sayısı, ödenmemiş EN ERKEN taksitin tarihi ve tutarı. Arşivlenmiş taksit hiçbirine katılmaz (v1.4-06). "Sonraki taksit" geçmişte olabilir. Taksiti hiç olmayan planda tarih ve tutar NULL döner, 0 değil. `security definer` DEĞİLDİR.';

-- `payment_overview_counts`'ta arşiv süzgeci **`where`'e** konuyor, tek tek
-- `filter`'lara değil — ve bu ayrım önemli. Buradaki `having count(*) > 0`
-- "görecek taksiti olmayan çağırana hiç satır dönmesin" diyor; arşiv süzgeci
-- `filter` içinde kalsaydı, yalnız arşivli taksiti olan bir kurum üç sıfır
-- okurdu ve o sıfırlar "kurumda hiç ödeme yok" derdi. Arşivli satır
-- sayılmayacaksa, sayımın dışında **tamamen** olmalı.
create or replace function public.payment_overview_counts()
returns table (
  collected_this_month numeric,
  upcoming_count bigint,
  overdue_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    coalesce(
      sum(installment.amount) filter (
        where installment.paid_at is not null
          and public.orbit_local_date(installment.paid_at)
                >= date_trunc('month', public.orbit_today())::date
          and public.orbit_local_date(installment.paid_at) <= public.orbit_today()
      ),
      0
    ) as collected_this_month,
    count(*) filter (
      where installment.paid_at is null
        and installment.due_date >= public.orbit_today()
        and installment.due_date <= public.orbit_today() + 7
    ) as upcoming_count,
    count(*) filter (
      where installment.paid_at is null
        and installment.due_date < public.orbit_today()
    ) as overdue_count
  from public.installments as installment
  join public.payment_plans as plan
    on plan.id = installment.plan_id
  where plan.archived_at is null
    and installment.archived_at is null
  having count(*) > 0;
$$;

comment on function public.payment_overview_counts() is
  'Ödeme ekranının yönetici kartları: bu ay tahsil edilen tutar, önümüzdeki 7 gün içinde vadesi gelen taksit sayısı, vadesi geçmiş taksit sayısı. Arşivlenmiş taksit sayımın tamamen dışındadır (v1.4-06) — filter içinde süzülse, yalnız arşivli taksiti olan kurum "hiç ödeme yok" anlamına gelen üç sıfır okurdu. Görebildiği taksit olmayan çağırana HİÇ SATIR dönmez. `security definer` DEĞİLDİR: kapsam RLS''ten gelir.';

-- =========================================================================
-- 6. Denetim izi — ödemede en gerekli olduğu yer
-- =========================================================================
--
-- v1.4-05 (ödev) ve v1.4-10 (veli) ile aynı boşluk, aynı sebep: bu tablolar
-- `audit_row_change`'den (v1.4-02) önce yazıldı. Ölçüldü — iki tabloda da
-- sıfır denetim tetikleyicisi vardı. Realtime yayını zaten vardı.
--
-- **Tam denetleniyor ve burada tartışma yok.** Para söz konusu olduğunda
-- "kim ne zaman değiştirdi" sorusu en sık sorulan sorudur: bir taksitin
-- tutarının, vadesinin veya "ödendi" damgasının kim tarafından
-- değiştirildiği, velinin de kurumun da ilk sorusu olur.
--
-- `paid_at` izleniyor ve bu listenin en önemli üyesi: bir taksiti "ödendi"
-- işaretlemek ya da işareti geri almak, defterin parayı gördüğü tek yer.
--
-- Arşivleme `audit_row_change` tarafından izlenen listeden bağımsız ele
-- alınıyor: `installment.archived` / `.restored` kendi eylemleri olarak
-- düşüyor — yanlış taksitin geri alınması bir güncelleme değil, ayrı bir olay.

create trigger payment_plans_audit_insert
  after insert on public.payment_plans
  for each row execute function public.audit_row_change(
    'payment_plan', 'name', 'total_amount', 'student_id'
  );

create trigger payment_plans_audit_update
  after update on public.payment_plans
  for each row execute function public.audit_row_change(
    'payment_plan', 'name', 'total_amount', 'student_id'
  );

create trigger installments_audit_insert
  after insert on public.installments
  for each row execute function public.audit_row_change(
    'installment', 'amount', 'due_date', 'paid_at', 'sequence_no', 'plan_id'
  );

create trigger installments_audit_update
  after update on public.installments
  for each row execute function public.audit_row_change(
    'installment', 'amount', 'due_date', 'paid_at', 'sequence_no', 'plan_id'
  );
