-- v1.4-10 · Veli önce bir kayıttır, sonra bir bağ (#275)
--
-- =========================================================================
-- 1. Yol haritasının varsayımı eksikti — ve bu ikinci kez
-- =========================================================================
--
-- Dilimin adı "veli–öğrenci bağının kurulması" idi ve gerekçesi şuydu:
-- `student_guardians` v1.2-03'te geldi, velinin **bütün** kapsamı ona
-- dayanıyor, satır oluşturan bir ekran ise hiç olmadı.
--
-- Doğru ama **eksik.** K-10 turu (2026-09-12) ölçtü: ortada bağlanacak bir
-- veli **kaydı** da yok, ve onu yaratan hiçbir yol yok.
--
--   `guardians` tablosuna yazan veritabanı fonksiyonu ......... 0
--   `guardians` tablosuna yazan istemci kodu .................. 0
--   üretimde `guardians` satır sayısı ......................... 0
--
-- Kanıtı v1.4-00'ın kendi çıktısında duruyor: o dilim **dört** RPC yazdı ama
-- istemci bugün yalnız ikisini çağırıyor. `link_guardian_account` ve
-- `unlink_guardian_account` hiç çağrılmıyor — çünkü bağlanacak kayıt yok.
--
-- Yani §4.7'nin A bulgusunun **veli yarısı hâlâ açıktı**: v1.4-00 öğrenci
-- yarısını kapattı, veli rolüyle giren kişi bugün hâlâ boş panel görüyor.
--
-- Bu, K-10'un ikinci kez aynı dilim ailesinde işe yaradığı yer (**K-11**):
-- v1.4-00'da da "zemin hazır, yazılmayan tek şey satırlar" denmişti ve
-- eksikti. Kayıt `ROADMAP` §4.7'ye düşüldü.
--
-- **Şema işi bu yüzden küçük:** tablolar, yabancı anahtarlar, kısmi tekillik
-- indeksi ve sütun yetkileri **zaten doğru**. Eksik olan üç şey aşağıda.

-- =========================================================================
-- 2. Velinin telefonu — yazılı bir sözün karşılığı
-- =========================================================================
--
-- `PROJECT_STATE` MVP madde 2 şunu söylüyor:
--
--   > "Öğrenci Yönetimi: Ad-Soyad, Öğrenci No, Sınıf, Telefon, **Veli Adı,
--   >  Veli Telefonu**"
--
-- Ölçüldü: telefon **yalnız `profiles`'ta** (giriş hesabının alanı).
-- `guardians` tablosunda telefon yok. Sonuç: **giriş hesabı olmayan velinin
-- telefonu hiçbir yerde durmuyor** — oysa bir dershanenin veli verisini asıl
-- kullanım biçimi tam olarak odur ve velilerin çoğunun hesabı olmayacak.
--
-- Kısıt `profiles.phone`'unkiyle **birebir aynı** tutuldu (7–30 karakter,
-- boş olabilir) — aynı kavramın iki tabloda farklı kurallara bağlanması
-- **K-06**'nın uyardığı şeydir. Biçim doğrulaması bilerek yok: ülke kodu,
-- sabit hat, dahili numara ve yurt dışı numarası hepsi meşru ve şemaya
-- yazılacak tek bir Türkiye kalıbı yok (v1.2-11'in `recovery_email`
-- kararının aynı ailesi).
--
-- ⚠️ **Kişisel veri.** `PLATFORM_SETTINGS`'in KVKK bölümü bu sütunu da
-- kapsar; yeni bir kategori açmıyor (telefon zaten `profiles`'ta işleniyor)
-- ama artık **hesabı olmayan kişilerin** telefonu da tutuluyor.

alter table public.guardians
  add column phone text;

alter table public.guardians
  add constraint guardians_phone_check
  check (
    phone is null
    or (char_length(trim(both from phone)) >= 7
        and char_length(trim(both from phone)) <= 30)
  );

comment on column public.guardians.phone is
  'Velinin telefonu. Giriş hesabından bağımsızdır: hesabı olmayan velinin de telefonu burada durur (profiles.phone yalnız hesap sahibinindir). Kısıt profiles.phone ile birebir aynıdır. Biçim doğrulanmaz — ülke kodu, sabit hat ve yurt dışı numarası meşrudur.';

-- Yetki: önce geri al, sonra ver. `select` zaten tablo düzeyinde verilmişti;
-- yazma yetkisi sütun bazında ve yalnız `authenticated` için açılıyor.
revoke all (phone) on public.guardians from public, anon, authenticated;
grant select (phone) on public.guardians to authenticated;
grant insert (phone) on public.guardians to authenticated;
grant update (phone) on public.guardians to authenticated;

-- =========================================================================
-- 3. Öğrenci kendi velisini görebilir
-- =========================================================================
--
-- Ölçüldü: `student_guardians` üzerinde üç SELECT politikası vardı —
-- `admin`, `guardian` ve `teacher`. **Öğrenci için hiçbiri yoktu**, yani bir
-- öğrenci kendi kaydının kime bağlı olduğunu göremiyordu.
--
-- Bunun v1.2-03'ün kararıyla ilgisi yok ve karıştırılmamalı. O karar
-- _"bir veli aynı öğrencinin **diğer velisini** görmez"_ diyor ve yürürlükte:
-- `student_guardians_select_guardian` politikası veliyi **kendi** satırıyla
-- sınırlıyor, yani iki veli birbirini görmüyor. Buradaki soru başkaydı ve
-- cevabı 2026-09-12'de verildi: öğrenci **kendi** velilerini görür.
--
-- Politika `current_user_owns_student_record` üzerine kuruluyor (v1.2-04) —
-- yani öğrenci yalnız `students.auth_user_id`'si kendisine ait satırların
-- bağlarını okuyabiliyor. Şifre değişimi kilidi diğer beş politikadaki
-- biçimin aynısıyla taşınıyor (v1.2-11).

create policy student_guardians_select_student
  on public.student_guardians
  for select
  to authenticated
  using (
    public.current_user_owns_student_record(student_id)
    and not (select public.current_user_must_change_password())
  );

-- =========================================================================
-- 4. Denetim ve yayın — atlanmış iki tablo daha
-- =========================================================================
--
-- v1.4-05'te ödev için yapılanın aynısı ve aynı sebeple: `audit_row_change`
-- v1.4-02'de, broadcast tetikleyicileri v1.3-13'te geldi; `guardians` ve
-- `student_guardians` ikisinden de **önce** yazıldığı için ikisini de
-- almamıştı. Ölçüldü — iki tabloda da sıfır denetim, sıfır yayın
-- tetikleyicisi vardı.
--
-- **`guardians` tam denetleniyor.** Hacim tartışması burada yok: veli sayısı
-- öğrenci sayısıyla aynı büyüklükte ve kayıt seyrek değişiyor.
--
-- **`student_guardians`'ta izlenen alanlar `student_id` ve `guardian_id`.**
-- Bir bağın kurulması ve koparılması velinin erişiminin **açılması ve
-- kapanması** demek — v1.2-19'un deyişiyle veli erişimi "devredilmiş" bir
-- erişimdir ve bağ bitince biter. Kimin ne zaman erişim kazandığı, denetim
-- defterinin cevaplaması gereken ilk sorulardan biri.
--
-- `archived_at` izlenen listede yok ama iz bırakıyor: `audit_row_change` onu
-- listeden bağımsız okuyup `student_guardian.archived` / `.restored`
-- üretiyor — bağın koparılması **kendi eylemi** olarak defterde görünüyor.
--
-- ⚠️ `student_guardians` tablosunda `branch_id` **yok**; `audit_row_change`
-- `yeni ->> 'branch_id'` okuduğunda `null` gelir ve denetim satırının şube
-- alanı boş kalır. Bu bir kusur değil: bağ kuruma ait, şubeye değil.

create trigger guardians_audit_insert
  after insert on public.guardians
  for each row execute function public.audit_row_change(
    'guardian', 'full_name', 'phone', 'auth_user_id'
  );

create trigger guardians_audit_update
  after update on public.guardians
  for each row execute function public.audit_row_change(
    'guardian', 'full_name', 'phone', 'auth_user_id'
  );

create trigger student_guardians_audit_insert
  after insert on public.student_guardians
  for each row execute function public.audit_row_change(
    'student_guardian', 'student_id', 'guardian_id'
  );

create trigger student_guardians_audit_update
  after update on public.student_guardians
  for each row execute function public.audit_row_change(
    'student_guardian', 'student_id', 'guardian_id'
  );

create trigger guardians_broadcast_insert
  after insert on public.guardians
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger guardians_broadcast_update
  after update on public.guardians
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger guardians_broadcast_delete
  after delete on public.guardians
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger student_guardians_broadcast_insert
  after insert on public.student_guardians
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger student_guardians_broadcast_update
  after update on public.student_guardians
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger student_guardians_broadcast_delete
  after delete on public.student_guardians
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();
