-- Issue #27 — Platform operatörü ekseni.
--
-- Platform operatörlüğü kurum içi bir rol DEĞİLDİR. `app_role` enum'u
-- (admin/teacher/student/parent) her zaman bir kuruma bağlıdır; platform
-- operatörü hiçbir kuruma ait değildir. Bu nedenle o enum'a beşinci bir değer
-- eklemek yerine ayrı bir eksen kuruluyor.
--
-- Gerekçe ve alternatifler için bkz. `.ai/DECISION_LOG.md` — "Platform
-- operatörü ayrı bir eksendir".
--
-- Tek doğruluk kaynağı bu tablodur. `auth.users.app_metadata.platform_admin`
-- bayrağı KULLANILMAZ: aynı bilgiyi iki düzlemde saklamak, bu projede
-- halihazırda beş kez soruna yol açmış olan drift kalıbının aynısıdır.

create type public.platform_operator_role as enum ('owner', 'operator');
create type public.platform_operator_status as enum ('active', 'suspended');

create table public.platform_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.platform_operator_role not null default 'operator',
  status public.platform_operator_status not null default 'active',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.platform_operators is
  'Geliştirme ekibi üyeleri. Kurum içeriğine erişim vermez; yalnızca kurum, şube ve kurum yöneticisi kaplarını yönetme yetkisi tanımlar.';

create trigger platform_operators_set_updated_at
  before update on public.platform_operators
  for each row execute function public.set_updated_at();

-- Kuruma bağlı olmayan platform işlemleri için ayrı denetim kaydı.
-- `public.audit_events.organization_id` NOT NULL olduğu için "operatör eklendi"
-- veya "kurum listelendi" gibi kurum-üstü olaylar oraya yazılamıyor.
create table public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  organization_id uuid references public.organizations (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on column public.platform_audit_events.organization_id is
  'Olay bir kuruma bağlıysa doldurulur. Kurum-üstü işlemlerde NULL kalır; audit_events tablosundan farkı budur.';

create index platform_audit_events_created_at_idx
  on public.platform_audit_events (created_at desc);

-- `current_user_has_membership` ile aynı desen: SECURITY DEFINER, çünkü
-- fonksiyonun kendisi RLS korumalı `platform_operators` tablosunu okur ve
-- çağıranın yetkisiyle çalışsaydı sonsuz döngü oluşurdu.
--
-- Yetki artışı yaratmaz: içeride `auth.uid()` kullanıldığı için çağıran
-- yalnızca kendi operatörlüğünü sorgulayabilir, başkasınınkini değil.
create or replace function public.current_user_is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_operators as operator
    where operator.user_id = (select auth.uid())
      and operator.status = 'active'
  );
$$;

alter table public.platform_operators enable row level security;
alter table public.platform_audit_events enable row level security;

-- Operatörler birbirini görebilir; bu, panelde operatör listesini göstermek
-- için gereklidir. Operatör olmayan bir kullanıcı hiçbir satır göremez ve
-- böylece operatör listesi dışarıya sızmaz.
create policy platform_operators_select_operator
  on public.platform_operators
  for select
  to authenticated
  using (public.current_user_is_platform_operator());

create policy platform_audit_events_select_operator
  on public.platform_audit_events
  for select
  to authenticated
  using (public.current_user_is_platform_operator());

-- İstemciden yazma yolu bilinçli olarak yoktur. Operatör ekleme/çıkarma ve
-- denetim kaydı üretme yalnızca `service_role` ile çalışan Edge Function
-- üzerinden yapılır; aksi halde bir operatör kendi yetkisini yükseltebilir
-- veya sahte denetim kaydı üretebilirdi.
revoke all on public.platform_operators from anon, authenticated;
revoke all on public.platform_audit_events from anon, authenticated;

grant select on public.platform_operators to authenticated;
grant select on public.platform_audit_events to authenticated;

grant all on public.platform_operators to service_role;
grant all on public.platform_audit_events to service_role;
grant usage, select on sequence public.platform_audit_events_id_seq to service_role;

-- Supabase, `public` şemasında oluşturulan her fonksiyona `anon` ve
-- `authenticated` için ayrı bir default EXECUTE grant'ı verir; `from public`
-- revoke'u bunları kaldırmaz. Issue #18'de tam olarak bu kaçırılmıştı.
--
-- `authenticated` yetkisi KORUNUR: yukarıdaki RLS policy'leri bu fonksiyonu
-- çağırır ve policy ifadeleri çağıran rolün ayrıcalıklarıyla değerlendirilir.
-- Kaldırılsaydı operatörler kendi listelerini de okuyamazdı.
revoke all on function public.current_user_is_platform_operator() from public, anon, authenticated;
grant execute on function public.current_user_is_platform_operator() to authenticated;
