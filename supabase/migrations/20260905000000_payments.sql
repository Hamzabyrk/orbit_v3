-- v1.2-06 — Ödeme planı ve taksit takibi.
--
-- **Bu bir ödeme altyapısı değil, bir defterdir.** Roadmap'in kapsamı net:
-- "Ödeme modülü yalnızca takiptir; kart verisi ve tahsilat kapsam dışı." Yani
-- burada kim ne kadar borçlu, hangi taksit ne zaman ve ödendi mi bilgisi tutulur;
-- para hareketi sistemin dışında olur.
--
-- Bu ayrım şemaya da yazılı: **kart numarası, IBAN, ödeme jetonu veya banka
-- hesabı taşıyan hiçbir sütun yok** ve olmayacak. Böyle bir sütun eklendiği gün
-- ürün PCI-DSS kapsamına girer ve iki kişilik bir ekibin taşıyamayacağı bir
-- uyum yükü doğar. Tahsilat gerektiğinde doğru yol, ödemeyi lisanslı bir
-- sağlayıcıya devredip buraya yalnızca **sonucu** yazmaktır.
--
-- **Öğretmen ödeme verisini HİÇ görmez.** Sistemdeki ilk yerdir ki
-- `current_user_teaches_student` kapsamı bilinçli olarak KULLANILMAZ: ödeme,
-- kurum ile aile arasındadır ve öğretmenin işi değildir. Öğretmenin bir
-- öğrenciyi okutuyor olması, o ailenin borcunu görmesi için sebep değil.
--
-- **Öğrenci de kendi planını görmez** (2026-09-04 kararı). Ailenin borcu
-- çocuğun ekranına düşmemeli. Yetişkin kursiyer için yol kapalı değil: onun
-- adına bir veli kaydı açılır ve kendi kendinin velisi olur.

create table public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  student_id uuid not null,
  name text not null,
  -- Tutarlar kuruş hassasiyetiyle. Para birimi sütunu YOK: ürün Türkiye
  -- pazarına satılıyor ve tutarlar TRY. Çok para birimli olmayan bir sisteme
  -- para birimi sütunu koymak, her sorguya taşınan ama hiç okunmayan bir alan
  -- üretirdi.
  total_amount numeric(12, 2) not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_plans_name_check check (
    char_length(trim(both from name)) >= 1
    and char_length(trim(both from name)) <= 160
  ),
  constraint payment_plans_total_check check (total_amount >= 0),
  constraint payment_plans_id_organization_key unique (id, organization_id),
  constraint payment_plans_student_organization_fkey
    foreign key (student_id, organization_id)
    references public.students (id, organization_id) on delete restrict
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  plan_id uuid not null,
  sequence_no integer not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  -- Ödendi bilgisi bir ZAMAN damgasıdır, bir durum değil. "Ödendi", "gecikti",
  -- "yaklaşıyor" gibi durumlar bundan ve `due_date`'ten TÜRETİLİR, saklanmaz:
  -- saklanan bir durum, tarih geçtiği gün sessizce yanlışa döner ve kimse onu
  -- güncellemez (K-02: gösterim ile karar ayrı tutulur).
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Sınav netinin aksine burada alt sınır VAR: sıfır veya negatif tutarlı bir
  -- taksit anlamlı bir kayıt değil.
  constraint installments_amount_check check (amount > 0),
  constraint installments_sequence_check check (sequence_no >= 1),
  constraint installments_plan_organization_fkey
    foreign key (plan_id, organization_id)
    references public.payment_plans (id, organization_id) on delete restrict,
  constraint installments_plan_sequence_key unique (plan_id, sequence_no)
);

comment on table public.payment_plans is
  'Bir öğrencinin ödeme planı. Yalnızca takip: kart verisi, IBAN veya ödeme jetonu TAŞIMAZ.';
comment on table public.installments is
  'Plandaki bir taksit. Durum (ödendi/gecikti) paid_at ve due_date''ten türetilir, saklanmaz.';
comment on column public.installments.paid_at is
  'Ödemenin alındığı an. NULL = henüz ödenmedi. Kısmi ödeme kapsam dışı; gerekirse taksit bölünür.';

create index payment_plans_student_idx on public.payment_plans (student_id, archived_at);
create index payment_plans_organization_idx on public.payment_plans (organization_id, archived_at);
create index installments_plan_idx on public.installments (plan_id, sequence_no);
create index installments_due_idx on public.installments (organization_id, due_date) where paid_at is null;
create index installments_organization_idx on public.installments (organization_id);

create trigger payment_plans_set_updated_at
before update on public.payment_plans
for each row execute function public.set_updated_at();

create trigger installments_set_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

alter table public.payment_plans enable row level security;
alter table public.installments enable row level security;

-- ---------------------------------------------------------------------------
-- Kapsam yardımcısı
-- ---------------------------------------------------------------------------
--
-- Taksit satırının öğrencisi yok; planına bağlı. Zinciri politikaya gömmek
-- yerine tek bir fonksiyonda toplanıyor — v1.2-04'teki
-- `current_user_can_record_attendance` ile aynı sebep.
--
-- Dikkat: bu fonksiyon `current_user_teaches_student` ÇAĞIRMIYOR. Eksiklik
-- değil, kararın kendisi: öğretmen ödeme görmez.
create or replace function public.current_user_can_see_payment_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.payment_plans as plan
    where plan.id = target_plan_id
      and (
        public.current_user_has_membership(
          plan.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_guards_student(plan.student_id)
      )
  );
$$;

comment on function public.current_user_can_see_payment_plan(uuid) is
  'Çağıran bu ödeme planını görebilir mi: kurum yöneticisi veya öğrencinin velisi. Öğretmen ve öğrencinin kendisi göremez.';

revoke all on function public.current_user_can_see_payment_plan(uuid) from public, anon, authenticated;
grant execute on function public.current_user_can_see_payment_plan(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Politikalar
-- ---------------------------------------------------------------------------
--
-- Veli **okur, yazmaz.** Ödemeyi aldığını kaydeden taraf kurumdur; velinin
-- kendi taksitini "ödendi" işaretleyebilmesi, defterin anlamını ortadan
-- kaldırırdı.

create policy payment_plans_select_admin on public.payment_plans
for select to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy payment_plans_select_guardian on public.payment_plans
for select to authenticated
using (
  public.current_user_guards_student(student_id)
  and not (select public.current_user_must_change_password())
);

create policy payment_plans_insert_admin on public.payment_plans
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy payment_plans_update_admin on public.payment_plans
for update to authenticated
using (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
)
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy installments_select_authorized on public.installments
for select to authenticated
using (
  public.current_user_can_see_payment_plan(plan_id)
  and not (select public.current_user_must_change_password())
);

create policy installments_insert_admin on public.installments
for insert to authenticated
with check (
  public.current_user_has_membership(organization_id, null, array['admin']::public.app_role[])
  and not (select public.current_user_must_change_password())
);

create policy installments_update_admin on public.installments
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
-- `student_id` hiçbir UPDATE yetkisinde yok: bir ödeme planını başka bir
-- öğrenciye taşımak bir düzeltme değil, kimin borçlu olduğunu değiştirmektir.
-- Yanlış öğrenciye açılan plan arşivlenir, doğrusu yeniden açılır.
revoke all on public.payment_plans from anon, authenticated;
revoke all on public.installments from anon, authenticated;

grant select on public.payment_plans to authenticated;
grant insert (organization_id, student_id, name, total_amount)
  on public.payment_plans to authenticated;
grant update (name, total_amount, archived_at)
  on public.payment_plans to authenticated;

grant select on public.installments to authenticated;
grant insert (organization_id, plan_id, sequence_no, due_date, amount)
  on public.installments to authenticated;
grant update (due_date, amount, paid_at) on public.installments to authenticated;

grant all on public.payment_plans to service_role;
grant all on public.installments to service_role;
