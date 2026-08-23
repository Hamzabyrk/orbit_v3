-- Issue #37 — Kurum kodu.
--
-- Giriş numarasının ilk dört hanesi kurum kodudur:
--   <kurum:4><kişi:4>  ->  örn. 1042 + 1137 = 10421137
--
-- Karar ve gerekçeler için bkz. `.ai/DECISION_LOG.md` — "Kimlik ve Giriş
-- Bilgisi Mimarisi".
--
-- Bu kolon platform paneliyle birlikte ekleniyor çünkü panel kurum üretmeye
-- başladığı anda her kurumun kodu olmak zorunda; sonradan eklenirse
-- oluşturulmuş kurumlara geriye dönük kod atamak gerekirdi.

-- Kod 1000'den başlar. Sıfırdan başlasaydı "0042" gibi baştan sıfırlı bir
-- bölüm oluşur, kullanıcı numarayı "42" diye yazıp giriş yapamaz duruma
-- düşerdi. Üst sınır 9999; `no cycle` sayesinde tükendiğinde sessizce
-- başa dönmek yerine açık bir hata verir.
create sequence public.organization_code_seq
  as integer
  start with 1000
  minvalue 1000
  maxvalue 9999
  no cycle;

-- `nextval` volatile olduğu için Postgres tabloyu yeniden yazar ve mevcut her
-- satıra ayrı bir değer atar; kolon eklendiğinde var olan kurumlar da kod alır.
alter table public.organizations
  add column code integer not null default nextval('public.organization_code_seq');

alter table public.organizations
  add constraint organizations_code_range check (code between 1000 and 9999);

alter table public.organizations
  add constraint organizations_code_key unique (code);

-- Sequence kolona bağlanır; kolon düşerse sequence de düşer, artık kalmaz.
alter sequence public.organization_code_seq owned by public.organizations.code;

comment on column public.organizations.code is
  'Giriş numarasının ilk dört hanesi. 1000-9999 aralığında, benzersiz, değişmez. Kurumun kendi iç numaralandırmasıyla ilgisi yoktur.';

-- Kod ataması yalnızca sunucu tarafında yapılır. İstemciden kurum
-- oluşturulamadığı için `anon` ve `authenticated` sequence'e erişmez;
-- Supabase'in varsayılan grant'ları bu projede daha önce sorun çıkardığı için
-- (Issue #18) açıkça geri alınıyor.
revoke all on sequence public.organization_code_seq from public, anon, authenticated;
grant usage, select on sequence public.organization_code_seq to service_role;
