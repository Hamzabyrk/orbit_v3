-- v1.4-09 · Şube açılabilir; kapatılmadan önce boşaltılmalı (#284)
--
-- =========================================================================
-- 1. Neden RLS — ve neden v1.4-07'deki gibi Edge Function DEĞİL
-- =========================================================================
--
-- Ölçüldü: `branches` üzerinde `authenticated` için **sıfır yazma yetkisi** ve
-- **tek bir SELECT politikası** (`branches_select_member`). Yani yazma yolu
-- bugün kapalı — v1.4-07'deki `organization_memberships` ile aynı tablo.
--
-- **Ama sebep aynı değil ve cevap da aynı olmamalı.** Üyelik bir **kimlik**
-- kaydıdır ve `DECISION_LOG`'un kuralı onu Edge Function'a bağlıyor. Şube ise
-- kimlik değil, **kurumsal iş verisi** — sınıfın, dersin, planın akrabası.
-- Sınıflar RLS ile yazılıyor; şube de öyle yazılıyor.
--
-- Yazma yolunun bugüne kadar kapalı olması bir karar değil, bir **boşluktu**:
-- `bootstrap-organization` ilk şubeyi yaratıyor ve başka hiçbir şeyin şube
-- yazmaya ihtiyacı olmamıştı.

create policy branches_insert_admin
  on public.branches
  for insert
  to authenticated
  with check (
    public.current_user_has_membership(
      organization_id, null, array['admin']::public.app_role[]
    )
    and not (select public.current_user_must_change_password())
  );

create policy branches_update_admin
  on public.branches
  for update
  to authenticated
  using (
    public.current_user_has_membership(
      organization_id, null, array['admin']::public.app_role[]
    )
    and not (select public.current_user_must_change_password())
  )
  with check (
    public.current_user_has_membership(
      organization_id, null, array['admin']::public.app_role[]
    )
    and not (select public.current_user_must_change_password())
  );

-- **Şube kapsamı `null` geçiliyor, `id` değil.** `current_user_has_membership`
-- ikinci argümanı şube olarak alıyor ve şubeye bağlı bir yönetici yalnız kendi
-- şubesini yönetebilirdi. Şube AÇMAK kurum düzeyinde bir iştir: yeni şubenin
-- kendisi henüz hiçbir yöneticinin kapsamında değildir. `null` geçmek
-- "kurumun yöneticisi olmak yeter" demek.
--
-- DELETE politikası **bilerek yok**: dört yabancı anahtar `RESTRICT` ve
-- kullanılmış bir şube zaten silinemez. Arşiv deseni geçerli.

revoke all (name, is_default, archived_at, organization_id)
  on public.branches from public, anon, authenticated;

grant select (id, organization_id, name, is_default, archived_at, created_at, updated_at)
  on public.branches to authenticated;
grant insert (organization_id, name, is_default) on public.branches to authenticated;
grant update (name, is_default, archived_at) on public.branches to authenticated;

-- `id` INSERT'te verilmiyor: v1.4-00'dan beri ölçülen kural, kimlik
-- veritabanının işidir.

-- =========================================================================
-- 2. Ad tekilliği — arşivlenen şube adını bırakır
-- =========================================================================
--
-- `branches_organization_name_key` **tam** bir `UNIQUE (organization_id, name)`
-- idi. Arşivlenen şube adını sonsuza dek tutardı: "Kadıköy Şubesi" kapatılıp
-- yenisi aynı adla açılamazdı.
--
-- Bu, v1.4-06'da `installments_plan_sequence_key`'de ölçülen tuzağın aynısı ve
-- çözümü de aynı — `students.student_number` ve `student_guardians`'ın deseni.

alter table public.branches
  drop constraint branches_organization_name_key;

create unique index branches_organization_name_active_idx
  on public.branches (organization_id, name)
  where archived_at is null;

comment on index public.branches_organization_name_active_idx is
  'Aktif şubeler arasında ad tekildir. Kısmi olması zorunlu: tam bir UNIQUE, arşivlenen şubenin adını sonsuza dek tutar ve aynı adla yenisi açılamaz.';

-- =========================================================================
-- 3. `is_default` bir anlam kazanıyor
-- =========================================================================
--
-- Ölçüldü: `is_default`'u okuyan **tek fonksiyon** `internal_bootstrap_organization`
-- ve o da yalnız **yazıyor**. Hiçbir sorgu, hiçbir politika ona danışmıyor —
-- yani sütunun bugün bir **davranışı** yok.
--
-- ⚠️ **Ama "şemada hiçbir şey onu korumuyor" DEĞİL ve ilk ölçümüm burada
-- eksikti.** K-10 turunda `is_default`'u fonksiyonlarda aradım, indekslerde
-- aramadım; oysa `branches_one_default_per_organization_idx` **v1.2'den beri
-- duruyor** ve tam olarak "kurum başına en fazla bir aktif varsayılan"ı
-- zorluyor. Eklemek üzere olduğum indeksin aynısı. Hata testte ortaya çıktı:
-- ikinci bir `create unique index` yazdım ve devir denemesi `23505` ile
-- çarptı.
--
-- Kayda geçiyor çünkü ders somut: **bir sütunun "ölü" olduğunu söylemek için
-- onu okuyan kodu aramak yetmez; şemanın kendisi de bir okuyucudur.**
--
-- Dolayısıyla bu dilim yeni bir kısıt eklemiyor. Yaptığı şey sütuna bir
-- **anlam** vermek: `is_default` artık "şube seçilmediyse buraya düşer"
-- demektir (2026-09-13 kararı). "En az bir varsayılan" ise indeksten değil,
-- aşağıdaki arşiv korumasından geliyor.

-- Varsayılanı devretmek tek bir UPDATE ile yapılabilmeli. İstemci "önce
-- eskisini temizle, sonra yenisini işaretle" yapsaydı iki istek arasında
-- kurum **varsayılansız** kalırdı ve ikinci istek düşerse öyle kalırdı.
--
-- ⚠️ Tetikleyici **BEFORE** olmak zorunda ve bu da ölçülerek bulundu. İlk
-- yazımda `after update` idi; mevcut tekillik indeksi ertelenebilir olmadığı
-- için satır yazılırken çarpıyor ve AFTER tetikleyicisi hiç çalışmıyordu.
-- BEFORE'da ise eski varsayılan, yeni satırın indeks girdisi yazılmadan önce
-- temizleniyor.
create or replace function public.enforce_single_default_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_default and new.archived_at is null then
    update public.branches
    set is_default = false
    where organization_id = new.organization_id
      and id <> new.id
      and is_default;
  end if;

  return new;
end;
$$;

comment on function public.enforce_single_default_branch() is
  'Bir şube varsayılan yapıldığında kurumun diğer varsayılanlarını temizler. BEFORE olmak zorunda: branches_one_default_per_organization_idx ertelenebilir değil, dolayısıyla AFTER tetikleyicisi hiç çalışamadan satır 23505 ile çarpar (ölçüldü). Tek işlemde olması da zorunlu: istemci iki adımda yapsaydı arada kurum varsayılansız kalırdı.';

revoke all on function public.enforce_single_default_branch()
  from public, anon, authenticated;

create trigger branches_single_default_insert
  before insert on public.branches
  for each row execute function public.enforce_single_default_branch();

create trigger branches_single_default_update
  before update of is_default on public.branches
  for each row execute function public.enforce_single_default_branch();

-- =========================================================================
-- 4. Dolu şube kapatılamaz
-- =========================================================================
--
-- Ölçüldü: şubeye bakan **dört yabancı anahtarın dördü de `RESTRICT`**
-- (`audit_events`, `classes`, `organization_memberships`, `students`), yani
-- kullanılmış şube **silinemiyor**. Ama `RESTRICT` yalnız DELETE'i engelliyor;
-- **arşivlemeyi hiçbir şey sınamıyordu.**
--
-- Sonuç: 40 öğrencisi olan bir şube arşivlenebilir ve o öğrenciler
-- arşivlenmiş bir şubeyi göstermeye devam ederdi — listelerden düşmeyen ama
-- "yok" sayılan bir yapı.
--
-- Üç kural da `ORB03` ("satır bu iş için uygun değil") ve `detail` hangisi
-- olduğunu söylüyor. Yeni bir kod açılmadı: üçü de aynı aileden ve
-- kullanıcının cevabı aynı biçimde — "önce şunu yap, sonra tekrar dene".

create or replace function public.enforce_branch_is_empty_before_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ogrenci integer;
  sinif integer;
  uyelik integer;
  kalan_sube integer;
begin
  if old.archived_at is not null or new.archived_at is null then
    return new;
  end if;

  select count(*) into ogrenci
  from public.students as ogr
  where ogr.branch_id = new.id and ogr.archived_at is null;

  select count(*) into sinif
  from public.classes as snf
  where snf.branch_id = new.id and snf.archived_at is null;

  select count(*) into uyelik
  from public.organization_memberships as uye
  where uye.branch_id = new.id and uye.status <> 'suspended';

  if ogrenci + sinif + uyelik > 0 then
    raise exception 'Bu şube kapatılamaz: içinde aktif kayıtlar var.'
      using errcode = 'ORB03',
            detail = format(
              'öğrenci=%s, sınıf=%s, üyelik=%s', ogrenci, sinif, uyelik
            ),
            hint = 'Önce bu kayıtları başka bir şubeye taşıyın veya arşivleyin.';
  end if;

  select count(*) into kalan_sube
  from public.branches as sube
  where sube.organization_id = new.organization_id
    and sube.archived_at is null
    and sube.id <> new.id;

  -- Son şube: kurum şubesiz kalırdı ve yeni üye/öğrenci hiçbir şubeye
  -- bağlanamazdı.
  if kalan_sube = 0 then
    raise exception 'Kurumun son şubesi kapatılamaz.'
      using errcode = 'ORB03',
            detail = 'işlem sonrası kalacak aktif şube sayısı=0',
            hint = 'Kapatmadan önce başka bir şube açın.';
  end if;

  -- Varsayılan şube: başka aktif şube varken kapatılırsa kurum varsayılansız
  -- kalır. Çözüm bir temizlik değil, **başkasını varsayılan yapmak** — bu
  -- yüzden ayrı bir `hint`. (v1.4-08'in `ORB06`'sıyla aynı biçim.)
  if old.is_default then
    raise exception 'Varsayılan şube kapatılamaz.'
      using errcode = 'ORB03',
            detail = 'kapatılmak istenen şube kurumun varsayılan şubesi',
            hint = 'Önce başka bir şubeyi varsayılan yapın, sonra bunu kapatın.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_branch_is_empty_before_archive() is
  'Şube arşivlenmeden önce boş olmalıdır: aktif öğrenci, sınıf veya askıda olmayan üyelik varsa ORB03 ile reddedilir ve detail kaç tane olduğunu söyler. Ayrıca son aktif şube ve varsayılan şube kapatılamaz. RESTRICT yabancı anahtarları yalnız DELETE''i engelliyordu; arşivlemeyi hiçbir şey sınamıyordu (ölçüldü).';

revoke all on function public.enforce_branch_is_empty_before_archive()
  from public, anon, authenticated;

create trigger branches_empty_before_archive
  before update of archived_at on public.branches
  for each row execute function public.enforce_branch_is_empty_before_archive();

-- =========================================================================
-- 5. Denetim ve yayın — atlanmış bir tablo daha
-- =========================================================================
--
-- v1.4-05 (ödev), v1.4-10 (veli) ve v1.4-06 (ödeme) ile aynı boşluk, aynı
-- sebep: `branches` `audit_row_change`'den (v1.4-02) ve broadcast
-- tetikleyicilerinden (v1.3-13) **önce** yazıldı. Ölçüldü — sıfır denetim,
-- sıfır yayın tetikleyicisi vardı.
--
-- `is_default` izlenen alanlar arasında ve bu bilinçli: varsayılanın
-- devredilmesi, yeni kayıtların hangi şubeye düşeceğini değiştirir. Kimin ne
-- zaman devrettiği sorulabilecek bir sorudur.
--
-- ⚠️ `branches` tablosunda `branch_id` sütunu yok; `audit_row_change`
-- `yeni ->> 'branch_id'` okuduğunda `null` gelir ve denetim satırının şube
-- alanı boş kalır. Kusur değil: şube kaydının kendisi kuruma ait.

create trigger branches_audit_insert
  after insert on public.branches
  for each row execute function public.audit_row_change(
    'branch', 'name', 'is_default'
  );

create trigger branches_audit_update
  after update on public.branches
  for each row execute function public.audit_row_change(
    'branch', 'name', 'is_default'
  );

create trigger branches_broadcast_insert
  after insert on public.branches
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger branches_broadcast_update
  after update on public.branches
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger branches_broadcast_delete
  after delete on public.branches
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();
