-- v1.4-07 · Bir üyeliğin rolü değişebilir, üyelik sona erebilir (#280)
--
-- =========================================================================
-- 1. Neden RPC değil de `internal_*` — ölçüldü
-- =========================================================================
--
-- Bu dilim v1.4'ün diğer dilimlerinden **yapısal olarak farklı** ve sebebi
-- ölçüldü: `organization_memberships` üzerinde `authenticated` için **sıfır
-- yazma yetkisi** var ve yalnız iki SELECT politikası (`memberships_select_admin`,
-- `memberships_select_self`). INSERT/UPDATE/DELETE politikası **hiç yok**.
--
-- Yani rol değiştirme ve çıkarma RLS'ten geçemez — ve bu bir eksik değil,
-- `DECISION_LOG`'un kararı: _"İş verisi RLS ile yazılır, kimlik işlemleri
-- Edge Function'da kalır."_ Üyelik bir kimlik kaydıdır.
--
-- Desen de kurulu ve aynen izleniyor (`internal_create_membership`):
-- iş `internal_*` bir `security definer` fonksiyonunda yapılır, fonksiyon
-- **kendi denetim kaydını yazar**, `authenticated`'dan revoke edilir ve yalnız
-- `service_role`'a verilir; Edge Function ince bir kabuktur.
--
-- **Çağıran kimliği parametreyle geçiyor, `auth.uid()`'den okunmuyor.**
-- `service_role` bağlamında `auth.uid()` boştur; denetim kaydının failini
-- doğru yazmanın tek yolu onu Edge Function'ın doğrulanmış jetonundan alıp
-- parametre olarak vermektir. Bu da mevcut desenin aynısı.
--
-- =========================================================================
-- 2. "Çıkarma" neden DELETE değil — ölçüldü
-- =========================================================================
--
-- Üyeliğe bakan **sekiz** yabancı anahtarın **sekizi de `RESTRICT`**:
-- `attendance_sessions.recorded_by_membership_id`, `calendar_events.owner_membership_id`,
-- `class_teachers.membership_id`, `classes.mentor_membership_id`,
-- `daily_feed_posts.author_membership_id`, `homework_assignments.assigned_by_membership_id`,
-- `schedule_entries.membership_id`, `tasks.owner_membership_id`.
--
-- Bir kez iş yapmış üyelik **fiziksel olarak silinemiyor** ve bu doğru:
-- yoklamayı kimin aldığını silmek defteri bozar. Geriye `status` kalıyor.
--
-- `membership_status` = `invited | active | suspended`. **`suspended` bugüne
-- kadar hiç kullanılmamıştı** — üretimde 0 satır, hiçbir fonksiyonda geçmiyor.
-- Bu dilim onu ilk kez çalıştırıyor. Dördüncü bir değer (`removed`) açılmadı:
-- "geçici askı" ile "kurumdan ayrılma" ayrımı bugün bir ihtiyaç değil ve
-- farkı **denetim defteri** söylüyor (2026-09-12 kararı).
--
-- =========================================================================
-- 3. Çıkarma role göre iki iş yapıyor — ve gerekçesi ölçüm
-- =========================================================================
--
-- On beş kapsam yardımcısı tek tek okundu. `status = 'active'` süzenler:
-- `current_user_has_membership`, `current_user_administers_person`,
-- `current_user_is_platform_operator`, `current_user_owns_membership`,
-- `current_user_teaches_class`. Öğretmenin diğer iki yardımcısı
-- (`teaches_student`, `can_record_attendance`) bunlara **devrediyor**, yani
-- personel tarafı tamamen kapsanıyor.
--
-- **Öğrenci ve veli tarafı kapsanmıyor:**
--
--   `current_user_owns_student_record` → `students.auth_user_id = auth.uid()`
--   `current_user_attends_class`       → `students.auth_user_id`
--   `current_user_guards_student`      → `guardians.auth_user_id`
--   `current_user_guards_class`        → `guards_student`'a devrediyor
--
-- Hiçbiri üyeliğe bakmıyor, çünkü onların kapsamı üyelikten değil **bağdan**
-- geliyor — v1.4-00 ve v1.4-10'un kurduğu yol. Sonuç: bir öğrencinin
-- üyeliğini `suspended` yapmak **erişimini kesmiyor.**
--
-- **Karar (2026-09-12): beş yardımcıya status süzgeci EKLENMİYOR.** Onlar
-- RLS'in en sıcak yolu ve v1.4-00'ın "kapsam bağdan gelir" kararıyla
-- çelişirdi. Bunun yerine çıkarma **iki şey** yapıyor:
--
--   1. Her rolde `status = 'suspended'` — üye listesinin dürüst kalması için.
--      Ayrılmış birinin "aktif" görünmesi, listeye bakan yöneticiye yanlış
--      söyler.
--   2. Öğrenci ve velide **ek olarak bağ koparılır** — erişimi fiilen kesen
--      tek şey o.
--
-- ⚠️ **Bedeli açıkça yazılıyor:** "çıkarma" role göre farklı şey yapıyor ve
-- ekran bunu **söylemek zorunda**. Yoksa yönetici bir öğrenciyi çıkarır ve
-- akademik kaydının hesaptan koptuğunu bilmez.
--
-- **Bağ koparma burada satır içinde yapılıyor, `unlink_student_account`
-- çağrılmıyor** ve bu bilinçli: o RPC yetkiyi `auth.uid()` üzerinden sınıyor,
-- `service_role` bağlamında `auth.uid()` boş olduğu için `42501` verirdi.
-- Denetim sözlüğü yine aynı tutuluyor — `student.account_unlinked` /
-- `guardian.account_unlinked` — ki defteri okuyan iki ayrı kelime görmesin
-- (**K-06**).

-- =========================================================================
-- 4. Rol değiştirme
-- =========================================================================
--
-- Şemanın zaten koyduğu kural burada **tekrarlanmıyor** (**K-06**):
-- `enforce_role_change_keeps_assignments` tetikleyicisi, `admin`/`teacher`'dan
-- çıkarken ayakta duran ders ataması, rehberlik veya program satırı varsa
-- `ORB03` ile reddediyor. Bu fonksiyon o hatayı **yutmuyor**; `detail` ve
-- `hint` olduğu gibi çağırana gidiyor ve ekran "önce şu atamaları arşivle"
-- diyebiliyor.

create or replace function public.internal_change_member_role(
  caller_user_id uuid,
  target_membership_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef public.organization_memberships;
begin
  select * into hedef
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'membership not found' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  -- Yönetici yapmak ve yöneticiyi indirmek bu fonksiyonun kapsamı değil —
  -- `internal_create_membership`'in "admin membership cannot be created here"
  -- kuralının aynısı. Kapsamı v1.4-08.
  --
  -- ⚠️ **Bu kapı aynı zamanda çağıranın kendisini korur** ve ayrı bir
  -- "kendi rolünü değiştiremez" kontrolü BİLEREK yazılmadı. İlk yazımda
  -- yazmıştım; K-23 mutasyonu onu kaldırdığımda testlerin **yeşil kalmasıyla**
  -- erişilemez olduğunu gösterdi: çağıran zorunlu olarak aktif bir
  -- yöneticidir, dolayısıyla kendi üyeliğinin rolü de `admin`'dir ve bu kapı
  -- her zaman önce ateşlenir. Erişilemez bir dal, testi yanlış sebeple
  -- geçiren bir daldır.
  --
  -- 🔴 **v1.4-08'e not:** yönetici devri bu kapıyı gevşetmek zorunda. O gün
  -- "çağıran kendini hedef alamaz" kontrolü **ayrıca yazılmalı**, yoksa son
  -- yönetici kendini indirip kurumu sıfır yöneticiyle bırakabilir.
  if new_role = 'admin' or hedef.role = 'admin' then
    raise exception 'admin roles are not handled here'
      using errcode = '42501',
            hint = 'Kurum yöneticisi devri ayrı bir işlemdir.';
  end if;

  if hedef.role = new_role then
    raise exception 'membership already has this role'
      using errcode = 'ORB04',
            hint = 'Rol zaten bu değerde; bir şey değişmedi.';
  end if;

  -- `ORB03` buradan DEĞİL tetikleyiciden gelir ve yutulmaz.
  update public.organization_memberships
  set role = new_role
  where id = target_membership_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    hedef.organization_id,
    hedef.branch_id,
    caller_user_id,
    'membership.role_changed',
    'organization_membership',
    target_membership_id,
    jsonb_build_object(
      'from', hedef.role::text,
      'to', new_role::text
    )
  );
end;
$$;

comment on function public.internal_change_member_role(uuid, uuid, public.app_role) is
  'Bir üyeliğin rolünü değiştirir. Çağıran, hedefin kurumunda aktif yönetici olmalıdır. Kendi rolünü değiştirmek ve admin rolüne/rolünden geçiş REDDEDİLİR (v1.4-08). Ayakta duran ders ataması varsa tetikleyici ORB03 ile reddeder ve hata yutulmaz. Denetim kaydını kendisi yazar; fail parametreyle gelir çünkü service_role bağlamında auth.uid() boştur.';

revoke all on function public.internal_change_member_role(
  uuid, uuid, public.app_role
) from public, anon, authenticated;

grant execute on function public.internal_change_member_role(
  uuid, uuid, public.app_role
) to service_role;

-- =========================================================================
-- 5. Kurumdan çıkarma
-- =========================================================================

create or replace function public.internal_remove_member(
  caller_user_id uuid,
  target_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef public.organization_memberships;
  kopan_ogrenci uuid;
  kopan_veli uuid;
begin
  select * into hedef
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'membership not found' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  -- Yöneticiyi çıkarmak v1.4-08'in işi. Bu kapı **çağıranın kendisini de
  -- kapsıyor** (çağıran zorunlu olarak yöneticidir), o yüzden ayrı bir
  -- "kendini çıkaramaz" kontrolü yazılmadı — yazılsaydı erişilemez olurdu.
  -- v1.4-08 bu kapıyı gevşetirken o kontrolü eklemek zorunda.
  if hedef.role = 'admin' then
    raise exception 'an administrator cannot be removed here'
      using errcode = '42501',
            hint = 'Kurum yöneticisi devri ayrı bir işlemdir.';
  end if;

  if hedef.status = 'suspended' then
    raise exception 'membership is already suspended'
      using errcode = 'ORB04',
            hint = 'Bu üyelik zaten kurumdan çıkarılmış.';
  end if;

  update public.organization_memberships
  set status = 'suspended'
  where id = target_membership_id;

  -- Öğrenci ve velide bağ da koparılıyor: erişimlerini kesen tek şey o.
  -- Satır içinde yapılıyor çünkü `unlink_*` RPC'leri yetkiyi `auth.uid()`
  -- üzerinden sınıyor ve burada o boş.
  if hedef.role = 'student' then
    update public.students
    set auth_user_id = null
    where auth_user_id = hedef.user_id
      and organization_id = hedef.organization_id
    returning id into kopan_ogrenci;
  elsif hedef.role = 'parent' then
    update public.guardians
    set auth_user_id = null
    where auth_user_id = hedef.user_id
      and organization_id = hedef.organization_id
    returning id into kopan_veli;
  end if;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    hedef.organization_id,
    hedef.branch_id,
    caller_user_id,
    'membership.removed',
    'organization_membership',
    target_membership_id,
    jsonb_build_object(
      'role', hedef.role::text,
      'unlinked_student_id', kopan_ogrenci,
      'unlinked_guardian_id', kopan_veli
    )
  );

  -- Bağ koparma **ayrı bir olay** olarak da defterde görünüyor ve sözlüğü
  -- `unlink_student_account`'un kullandığıyla aynı (**K-06**): defteri okuyan
  -- "hesap bağı koptu" olayını tek bir kelimeyle arar.
  if kopan_ogrenci is not null then
    insert into public.audit_events (
      organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      hedef.organization_id, hedef.branch_id, caller_user_id,
      'student.account_unlinked', 'student', kopan_ogrenci,
      jsonb_build_object('reason', 'membership.removed')
    );
  end if;

  if kopan_veli is not null then
    insert into public.audit_events (
      organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      hedef.organization_id, hedef.branch_id, caller_user_id,
      'guardian.account_unlinked', 'guardian', kopan_veli,
      jsonb_build_object('reason', 'membership.removed')
    );
  end if;

  return jsonb_build_object(
    'role', hedef.role::text,
    'unlinked_student_id', kopan_ogrenci,
    'unlinked_guardian_id', kopan_veli
  );
end;
$$;

comment on function public.internal_remove_member(uuid, uuid) is
  'Bir üyeliği kurumdan çıkarır: status = suspended. DELETE yapılmaz ve yapılamaz — üyeliğe bakan sekiz yabancı anahtarın sekizi de RESTRICT. Öğrenci ve velide EK OLARAK akademik kaydın hesap bağı koparılır, çünkü onların kapsamı üyelikten değil bağdan gelir (ölçüldü: beş kapsam yardımcısı status süzmüyor). Yöneticiyi ve çağıranın kendisini çıkarmayı reddeder (v1.4-08). Dönen jsonb, ekranın "bağ da koptu" diyebilmesi için hangi kaydın koptuğunu söyler.';

revoke all on function public.internal_remove_member(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_remove_member(uuid, uuid)
  to service_role;
