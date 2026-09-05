-- v1.2-09 — Günlük Akış ve Gün Planı.
--
-- Bu dilim **iki ayrı şeyi aynı anda** getiriyor ve asıl işi onları
-- karıştırmamak. Soru 5'in onaylı cevabı:
--
--   * **Günlük Akış** (`daily_feed_posts`): yöneticinin veya yetkili
--     öğretmenin kurum/sınıf hedefiyle paylaştığı **duyuru**. Hedeflenen
--     sınıfa bağlı herkes görür.
--   * **Gün Planı** (`tasks`, `calendar_events`): kullanıcının **kişisel**
--     to-do ve takvim kayıtları. Yalnızca **sahibi** görür ve yönetir.
--
-- Aynı tabloda birleştirilselerdi bir kişinin kendine yazdığı notun duyuru
-- akışına sızması, tek bir politika hatası uzağında olurdu.
--
-- ⚠️ **`tasks` ve `calendar_events`, YÖNETİCİNİN DE GÖREMEDİĞİ ilk tablolar.**
-- Bugüne kadar her tabloda kurum yöneticisi en geniş kapsama sahipti. Burada
-- değil: kişisel çalışma alanı kurumun değil kişinindir. Yöneticinin bir
-- öğretmenin kendine yazdığı "veli görüşmesine hazırlan" notunu görmesi için
-- hiçbir sebep yok — ve görebilseydi, insanlar bu alanı kullanmayı bırakırdı.
--
-- ⚠️ **K-11 kaydı — istemci bu modele hazır değil.** `educationData.ts`
-- kişisel verileri `dayPlanTasksByRole` ve `dayPlanEventsByRole` adlarıyla
-- **role göre** tutuyor. Rol bazlı bir liste gerçek veride çalışmaz: aynı
-- kurumdaki iki öğretmen tek bir listeyi paylaşır ve birinin notu diğerine
-- görünür. Veri modeli **kullanıcı bazlıdır** (Soru 5) ve ekran bağlanırken
-- (v1.2-10) o yapı kullanıcıya göre yeniden kurulmalıdır.
--
-- Not: "Günlük Akış" bugün arayüzde **hiç yok** — `grep -rn "Akış" client/src`
-- sıfır sonuç veriyor. Tablo ekranından önce geliyor; bu bir sorun değil ama
-- v1.2-10'da bağlanacak bir ekranın da yazılması gerektiği anlamına geliyor.

-- ---------------------------------------------------------------------------
-- Günlük Akış — kurumsal duyuru
-- ---------------------------------------------------------------------------

create table public.daily_feed_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  -- Opsiyonel: dolu = sınıf hedefli, boş = kurum geneli duyuru.
  class_id uuid,
  title text not null,
  body text,
  -- Duyuruyu kimin paylaştığı. İstemci yazamaz; trigger çağıranın
  -- üyeliğinden dolduruyor.
  author_membership_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_feed_posts_title_check check (
    char_length(trim(both from title)) >= 1
    and char_length(trim(both from title)) <= 200
  ),
  constraint daily_feed_posts_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint daily_feed_posts_author_organization_fkey
    foreign key (author_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

comment on table public.daily_feed_posts is
  'Kurum veya sınıf hedefli duyuru. Kişisel kayıt DEĞİLDİR; kişisel olan tasks ve calendar_events tablolarındadır.';

create index daily_feed_posts_organization_idx
  on public.daily_feed_posts (organization_id, created_at desc);
create index daily_feed_posts_class_idx
  on public.daily_feed_posts (class_id, created_at desc);
create index daily_feed_posts_author_idx
  on public.daily_feed_posts (author_membership_id);

create trigger daily_feed_posts_set_updated_at
before update on public.daily_feed_posts
for each row execute function public.set_updated_at();

-- Üçüncü kopya. v1.2-08'de "üçüncüsü gerekirse genelleştirilir" yazılmıştı ve
-- o eşik burada geldi — ama genelleştirme yine YAPILMADI ve gerekçesi değişti:
-- artık sorun kopya sayısı değil, genelleştirmenin bu üç yerde **aynı şeyi**
-- ifade etmemesi. `recorded_by`, `assigned_by` ve `author` farklı olguları
-- kaydediyor; tek bir "aktörü doldur" fonksiyonu üçünü de aynı şey sanmaya
-- davet ederdi. Sekiz satırlık üç fonksiyon, dinamik alan atayan tek bir
-- fonksiyondan hem daha okunaklı hem de `SECURITY DEFINER` bağlamında daha
-- kolay denetlenir.
create or replace function public.set_feed_post_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_membership_id is null and (select auth.uid()) is not null then
    select membership.id
    into new.author_membership_id
    from public.organization_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = new.organization_id
      and membership.status = 'active';
  end if;

  return new;
end;
$$;

comment on function public.set_feed_post_author() is
  'Duyuruyu paylaşan üyeliği çağıranın kimliğinden doldurur; istemcinin iddiasına güvenmez.';

revoke all on function public.set_feed_post_author() from public, anon, authenticated;

create trigger daily_feed_posts_set_author
before insert on public.daily_feed_posts
for each row execute function public.set_feed_post_author();

-- ---------------------------------------------------------------------------
-- Gün Planı — kişisel kayıtlar
-- ---------------------------------------------------------------------------
--
-- `owner_membership_id` **NOT NULL**: sahipsiz kişisel kayıt diye bir şey yok.
-- Üyeliğe bağlanıyor çünkü üyelik `organization_id` taşıyor ve bileşik FK
-- kaydın kurumla tutarlı kalmasını veri düzeyinde garanti ediyor.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  owner_membership_id uuid not null,
  title text not null,
  detail text,
  due_on date,
  -- Ödemedeki `paid_at` ile aynı gerekçe: "tamamlandı" bir ZAMAN damgasıdır,
  -- saklanan bir durum değil. Gecikmiş/bugün/yaklaşıyor buradan ve
  -- `due_on`'dan türetilir (K-02).
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_check check (
    char_length(trim(both from title)) >= 1
    and char_length(trim(both from title)) <= 200
  ),
  constraint tasks_owner_organization_fkey
    foreign key (owner_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  owner_membership_id uuid not null,
  title text not null,
  subtitle text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_check check (
    char_length(trim(both from title)) >= 1
    and char_length(trim(both from title)) <= 200
  ),
  constraint calendar_events_time_check check (ends_at is null or ends_at > starts_at),
  constraint calendar_events_owner_organization_fkey
    foreign key (owner_membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

comment on table public.tasks is
  'Kişisel yapılacak kaydı. YALNIZCA sahibi görür — kurum yöneticisi dahil başka kimse göremez.';
comment on table public.calendar_events is
  'Kişisel takvim kaydı. YALNIZCA sahibi görür — kurum yöneticisi dahil başka kimse göremez.';

create index tasks_owner_idx on public.tasks (owner_membership_id, due_on);
create index tasks_organization_idx on public.tasks (organization_id);
create index calendar_events_owner_idx on public.calendar_events (owner_membership_id, starts_at);
create index calendar_events_organization_idx on public.calendar_events (organization_id);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.daily_feed_posts enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

-- ---------------------------------------------------------------------------
-- Sahiplik yardımcısı
-- ---------------------------------------------------------------------------
--
-- Kişisel kayıtların tek kapısı. Altı yerde kullanılıyor (iki tablo × üç
-- işlem), bu yüzden politikaya gömmek yerine tek bir yerde duruyor (K-06).

create or replace function public.current_user_owns_membership(target_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.id = target_membership_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

comment on function public.current_user_owns_membership(uuid) is
  'Bu üyelik çağıranın kendi üyeliği mi. Kişisel kayıtların sahiplik kapısı.';

revoke all on function public.current_user_owns_membership(uuid) from public, anon, authenticated;
grant execute on function public.current_user_owns_membership(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Günlük Akış politikaları
-- ---------------------------------------------------------------------------
--
-- Kurum geneli duyuru (`class_id is null`) kurumun her üyesine açıktır — zaten
-- amacı bu. Sınıf hedefli duyuru, o sınıfla ilişkisi olanlara.

create policy daily_feed_posts_select_organization_wide on public.daily_feed_posts
for select to authenticated
using (
  class_id is null
  and public.current_user_has_membership(organization_id)
  and not (select public.current_user_must_change_password())
);

create policy daily_feed_posts_select_admin on public.daily_feed_posts
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy daily_feed_posts_select_teacher on public.daily_feed_posts
for select to authenticated
using (
  public.current_user_teaches_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy daily_feed_posts_select_student on public.daily_feed_posts
for select to authenticated
using (
  public.current_user_attends_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy daily_feed_posts_select_guardian on public.daily_feed_posts
for select to authenticated
using (
  public.current_user_guards_class(class_id)
  and not (select public.current_user_must_change_password())
);

-- Kurum geneli duyuru yalnızca yöneticinin; sınıf duyurusunu o sınıfın
-- öğretmeni de paylaşabilir. Sınavdaki kalıbın aynısı: kurumun tamamını
-- ilgilendiren bir işlem tek bir öğretmenin kararı olmamalı.
create policy daily_feed_posts_insert_authorized on public.daily_feed_posts
for insert to authenticated
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
);

create policy daily_feed_posts_update_authorized on public.daily_feed_posts
for update to authenticated
using (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
)
with check (
  (
    public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
    or (class_id is not null and public.current_user_teaches_class(class_id))
  )
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Gün Planı politikaları — tek kural, üç işlem, iki tablo
-- ---------------------------------------------------------------------------
--
-- Yönetici politikası **yok** ve bu bir eksiklik değil, kararın kendisi.

create policy tasks_select_owner on public.tasks
for select to authenticated
using (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

-- `owner_membership_id` yazma yetkisinde VAR ama başkası adına kayıt açmak
-- yine de imkânsız: `with check` sahipliği doğruluyor. Yoklama ve ödevde
-- olduğu gibi trigger'la doldurulmadı çünkü buradaki sütun bir **denetim
-- iddiası** değil, erişimin **anahtarı**. Yanlış bir değer yazılamaz — politika
-- reddeder — ve yazılabilseydi bile kayıt yazana görünmez olurdu, yani
-- kendini bozan bir hata olurdu. `recorded_by`/`assigned_by` ise sessizce
-- yanlış kalırdı; fark bu.
create policy tasks_insert_owner on public.tasks
for insert to authenticated
with check (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

create policy tasks_update_owner on public.tasks
for update to authenticated
using (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

create policy calendar_events_select_owner on public.calendar_events
for select to authenticated
using (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

create policy calendar_events_insert_owner on public.calendar_events
for insert to authenticated
with check (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

create policy calendar_events_update_owner on public.calendar_events
for update to authenticated
using (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_owns_membership(owner_membership_id)
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- Kişisel kayıtlarda DELETE de yok: kullanıcı kendi notunu siler gibi
-- görünse de arşivler. Sebep tutarlılık değil, geri alınabilirlik — yanlışlıkla
-- silinen bir günlük plan geri getirilemezdi.
revoke all on public.daily_feed_posts from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
revoke all on public.calendar_events from anon, authenticated;

grant select on public.daily_feed_posts to authenticated;
grant insert (organization_id, class_id, title, body)
  on public.daily_feed_posts to authenticated;
grant update (class_id, title, body, archived_at)
  on public.daily_feed_posts to authenticated;

grant select on public.tasks to authenticated;
grant insert (organization_id, owner_membership_id, title, detail, due_on)
  on public.tasks to authenticated;
grant update (title, detail, due_on, completed_at, archived_at)
  on public.tasks to authenticated;

grant select on public.calendar_events to authenticated;
grant insert (organization_id, owner_membership_id, title, subtitle, starts_at, ends_at)
  on public.calendar_events to authenticated;
grant update (title, subtitle, starts_at, ends_at, archived_at)
  on public.calendar_events to authenticated;

grant all on public.daily_feed_posts to service_role;
grant all on public.tasks to service_role;
grant all on public.calendar_events to service_role;
