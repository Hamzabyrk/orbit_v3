# WORK_LOG.md — ORBIT

> Hangi geliştirici/YZ ne yaptı, sırada hangi bilet var. Format: `PROJECT_ARCHITECT.md` §01.
>
> **Kayıt disiplini:** Bu dosyadaki geçmiş girdiler silinmez veya geri alınmaz. Bir kayıt sonradan yanlış çıkarsa, o girdinin altına `**Sonradan düzeltme (tarih):**` satırı eklenir ve güncel durum en üstteki girdide anlatılır. Gerekçe için bkz. `DECISION_LOG.md` — "Hafıza kayıtları ileriye doğru düzeltilir".

---

## 2026-08-23 — Platform Operatörü Şeması (Issue #27)

**Kim:** Claude (Arda Bülent onayıyla, `feat/27-platform-operators-schema` branch'inde)

**Ne yapıldı:**

- `platform_operators` tablosu, `current_user_is_platform_operator()` yardımcısı ve `platform_audit_events` tablosu migration olarak eklendi.
- Platform operatörlüğü `app_role` enum'una eklenmedi. O enum her zaman bir kuruma bağlıdır; platform operatörü hiçbir kuruma ait değildir ve beşinci bir değer sahte bir "platform kurumu" kaydı yaratmayı zorunlu kılardı.
- `auth.users.app_metadata.platform_admin` bayrağı kullanılmadı; tek doğruluk kaynağı tablodur. Aynı bilgiyi iki düzlemde saklamak, bu projede beş kez soruna yol açmış olan drift kalıbının aynısı olurdu.
- `platform_audit_events` ayrı bir tablodur çünkü `audit_events.organization_id` NOT NULL'dır ve "operatör eklendi" gibi kurum-üstü olaylar oraya yazılamaz. Yeni tabloda `organization_id` nullable.
- RLS: operatörler birbirini görebilir, operatör olmayan hiçbir satır göremez. İstemciden **yazma yolu yoktur**; operatör ekleme ve denetim kaydı üretme yalnızca `service_role` ile çalışan Edge Function üzerinden yapılacaktır. Aksi halde bir operatör kendi yetkisini yükseltebilir veya sahte denetim kaydı üretebilirdi.
- Fonksiyon yetkileri Issue #18 dersine göre açıkça bildirildi: `anon`'dan kaldırıldı, `authenticated`'a bırakıldı. RLS policy ifadeleri bu fonksiyonu çağıran rolün ayrıcalıklarıyla değerlendirildiği için yetkinin kaldırılması operatörlerin kendi listelerini bile okuyamamasına yol açardı.
- On iki pgTAP testi eklendi. Üçü, platform operatörünün `organizations`, `branches` ve `organization_memberships` kayıtlarını **göremediğini** doğruluyor; bu, KVKK gerekçesiyle verilen "operatör kapları yönetir, içeriği görmez" taahhüdünün çalıştırılabilir karşılığıdır ve ileride sessizce gevşetilirse CI'da kırılır.

**Düzeltilen önceki değerlendirme:** `PLATFORM_SETTINGS.md` bölüm 5'te "preview deployment koruması kapalı, adresi bilen herkes demo şifresiyle girebilir" yazıyordu. Bu **yanlıştı**. Preview adresleri `302` ile Vercel SSO'ya yönlendiriyor; doğrulandı. Kayıt düzeltildi. Demo şifresiyle dışarıdan erişim riski yok; bedeli, preview'ı incelemek için o Vercel takımına ait bir oturum gerekmesi.

**Kapsam dışında bırakılan:** `bootstrap-organization` Edge Function'ının bu tabloyu okuyacak biçimde güncellenmesi bilinçli olarak bu PR'a alınmadı. Edge Function'lar Supabase GitHub entegrasyonuyla **otomatik deploy edilmez**; yalnızca `supabase/migrations/` uygulanır. Fonksiyonu burada değiştirmek, repo ile production arasında yeni bir ayrışma yaratırdı. Değişiklik, deploy'uyla birlikte panel işinde yapılacaktır.

**Sırada ne var:**

1. `bootstrap-organization` Edge Function'ının güncellenmesi ve deploy'u.
2. `/platform` rotası, giriş ekranı ve panel iskeleti.
3. İlk platform operatörü hesaplarının bir defaya mahsus kontrollü eklenmesi.
4. Test kurumunun silinip ilk kurumun panel üzerinden yeniden kurulması.

---

## 2026-08-23 — v1.1.1 Kalite Kapısı ve v1.1.2 Şifre Akışı (Issue #22, #25)

**Kim:** Claude (Arda Bülent onayıyla; `fix/22-ci-quality-gate` ve `feat/25-password-recovery-flow` branch'lerinde). PR #23'ü Hamza Bayrak onayladı.

**Ne yapıldı — kalite kapısı (Issue #22, PR #23):**

- Bağımlılık taraması engelleyici hale getirildi, ancak doğrudan `continue-on-error` kaldırılmadı. Önce mevcut duruma bakıldı: tüm bağımlılıklarda 20 high ve 2 critical açık vardı; kapı öylece açılsaydı CI her PR'da kırmızı kalır ve zamanla göz ardı edilmeye başlanırdı. Tarama ikiye ayrıldı: production bağımlılıkları engelleyici, geliştirme bağımlılıkları görünür ama engellemeyen.
- Production'daki iki high seviyeli açık gerçekten kapatıldı. İkisi de aynı advisory'ydi: lodash `_.template` kod enjeksiyonu, `recharts` ve `mermaid` zincirlerinden transitive olarak geliyordu. Repoda zaten kullanılan `pnpm.overrides` deseniyle `>=4.18.1`'e sabitlendi. Production audit artık 0 high, 0 critical.
- Yıkıcı migration guard'ı eklendi. `drop table/schema/database`, `drop column`, `truncate` ve `delete from` engellenir; `drop policy` engellemez ama uyarır. Kaçış yolu `-- ALLOW-DESTRUCTIVE: <gerekçe>` satırıdır.
- Guard mevcut migration'lara karşı kalibre edildi: SQL bu repoda küçük harfle yazıldığı için eşleştirme büyük/küçük harf duyarsız, ve satır yorumları taramadan önce temizleniyor çünkü `20260822221832` numaralı migration açıklama metninde `DELETE/TRUNCATE` geçiyor.
- Guard yalnızca PR'da değişen dosyaları tarar. Tüm geçmişi tarasaydı, meşru bir yıkıcı migration merge edildiği anda kapı kalıcı olarak kırmızıya dönerdi.
- `.gitattributes` eklendi; Windows'taki `core.autocrlf` ile `prettier endOfLine: "lf"` çakışması giderildi.

**Guard uçtan uca doğrulandı.** PR #23 `supabase/**` altına dokunmadığı için guard orada tetiklenmiyordu. Tek kullanımlık bir dal (PR #24) açıldı, içine kasıtlı yıkıcı bir migration konuldu, guard doğru dosyayı ve doğru satır numarasını bildirerek işi altı saniyede düşürdü, dal merge edilmeden kapatıldı. Aynı koşuda `Tenant RLS` işi geçti, yani guard mevcut testleri engellemiyor.

**Ne yapıldı — şifre akışı (Issue #25):**

- **Çözülen çekirdek sorun:** `AuthProvider` içindeki `onAuthStateChange` aboneliği her auth olayında kimliği yüklüyordu. Supabase'in şifre sıfırlama bağlantısı da geçerli bir oturum açtığı için, bağlantıya tıklayan kullanıcı hiç şifre ekranı görmeden panele giriyor ve şifresini asla belirleyemiyordu. `PASSWORD_RECOVERY` olayı artık ayrı ele alınıyor ve bayrak, şifre belirlenene veya vazgeçilene kadar kalıcı; aksi halde sonradan gelen `SIGNED_IN` olayları kullanıcıyı panele geri düşürürdü.
- `arrivedWithRecoveryLink`, `createClient` çağrılmadan önce URL hash'ini okur. `createClient` hash'i temizlediği ve olay kısa bir gecikmeyle geldiği için, aksi halde ekran önce "bağlantı geçersiz" gösterip sonra forma dönerdi.
- `/sifre-sifirla` ve `/sifre-belirle` rotaları eklendi. İkincisi Supabase sıfırlama e-postasının hedefidir ve Redirect URL listesiyle uyumludur.
- Şifre politikasının istemci doğrulaması sekiz birim testiyle eklendi. Büyük/küçük harf kontrolü Unicode özellik sınıfları yerine karakterin kendi büyük/küçük hâliyle karşılaştırılıyor; projenin `tsconfig` hedefi regex `u` bayrağını desteklemiyor ve yalnızca `[a-z]`/`[A-Z]` kullanmak Türkçe harfleri harf saymayarak geçerli şifreleri reddederdi.
- Şifre kaydedildikten sonra oturum **kapatılıyor** ve kullanıcı yeni şifresiyle giriş yapıyor. Doğrudan panele almak daha hızlı olurdu ancak şifrenin gerçekten çalıştığı doğrulanmamış kalırdı; bu akışın var olma sebebi tam olarak o belirsizliği ortadan kaldırmak.
- Hesabın kayıtlı olup olmadığı sızdırılmıyor; sıfırlama talebi her durumda aynı onay mesajını gösteriyor.
- Demo modunda akış kapalı ve ekran bunu açıkça söylüyor.
- `EducationLoginScreen` bilinçli olarak refactor edilmedi; ortak `AuthShell` kabuğu yalnızca yeni ekranlarda kullanıldı, çalışan giriş akışına dokunulmadı.

**Doğrulama:** 32 birim testi (24'ten yükseldi), `tsc --noEmit` temiz, `eslint` temiz, `vite build` başarılı.

**Sırada ne var:**

1. `platform_operators` şeması, `current_user_is_platform_operator()` ve `platform_audit_events` migration'ı.
2. `bootstrap-organization` Edge Function'ının bu tabloyu okuyacak biçimde güncellenmesi.
3. `/platform` paneli ve panelden kurum/kullanıcı oluşturma akışı.
4. Şifre akışı production'da uçtan uca doğrulandıktan sonra `PLATFORM_SETTINGS.md` bölüm 4'teki beş ertelenmiş ayarın açılması.

---

## 2026-08-23 — v1.1.1 Güvenlik Kapanışı ve Platform Ayarlarının Kayda Alınması (Issue #18, #20)

**Kim:** Claude (Arda Bülent onayıyla; `fix/18-harden-function-grants` ve `docs/20-platform-settings-registry` branch'lerinde). PR #19'u Hamza Bayrak onayladı.

**Ne yapıldı:**

- `anon` ve `authenticated` rollerinin `internal_bootstrap_organization` ve `handle_new_auth_user` üzerindeki EXECUTE yetkileri, `current_user_has_membership` üzerindeki `anon` yetkisi ve `workspace_documents` üzerindeki DML yetkileri migration ile kaldırıldı.
- `current_user_has_membership` için `authenticated` yetkisi bilinçli olarak **korundu**. RLS policy ifadeleri çağıran rolün ayrıcalıklarıyla değerlendirildiği ve bu fonksiyon dört tablonun policy'sinde birden kullanıldığı için yetkinin kaldırılması tüm tenant okuma akışını kıracaktı. Bu, ilk plandaki "dört fonksiyondan da kaldır" yaklaşımının hatalı olduğunun tespitidir.
- `set_updated_at` kapsam dışında bırakıldı: SECURITY DEFINER değil ve `trigger` tipi döndürdüğü için trigger bağlamı dışında çağrılamıyor.
- `supabase/tests/database/function_grants.test.sql` eklendi. Sekiz testin beşi negatif (yetkiler gerçekten kalktı mı), üçü regresyon (auth trigger'ı hâlâ profil oluşturuyor, `authenticated` hâlâ üyelik sorgulayabiliyor ve profilini güncelleyebiliyor).
- Production Auth ayarları panelden hizalandı: yeni kayıt kapatıldı, minimum şifre uzunluğu 8'e çıkarıldı, şifre karmaşıklığı zorunlu kılındı.
- **Site URL düzeltildi.** `https://orbit-v3-orb-i-t.vercel.app/` ayarlıydı; bu adres Vercel SSO girişine 302 yönlendiriyor. Auth e-postalarındaki bağlantılar kullanıcıyı Vercel login ekranına götüreceği için v1.1.2 şifre sıfırlama akışı kırık doğacaktı. Çalışan public adres `https://orbit-v3-topaz.vercel.app` olarak ayarlandı.
- Redirect URL listesindeki dört hatalı kayıt kaldırıldı (ikisi SSO korumalı domaine işaret ediyordu, ikisinde wildcard yanlış konumdaydı) ve eksik `/**` varyantları eklendi.
- Edge Function `ALLOWED_ORIGINS` secret'ı production adresiyle set edildi.
- Vercel `orbit-v3` projesindeki, uygulamanın kullanmadığı 16 sunucu değişkeni silindi; proje yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ile kaldı. Supabase→Vercel env senkronizasyonu kapatıldı.
- `.ai/PLATFORM_SETTINGS.md` eklendi ve `PROJECT_ARCHITECT.md` §01 ortak hafıza listesine işlendi.

**Canlıda doğrulanan sonuçlar:**

- `anon` → `internal_bootstrap_organization`: önce `HTTP 409` (fonksiyon çalışıyordu), sonra `42501 permission denied`.
- Yeni kayıt: önce `weak_password` (açıktı), sonra `email_provider_disabled`.
- Şifre politikası: önce "at least 6 characters", sonra "at least 8 characters".
- `anon` → `workspace_documents`: `42501 permission denied`.
- `ALLOWED_ORIGINS`: yalnızca production adresi geçiyor; `localhost` ve bilinmeyen origin'ler `origin_not_allowed` alıyor.
- Supabase security advisor uyarıları sekizden üçe düştü; kalan üçü `PLATFORM_SETTINGS.md` bölüm 5'te kabul edilmiş açıklardır.
- Regresyon kontrolü temiz: production sitesi HTTP 200, mevcut oturum canlı, tenant kayıt sayıları değişmedi.

**Repo public'e alınırken oluşan açık pencere denetlendi:** Kötüye kullanım bulgusu yok. Tüm tenant kayıtlarının ve tek Auth kullanıcısının oluşturulma zamanı 2026-08-21 19:04'tür, yani repo public'e alınmadan öncedir.

**Ertelenen ve gerekçesi kayda geçen ayarlar:** `require current password when updating`, `secure password change`, oturum zaman aşımı, JWT secret ve `service_role` rotasyonu. Beşi de aynı sebeple bekliyor: kurucu yöneticinin şifre girişi çalışmıyor ve erişimi tek bir oturuma bağlı. Ayrıntı ve açılma şartı için bkz. `PLATFORM_SETTINGS.md` bölüm 4.

**Sırada ne var:**

1. v1.1.2 — şifre belirleme/sıfırlama akışı. Ertelenen beş ayarın ve Arda'nın hesabının kilidi buna bağlı; kritik yol budur.
2. v1.1.1 kalan iki madde: CI'daki `pnpm audit` kapısı ile yıkıcı migration guard'ı, ve `.gitattributes`.
3. v1.1.2 — `platform_operators` şeması, `/platform` paneli, test kurumunun panel üzerinden yeniden kurulması.

---

## 2026-08-23 — Stabilizasyon Denetimi ve Hafıza Düzeltmesi (Issue #16)

**Kim:** Claude (Arda Bülent onayıyla, `fix/16-ai-memory-truth` branch'inde)

**Ne yapıldı:**

- Production Supabase, GitHub reposu ve canlı site uçtan uca salt-okunur denetimden geçirildi. Bulgular doğrudan canlı sistemden doğrulandı; yalnızca dokümana güvenilmedi.
- `.ai/` hafıza dosyalarının production gerçekliğiyle çeliştiği tespit edildi ve bu PR ile giderildi (ayrıntı aşağıdaki düzeltme notlarında).
- Bu PR'da uygulama kodu, Supabase şeması ve deployment **değiştirilmedi**.

**Doğrulanan production durumu (2026-08-23):**

- Supabase projesi `orbit-dershane`, ref değişmeden `ORBIT Platform` organizasyonuna transfer edilmiş; Arda Owner davetini kabul etmiştir.
- Auth'ta tek kullanıcı var: kurucu yönetici hesabı. Hiçbir kullanıcıda `platform_admin` app metadata'sı **yok**, dolayısıyla `bootstrap-organization` Edge Function'ı şu an kimse tarafından çağrılamıyor.
- Tenant çekirdeği mevcut: 1 kurum (`orbitdershane`), 1 varsayılan şube, 1 org-geneli aktif admin üyeliği, 1 `organization.bootstrap` audit kaydı.
- Production build doğru şekilde production modunda; demo rol geçişi ve demo şifresi kapalı.
- Tenant tablolarında `anon` rolünün hiçbir yetkisi yok; RLS politikaları ve `current_user_has_membership` org-geneli üyelik davranışı doğru çalışıyor. Edge Function'ın `platform_admin` kapısı ve `verify_jwt` doğrulaması çalışıyor.

**Tespit edilen açık bulgular (bu PR'da düzeltilmiyor, sonraki fazlara alındı):**

1. `internal_bootstrap_organization`, `handle_new_auth_user` ve `current_user_has_membership` fonksiyonları `anon` ve `authenticated` rollerine açık. Migration'daki `revoke ... from public`, Supabase'in varsayılan `anon`/`authenticated` EXECUTE grant'larını kaldırmıyor.
2. Production Auth'ta yeni kayıt (signup) **açık** ve minimum şifre uzunluğu 6. `supabase/config.toml` ise `enable_signup = false` ve `minimum_password_length = 8` diyor — `config.toml` yalnızca yerel ortamı yönetir, production ayarlarını değiştirmez.
3. (1) ve (2) birlikte sömürülebilir bir zincir oluşturuyor: kayıt ol, kendi kullanıcı kimliğinle RPC'yi çağır, kendine kurum ve admin üyeliği aç. Mevcut kurum verisi risk altında değil; risk ücretsiz katmanın sahte kurumlarla doldurulması ve sahte audit kaydı üretilmesi.
4. `workspace_documents` tablosunda RLS açık ama hiçbir policy yok; `storage.objects` üzerinde de policy yok. "Belgeler" özelliği production'da işlevsiz. Ayrıca tablo üzerinde `anon` ve `authenticated` hâlâ tam DML yetkisine sahip.
5. Edge Function `ALLOWED_ORIGINS` secret'ı set edilmemiş görünüyor; production fallback listesi üzerinden `http://localhost:5173` origin'ini kabul ediyor. Ayrıca origin kontrolü `Origin` başlığı olmayan isteklerde tamamen atlanıyor — bu allowlist bir güvenlik sınırı değil, yalnızca CORS hijyenidir.
6. CI'da `pnpm audit` adımı `continue-on-error: true` ile çalışıyor; bağımlılık taraması kalite kapısını düşüremiyor.
7. Vercel Preview deployment koruması kapalı. Preview derlemeleri demo modunda olduğundan preview adresini bilen herkes demo şifresiyle girebiliyor.
8. Vercel `orbit-v3` projesine uygulamanın ihtiyaç duymadığı 16 sunucu değişkeni eklenmiş (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD` vb.). Production JS bundle'ı tarandı: bu değerler **istemciye sızmamış**, Vite'ın `VITE_` prefix kuralı tutmuş. Kalan risk build ortamıdır.
9. `client/src/components/education/EducationPlatform.tsx` içindeki yoklama/ödev/gün planı yazmaları `isDemoMode` ile korunmuyor; production'da yalnızca tarayıcı `localStorage`'ına yazılıyor.
10. Production giriş ekranında demo içeriği görünüyor (örnek veli adı ve uydurma kurum istatistikleri).
11. GitHub Free planında private repo için branch protection ve ruleset **uygulanmıyor**. `CODEOWNERS` ve `CONTRIBUTING.md` zorunlu review kuralı tanımlıyor ancak PR #11, #13 ve #15 review'suz merge edilmiş.

**Erişim durumu — kritik:**

Kurucu yöneticinin gizli sekmeden e-posta/şifre ile girişi başarısız oldu. Erişimi, süresi dolmayan tek bir davet oturumuna bağlı; UI'da şifre belirleme veya sıfırlama ekranı bulunmuyor. İkinci bir kullanıcı hesabı yok. Yani ürünün şu anda kullanılabilir insan erişimi tek noktaya bağlı. Bu nedenle JWT secret rotasyonu, şifre akışı kurulana kadar **yapılmayacaktır** — rotasyon mevcut oturumu da düşürür.

**Sırada ne var:**

1. Faz B1 — fonksiyon grant'larını sıkılaştıran migration ve buna karşılık gelen negatif pgTAP testi.
2. Faz B2 — production Auth ayarları, Vercel değişken temizliği ve Preview koruması (elle yapılacak kontrol listesi).
3. Faz B3 — dashboard'dan elle yönetilen ayarların `.ai/` altına yazılı kontrol listesi olarak eklenmesi.
4. Faz B4 — CI kalite kapısının sıkılaştırılması ve yıkıcı migration guard'ı.
5. Faz C1 — şifre belirleme/sıfırlama akışı (tek erişim noktası riskini kaldırır, panelin ön koşuludur).
6. Faz C2 — `platform_operators` şeması. Faz D — `/platform` paneli. Faz F — test kurumunun silinip panel üzerinden yeniden kurulması.

---

## 2026-08-22 — Hamza Platform Sahipliği ve Production Altyapı Transferi

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/14-hamza-platform-migration` branch'inde)

**Ne yapıldı:**

- GitHub Issue #14 açıldı ve altyapı sahipliği çalışması güncel `main`den ayrı feature branch/worktree üzerinde başlatıldı.
- Kaynak `orbit-dershane` Supabase projesi salt-okunur envanterle denetlendi: 1 Auth kullanıcısı, 1 profil, 1 kurum, 1 şube, 1 üyelik, 1 audit kaydı; sıfır belge ve sıfır Storage nesnesi doğrulandı.
- Hamza hesabında ücretsiz `ORBIT Platform` Supabase organizasyonu oluşturuldu. Veri kaybı riski taşıyan sil-yeniden-kur yaklaşımı yerine proje transferi seçildi.
- Transfer önkoşulu olarak eski GitHub production entegrasyonu kontrollü biçimde kapatıldı; `orbit-dershane` projesi kimliği, bölgesi ve verileri korunarak `ORBIT Platform` organizasyonuna transfer edildi.
- Transfer sonrası Auth ve tenant kayıt sayıları yeniden sorgulandı ve kaynak envanteriyle birebir eşleşti.
- Hamza yeni organizasyonda Owner olarak doğrulandı. Arda'ya aynı organizasyon için Owner daveti gönderildi; kabul durumu henüz `Invited`.
- `Hamzabyrk/orbit_v3` Supabase GitHub entegrasyonu repo kökü + `main` production branch ayarıyla yeniden etkinleştirildi.
- Vercel `orbit-v3` projesinin Hamza'nın Owner olduğu `ORBİT` Hobby takımında bulunduğu, production deployment'ın `Ready` olduğu ve `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` değişkenlerinin tüm ortamlarda mevcut olduğu doğrulandı.
- Supabase proje referansı ve anahtarları transferde değişmediği için Vercel bağlantısı kesilmedi. Gereksiz `POSTGRES_PASSWORD` / `SUPABASE_SECRET_KEY` aktarımını önlemek amacıyla geniş yetkili Vercel Marketplace kurulumu bilinçli olarak yapılmadı.

**Sırada ne var:**

1. Arda'nın `ORBIT Platform` Owner davetini kabul ettiğini doğrulamak.
2. `feat/14-hamza-platform-migration` dokümantasyon değişikliklerini kalite kontrollerinden geçirip Issue #14'e bağlı PR açmak.
3. Production login smoke testini Hamza hesabıyla tamamlayıp v1.2 release gate'ine kanıt olarak kaydetmek.

**Sonradan düzeltme (2026-08-23, Issue #16):**

- 1. madde tamamlandı: Arda `ORBIT Platform` Owner davetini kabul etti. 2. madde tamamlandı: PR #15 merge edildi.
- 3. madde **tamamlanmadı**. Production login smoke testi başarısız: kurucu yönetici gizli sekmeden e-posta/şifre ile giriş yapamadı. Mevcut erişim yalnızca süresi dolmayan bir davet oturumundan geliyor ve UI'da şifre belirleme ekranı yok.
- Yukarıdaki "geniş yetkili Vercel Marketplace kurulumu bilinçli olarak yapılmadı" ifadesi yazıldığı anda doğruydu, ancak **sonrasında geçersiz kaldı**: Vercel `orbit-v3` projesine `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD` dahil 16 sunucu değişkeni eklenmiş durumda. Bu değerler istemci bundle'ına sızmamıştır; temizliği Faz B2 kapsamındadır.

---

## 2026-08-21 - v1.1 Supabase Auth ve Tenant Temeli

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/8-auth-tenant-foundation` branch'inde)

**Ne yapıldı:**

- GitHub Issue #8 açıldı ve çalışma merge edilmiş roadmap sonrası güncel `main`den ayrı feature branch üzerinde başlatıldı.
- `profiles`, `organizations`, `branches`, `organization_memberships` ve `audit_events` tabloları; rol/üyelik enum'ları, indeksler, foreign key'ler ve deny-by-default RLS politikaları migration olarak eklendi.
- Org-wide admin ile şube sınırlı üyelik ayrımı ve `current_user_has_membership` güvenlik helper'ı kuruldu. Kurumlar arası okuma/yazma ile sahte audit üretimini reddeden pgTAP negatif testleri eklendi.
- Mevcut login UI korunarak Supabase Auth session provider bağlandı. Production rolü üyelik kaydından gelir; local/Vercel Preview demo davranışı sürer, Production rol geçişi gizlenir.
- İlk kurum + varsayılan şube + admin daveti için `platform_admin` kontrolü, Zod girdi doğrulaması, origin allowlist'i ve sunucu tarafı `service_role` kullanan `bootstrap-organization` Edge Function eklendi.
- Supabase local auth ayarları invitation-only, minimum 8 karakter karma şifre, e-posta doğrulaması ve güvenli şifre değişimi olacak şekilde sıkılaştırıldı.
- `npm run check`, `npm run lint`, `npm test` (24/24) ve `npm run build` geçti. Bağlı Supabase projesinde `db lint --linked --level error` ve `db push --dry-run` geçti.
- İlk PR koşusunda lockfile'daki güncel Supabase client'ın Node 22+ native WebSocket gereksinimi CI'ın Node 20 ayarıyla çakıştı; kalite kapısı desteklenen Node 22 sürümüne yükseltildi.
- `supabase/**` değişikliklerinde çalışan ayrı `Supabase Database Tests` workflow'u eklendi; migration'lar ve pgTAP tenant/RLS negatif testleri GitHub'ın izole Docker ortamında otomatik çalışır.
- Bu makinede Docker/Supabase local DB bulunmadığı için yerel `supabase test db` çalışmadı; aynı migration ve pgTAP testleri GitHub'ın izole Supabase workflow'unda başarıyla geçti.
- Arda PR #9'u onayladı; ana CI, Vercel Preview ve Tenant RLS workflow'ları yeşile döndü. `20260821183000_auth_tenant_foundation.sql` migration'ı ve `bootstrap-organization` Edge Function production `orbit-dershane` projesine deploy edildi.
- İlk tenant için kurum `orbitdershane`, şube `orbit123`, yönetici `Ahmet Yılmaz` olarak onaylandı. `yonetici@orbit.edu.tr` adresi Supabase tarafından `email_address_invalid` ile reddedildi; DNS/MX kaydı da bulunmadı. Davet oluşmadığı için atomik bootstrap çalıştırılmadı ve yarım kurum/üyelik kaydı oluşmadı.

**Sırada ne var:**

1. Ahmet Yılmaz için davet alabilen, gerçek ve erişilebilir bir e-posta adresi almak.
2. Daveti gönderip atomik bootstrap RPC'siyle `orbitdershane` / `orbit123` tenant'ını ve admin üyeliğini oluşturmak.
3. PR #9'u merge edip Vercel Production deployment ve gerçek login akışını doğrulamak.
4. Platform operatör hesabına `platform_admin` app metadata'sını kontrollü vermek; v1.2'ye release gate tamamlanmadan başlamamak.

**Sonradan düzeltme (2026-08-23, Issue #16):**

Yukarıdaki "Davet oluşmadığı için atomik bootstrap çalıştırılmadı ve yarım kurum/üyelik kaydı oluşmadı" cümlesi yalnızca **ilk deneme** için doğruydu ve sonrasında geçersiz kaldı. Canlı veritabanı doğrulaması:

- İlk deneme gerçekten başarısız oldu; `yonetici@orbit.edu.tr` adresi `email_address_invalid` ile reddedildi ve yarım kayıt oluşmadı.
- **Ardından tenant kuruldu.** Yönetici olarak kurucu ekip üyesinin gerçek e-posta adresi kullanıldı; `orbitdershane` kurumu, `orbit123` varsayılan şubesi, kurum-geneli aktif admin üyeliği ve `organization.bootstrap` audit kaydı production'da mevcuttur.
- **Kurulum tasarlanan akıştan yapılmadı.** `bootstrap-organization` Edge Function'ı yerine, yetkili yerel kontrol düzleminden doğrudan `internal_bootstrap_organization` RPC'si çağrıldı. Kanıt: audit kaydı, yönetici kullanıcı satırından iki saniye sonra ve e-posta onayından on dakika önce oluşmuş; ayrıca o anda hiçbir hesapta `platform_admin` bayrağı bulunmuyordu. Bu bayrak bugün de hiçbir hesapta yok.
- **Sonuç:** Tasarlanan onboarding mekanizması hiç çalıştırılmadı, dolayısıyla çalıştığı doğrulanmış değildir. Bu, `bootstrap-organization`'ın gerçek bir kurulumda test edilmediği anlamına gelir.
- Yukarıdaki 1., 2. ve 3. maddeler bu nedenle kapanmış sayılır; 4. madde (`platform_admin` verilmesi) **hâlâ açıktır** ve Faz C2/D kapsamında `platform_operators` tablosuyla yeniden ele alınacaktır.
- v1.1 release gate'i **kapanmamıştır**; ayrıntı için bkz. `ROADMAP.md` v1.1 bölümü.

---

## 2026-08-21 - Functional MVP Kararları ve Sürüm Kapıları

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/6-functional-mvp-roadmap` branch'inde)

**Ne yapıldı:**

- GitHub Issue #6 açıldı; çalışma güncel `main`den ayrı feature branch üzerinde başlatıldı.
- Auth/demo davranışı, tenant üyelik modeli, pilot admin kurulumu, öğrenci hesabı, Günlük Akış/Gün Planı ayrımı, sınav sıralaması gizliliği, temiz kurum durumu ve teslim sırası için sekiz soru-cevap `.ai/ROADMAP.md` içine kalıcı karar kaydı olarak eklendi.
- Günlük Akış ile kişisel Gün Planı ayrı veri modelleri ve ayrı RLS kapsamları olarak kesinleştirildi.
- Önceki toplu Auth/backend fazı; v1.1 Auth, v1.2 ilişkisel DB/RLS, v1.3 dinamik frontend/mock temizliği, v1.4 CRUD ve v1.5 kapalı beta sürümlerine ayrıldı.
- Phase 2; v1.6 Storage, v1.7 toplu veri aktarımı, v1.8 raporlama ve v2.0 Core Product kapılarıyla kaydedildi.
- Bu işte uygulama kodu, Supabase şeması ve deployment değiştirilmedi.

**Sırada ne var:**

1. Dokümantasyon kalite kontrollerini tamamlayıp Issue #6 için draft PR açmak.
2. Plan onayından sonra v1.1 Auth ve tenant temeli için ayrı uygulama issue/branch'i başlatmak.

---

## 2026-08-21 — PR #5 Kalite Kapısı ve Main Senkronizasyonu

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/4-kullanici-paneli-gelistirme` branch'inde)

**Ne yapıldı:**

- Arda'nın PR #5 branch'i güncel `main` ile birleştirildi; platform entegrasyonu ve Supabase güvenlik migration'ları kullanıcı paneli geliştirmeleriyle aynı geçmişe alındı.
- `.ai/WORK_LOG.md` çatışması iki tarafın kayıtları korunarak çözüldü.
- GitHub Actions logunda bildirilen 12 dosyanın Prettier biçim hataları düzeltildi.
- `npm run lint`, `npm run check`, `npm test` (15/15) ve `npm run build` başarıyla tamamlandı.

**Sırada ne var:**

1. Branch'i uzak PR'a gönderip GitHub Actions ve Vercel kontrollerinin yeniden çalışmasını doğrulamak.
2. Vercel kontrolü commit sahibinin ekip üyeliği nedeniyle yeniden hata verirse Arda'nın ORBİT Vercel ekibine davetini tamamlamak.

---

## 2026-08-21 — Ödevler (Homework) — 4 Rol İçin Farklı Yetkilerle

**Kim:** Claude (Arda Bülent ile birlikte, `feat/4-kullanici-paneli-gelistirme` branch'inde, `Hamzabyrk/orbit_v3` reposu)

**Ne yapıldı:**

- Yeni "Ödevler" bölümü eklendi — bu, Gün Planı/Ayarlar'dan farklı olarak **tüm 4 rolün** erişebildiği ama yetkisi farklı olan ilk bölüm: öğretmen sadece sorumlu olduğu sınıflara (Merve Karaca → YKS 12-A & YKS 11-C) gerçek bir formla (placeholder değil) yeni ödev oluşturabiliyor; admin tüm sınıfların ödevlerini görüntülüyor; öğrenci/veli sadece kendi sınıflarının (YKS 12-A) ödevlerini görüntülüyor. Hepsi salt-görüntüleme, sadece öğretmen ekleme yapabiliyor.
- Mevcut 3'lü rol-filtre deseni (`visibleStudents`/`AttendancePage`/`ClassesPage`'de zaten kullanılan) birebir tekrar kullanıldı — yeni bir mimari icat edilmedi.
- `educationAccess.ts`'e `"Ödevler"` eklendi, dört rolün de erişim dizisine dahil edildi (Gün Planı/Ayarlar admin/teacher-only'ydi, bu ilk herkese-açık-farklı-yetkili bölüm).
- Yeni dosyalar: `HomeworkPage.tsx` (liste + rol filtresi), `HomeworkCard.tsx` (kart), `HomeworkCreateDialog.tsx` (öğretmen için gerçek oluşturma formu — shadcn `Dialog`/`Select`/`Input`/`Textarea`, sınıf seçimi öğretmenin kendi sınıflarıyla sınırlı).
- Oluşturulan ödev `homework` state'ine eklenip `demoStorage` ile kalıcı hale geliyor (`automations`/`dayPlanTasks` ile aynı desen), `resetDemoData()`'ya dahil edildi.
- `pnpm check`, `pnpm lint`, `pnpm test` (15/15), `pnpm build` geçti; dev server'da tüm 4 rol tek tek test edildi (admin 7/7 görür-oluşturamaz, öğretmen 5/5 görür+oluşturabilir ve sınıf seçimi kendi 2 sınıfıyla sınırlı, öğrenci/veli sadece YKS 12-A'yı görür-oluşturamaz), gerçek bir ödev oluşturuldu ve kalıcılığı doğrulandı, sıfırlama ile 7 kayda geri dönüldüğü doğrulandı.
- Not: Tarayıcı otomasyonunda `computer.type` aksiyonunun React controlled input'una bazen React `onChange`'i tetiklemeden yazdığı gözlemlendi (muhtemelen bu spesifik input bileşenindeki IME composition sarmalayıcısıyla ilgili bir otomasyon ortamı etkileşimi) — gerçek kullanıcı yazımını etkilemez, form JS ile değer atanıp doğrulandı.

**Sırada ne var:**

1. Kullanıcının orijinal 3 parçalık isteği (Ayarlar genişletme, Ödevler) tamamlandı. Sıradaki adım kullanıcının kararı — commit/push ve olası PR açma.
2. Hamza/Codex'in `feat/1-platform-integrations` (Draft PR #2) hâlâ ayrı merge bekliyor; asıl auth/Supabase Auth/RLS fazı hâlâ başlamadı.

---

## 2026-08-21 — Ayarlar Sayfasının Kategorili Yapıya Genişletilmesi

**Kim:** Claude (Arda Bülent ile birlikte, `feat/4-kullanici-paneli-gelistirme` branch'inde, `Hamzabyrk/orbit_v3` reposu)

**Ne yapıldı:**

- `SettingsPage.tsx` 3 statik karttan, sol tarafta kategori listesi + sağda detay paneli olan 8 kategorili bir yapıya genişletildi (Profil, Kurum, Bildirimler, Roller ve Erişim, Sistem, Güvenlik, Veri Yönetimi, Veri İçe Aktarma) — referans bir SaaS uygulamasının canlı sürümü (demo1/demo1 ile) incelenerek tasarlandı. Sayfa hâlâ sadece admin'e açık, `educationAccess.ts`'e dokunulmadı.
- Profil/Kurum/Sistem/Güvenlik kategorileri gerçek düzenlenebilir form alanları + "Değişiklikleri Kaydet" butonu içeriyor (ephemeral, backend yok); Bildirimler ve Güvenlik'te gerçek shadcn `Switch` kullanıldı — bu, `education/` modülünde ilk shadcn kullanımı (repo genelinde zaten kurulu, kullanıcı onayıyla).
- "Roller ve Erişim" kategorisi artık `educationAccess.ts`'in gerçek `access` verisinden (mevcut 2 export edilen fonksiyon üzerinden, dosyaya dokunmadan) üretilen canlı bir erişim matrisi gösteriyor — sahte/statik içerik değil.
- "Veri Yönetimi"deki "Demo Verilerini Sıfırla" birebir aynı işlevle korundu, üzerine shadcn `Dialog` ile bir onay adımı eklendi (geri alınamaz aksiyon artık onaysız tetiklenmiyor); yanına referanstaki dışa aktarma kartına simetrik bir placeholder eklendi.
- Yeni "Veri İçe Aktarma" kategorisi: bağımlılıksız, elle yapılmış dosya seçici/sürükle-bırak alanı (CSV/Excel), gerçek dosya adını toast'ta gösteriyor.
- `pnpm check`, `pnpm lint`, `pnpm test` (14/14), `pnpm build` geçti; dev server'da admin olarak 8 kategorinin tamamı, "Değişiklikleri Kaydet" toast'ları, switch'ler, erişim matrisinin gerçek verilerle eşleştiği, sıfırlama onay diyaloğunun gerçekten çalıştığı (regresyon yok), dosya seçme + sürükle-bırakın toast attığı ve öğretmen/öğrenci/veli rollerinde "Ayarlar"ın hâlâ hiç görünmediği tek tek doğrulandı.
- Not: Test sırasında otomasyon tarayıcı sekmesinin CSS animasyonlarını tick'lemediği (muhtemelen arka planda/throttle edilmiş sekme) fark edildi — bu, Dialog kapanışında görünmez bir overlay'in DOM'da takılı kalmasına yol açtı; `animationend` event'ini elle tetikleyince sorunun anında düzeldiği doğrulandı, yani bu gerçek kullanıcıyı etkilemeyen bir otomasyon-ortamı artefaktı, kod tarafında bir hata değil.

**Sırada ne var:**

1. Kullanıcının bir sonraki fazı: rol-bazlı bir "Ödevler" bölümü (öğretmen sadece sorumlu olduğu sınıflara girer — mevcut eşleme Merve Karaca → YKS 12-A & YKS 11-C, Bora Ekin → YKS 12-B —, admin hepsini görür, öğrenci/veli/admin sadece görüntüler). Ayrı bir plan turu olarak ele alınacak.

---

## 2026-08-21 — Gün Planı (To-Do List + Takvim) — Yönetici & Öğretmen Paneli

**Kim:** Claude (Arda Bülent ile birlikte, `feat/4-kullanici-paneli-gelistirme` branch'inde, `Hamzabyrk/orbit_v3` reposu)

**Ne yapıldı:**

- Yönetici ve öğretmen panellerine yeni bir "Gün Planı" bölümü eklendi: üstte "To-Do List" (4 kolonlu Kanban görev panosu — Planla/Bugün/Odaklan/Tamamlandı) ve "Takvim" (aylık takvim + günlük ajanda) sekmeleri.
- `educationAccess.ts`'e `"Gün Planı"` section'ı eklendi, sadece `admin`/`teacher` erişebiliyor (`student`/`parent`'a kapalı) — hem birim testle hem tarayıcıda rol geçişleriyle doğrulandı.
- Veri role-özel: yönetici ve öğretmen kendi ayrı mock görev/randevu listelerine sahip (`dayPlanTasksByRole`/`dayPlanEventsByRole`, `mockData.ts`).
- Görev durumu değişimi (dropdown ile kolon taşıma) tam fonksiyonel ve `demoStorage` ile kalıcı (mevcut `attendances`/`automations` deseniyle aynı, `resetDemoData()`'ya dahil edildi); takvimde gün seçimi ajandayı güncelliyor. "+ Yeni görev" / "+ Yeni Görüşme Ekle" ve kolon-içi "+" butonları, uygulamanın geri kalanındaki "Yeni sınıf" konvansiyonuyla tutarlı şekilde placeholder toast gösteriyor.
- Yeni dosyalar: `DayPlanPage.tsx`, `DayPlanToDoBoard.tsx`, `DayPlanTaskCard.tsx`, `DayPlanCalendar.tsx`, `DayPlanMonthGrid.tsx`, `DayPlanAgenda.tsx`, `dayPlanHelpers.ts` (+ test). Yeni npm bağımlılığı eklenmedi (`date-fns`, `lucide-react`, mevcut `Badge`/`PageHeader`/`StatCard` yeterliydi).
- `pnpm check`, `pnpm lint`, `pnpm test` (14/14), `pnpm build` başarıyla geçti; dev server'da admin ve öğretmen olarak gerçek tarayıcı testi yapıldı (nav görünürlüğü, kolon taşıma, kalıcılık, takvim gün seçimi, placeholder toast'lar, rol-özel veri izolasyonu tek tek doğrulandı).
- Not: `pnpm run format:check` bu Windows checkout'ta 38 dosyada CRLF/LF uyuşmazlığı uyarısı veriyor (`core.autocrlf=true` vs `.prettierrc`'deki `endOfLine: "lf"`) — bu, bu iş kapsamının dışında, repo genelini etkileyen ortam kaynaklı bir durum; CI Linux'ta çalıştığı için etkilenmiyor.

**Sırada ne var:**

1. Hamza/Codex'in `feat/1-platform-integrations` (Draft PR #2, sadece Vercel/Supabase platform bağlantısı — henüz gerçek auth/DB fazı değil) işi ayrı olarak merge edilmeyi bekliyor.
2. Asıl auth + Supabase Auth + RLS fazı (mock veri temizliği dahil) henüz başlamadı, ayrı bir Issue olarak planlanacak.

## 2026-08-21 — Vercel Production Deploy ve Supabase Güvenlik Bağlantısı

**Kim:** Codex (Hamza Bayrak onayıyla, `feat/1-platform-integrations` branch'inde)

**Ne yapıldı:**

- GitHub Issue #1 açıldı ve çalışma doğrudan `main` yerine feature branch üzerinde yürütüldü.
- ORBİT Vercel ekibinde `orbit-v3` projesi oluşturuldu ve `Hamzabyrk/orbit_v3` GitHub reposuna otomatik deployment için bağlandı; Production/Preview/Development ortamlarına `VITE_SUPABASE_URL` ve public anon key eklendi. `service_role` anahtarı kullanılmadı.
- Production build `https://orbit-v3-topaz.vercel.app` adresinde yayınlandı.
- Mevcut `orbit-dershane` Supabase projesi bağlandı. Denetimde sıfır belge satırı ve sıfır storage nesnesi bulundu.
- Anonim SELECT/INSERT/DELETE ve storage okuma/yükleme/silme politikaları migration ile kaldırıldı; `workspace-documents` bucket'ı private yapıldı. Son doğrulamada tablo politikası `0`, storage politikası `0`, bucket `public=false` olarak ölçüldü.
- Supabase CLI yapılandırması ve uzak migration geçmişiyle eşleşen timestamp'li migration dosyaları repoya eklendi.
- `pnpm test` (7/7), TypeScript, ESLint ve production build başarıyla tamamlandı.
- Draft PR #2 için GitHub Actions `quality-gate` işi başarıyla geçti.

**Sırada ne var:**

1. Arda'yı GitHub repo ve Vercel ORBİT ekibinde gereken rollerle doğrulamak.
2. Supabase Auth + tenant sahipliği tasarlanmadan belge yazma/okuma politikası eklememek.

---

## 2026-08-18 — Graph-First Düşünme, Blast Radius ve Sistemik Risk Protokolü

**Kim:** Antigravity (Arda Bülent ile birlikte, `feat/orbit-core-init` branch'inde)

**Ne yapıldı:**

- `PROJECT_ARCHITECT.md` §00 Kural 8 ve yeni `08 — Graph-First Düşünme ve Sistemik Risk Protokolü` eklendi. YZ ajanlarına koda atlamadan önce 6 Boyutlu Sistem Grafı (Teknik Kod/Tipler/State, Ticari Bütçe, Hata/Fallback, KVKK/Gizlilik, Pik Yük/Darboğaz, Güvenlik) çıkarma ve risk durumunda proaktif itiraz (pushback) kuralı getirildi.
- `.github/PULL_REQUEST_TEMPLATE.md` içine "🕸️ Graph & Etki Alanı (Blast Radius) Analizi" şablonu eklendi.
- `CONTRIBUTING.md` içine 7. kural olarak "Graph-First Düşünme ve Etki Alanı Analizi" işlendi.
- `.ai/PROJECT_STATE.md` ve `.ai/DECISION_LOG.md` güncellendi.
- `npm run format`, `npm run format:check`, `npm run lint`, `npm test`, `npm run check`, `npm run build` ile doğrulandı.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme (CRUD) formlarının dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme interaktif modalının geliştirilmesi.
3. Yoklama ve sınav hesaplama mantıklarının bağlanması.

---

## 2026-08-18 — EducationPlatform Bölünmesi, Mock Veri İzolasyonu ve ESLint Kalite Kapısı

**Kim:** Claude Code (Arda Bülent ile birlikte, `feat/core-shared-modules` branch'inde)

**Ne yapıldı:**

- 2659 satırlık `EducationPlatform.tsx` tek dosyası `components/education/` altında `types.ts`, `mockData.ts`, `shared.tsx`, `LoginScreen.tsx`, `StudentDetail.tsx`, `dashboards/`, `pages/` ve kompozisyon kökü `EducationPlatform.tsx` olarak bölündü; `Home.tsx` import'ları güncellendi.
- `Student`, `ClassGroup`, `ScheduleItem`, `Automation`, yeni `PaymentRow` tiplerine `isMock: true` bayrağı eklendi (`PaymentsPage`'in inline `items` dizisi `mockData.ts`'e `paymentRows` olarak taşındı).
- `attendances` ve `automations` state'leri için `lib/demoStorage.ts` (+ `demoStorage.test.ts`) ile localStorage kalıcılığı eklendi; `SettingsPage`'e "Demo Verilerini Sıfırla" kartı/butonu eklendi.
- ESLint 9 (flat config, `eslint.config.js`) + typescript-eslint + eslint-plugin-react-hooks (v5, klasik kural seti) + eslint-plugin-react-refresh eklendi; `pnpm lint` script'i ve CI'a `Lint Kontrolü (ESLint)` adımı eklendi. Kurulum sırasında bulunan gerçek sorunlar (kullanılmayan import, `usePersistFn`'deki `any`, `ThemeContext`'in context+hook dışa aktarımı) düzeltildi.
- `pnpm check`, `pnpm test`, `pnpm run lint`, `pnpm run format:check`, `pnpm build` hepsi yeşil.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme işlevlerinin (CRUD) dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme formlarının interaktif hale getirilmesi.
3. Supabase Auth ve RLS politikalarının aktif edilmesi (Aşama 3 kapsamında).

---

## 2026-08-17 — Keşif Mülakatı ve MVP Mimarisinin Kesinleştirilmesi

**Kim:** Antigravity (Arda Bülent ile birlikte, `feat/orbit-core-init` branch'inde)

**Ne yapıldı:**

- `PROJECT_ARCHITECT.md` §02 Etkileşimli Keşif Mülakatı (Grup A, B, C, D) başarıyla tamamlandı.
- Ürün kapsamı: Devlet kısıtlaması olmayan özel kurslar (LGS/YKS, butik etüt, dil kursları) için yalın Sınıf & Öğrenci CRM'i olarak belirlendi.
- Müşteri görüşmesi stratejisi: Auth ve harici API yükü olmadan, tek tıkla rol geçişli ve `isMock: true` bayraklı verilerle çalışan saha demosu olarak kararlaştırıldı.
- `.ai/PROJECT_STATE.md` ve `.ai/DECISION_LOG.md` güncellenerek tüm kararlar kayıt altına alındı.
- Vercel dağıtım ve GitHub entegrasyon kararları onaylandı.

**Sırada ne var:**

1. Sınıf ekleme/düzenleme/silme işlevlerinin (CRUD) dinamik state'e bağlanması.
2. Öğrenci ekleme/düzenleme/silme (Ad, No, Sınıf, Tel, Veli Bilgileri) formlarının interaktif hale getirilmesi.
3. Yoklama alma ve sınav sonuçlarının dinamik olarak hesaplanması.
4. Örnek verilerin `isMock: true` bayrağı ile işaretlenmesi ve tek tıkla "Demo Verileri Sıfırla / Temizle" aksiyonunun eklenmesi.
