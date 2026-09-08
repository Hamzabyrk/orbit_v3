-- Sınava kaç kişi girdiği, çağıranın kaç satır görebildiği DEĞİLDİR (v1.3-01/D).
--
-- =========================================================================
-- Bulgu
-- =========================================================================
--
-- D parçasında sınav başlığı "7 Eylül 2026 · 3 katılımcı · 100 üzerinden"
-- diyor ve katılımcı sayısı istemcide, `exams` sorgusuna gömülen
-- `exam_results (id)` dizisinin **uzunluğu** sayılarak bulunuyordu.
--
-- `exam_results` üzerindeki RLS satır bazlıdır: yönetici kurumun hepsini,
-- öğretmen yalnız okuttuğu öğrencilerin satırını, öğrenci yalnız kendi
-- satırını, veli yalnız çocuğununkini görür. Dolayısıyla o dizinin uzunluğu
-- sınava kaç kişinin girdiğini değil, **çağıranın kaç satır görmeye yetkili
-- olduğunu** ölçüyordu.
--
-- Canlıda ölçüldü (2026-09-08, `begin; … rollback;` içinde; kalıcı satır
-- yazılmadı). Kurum geneli bir denemeye üç öğrenci girdi:
--
--     gerçek katılımcı : 3
--     yönetici görür   : 3   ✅
--     öğretmen görür   : 2   ❌  (yalnız okuttuğu sınıftaki ikisi)
--     öğrenci görür    : 1   ❌  (yalnız kendi satırı)
--
-- Öğrenci ve veli için bu sayı **her zaman 1**, sınava girmemiş biri için
-- **her zaman 0** olurdu — yetkili görünen, sabit ve yanlış bir sayı.
-- C parçasındaki devam yüzdesiyle aynı aile: sistemin bilmediği bir şeyi
-- biliyormuş gibi göstermek (K-03, K-22).
--
-- =========================================================================
-- Neden yeni bir yetki AÇMIYOR
-- =========================================================================
--
-- Katılımcı sayısı bugün zaten türetilebilir: `exam_ranking(uuid)` sınavdaki
-- **her sonuç için bir satır** döndürüyor; isimler maskeleniyor ama satır
-- sayısı gerçek. Aynı canlı ölçümde:
--
--     exam_ranking satır sayısı → yönetici 3, öğretmen 3, öğrenci 3
--     sınavla ilgisi olmayan üye → 0 (boş küme)
--
-- Yani bu fonksiyon, `exam_ranking`'in aynı çağırana zaten verdiği bir sayıyı
-- ucuza veriyor; kimseye yeni bir şey göstermiyor. Yetki koşulu da
-- uydurulmadı, `exam_ranking`'inkinin **aynısı** (K-06: aynı olgu iki yerde
-- iki kurala bağlanırsa biri eskir):
--
--   > "Sıralamayı görme koşulu: çağıran sınavda en az bir öğrenciyi
--   >  görebiliyor olmalı."
--
-- Sıralamayı çekip satır saymak da bir seçenekti ve reddedildi: 500 kişilik
-- bir denemede başlıktaki tek sayı için 500 satır taşınırdı, üstelik LİSTE
-- ekranı SIRALAMA yoluna bağlanmış olurdu. `DECISION_LOG` — "İki yol
-- birbirinin yerine geçmez."
--
-- =========================================================================
-- Neden `0` değil `null`
-- =========================================================================
--
-- Yetkisiz çağırana `0` dönmek "bu sınava kimse girmedi" demektir ve bu bir
-- iddiadır (K-22). Fonksiyon `null` döner, istemci de o ibareyi hiç çizmez —
-- susmak hiçbir zaman yanlış bir cevap değildir. Sonucu henüz girilmemiş bir
-- sınav da `null` döner: "kimse girmedi" ile "sana gösterecek bir şey yok"
-- ayrımı, ilgisiz bir üyeye "bu sınavın sonuçları girilmiş" bilgisini
-- sızdıracak yeni bir kanal açardı.

create or replace function public.exam_participant_count(target_exam_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  with sinav as (
    select exam.id, exam.organization_id
    from public.exams as exam
    where exam.id = target_exam_id
      and exam.archived_at is null
      and public.current_user_has_membership(exam.organization_id)
      and not public.current_user_must_change_password()
  ),
  satirlar as (
    select
      (
        public.current_user_has_membership(
          sinav.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_student(result.student_id)
        or public.current_user_owns_student_record(result.student_id)
        or public.current_user_guards_student(result.student_id)
      ) as gorebilir
    from public.exam_results as result
    join sinav on sinav.id = result.exam_id
  )
  select case
    when exists (select 1 from satirlar where gorebilir)
      then (select count(*) from satirlar)
  end;
$$;

comment on function public.exam_participant_count(uuid) is
  'Sınava kaç kişi girdiği. `security definer`: sayı çağıranın GÖRDÜĞÜ satırlardan değil, sınavın tamamından gelir — RLS ile sayılsaydı öğrenci her sınavda "1 katılımcı" görürdü. Yetki koşulu `exam_ranking` ile aynıdır: çağıran sınavda en az bir öğrenciyi görebiliyorsa sayı döner, göremiyorsa `null` (0 değil: 0 bir iddiadır). Arşivlenmiş sınav için de `null`.';

revoke all on function public.exam_participant_count(uuid) from public, anon, authenticated;
grant execute on function public.exam_participant_count(uuid) to authenticated;
