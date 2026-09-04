-- v1.2-07 — Ders programı.
--
-- **Gün alanı gerçek** (#117). Dilimin beyan ettiği varsayım buydu ve açılışta
-- koda bakılarak doğrulandı: `scheduleHelpers.ts`'teki `getTodayWeekDay()`
-- günü `new Date()`'ten türetiyor, sabit bir dizinden değil.
--
-- **Ama veritabanı arayüzün beş günlük sınırını miras ALMIYOR.** İstemcideki
-- `WeekDay` tipi yalnızca Pazartesi–Cuma taşıyor; dershanelerde hafta sonu
-- kursu yaygın bir gerçek ve şema onu yazılamaz kılmamalı. Gün 1–7 aralığında
-- **ISO 8601** numarasıdır (Pazartesi = 1, Pazar = 7).
--
-- Sayı, enum'a tercih edildi: doğal sıralanıyor, `extract(isodow from date)`
-- ile doğrudan karşılaştırılabiliyor ve veritabanına Türkçe gösterim metni
-- girmiyor — diğer enum'larda olduğu gibi görünen ad istemcide eşlenir.
--
-- ⚠️ **Bu bir K-11 kaydıdır:** istemcinin beş günlük `WeekDay` tipi artık
-- veritabanının kabul ettiğinden dar. Ekran bu tabloya bağlandığında (v1.2-10)
-- ya tip yediye genişletilmeli ya da hafta sonu dersleri **açıkça** kapsam dışı
-- ilan edilmeli. Sessizce dar kalırsa, kaydedilmiş ama hiçbir ekranda
-- görünmeyen ders satırları oluşur.

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  class_id uuid not null,
  -- Dersin kendisi. Opsiyonel çünkü programda derse karşılık gelmeyen bloklar
  -- var: etüt, rehberlik saati, deneme oturumu.
  subject_id uuid,
  -- `subject_id` boşsa görünen ad buradan gelir. İkisi birden dolu olabilir
  -- ama ad iki yerde tutulmaz: dolu olan `subject_id` ise ad dersten okunur.
  title text,
  -- Dersi veren kişi. Opsiyonel: program önce kurulur, öğretmen sonra atanır.
  -- `class_teachers` ile tutarlılık ZORLANMAZ — vekil öğretmen gerçek bir
  -- durumdur ve atama tablosuna girmeden bir saati doldurabilir.
  membership_id uuid,
  day_of_week smallint not null,
  starts_at time not null,
  ends_at time,
  room text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entries_day_check check (day_of_week between 1 and 7),
  constraint schedule_entries_time_check check (ends_at is null or ends_at > starts_at),
  -- Adsız bir program satırı ekranda boş bir kutu demek.
  constraint schedule_entries_label_check check (subject_id is not null or title is not null),
  constraint schedule_entries_title_check check (
    title is null
    or (char_length(trim(both from title)) >= 1 and char_length(trim(both from title)) <= 120)
  ),
  constraint schedule_entries_class_organization_fkey
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id) on delete restrict,
  constraint schedule_entries_subject_organization_fkey
    foreign key (subject_id, organization_id)
    references public.subjects (id, organization_id) on delete restrict,
  constraint schedule_entries_membership_organization_fkey
    foreign key (membership_id, organization_id)
    references public.organization_memberships (id, organization_id) on delete restrict
);

comment on table public.schedule_entries is
  'Haftalık ders programı satırı. day_of_week ISO 8601''dir (Pazartesi=1, Pazar=7); hafta sonu dersleri kasıtlı olarak mümkündür.';
comment on column public.schedule_entries.membership_id is
  'Dersi veren üyelik. class_teachers ile tutarlılık zorlanmaz: vekil öğretmen atama olmadan bir saati doldurabilir.';

create index schedule_entries_class_idx
  on public.schedule_entries (class_id, day_of_week, starts_at);
create index schedule_entries_membership_idx
  on public.schedule_entries (membership_id, day_of_week, starts_at);
create index schedule_entries_organization_idx
  on public.schedule_entries (organization_id, archived_at);
create index schedule_entries_subject_idx on public.schedule_entries (subject_id);

-- Bir sınıf aynı anda iki yerde olamaz.
create unique index schedule_entries_class_slot_idx
  on public.schedule_entries (class_id, day_of_week, starts_at)
  where archived_at is null;

-- Bir öğretmen de olamaz. Bu kısıt, program kurulurken en sık yapılan hatayı
-- veritabanı düzeyinde yakalar: aynı öğretmeni aynı saate iki sınıfa yazmak.
-- Oda için aynı kısıt yazılmadı çünkü `room` serbest metin; "A-101" ile "A101"
-- farklı sayılırdı ve kısıt güven vermeyen bir kısıt olurdu.
create unique index schedule_entries_teacher_slot_idx
  on public.schedule_entries (membership_id, day_of_week, starts_at)
  where membership_id is not null and archived_at is null;

create trigger schedule_entries_set_updated_at
before update on public.schedule_entries
for each row execute function public.set_updated_at();

alter table public.schedule_entries enable row level security;

-- ---------------------------------------------------------------------------
-- Politikalar
-- ---------------------------------------------------------------------------
--
-- Okuma geniş, yazma dar. Program kurumun planıdır: yönetici kurar. Öğretmen
-- kendi saatini göremezse işini yapamaz, ama programı değiştirebilseydi oda ve
-- saat çakışmalarını kurumun haberi olmadan üretirdi.
--
-- Yoklamayla arasındaki fark bilinçli: yoklama dersin **yürütülmesidir** ve
-- öğretmenin işidir; program dersin **planlanmasıdır** ve kurumun işidir.

create policy schedule_entries_select_admin on public.schedule_entries
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

-- Öğretmen iki yoldan görür: sınıfı okutuyorsa, veya satır doğrudan ona
-- yazılmışsa (vekil olarak atandığı, ama sınıfın asıl öğretmeni olmadığı saat).
create policy schedule_entries_select_teacher on public.schedule_entries
for select to authenticated
using (
  (
    public.current_user_teaches_class(class_id)
    or exists (
      select 1 from public.organization_memberships as membership
      where membership.id = schedule_entries.membership_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  )
  and not (select public.current_user_must_change_password())
);

create policy schedule_entries_select_student on public.schedule_entries
for select to authenticated
using (
  public.current_user_attends_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy schedule_entries_select_guardian on public.schedule_entries
for select to authenticated
using (
  public.current_user_guards_class(class_id)
  and not (select public.current_user_must_change_password())
);

create policy schedule_entries_insert_admin on public.schedule_entries
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy schedule_entries_update_admin on public.schedule_entries
for update to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

-- ---------------------------------------------------------------------------
-- Tablo yetkileri
-- ---------------------------------------------------------------------------
--
-- `class_id` UPDATE yetkisinde yok: bir program satırını başka sınıfa taşımak
-- onu düzeltmek değil, başka bir satır yapmaktır. Yanlış sınıfa yazılan satır
-- arşivlenir, doğrusu açılır.
revoke all on public.schedule_entries from anon, authenticated;

grant select on public.schedule_entries to authenticated;
grant insert (organization_id, class_id, subject_id, title, membership_id,
              day_of_week, starts_at, ends_at, room)
  on public.schedule_entries to authenticated;
grant update (subject_id, title, membership_id, day_of_week, starts_at,
              ends_at, room, archived_at)
  on public.schedule_entries to authenticated;

grant all on public.schedule_entries to service_role;
