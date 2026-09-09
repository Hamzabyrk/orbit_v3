-- Realtime kanal zemini: kanalın adı kapsamın kendisidir (v1.3-05).
--
-- =========================================================================
-- Ne açılıyor ve neden bu yol
-- =========================================================================
--
-- Bu migration **otonom bir davranış açıyor**: bundan sonra her açık sekme
-- kalıcı bir WebSocket tutacak ve veritabanı değişiklikleri istemcilere
-- itilecek. Kapsamı ve riski açıklanıp onaylandı (2026-09-09, Arda Bülent).
--
-- Ölçülen başlangıç durumu:
--
--   * `supabase_realtime` yayını var ama **içinde hiç tablo yok**.
--   * `realtime.messages` RLS **açık** ve **sıfır politika** — yani bugün
--     hiçbir özel kanal dinlenemiyor. Fail-closed bir zemin.
--   * On bir iş tablosunun hepsinde `REPLICA IDENTITY = default`.
--
-- Üçüncüsü `postgres_changes` yolunu eleyen şeydi. Orada silme olayında eski
-- satırdan yalnız birincil anahtar kalıyor; RLS'in süzeceği `organization_id`
-- yok, dolayısıyla **başka kurumda silinen satırın kimliği her aboneye
-- giderdi**. Bu depoda tenant sınırı iki bağımsız mekanizmayla tutuluyor
-- (RLS ve bileşik yabancı anahtarlar); üçüncü bir yerden delinmesine izin
-- verilmiyor.
--
-- **Tetikleyici yolu o sorunu tamamen ortadan kaldırıyor:** tetikleyicinin
-- `OLD` kaydı `REPLICA IDENTITY`'den bağımsız olarak TAM satırdır. Yani
-- silmede de `organization_id` elimizde ve kapsam kesin.
--
-- Ve 2026-08-21 kararının cümlesi zaten bunu tarif ediyordu: _"kanallar kurum
-- ve gerekli sınıf kapsamıyla sınırlandırılacak"_. Burada **kanalın adı
-- kapsamdır**; yetki kanal düzeyinde bir kez çözülür, her mesajda her abone
-- için yeniden değil.
--
-- =========================================================================
-- ⛔ Yayın hiçbir VERİ taşımıyor
-- =========================================================================
--
-- Gönderilen yük yalnızca `{ "table": ..., "op": ... }`. Ne satır, ne kimlik,
-- ne değer.
--
-- Sebep: yayın yükü satır düzeyinde RLS'ten geçmez. İçine bir kimlik bile
-- koysak, o kimlik kanalı dinleyen herkese giderdi — kanal kurum kapsamlı
-- olsa da kurum içindeki rol ayrımları (öğretmen ödeme göremez, öğrenci veli
-- listesi göremez) yayında uygulanmaz.
--
-- Bu yüzden yayın bir **veri kanalı değil, bir dürtme**. İstemci "şu tabloda
-- bir şey değişti" bilgisini alır ve ilgili sorguyu tazeler; veri o tazeleme
-- sırasında, her zamanki gibi RLS'ten geçerek gelir. Böylece Realtime
-- kapsamı genişletmiyor, yalnızca zamanlamayı değiştiriyor.
--
-- =========================================================================
-- Yayın başarısız olursa asıl işlem düşmez — ve bunu BİZ yapmıyoruz
-- =========================================================================
--
-- İlk yazımda bu tetikleyici `realtime.send`'i kendi istisna bloğuna sarıyordu.
-- Gereksizmiş: `realtime.send`'in kaynağı okundu ve kendi içinde
-- `EXCEPTION WHEN OTHERS THEN RAISE WARNING` taşıyor, yani hiçbir koşulda
-- çağırana hata yükseltmiyor. Yazma işlemi zaten korunuyor.
--
-- Sarmalayıcı KALDIRILDI çünkü zararsız değildi: kendi döngümüzdeki bir hatayı
-- da yutardı. Nitekim ilk ölçümde tam olarak bu oldu — mesajlar yazılmıyordu ve
-- sebep susturulmuştu.
--
-- Kabul edilen bedel yerinde duruyor: yayın düşerse ekran bir sonraki
-- tazelemeye kadar bayat kalır. Alternatifi — bildirim kanalının arızası
-- yüzünden öğretmenin aldığı yoklamanın kaydedilememesi — kabul edilemezdi.
--
-- =========================================================================
-- Bölümler: Realtime servisi kendi yaratıyor, ölçüldü
-- =========================================================================
--
-- `realtime.messages` `inserted_at` üzerinde RANGE bölümlenmiş bir tablo ve
-- ilk ölçümde **sıfır bölümü** vardı; `realtime.send` sessizce düşüyordu
-- (yukarıdaki WARNING yolu). `pg_cron` kurulu değil ve `realtime` şemasında
-- bölüm açan bir fonksiyon yok — üstelik o şemada nesne oluşturma iznimiz de
-- yok, denendi ve reddedildi.
--
-- Sebep provizyondu, tasarım değil: bu projede Realtime hiç kullanılmamıştı.
-- Yerel bir istemciyle tek bir kanala abone olundu (`SUBSCRIBED`) ve servis
-- **beş günlük bölümü kendisi açtı** (dün → üç gün sonrası). Ardından uçtan
-- uca ölçüm yapıldı ve mesajlar yerine ulaştı.
--
-- Yani bölüm yaşam döngüsü bizim işimiz değil; burada yazılı olmasının sebebi,
-- bir sonraki kişinin "yayın çalışmıyor" gördüğünde önce buraya bakması.

-- ---------------------------------------------------------------------------
-- Konu adından kurum kimliği
-- ---------------------------------------------------------------------------
--
-- Biçimi tutmayan bir konu için `null` döner. `current_user_has_membership`
-- `null` aldığında hata vermez, **false** döner (ölçüldü) — yani bozuk ya da
-- uydurulmuş bir konu adı kendiliğinden kapalı kapıya çarpar.

create or replace function public.realtime_topic_organization_id(topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when topic ~ '^org:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then substring(topic from 5)::uuid
  end;
$$;

comment on function public.realtime_topic_organization_id(text) is
  'Realtime konu adından (`org:<uuid>`) kurum kimliğini çıkarır. Biçim tutmuyorsa NULL döner ve çağıran politika kapalı kalır.';

grant execute on function public.realtime_topic_organization_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Kanal yetkisi
-- ---------------------------------------------------------------------------
--
-- `realtime.messages` üzerinde bugün hiç politika yok, yani her kanal kapalı.
-- Açılan tek kapı bu: kurumun aktif üyesi, kendi kurumunun kanalını dinler.
--
-- Şube kırılımı BİLEREK yok. `current_user_has_membership` şube parametresini
-- boş bırakınca kurum düzeyinde bakıyor ve kanal da kurum düzeyinde. Şube ya
-- da sınıf kapsamlı kanal gerekirse ayrı bir konu öneki ve ayrı bir politika
-- ile gelir; bugünkü ekranların hiçbiri şube bazlı tazeleme istemiyor.

create policy "kurum uyesi kendi kurumunun kanalini dinler"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.current_user_has_membership(
    public.realtime_topic_organization_id(realtime.topic())
  )
);

-- ---------------------------------------------------------------------------
-- Tetikleyici
-- ---------------------------------------------------------------------------
--
-- **Deyim düzeyinde, geçiş tablosuyla.** Satır düzeyinde olsaydı yüz satırlık
-- bir içe aktarma yüz ayrı yayın üretirdi. Geçiş tablosu sayesinde bir deyim
-- kaç satıra dokunursa dokunsun, etkilenen **her kurum için tek** mesaj gider.
--
-- Geçiş tablosu takma adı üç olayda da `changed_rows`: INSERT ve UPDATE'te
-- yeni tablo, DELETE'te eski tablo. Bu yüzden tek fonksiyon üçüne de yetiyor.
-- (Postgres geçiş tablolu bir tetikleyicinin birden çok olaya bağlanmasına
-- izin vermiyor; bu yüzden tablo başına üç tetikleyici var.)

create or replace function public.broadcast_organization_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scope_id uuid;
begin
  for scope_id in
    select distinct changed.organization_id
    from changed_rows as changed
    where changed.organization_id is not null
  loop
    -- İstisna sarmalayıcı YOK ve bu bilinçli: `realtime.send` kendi içinde
    -- yutuyor (kaynağı okundu), yani yazma zaten korunuyor. Buraya bir
    -- `when others` koymak yalnızca KENDİ hatalarımızı gizlerdi.
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'op', tg_op),
      'change',
      'org:' || scope_id::text,
      true
    );
  end loop;

  return null;
end;
$$;

comment on function public.broadcast_organization_change() is
  'Deyim düzeyinde tetikleyici: etkilenen her kurum için `org:<uuid>` kanalına tek bir dürtü yayınlar. Yük yalnızca tablo adı ve işlem türüdür — VERİ TAŞIMAZ, çünkü yayın satır düzeyinde RLS''ten geçmez. Yayın hatası yazma işlemini düşürmez.';

-- Ölçüldü (canlı, `begin; … rollback;`): tek bir INSERT deyimi iki farklı
-- kuruma üç satır yazdığında **her kuruma tam bir mesaj** gitti (2 + 1 değil,
-- 1 + 1). UPDATE ve DELETE de birer mesaj üretti; DELETE'in tetiklenmesi
-- `OLD`'un `organization_id` taşıdığını doğruluyor — `REPLICA IDENTITY`
-- default olduğu halde. Bu yolu seçmenin sebebi tam olarak buydu.
--
-- Yükün içeriği de ölçüldü: `{"op": "DELETE", "table": "students"}`. Veri yok.
--
-- Kanal yetkisi ayrıca ölçüldü: A kurumunun üyesi A kanalında 1 mesaj gördü,
-- B kurumunun üyesi aynı kanalda **0**, uydurulmuş bir konu adında **0**.

-- ---------------------------------------------------------------------------
-- Bağlanan tablolar
-- ---------------------------------------------------------------------------
--
-- Ekranların okuduğu ve yöneticinin değiştirdiği tablolar. Hepsinde
-- `organization_id not null` olduğu doğrulandı.
--
-- Denetim kaydı (`audit_events`) ve üyelikler (`organization_memberships`)
-- BİLEREK dışarıda: denetim kaydı imleçli ve geçmişe doğru okunuyor, canlı
-- tazeleme oraya bir şey katmaz; üyelik değişimi ise kimliği etkiler ve onun
-- tazelenmesi ayrı bir mesele (oturum/kimlik akışı, #221'in alanı).

do $$
declare
  hedef text;
  tablolar text[] := array[
    'students',
    'classes',
    'class_enrollments',
    'schedule_entries',
    'attendance_sessions',
    'attendance_records',
    'exams',
    'exam_results',
    'payment_plans',
    'installments'
  ];
begin
  foreach hedef in array tablolar loop
    execute format(
      'drop trigger if exists %I on public.%I',
      hedef || '_broadcast_insert', hedef
    );
    execute format(
      'create trigger %I after insert on public.%I
         referencing new table as changed_rows
         for each statement
         execute function public.broadcast_organization_change()',
      hedef || '_broadcast_insert', hedef
    );

    execute format(
      'drop trigger if exists %I on public.%I',
      hedef || '_broadcast_update', hedef
    );
    execute format(
      'create trigger %I after update on public.%I
         referencing new table as changed_rows
         for each statement
         execute function public.broadcast_organization_change()',
      hedef || '_broadcast_update', hedef
    );

    execute format(
      'drop trigger if exists %I on public.%I',
      hedef || '_broadcast_delete', hedef
    );
    execute format(
      'create trigger %I after delete on public.%I
         referencing old table as changed_rows
         for each statement
         execute function public.broadcast_organization_change()',
      hedef || '_broadcast_delete', hedef
    );
  end loop;
end;
$$;
