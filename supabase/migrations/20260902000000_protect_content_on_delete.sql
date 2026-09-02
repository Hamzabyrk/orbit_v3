-- ALLOW-DESTRUCTIVE: Fonksiyon gövdesindeki `delete from` ifadeleri migration
-- çalıştığında hiçbir veri silmez; silme yalnızca fonksiyon çağrıldığında olur.
-- Bu migration silme yüzeyini genişletmiyor, tam tersine daraltıyor.
--
-- Issue #150 — `internal_delete_organization` kimlikleri koruyordu, içeriği değil.
--
-- 20260825000000 numaralı migration bir olaydan sonra yazıldı ve **kimliği**
-- korudu: kurum silinirken platform operatörünün auth hesabı yok olmuştu.
-- Ama `audit_events`, `organization_memberships`, `branches` ve `organizations`
-- koşulsuz siliniyordu ve bu bugün zararsızdı — çünkü "dolu kurum" diye bir şey
-- yoktu. `students`, `classes`, `attendance`, `exams`, `payments`: hiçbiri yok.
--
-- v1.2 o tabloları eklediği anda aynı fonksiyon **sessiz bir veri kaybı yoluna**
-- dönüşüyor: operatör, listede bir satıra tıklayıp öğrenci/not/ödeme kaydı dolu
-- bir kurumu tek çağrıyla yok edebilir. Geri alınamaz.
--
-- **Neden sabit bir tablo listesi yazılmadı.** Bariz çözüm şuydu: `students`,
-- `classes`, `exams` diye saymak. Ama o tablolar henüz yok — bugün yazılacak
-- liste boş bir listedir ve v1.2'yi yazan kişinin her yeni tabloda buraya
-- dönmeyi **hatırlaması** gerekir. Bu projede hatırlamaya bırakılan adım üç kez
-- atlandı (K-08'in kaynağına bakın). Issue #150'nin kendisi de sorunu tam
-- olarak böyle tarif ediyor: "İki iş arasında bugün hiçbir bağ yok."
--
-- Bu yüzden koruma **ters yönde** kuruldu: liste korunacakları değil,
-- **korunmayacakları** sayar. `public` şemasında `organization_id` sütunu taşıyan
-- her tablo, aşağıdaki dört yapısal tablo dışında, içerik sayılır ve doluysa
-- silmeyi reddeder. v1.2 `students` tablosunu eklediği gün koruma o tabloyu
-- kimse bir şey yazmadan kapsar.
--
-- Ödediğimiz bedel bilinçli: gerçekten silinmesi gereken yeni bir tablo
-- eklendiğinde birileri bu listeyi düzenlemek zorunda kalır. Bu iyi bir bedel —
-- unutmanın sonucu artık veri kaybı değil, açıkça reddedilen bir silme.
--
-- **Sınır — dürüstçe yazılıyor:** koruma yalnızca `organization_id` sütununa
-- bakar. Kuruma dolaylı bağlanan bir tablo (örneğin yalnızca `class_id` taşıyan
-- `class_enrollments`) doğrudan görülmez. Pratikte kapsanır, çünkü böyle bir
-- kayıt ancak `classes` doluyken var olabilir ve `classes` engeli zaten
-- çalışır. Yine de v1.2'nin her dilimi şunu varsaymalıdır: **kuruma ait her
-- tablo `organization_id` taşır.** Taşımayan bir tablo yalnızca bu korumayı
-- değil, tenant modelinin tamamını delmektedir.

create or replace function public.internal_delete_organization(
  target_organization_id uuid,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Kurumla birlikte silinmesi ya da tutulması **bilinçli** olan tablolar.
  -- Buraya bir tablo eklemek "evet, bu kurumla birlikte gitsin" demektir ve
  -- inceleme gerektiren bir karardır. Listede olmayan her şey içeriktir.
  --
  --   branches, organization_memberships, audit_events → kurumla silinir
  --   platform_audit_events → kurumla silinMEZ; `organization_id` NULL'a düşer
  --     ve kaydın kendisi kalır. Platform seviyesi bir kayıttır: kurumun
  --     silindiğini de o yazar, kurumla birlikte gitseydi silme işleminin izi
  --     silme işlemiyle birlikte kaybolurdu.
  structural_tables constant text[] := array[
    'branches',
    'organization_memberships',
    'audit_events',
    'platform_audit_events'
  ];

  organization_name text;
  organization_code integer;
  deletable_ids uuid[];
  protected_ids uuid[];
  deleted_memberships integer;
  deleted_branches integer;
  deleted_audit_events integer;
  content_table text;
  content_rows bigint;
  blocking_content jsonb := '[]'::jsonb;
begin
  select o.name, o.code
  into organization_name, organization_code
  from public.organizations as o
  where o.id = target_organization_id
  for update;

  if not found then
    raise exception 'organization does not exist' using errcode = '23503';
  end if;

  -- İçerik koruması, denetim kaydından ve silmeden ÖNCE.
  --
  -- Sıra önemli: reddedilen bir silme, "silindi" denetim kaydı bırakmamalıdır.
  -- Exception işlemi geri sardığı için buradan sonra yazılan hiçbir şey kalmaz;
  -- reddin kendi kaydını Edge Function yazar (transaction dışında).
  for content_table in
    select c.relname
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute as a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      -- Bölümlenmiş tablonun parçaları ayrıca sayılmasın; üst tabloyu saymak
      -- parçaları da kapsar.
      and not c.relispartition
      and a.attname = 'organization_id'
      and a.attnum > 0
      and not a.attisdropped
      and c.relname <> all (structural_tables)
    order by c.relname
  loop
    -- Tablo adı katalogdan geliyor, kullanıcı girdisinden değil; yine de `%I`
    -- ile alıntılanıyor. `search_path` boş olduğu için şema açıkça yazılmak
    -- zorunda.
    execute format(
      'select count(*) from public.%I where organization_id = $1',
      content_table
    )
    into content_rows
    using target_organization_id;

    if content_rows > 0 then
      blocking_content := blocking_content || jsonb_build_object(
        'table', content_table,
        'rows', content_rows
      );
    end if;
  end loop;

  if jsonb_array_length(blocking_content) > 0 then
    -- `ORB01` standart bir SQLSTATE sınıfı değil; çağıranın bu reddi diğer
    -- hatalardan ayırt edebilmesi için özel olarak seçildi. Mesaj metnine göre
    -- eşleşmek kırılgandır — metin değişince sessizce genel hataya düşerdi.
    raise exception 'organization still holds content'
      using errcode = 'ORB01',
            detail = blocking_content::text,
            hint = 'Kayıtlar kaldırılmadan kurum silinemez.';
  end if;

  -- Üyeler ikiye ayrılıyor: kimliği silinebilecekler ve korunacaklar.
  --
  -- Ölçüt "operatör mü" değil, **başka bir şey bu kimliği talep ediyor mu**:
  --
  --   * Başka bir kurumdaki aktif üyelik. Bugünkü kimlik modelinde bir hesap
  --     tek kuruma ait olduğu için bu koşul normalde tetiklenmez; yine de
  --     kontrol ediliyor, çünkü modelin değişmesi bu fonksiyonun sessizce
  --     yanlışa dönmesine yol açmamalı.
  --   * Platform operatörlüğü. Kurumdan bağımsız bir eksendir; kurumun
  --     silinmesi o ekseni yok etmemelidir.
  --
  -- Operatörlükte `status` filtresi YOK: askıya alınmış bir operatörün hesabı
  -- da silinmemeli, çünkü askı geri alınabilir bir durumdur, hesap silme ise
  -- değildir.
  select
    coalesce(array_agg(m.user_id) filter (where not claimed), '{}'),
    coalesce(array_agg(m.user_id) filter (where claimed), '{}')
  into deletable_ids, protected_ids
  from (
    select
      m.user_id,
      (
        exists (
          select 1
          from public.organization_memberships as other
          where other.user_id = m.user_id
            and other.organization_id <> target_organization_id
        )
        or exists (
          select 1
          from public.platform_operators as op
          where op.user_id = m.user_id
        )
      ) as claimed
    from public.organization_memberships as m
    where m.organization_id = target_organization_id
  ) as m;

  -- Denetim kaydı silmeden ÖNCE yazılıyor; sonraya bırakılsaydı ve araya bir
  -- hata girseydi veriler gitmiş ama kimin sildiği kayıtsız kalmış olurdu.
  -- Kurum adı ve kodu metadata'ya kopyalanıyor çünkü `organization_id` kurum
  -- silinince NULL'a düşüyor.
  insert into public.platform_audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    organization_id,
    metadata
  )
  values (
    actor_user_id,
    'platform.organization_deleted',
    'organization',
    target_organization_id,
    target_organization_id,
    jsonb_build_object(
      'organization_name', organization_name,
      'organization_code', organization_code,
      'member_count',
        coalesce(array_length(deletable_ids, 1), 0)
        + coalesce(array_length(protected_ids, 1), 0),
      'protected_identity_count', coalesce(array_length(protected_ids, 1), 0)
    )
  );

  delete from public.audit_events as a
  where a.organization_id = target_organization_id;
  get diagnostics deleted_audit_events = row_count;

  delete from public.organization_memberships as m
  where m.organization_id = target_organization_id;
  get diagnostics deleted_memberships = row_count;

  delete from public.branches as b
  where b.organization_id = target_organization_id;
  get diagnostics deleted_branches = row_count;

  delete from public.organizations as o
  where o.id = target_organization_id;

  return jsonb_build_object(
    'organization_name', organization_name,
    'organization_code', organization_code,
    'member_user_ids', to_jsonb(deletable_ids),
    'protected_user_ids', to_jsonb(protected_ids),
    'deleted_memberships', deleted_memberships,
    'deleted_branches', deleted_branches,
    'deleted_audit_events', deleted_audit_events
  );
end;
$$;

comment on function public.internal_delete_organization(uuid, uuid) is
  'Kurumu ve bağlı kayıtlarını siler. Kurumda içerik varsa REDDEDER (SQLSTATE ORB01, detail = engelleyen tablo/satır listesi); içerik ölçütü "public şemasında organization_id taşıyan ve yapısal listede olmayan her tablo"dur, böylece v1.2 tabloları eklendiği gün kendiliğinden kapsanır. `member_user_ids` yalnızca kimliği başka hiçbir yerden talep edilmeyen üyeleri içerir; platform operatörlüğü veya başka bir kurumda üyeliği olanlar `protected_user_ids` altında döner ve auth hesapları korunur.';

revoke all on function public.internal_delete_organization(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_delete_organization(uuid, uuid)
  to service_role;
