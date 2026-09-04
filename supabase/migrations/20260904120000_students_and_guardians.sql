-- v1.2-01 — Öğrenci ve veli kayıtları.
--
-- Bu, sistemin ilk **iş tablosu**. Bugüne kadar veritabanı yalnızca kimlik
-- taşıyordu: kim var, hangi kurumda, hangi rolde. Öğrenci kaydı bundan farklı
-- bir şey — bir kişinin akademik varlığı, giriş hesabından bağımsız.
--
-- **Neden ayrı tablo, neden üyelik yetmiyor:** `organization_memberships` bir
-- auth hesabına bağlıdır (`user_id` NOT NULL). Öğrencilerin çoğunun hesabı
-- olmayacak — Soru 4'ün onaylı cevabı: "giriş yapmayacak küçük öğrenci için
-- Auth hesabı açılmaz, `auth_user_id` boş kalır, bağlı veli kendi hesabından
-- görür." Hesabı olmayan öğrenci üyelik tablosuna yazılamaz; kendi kaydına
-- ihtiyacı var.
--
-- **`organization_id` neden zorunlu:** #150'nin içerik koruması, `public`
-- şemasında bu sütunu taşıyan her tabloyu kurum içeriği sayar ve dolu kurumun
-- silinmesini reddeder. Sütun olmasaydı koruma öğrencileri göremez, kurum
-- silindiğinde sessizce giderlerdi. Sütun aynı zamanda tenant modelinin
-- kendisidir; ikisi aynı şey.

create table public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  branch_id uuid,
  -- Öğrencinin giriş hesabı — **opsiyonel ve öyle kalacak** (Soru 4).
  -- `on delete set null`: hesap silinirse akademik kayıt DURUR, yalnızca
  -- bağlantısı kopar. Cascade olsaydı bir hesabın silinmesi öğrencinin
  -- yoklamasını, notunu ve ödeme planını da götürürdü.
  auth_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  -- Silme yerine arşivleme; `organizations` ve `branches` ile aynı kalıp.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_full_name_check check (
    char_length(trim(both from full_name)) >= 1
    and char_length(trim(both from full_name)) <= 120
  ),
  -- Bileşik FK: şube, öğrencinin kurumuna ait OLMAK ZORUNDA. Tek sütunlu bir
  -- `branch_id` FK'si başka bir kurumun şubesini kabul ederdi ve bu, tenant
  -- sınırını veri düzeyinde delen bir kapı olurdu. `organization_memberships`
  -- aynı kalıbı kullanıyor.
  constraint students_branch_organization_fkey
    foreign key (branch_id, organization_id)
    references public.branches (id, organization_id) on delete restrict
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  auth_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guardians_full_name_check check (
    char_length(trim(both from full_name)) >= 1
    and char_length(trim(both from full_name)) <= 120
  )
);

comment on table public.students is
  'Öğrencinin akademik kaydı. Giriş hesabından bağımsızdır; auth_user_id boş kalabilir (ROADMAP Soru 4).';
comment on table public.guardians is
  'Velinin kurum içindeki kaydı. Öğrenciyle bağı v1.2-03''te gelen student_guardians tablosundan kurulur.';
comment on column public.students.auth_user_id is
  'Varsa öğrencinin giriş hesabı. NULL = hesabı yok; verisini yalnızca yönetici ve bağlı velisi görür.';
comment on column public.guardians.auth_user_id is
  'Varsa velinin giriş hesabı. NULL = veli sisteme girmiyor, kaydı yalnızca kurum içi bir kayıttır.';

create index students_organization_idx
  on public.students (organization_id, archived_at);
create index students_branch_idx
  on public.students (branch_id, organization_id);
create index guardians_organization_idx
  on public.guardians (organization_id, archived_at);

-- Bir giriş hesabı en fazla bir öğrenci ve en fazla bir veli kaydına bağlanır.
-- Kısıt kurum başına değil GENELDİR: giriş numarası `<kurum:4><kişi:4>`
-- biçiminde ve auth kimliğinin kendisi olduğu için bir hesap zaten tek kuruma
-- aittir (`DECISION_LOG` 2026-08-24). Kurum başına yazılsaydı aynı hesabın iki
-- kurumda öğrenci olmasına izin verirdi ve o kararı sessizce delerdi.
create unique index students_auth_user_idx
  on public.students (auth_user_id) where auth_user_id is not null;
create unique index guardians_auth_user_idx
  on public.guardians (auth_user_id) where auth_user_id is not null;

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger guardians_set_updated_at
before update on public.guardians
for each row execute function public.set_updated_at();

alter table public.students enable row level security;
alter table public.guardians enable row level security;

-- ---------------------------------------------------------------------------
-- RLS politikaları
-- ---------------------------------------------------------------------------
--
-- **Kilit şartı bu dilimde devreye giriyor.** `not
-- current_user_must_change_password()` koşulu ROADMAP'te v1.2-11'e planlanmıştı
-- ("v1.2-01…09 tamamlandıktan sonra her tablonun politikasına eklenir"). Öne
-- alındı ve gerekçesi şu: bu, sistemin **yazma yetkisi olan ilk iş tablosu**.
-- Kilit bugün yalnızca istemcide duruyor; kilitli bir kullanıcı REST API'yi
-- doğrudan çağırabiliyor. Şimdiye kadar zararı sınırlıydı çünkü ulaşabileceği
-- tek şey kendi profiliydi. Öğrenci tablosuyla birlikte zarar gerçek oluyor —
-- ve koşulu dokuz dilim sonra eklemek, o dokuz dilimin kilitsiz yaşaması
-- demek. Bir satır bugün, dokuz tablo sonra yapılacak bir tarama yerine.
--
-- Koşul `(select ...)` içinde sarmalı: argümansız STABLE fonksiyon böyle
-- sorgu başına bir kez değerlendirilir, satır başına değil. Mevcut
-- politikalardaki `(select auth.uid())` ile aynı kalıp.
--
-- **Yönetici şubesine bağlıysa yalnızca kendi şubesini görür.** Bu bilinçli:
-- `audit_events_select_admin` da aynı şekilde çalışıyor. Kurum geneli yönetici
-- (`branch_id is null`) tüm şubeleri görür.
--
-- **Öğretmen ve veli bu dilimde HİÇBİR ŞEY göremez.** Eksiklik değil, karar:
--   * Öğretmenin kapsamı sınıf atamasından gelir, atama tablosu v1.2-02'de.
--   * Velinin kapsamı öğrenci bağından gelir, bağ tablosu v1.2-03'te.
-- Kapsamı olmayan role şimdilik kurum geneli erişim vermek, sonra daraltmayı
-- hatırlamayı gerektirirdi; hatırlanmazsa açık sessizce kalıcı olurdu. Kapalı
-- başlayıp açmak, açık başlayıp daraltmaktan güvenlidir (K-04).

create policy students_select_admin on public.students
for select to authenticated
using (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

create policy students_select_self on public.students
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  and not (select public.current_user_must_change_password())
);

create policy students_insert_admin on public.students
for insert to authenticated
with check (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

-- `using` okunabilecek satırı, `with check` yazıldıktan SONRAKİ hâli sınar.
-- İkisi birden gerekli: yalnızca `using` yazılsaydı yönetici, kendi kurumundan
-- okuduğu bir satırın `branch_id`'sini başka bir şubeye taşıyabilirdi.
create policy students_update_admin on public.students
for update to authenticated
using (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(
    organization_id, branch_id, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

create policy guardians_select_admin on public.guardians
for select to authenticated
using (
  public.current_user_has_membership(
    organization_id, null, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

create policy guardians_select_self on public.guardians
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  and not (select public.current_user_must_change_password())
);

create policy guardians_insert_admin on public.guardians
for insert to authenticated
with check (
  public.current_user_has_membership(
    organization_id, null, array['admin']::public.app_role[]
  )
  and not (select public.current_user_must_change_password())
);

create policy guardians_update_admin on public.guardians
for update to authenticated
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

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- **Bu iki tablo, `authenticated` rolünün yazabildiği ilk tablolar.** Bugüne
-- kadar her yazma `service_role` taşıyan bir Edge Function'dan geçiyordu ve
-- `authenticated` hiçbir tabloda SELECT dışında yetki taşımıyordu.
--
-- Deseni değiştirmenin gerekçesi: iş verisi kurum kapsamlıdır ve RLS bu sınırı
-- tam olarak ifade edebilir — Edge Function'ın eklediği tek şey bir ağ atlaması
-- olurdu. Buna karşılık her fonksiyon elle deploy edilen ayrı bir parçadır ve
-- bu bizi bir kez ısırdı: #113/#114'te arayüz, deploy edilmemiş bir fonksiyona
-- bağlanmış ve form sessizce çalışmamıştı. On iki dilim boyunca her CRUD
-- işlemi için bir fonksiyon, iki kişilik ekipte sürdürülebilir değil.
--
-- Sınır şurada duruyor: **kimlik işlemleri Edge Function'da kalır.** Bu yüzden
-- `auth_user_id` hiçbir yazma yetkisinde YOK. Bir öğrenciye giriş hesabı
-- bağlamak, adını düzeltmekle aynı sınıfta bir işlem değil; yönetici bunu
-- doğrudan UPDATE ile yapamaz. Aynı sebeple `organization_id` de UPDATE
-- yetkisinde yok: bir öğrenciyi başka kuruma taşımak tenant sınırını geçmektir.
--
-- DELETE ne yetki ne politika olarak var — çift koruma. Kayıt silinmez,
-- `archived_at` ile arşivlenir; yoklama ve not kayıtları öğrenciye bağlanacağı
-- için silme, geçmişi de götüren bir işlem olurdu.
revoke all on public.students from anon, authenticated;
revoke all on public.guardians from anon, authenticated;

grant select on public.students to authenticated;
grant insert (organization_id, branch_id, full_name) on public.students to authenticated;
grant update (full_name, branch_id, archived_at) on public.students to authenticated;

grant select on public.guardians to authenticated;
grant insert (organization_id, full_name) on public.guardians to authenticated;
grant update (full_name, archived_at) on public.guardians to authenticated;

grant all on public.students to service_role;
grant all on public.guardians to service_role;
