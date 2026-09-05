-- v1.2-17 · Tekrarlanan istek, ikinci bir istek değildir
--
-- Kapsam turunun 10 numaralı bulgusu: Edge Function'ların hiçbirinde hız sınırı
-- ve idempotency yok (ölçüldü — `supabase/functions/` altında sıfır eşleşme).
--
-- =========================================================================
-- Tehdit modeli — ve neden sıralaması bu
-- =========================================================================
--
-- Beş fonksiyonun beşi de `verify_jwt = true` ve içeride yetki kontrolü
-- yapıyor: çağıran ya platform operatörü ya kurum yöneticisi. Yani "anonim
-- sel" diye bir senaryo yok; GoTrue kendi uçlarını `[auth.rate_limit]` ile
-- zaten sınırlıyor.
--
-- Gerçekte olan şey daha sıkıcı ve çok daha olası: **yanıt kayboluyor,
-- kullanıcı tekrar deniyor.** Formda dönen çarkı gören yönetici hata alınca
-- düğmeye ikinci kez basıyor. Sonuç:
--
--   * `create-member` → aynı kişi için **iki hesap**. Üye silme ekranı v1.4-07'ye
--     kadar yok, yani duplike kayıt öylece kalıyor.
--   * `reset-*` → **yeni bir geçici şifre**, ve yöneticinin biraz önce kâğıda
--     yazdığı şifre sessizce geçersiz oluyor.
--
-- Bu yüzden bu dilimin ağırlığı hız sınırında değil **idempotency**'de.
--
-- **İki fonksiyon idempotency almıyor, çünkü ihtiyaçları yok:**
--
--   * `bootstrap-organization` — `organizations_slug_key` benzersiz; tekrarlanan
--     çağrı zaten çakışmayla reddediliyor.
--   * `delete-organization` — ikinci silme kurumu bulamıyor (`maybeSingle`),
--     doğal olarak idempotent.
--
-- İkisi de hız sınırına dahil. Kapsamı daraltmak bir atlama değil, ölçüm
-- sonucu: var olan bir korumayı ikinci kez yazmak K-06'dır.
--
-- =========================================================================
-- Tek tablo, iki iş
-- =========================================================================
--
-- Hız sınırı "bu çağıran son pencerede kaç kez çağırdı", idempotency "bu
-- anahtar daha önce görüldü mü" sorusunu soruyor. İkisi de **çağrı kaydına**
-- bakıyor, dolayısıyla iki ayrı tablo iki ayrı gerçek kaynağı olurdu.
--
-- Ayıklama (`prune`) bilinçli olarak **yalnızca çağıranın kendi satırlarında**
-- yapılıyor: mevcut indeksi kullanır ve ucuzdur. Bir daha hiç çağırmayan bir
-- kullanıcının eski satırları kalır — hacim önemsiz ve karşılığı, her çağrıda
-- tablo genelinde tarama yapmamak.

create table public.internal_function_calls (
  id bigint generated always as identity primary key,
  function_slug text not null,
  caller_user_id uuid not null,
  -- İstemcinin ürettiği anahtar. Boş olabilir: anahtar göndermeyen bir çağrı
  -- yine hız sınırına takılır, yalnızca idempotency korumasından yararlanamaz.
  idempotency_key text,
  -- Tamamlanan çağrının tekrarında döndürülecek özet.
  --
  -- ⚠️ **Geçici şifre buraya ASLA yazılmaz.** Şifre yalnızca ilk yanıtta bir
  -- kez görünür ve hiçbir yere kaydedilmez (`DECISION_LOG` — "Kimlik ve Giriş
  -- Bilgisi Mimarisi"). Tekrarlanan istek bu yüzden şifreyi geri veremez;
  -- verdiği şey "bu iş zaten yapıldı" olgusu ve giriş numarasıdır. Yönetici
  -- şifreyi kaybettiyse yolu sıfırlamaktır — idempotency bunu değiştirmez,
  -- çünkü değiştirmesi şifreyi saklamak demek olurdu.
  outcome jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Anahtar çağıranla birlikte benzersiz: başka bir yöneticinin anahtarı
-- yanlışlıkla çakışsa bile onun sonucunu okuyamaz, kendi çağrısını yapar.
create unique index internal_function_calls_key_idx
  on public.internal_function_calls (function_slug, caller_user_id, idempotency_key)
  where idempotency_key is not null;

create index internal_function_calls_window_idx
  on public.internal_function_calls (caller_user_id, function_slug, created_at desc);

alter table public.internal_function_calls enable row level security;

-- Politika YOK ve bu bilinçli: bu tabloyu yalnızca `service_role` okur ve
-- yazar. RLS açık + politika yok = `authenticated` ve `anon` için kapalı.
-- Yetkiler de ayrıca kaldırılıyor; iki koruma birbirinin yedeği.
revoke all on public.internal_function_calls from anon, authenticated;
grant all on public.internal_function_calls to service_role;

comment on table public.internal_function_calls is
  'Edge Function çağrı kaydı: hız sınırı penceresi ve idempotency anahtarı. Geçici şifre burada TUTULMAZ.';

-- ---------------------------------------------------------------------------
-- Çağrıyı başlat: hız sınırı ve idempotency tek kapıda
-- ---------------------------------------------------------------------------
--
-- Sınırlar burada, çağıranda değil. Edge Function kendi sınırını parametre
-- olarak geçseydi, hatalı bir sürüm kendini sınırsız ilan edebilirdi; sınır
-- onu uygulayan yerde durmalı.
--
-- Değerler "kötü niyeti durdurma" değil **kaçak döngüyü yakalama** ölçeğinde
-- seçildi. Bir sınıfı sisteme geçiren yönetici saatte otuz üye açabilir; bunu
-- engellemek ürünü kullanılamaz yapardı.

create or replace function public.internal_begin_function_call(
  function_slug text,
  caller_user_id uuid,
  idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saatlik_sinir integer;
  mevcut public.internal_function_calls%rowtype;
  pencere_sayisi integer;
  yeni_id bigint;
begin
  saatlik_sinir := case internal_begin_function_call.function_slug
    when 'create-member' then 60
    when 'reset-member-password' then 30
    when 'reset-admin-password' then 30
    when 'bootstrap-organization' then 10
    when 'delete-organization' then 5
    -- Tanınmayan bir slug sessizce sınırsız kalmamalı (K-04).
    else 10
  end;

  -- Ayıklama: yalnızca bu çağıranın bu fonksiyona ait eski satırları.
  delete from public.internal_function_calls as eski
  where eski.caller_user_id = internal_begin_function_call.caller_user_id
    and eski.function_slug = internal_begin_function_call.function_slug
    and eski.created_at < now() - interval '7 days';

  if internal_begin_function_call.idempotency_key is not null then
    select * into mevcut
    from public.internal_function_calls as kayit
    where kayit.function_slug = internal_begin_function_call.function_slug
      and kayit.caller_user_id = internal_begin_function_call.caller_user_id
      and kayit.idempotency_key = internal_begin_function_call.idempotency_key;

    if found then
      if mevcut.completed_at is not null then
        return jsonb_build_object(
          'allowed', false, 'reason', 'replay', 'outcome', mevcut.outcome
        );
      end if;

      -- Aynı anahtarla eşzamanlı ikinci istek. İşi tekrar yapmak yerine
      -- çağıranı bekletmek doğru: birincisi bitince tekrar sorabilir.
      return jsonb_build_object('allowed', false, 'reason', 'in_progress');
    end if;
  end if;

  select count(*) into pencere_sayisi
  from public.internal_function_calls as kayit
  where kayit.caller_user_id = internal_begin_function_call.caller_user_id
    and kayit.function_slug = internal_begin_function_call.function_slug
    and kayit.created_at > now() - interval '1 hour';

  if pencere_sayisi >= saatlik_sinir then
    return jsonb_build_object(
      'allowed', false, 'reason', 'rate_limited', 'limit', saatlik_sinir
    );
  end if;

  insert into public.internal_function_calls (
    function_slug, caller_user_id, idempotency_key
  )
  values (
    internal_begin_function_call.function_slug,
    internal_begin_function_call.caller_user_id,
    internal_begin_function_call.idempotency_key
  )
  -- Yarış: aynı anahtarla iki istek yukarıdaki okumayı birlikte geçebilir.
  -- Benzersiz indeks birini eler; elenen taraf işi yapmaz.
  on conflict do nothing
  returning id into yeni_id;

  if yeni_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'in_progress');
  end if;

  return jsonb_build_object('allowed', true, 'call_id', yeni_id);
end;
$$;

comment on function public.internal_begin_function_call(text, uuid, text) is
  'Edge Function çağrısını açar: saatlik hız sınırını uygular ve idempotency anahtarını sahiplenir. Sınırlar burada tanımlıdır, çağıranda değil.';

revoke all on function public.internal_begin_function_call(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.internal_begin_function_call(text, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Çağrıyı kapat
-- ---------------------------------------------------------------------------
--
-- Kapatılmayan bir kayıt `in_progress` olarak kalır ve aynı anahtarla gelen
-- tekrar reddedilir. Bu, açık bırakmanın **güvenli** yönü: bir çökme sonrası
-- ikinci kez iş yapılmasındansa çağıranın tekrar denemesi istenir.

create or replace function public.internal_finish_function_call(
  call_id bigint,
  outcome jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.internal_function_calls
  set outcome = internal_finish_function_call.outcome,
      completed_at = now()
  where id = internal_finish_function_call.call_id;
$$;

comment on function public.internal_finish_function_call(bigint, jsonb) is
  'Çağrıyı tamamlanmış işaretler ve tekrarında döndürülecek özeti yazar. Özet ASLA geçici şifre içermez.';

revoke all on function public.internal_finish_function_call(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.internal_finish_function_call(bigint, jsonb)
  to service_role;
