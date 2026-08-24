# Faz E0 — sentetik adresten gerçek adrese geçiş

**Soru:** `<numara>@orbit.invalid` adresli bir kullanıcı, eski posta kutusuna **erişemeden** gerçek bir e-posta adresine geçebilir mi?

Bu soru kurtarma zincirinin tamamının dayandığı varsayımdı. Cevap yanlış olsaydı kurum yöneticisi e-postasını hiç doğrulayamaz, şifresini unuttuğunda tek çare platform operatörü olurdu.

> ⚠️ **Bu dizin CI'da çalışmaz.** `supabase start` gerektirmez; kendi minimal Auth ortamını kurar. Elle çalıştırılır, bulguyu yeniden üretmek içindir.

## Neden `supabase start` kullanılmadı

`supabase/postgres` imajı ~3–4 GB ve bağlantı hızımızda saatler sürüyordu. Ölçülen şey yalnızca **GoTrue'nun e-posta değişimi davranışı** olduğu için PostgREST, Realtime, Storage ve Studio gereksizdi. Bu betikler sade `postgres:15-alpine` + GoTrue + Mailpit ile aynı GoTrue sürümünü (production ile birebir **v2.195.0**) ayağa kaldırıyor.

## Çalıştırma

```bash
bash up.sh    # ortami kurar (~15 sn, imajlar yerelse)
bash run.sh   # senaryolari kosar
```

`up.sh` iki şeyi elle yapar; Supabase'in kendi Postgres imajı bunları hazır getirdiği için normalde görünmezler:

1. **`auth` şeması ve Supabase rolleri** — GoTrue'nun ilk migration'ı bunların önceden var olmasını bekliyor.
2. **`search_path = auth, public`** — GoTrue çalışma zamanında tabloları `auth.` öneki olmadan sorguluyor. Bu ayar GoTrue **hiç başlamadan önce** uygulanmalı; sonradan değiştirilirse migration'lar yarım kalmış bir şemada yeniden koşuyor ve veritabanı tutarsız hale geliyor (spike sırasında bir kez yaşandı).

## Bulgular (2026-08-24, GoTrue v2.195.0)

| Senaryo | Yol                                              | `Secure email change` | Giden posta                                | Sonuç                                                  |
| ------- | ------------------------------------------------ | --------------------- | ------------------------------------------ | ------------------------------------------------------ |
| **A**   | Kullanıcı kendi oturumuyla                       | **AÇIK**              | **2** — yeni adres **ve** `@orbit.invalid` | Değişim tamamlanmıyor                                  |
| **A2**  | Yalnızca yeni adresin token'ı onaylandı          | **AÇIK**              | —                                          | `verify` 303 döndü ama **adres değişmedi**             |
| **C**   | Kullanıcı kendi oturumuyla                       | **KAPALI**            | **1** — yalnızca yeni adres                | **Değişim tamamlandı**, gerçek adresle giriş çalışıyor |
| **B**   | `service_role` admin API, `email_confirm: true`  | fark etmiyor          | **0**                                      | Anında değişti, **hiç doğrulama yok**                  |
| **D**   | `service_role` admin API, `email_confirm: false` | fark etmiyor          | **0**                                      | Yine anında değişti, yine doğrulama yok                |

### Cevap

**Ayar açıkken geçiş imkânsız.** GoTrue eski adrese de onay maili gönderiyor ve **tek onay yetmiyor** — A2 bunu doğrudan kanıtlıyor: yeni adresin bağlantısı tıklandı, `verify` başarılı döndü, adres yine değişmedi. `@orbit.invalid` kutusuna production'da hiçbir posta ulaşamayacağı için değişim kalıcı olarak kilitli kalır.

**Admin API doğrulama yolu değildir.** `email_confirm` değeri ne olursa olsun adres anında değişiyor ve **hiçbir doğrulama maili gitmiyor**. Yani "adresi admin API ile yazalım ama doğrulamayı GoTrue yapsın" mümkün değil; admin API kullanılırsa adres **doğrulanmadan** kabul edilmiş olur.

**Tek çalışan doğrulamalı yol, ayarın kapatılmasıdır.** O zaman GoTrue yalnızca yeni adrese tek bir onay maili gönderiyor, kullanıcı tıklıyor, adres değişiyor ve eski sentetik adres artık giriş kabul etmiyor.

Kararın kendisi ve güvenlik bedeli: `.ai/DECISION_LOG.md` — "Sentetik adresten gerçek adrese geçiş".
