# AGENT_WORKFLOW.md — ORBIT'te iki ajanlı çalışma düzeni

> ⚠️ **Bu belge bir görev değildir.** Bir sürecin tarifidir. Hiçbir ajan bu dosyayı okuduğu için bir iş başlatmaz. Yalnızca **açık bir görev brifingi** verildiğinde uygulanır.
>
> Elinizde `.ai/tasks/` altında size verilmiş bir brifing yoksa bu belge sizi ilgilendirmiyor.

---

## Neden var

ORBIT iki kişilik, sıfır bütçeli bir ekip tarafından geliştiriliyor ve ağır iş yükü yapay zekâ ajanlarında. Tek bir ajanın hem yazıp hem denetlemesi iki sorun üretiyordu: maliyet ve kör nokta. Bir ajan kendi varsayımını dürüstçe bildirebiliyor ama **yanlış olduğunu göremiyor**.

Bu yüzden iş ikiye ayrıldı: **yazan** ve **denetleyen**. Bu belge o ayrımın kurallarını tutuyor ki oturum değişince kaybolmasın.

---

## Döngü

Her devredilen iş aynı yedi adımdan geçer. Adım atlanmaz.

```
0. TAZELE     Denetleyen: main'i çek, ÜZERİNDEN yeni dal aç
1. BRİFİNG    Denetleyen yazar → .ai/tasks/<sıra>-<kısa-ad>.md
2. UYGULAMA   Yazan uygular, kalite kapısını çalıştırır, DURUR
3. TESLİM     Yazan altı çıktıyı verir (aşağıda)
4. KAPSAM     Denetleyen: brifing dışı dosyaya dokunulmuş mu?
                └─ dokunulmuşsa → REDDET, içeriğe hiç bakma
5. İNCELEME   Denetleyen diff'i okur, kapıyı KENDİ çalıştırır
                ├─ kabul  → 6. adım
                └─ revizyon → 2. adıma dön
6. KAPANIŞ    Denetleyen commit, PR, belgeyi günceller, brifingi siler
                (brifing izlenmiyor — silmek commit gerektirmez)
                └─ merge sonrası: commit'ler main'e GERÇEKTEN girdi mi?
```

Döngü tamamlanmadan sıradaki iş başlamaz.

**4. adım 5. adımdan önce gelir ve atlanmaz.** Kapsam ihlali varken koda bakmak, kötü bir alışkanlığı ödüllendirir: kod iyiyse ihlal görmezden gelinir ve sınır aşınır. Önce sınır, sonra içerik.

### 0. adım — tazeleme

Her iş, güncellenmiş `main` üzerinden açılan **yeni bir dalla** başlar. Mevcut bir dala devam edilmez.

```bash
git fetch origin
git checkout main && git pull --ff-only
git checkout -b <tip>/<issue-no>-<kisa-ad>
```

Bu tek adım iki ayrı hatayı birden kapatır:

- **Bayat çalışma kopyası.** Git kendiliğinden senkronize olmaz. Yazan ajan çalışma kopyasındaki dosyaları okur; kopya geride ise ajan artık geçerli olmayan bir kod tabanına göre iş yapar ve bunu kimse fark etmez.
- **Merge edilmiş dala commit.** Bir PR merge edildikten sonra o dal ölüdür. Üzerine atılan commit dalda durur, `main`'e hiç girmez ve CI bile koşmaz — çünkü PR kapanmıştır.

> **"Düzenli olarak `git pull` yap" kuralı bilinçli olarak yazılmadı.** Tetikleyicisi olmayan kural uygulanmaz; bu projede `WORK_LOG` tam olarak böyle öldü. Tazeleme bir alışkanlık değil, döngünün **ilk adımıdır** — ve dalı `main` üzerinden açmak, bayatlığı yasaklamak yerine **imkânsız** kılar.

**Aynı adımda yol haritası mutabakatı yapılır.** Çekilen commit'ler ile `ROADMAP.md`'nin söylediği birbirini tutuyor mu:

```bash
git log --oneline -15
```

Listede, yol haritasında hâlâ `[ ]` görünen bir işi bitiren PR var mı? Varsa **brifingi yazmadan önce** kutucuk işaretlenir.

Bu kontrol kapanışa değil **açılışa** kondu ve sebebi şu: kapanışta belge güncellemek kuralı zaten var ve **üç kez atlandı** (#77 · B08, B10 · E4). Önleme çalışmadı; kalan şey tespit. Ve tespit için doğru an burasıdır — yol haritasını **okuyan** taraf bir sonraki görevdir, yanlış bilgiden zarar gören de o.

### 6. adımın son yarısı — commit'ler gerçekten indi mi?

PR merge edildikten sonra, o PR'daki her commit'in `main`'e girdiği doğrulanır:

```bash
git fetch origin
git merge-base --is-ancestor <commit-sha> origin/main && echo "indi" || echo "SIKISTI"
```

**Neden gerekli:** Bu projede iki kez, merge edilmiş bir dala sonradan commit atıldı ve commit'ler sessizce kayboldu (PR #52 → `dc70d6e`; PR #78 → iki commit). İkisinde de yerel `git push` başarılı döndü, uzak dal güncellendi ve **hiçbir hata görünmedi** — çünkü teknik olarak bir hata yoktu; commit doğru dala gitti, o dal artık hiçbir yere bağlı değildi.

Sıkışmış commit varsa çözüm: güncel `main` üzerinden yeni dal açıp `git cherry-pick` ile taşımak ve yeni PR açmak.

---

## Rol dağılımı

| İş                             | Kim            | Neden                                   |
| ------------------------------ | -------------- | --------------------------------------- |
| Tasarım kararları, tartışma    | **Denetleyen** | Bağlamın tamamı ve karar geçmişi orada  |
| Migration, RLS, yetkilendirme  | **Denetleyen** | Hatası sessiz ve geri dönüşü pahalı     |
| Edge Function                  | **Denetleyen** | `service_role` taşıyor                  |
| Production'a dokunan her şey   | **Denetleyen** | Geri alınamaz                           |
| Arayüz bileşenleri             | **Yazan**      | Sınırlı ve geri alınabilir              |
| Mekanik dönüşümler             | **Yazan**      | Hacimli ama düşük riskli                |
| Saf mantık ve testleri         | **Yazan**      | Şartname brifingde net verilebiliyor    |
| `client/src/lib/` yardımcıları | **Yazan**      | Sağlayıcıya dokunmuyor, testi kolay     |
| Vitest testleri                | **Yazan**      | Beklenen davranış brifingde yazılabilir |
| PR açıklaması taslağı          | **Yazan**      | Gerekçeyi zaten biliyor                 |
| `git diff` incelemesi          | **Denetleyen** | Devrin var olma sebebi                  |

Sınır şu soruyla çizilir: **yanlış yapılırsa sessizce mi geçer, yoksa hemen görünür mü?** Sessiz olanlar devredilmez.

**Devredilebilir alan zamanla genişler.** Bir tür iş iki kez sorunsuz teslim edildiyse, üçüncüsünde sınırı daraltmak için sebep yoktur. Daralttıkça devrin anlamı azalır ve denetleyen tıkanma noktasına döner.

**Bir dilim, tek başına anlamlı olduğu sürece bölünmez.** Etkileşmeyen iki iş aynı brifingde verilebilir; her tur bir brifing, bir teslim ve bir inceleme maliyeti getirir ve gereksiz tur en pahalı israftır. Bölmenin tek geçerli sebebi **bağımlılık**: biri diğerinin çıktısına dayanıyorsa ayrılır.

---

## Yazan ajan için kurallar

### Her görevde geçerli

- Brifingde **adı geçmeyen hiçbir dosyaya** dokunma.
- `git commit`, `git push`, `git merge`, PR açma — **hiçbiri**. Branch'te bırak, dur.
- Supabase, Vercel veya GitHub'a **hiçbir çağrı** yapma.
- **Yeni bağımlılık ekleme.** `package.json` ve kilit dosyaları dokunulmaz.
- `supabase/`, `.ai/` (kendi brifingin hariç) ve `.env*` — **dokunulmaz**.
- ESLint kuralını `eslint-disable` ile **susturma**. Kural doğrudur; kod yanlıştır.
- Brifingde **listelenmeyen özellik ekleme**. "Faydalı olur" diye eklenen şey kapsam dışıdır.
- Var olan dosyaları "iyileştirme".
- Görevi tamamlamak için **başka bir dosyayı değiştirmen gerektiğini düşünüyorsan yapma** — dur ve sor. Kapsam dışı bir dosyaya dokunmak, teslimin içeriğine bakılmadan reddedilmesine yol açar.

### Belirsizlik kuralı

Brifingde cevabı olmayan bir şeyle karşılaşırsan **dur ve sor**. Yanlış varsayımla yazılmış kodu düzeltmek, sormaktan pahalıdır.

Varsayım yapmak zorunda kaldıysan teslimde **açıkça yaz**. Nerede tahmin ettiğini bilmek, kodun kendisinden daha değerlidir.

### Kod kuralları

- Arayüz metinleri **Türkçe**.
- Yorumlar Türkçe ve **"ne" değil "neden"** anlatır. `// state'i güncelle` yazma; `// Kaçış yolu bırakılmıyor çünkü ...` yaz.
- Mevcut dosyaların yorum yoğunluğuna ve üslubuna uy.
- `any` kullanma.
- Var olan ortak bileşenleri ve yardımcıları **yeniden kullan**, benzerini yazma.

### Teslim — altı çıktı, eksiksiz

1. `git status --short`
2. `git diff` (yeni dosyada `git add -N . && git diff`)
3. Kalite kapısının beş komutunun **gerçek çıktısı** — "geçti" yazmak yetmez
4. **Varsayımların** — yoksa "varsayım yok" yaz
5. **Emin olamadıkların**
6. **PR açıklaması taslağı**

Son üç madde atlanamaz.

**6. madde neden var:** Denetleyenin en pahalı işi kod okumak değil, PR açıklamasını sıfırdan yazmaktır — çünkü o metin projenin kalıcı hafızası ve "ne yapıldı"dan çok **"neden böyle yapıldı"** anlatmak zorunda. Yazan ajan o gerekçeyi zaten biliyor; denetleyen onu yeniden üretmek yerine düzeltirse iş ucuzlar.

Taslak üç başlık taşır, hepsi kısa:

- **Ne değişti** — madde madde, dosya listesi değil
- **Neden böyle** — reddedilen alternatif varsa gerekçesiyle
- **Neye dokunulmadı** — bilinçli olarak kapsam dışı bırakılanlar

Taslak olduğu gibi kullanılmaz; denetleyen doğruladığı şeyleri ekler ve doğrulayamadığını çıkarır.

### Kalite kapısı

```bash
npx prettier --check .
npx eslint .
npx tsc --noEmit
npx vitest run
npx vite build
```

Hepsi yeşil olmadan teslim etme.

**Bu komutlar için ayrıca izin istenmez.** Beşi de salt okumadır: dosya değiştirmez, ağa çıkmaz, git'e dokunmaz. Yazan ajanın kum havuzu bunları engelliyorsa, kum havuzu dışında çalıştırılmaları **baştan onaylıdır** — her görevde yeniden sorulması gereksiz sürtünmedir.

Onay hâlâ gereken şeyler değişmedi: `pnpm install` veya herhangi bir bağımlılık kurulumu, ağ isteği, `git` komutları, ve brifingde izin verilmeyen bir dosyayı yazan her şey.

`npx prettier --write` yalnızca **brifingin izin verdiği dosyalar üzerinde** serbesttir; kendi çıktını biçimlendirmek kapının parçasıdır.

> **Kapının yeşil olduğunu bildirmek yetmez.** Denetleyen dördünü de kendisi çalıştırır ve bu boşuna değil: C1 teslimi `prettier --check` için yeşil bildirdi, denetleyende kırmızıydı. Rapor iyi niyetle yanlış olabilir; kapı yanılmaz.

---

## Denetleyen ajan için kurallar

Bu bölüm en az diğeri kadar bağlayıcıdır. Denetleyenin kayması, yazanın kaymasından **daha pahalıdır** çünkü onu yakalayacak kimse yoktur.

### Rolü koru

- **Kendin özellik kodu yazma.** İstisnalar: şema, RLS, Edge Function, bağlama (wiring) ve tek satırlık düzeltmeler. Bunun dışına çıkıyorsan dur ve devret.
- "Ben daha hızlı yazarım" düşüncesi devrin **var olma sebebini** ortadan kaldırır. Hız değil, süreklilik hedefleniyor.

### Asla güvenme, doğrula

- Yazanın kalite kapısı raporuna **güvenme**, kapıyı **kendin çalıştır**.
- İddia edilen davranışı **ölç**. Yuvarlama, tarih, sınır durumu — çalıştırılabilir bir kontrolle doğrula.
- İçe aktarılan her API'nin **gerçekten var olduğunu** kontrol et. Uydurulmuş bir isim `tsc`'den geçebilir (varsa) veya geçmeyebilir; bakmak ucuz.

### Kapsam kontrolü — her teslimde, koda bakmadan ÖNCE

Bu adım atlanmaz ve içerik incelemesinden **önce** gelir.

```bash
git status --short                    # brifing dışı dosya var mı
git log --oneline -3                  # izinsiz commit var mı
git diff --stat                       # kaç dosya, kaç satır
git diff --name-only                  # tam liste
```

Sonra listeyi brifingdeki dosya adlarıyla **tek tek karşılaştır.** Beklenen dosya sayısını brifingi yazarken zaten biliyorsun; sayı tutmuyorsa dur.

Şunlardan biri varsa **içeriğe bakmadan reddet:**

| Bulgu                                | Neden reddedilir                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Brifingde adı geçmeyen dosya         | Kapsam ihlali; "faydalı olur" diye yapılan değişiklik denetlenmemiş değişikliktir |
| `supabase/` altında herhangi bir şey | Şema ve yetkilendirme devredilmez                                                 |
| `.ai/` altında brifing dışı dosya    | Proje hafızası                                                                    |
| `package.json` veya kilit dosyası    | Bağımlılık yüzeyi                                                                 |
| `.env*`, anahtar, token              | Hiçbir koşulda                                                                    |
| İzinsiz commit veya push             | Kapanış yalnızca denetleyene ait                                                  |
| `eslint-disable`                     | Kural doğrudur; kod yanlıştır                                                     |

Reddetmek kaba değil, **sınırı koruyan şey.** Kod iyi diye ihlali görmezden gelmek sınırı bir kez aşındırır ve bir daha geri gelmez.

Değişiklik gerçekten gerekliyse doğru yol brifingi genişletip yeniden istemektir — sessizce kabul etmek değil.

### Kapanış

- Commit, PR ve production **yalnızca denetleyene** aittir.
- PR açıklaması **neyin neden yapıldığını** anlatır; değişiklik listesi yetmez.
- **Belgeyi aynı PR'da güncelle.** Bu adım isteğe bağlı değildir:
  - bir dilim bittiyse → `ROADMAP.md` §0 tablosu **ve** §4.5'teki kutucuk
  - bir mimari karar alındı veya değişti → `DECISION_LOG.md` (**indekse de satır ekle**)
  - panelden bir ayar değiştiyse → `PLATFORM_SETTINGS.md`
  - klasör veya servis katmanı değiştiyse → `PROJECT_STATE.md` §5
- **Biten brifingi sil.** Git geçmişi kaydı tutar; çalışma kopyası temiz kalır.
- Yeni bir hata çıktıysa **aşağıdaki kural listesine ekle.**

> **Neden kapanışta:** Belge güncellemesi uzun süre kimsenin adımı değildi ve sonuç ölçüldü — 28 commit boyunca çalışma günlüğü hiç yazılmadı, `ROADMAP.md` §0 bir gün geride kaldı ve bitmiş üç dilimi "başlanmadı" gösterdi. O tablo, bu belgenin denetleyene gösterdiği tek bağlam çıpasıydı. Ayrı bir "belgeleri güncelleme" işi açmak çözüm değil: açılır, sıraya girer, yapılmaz. Bkz. `DECISION_LOG.md` — "Belge sayısı değil bakım borcu".

### Bağlamı koru

Her göreve başlamadan önce:

- `ROADMAP.md` **bölüm 0** — hangi aşamadayız
- Görevin dayandığı kararlar `DECISION_LOG.md`'de var mı

Yol haritasını hatırlamak denetleyenin işidir. Yazan ajanın bağlamı görev kadardır; **bütünü gören tek taraf denetleyendir.**

---

## Birikimli kurallar — geçmiş hatalardan

> Her görevden sonra buraya bakılır. Yeni bir hata çıktıysa **kural olarak** eklenir, hata kaydı olarak değil.
>
> Gerekçe: hata listesini kimse okumaz, kural listesi ise her brifinge girer.

### K-01 · Süreler ve son tarihler aşağı yuvarlanır

Kalan süre **asla olduğundan uzun gösterilmez**. 1 günün altındaki süreler saat olarak yazılır.

_Kaynak: E3-01. `Math.ceil` kullanılmıştı; 5 saati kalan kullanıcıya "1 gün" görünüyordu. Kullanıcı "yarın hallederim" der ve hesabı kilitlenir._

### K-02 · Gösterim ile karar birbirinden ayrılır

Ekranda gösterilmek üzere yuvarlanmış bir değer, **karar mantığında kullanılmaz**. Karar ham veriden türetilir.

_Kaynak: E3-01. "Süresi doldu" kararı yuvarlanmış gün sayısından geliyordu; yuvarlama biçimi değişince karar da sessizce değişirdi._

### K-03 · Çözümlenemeyen veri uydurulmuş değerle gösterilmez

Tarih, sayı veya biçim çözümlenemiyorsa **hiç gösterilme**. Varsayılan bir değer üretme.

_Kaynak: E3-01. Bozuk tarih ekrana `NaN gün sonra geçersiz olacak` basıyordu._

### K-04 · Bilinmeyende güvenli tarafta kal

Bir güvenlik durumu okunamıyorsa **kısıtlayıcı** olan varsayılır. Kilit bayrağı okunamıyorsa kilit **var** sayılır.

_Kaynak: E3 bağlama. Fail-open olmak, kilidi tek bir ağ hatasıyla atlanabilir kılardı._

### K-05 · Ortak kabuk bileşeni kendi düzenini kurmaz

`AuthShell` gibi ortak kabuklar arka planı ve tam ekran düzenini kendileri sağlar. Onları kullanan bileşen kendi `min-h-screen` sarmalayıcısını yazmaz.

_Kaynak: E3-01 brifingi. İlk yazımda belirtilmemişti; belirtilmeseydi çift sarmalama olacaktı._

### K-06 · Aynı olgu iki yerde tutulursa biri mutlaka eskir

Bir durum, sayı veya liste iki ayrı dosyada tutuluyorsa güncellemelerden biri er ya da geç atlanır — ve iki kaynak çelişince okuyan hangisinin doğru olduğunu bilemez. Çözüm hatırlamaya çalışmak değil, **ikinci kopyayı kaldırıp yerine tek kaynağa işaret koymaktır.**

Bu kural üç kez ısırdı: `WORK_LOG` ile `ROADMAP` durumu ayrı tutuyordu; README ile `PROJECT_STATE` klasör ağacını ayrı tutuyordu; `PROJECT_STATE` §7 ve §9, `ROADMAP` §0 ile aynı gün çelişti — biri güncellendi, ikizi bırakıldı.

Bir metin yazarken şunu sor: **bu olgu başka bir dosyada da yazıyor mu?** Yazıyorsa yazma, işaret et.

_Kaynak: Issue #77 belge denetimi ve Issue #80 (Codex A1 analizi, B10–B11)._

### K-07 · Paralel çalışırken git ağacı ortaktır, dosya kümeleri değil

İki ajan aynı anda çalışabilir ve dosya kümeleri kesişmese bile **git çalışma kopyası tektir.** Dal değiştirmek, hazırlama alanına toplu ekleme yapmak ve dosya geri almak, diğer tarafın commit edilmemiş işine dokunur.

Üç kural, üçü de bir kez ihlal edildiği için yazıldı:

- **`git add -A` / `git add .` kullanma.** Yalnızca açık dosya yolu: `git add path/to/file`. Toplu ekleme, diğer ajanın o an yazdığı dosyaları da commit'ine alır.
- **Dal değiştirmeden önce `git status` boş olmalı.** Boş değilse commit et veya `git stash push -- <yol>` ile yalnızca kendi dosyalarını ayır. Git, commit edilmemiş değişiklikleri çakışma yoksa sessizce yeni dala taşır — ve bunu haber vermez.
- **Diğerinin dosyasını `git checkout -- <yol>` ile geri alma.** O komut, o an üretilmekte olan işi geri döndürülemez biçimde siler. Ayırman gerekiyorsa önce çalışma kopyasının dışına kopyala.

**Ne olduğu:** Denetleyen sunucu tarafını yazarken Codex istemci tarafını aynı ağaçta yazıyordu. Denetleyen bir test dosyasını okumak için dal değiştirdi; Codex'in commit edilmemiş iki dosyası onunla taşındı ve `git add -A` onları sunucu commit'ine süpürdü. Ayrıca daha öncesinde aynı dosyalar `git checkout --` ile geri alınmış, Codex'in o anki üretimi silinmişti — yalnızca önceden kopya alındığı için kurtarıldı.

**Bedeli:** Kapsam kontrolü anlamsızlaşır. İki ajanın işi tek diff'te birleşince, hangi satırın kimden geldiği ve hangisinin incelendiği belirsizleşir — kontrolün var olma sebebi tam olarak budur.

_Kaynak: Issue #80, sunucu ve istemci yarılarının paralel yürütülmesi._

### K-08 · Biten iş kutucuğunu kendiliğinden işaretlemez

Bir iş merge edildiğinde yol haritası **kendiliğinden güncellenmez.** Kapanış adımı bunu söylüyor ve yine de atlanabiliyor — çünkü kapanış anında dikkat commit'te, PR'da ve bir sonraki işte olur.

Bu üç kez oldu: `AGENTS.md` beş komut listelerken "dört" dedi, `PROJECT_STATE` §7 v1.1'i kapanmamış gösterdi, E4'ün dört maddesi bitmişken `[ ]` kaldı.

**Kural iki parçalı:**

1. **Kapanışta işaretle.** Döngünün 6. adımı, değişmedi.
2. **Açılışta doğrula.** 0. adımda `git log` ile yol haritası karşılaştırılır; işaretlenmemiş biten iş varsa brifing yazılmadan önce düzeltilir.

İkinci parça önlemenin yerine değil, **başarısız olduğu için** var. Üç denemede tutmayan bir disiplini dördüncü kez yazmak yerine, yanlış bilginin **zarar verdiği ana** bir kontrol kondu: yol haritasını okuyan taraf bir sonraki görevdir.

**Yarım biten iş tam işaretlenmez.** E4'te sıfırlama akışının dallanması için ekran metni yazıldı ama mekanizma yok; kutucuk açık bırakıldı. Doğru bir cümlenin arkasına eksik bir mekanizma saklamak, hiç yazmamaktan kötüdür.

_Kaynak: Issue #77 (B08, B10) ve E4 durum denetimi._

### K-09 · Güvenli tarafta kalmak, sebebini yanlış söylemeyi haklı çıkarmaz

K-04 bilinmeyende kısıtlayıcı olanı seçmeyi söyler ve bu doğrudur. Ama **kararı almak ile kullanıcıya cümleyi kurmak iki ayrı iştir.** Kısıtlama doğru olduğu için ekrandaki metin denetlenmeden kalabiliyor.

Bir durum okunamadığında ekran, **okunabilmiş gibi** konuşmaz. "Okuyamadım" ile "hayır" aynı cevap değildir; kullanıcıya ikincisi söylenirse, olmayan bir sorunu çözmeye çalışır.

Pratik karşılığı: bir güvenlik durumu üç değer taşıyorsa (**var** · **yok** · **okunamadı**) bunu iki değerli bir alanda tutma. Üçüncü durumu tipe koy — o zaman her çağrı noktası onu ele almak zorunda kalır ve unutmak derleme zamanında yakalanır.

_Kaynak: Issue #102. `must_change_password` okunamadığında istemci kilidi varsayıyordu — karar doğru — ama kullanıcı "şifrenizi değiştirmelisiniz" ekranını görüyor ve veritabanı "gerek yok" derken şifresini gereksiz yere değiştiriyordu. Production'da yaşandı._

### K-10 · Dilim açılışında keşif turu

Hiçbir alt başlık, **beyan ettiği varsayımlar canlı sistemde doğrulanmadan** başlamaz.

Her alt başlık `ROADMAP.md`'de bir **"Dayandığı varsayımlar"** satırı taşır. Açılışta o satırdaki her madde tek tek sınanır — dosyadan okunarak değil, çalışan sistemden. Beş dakikalık bir iştir; uzun sürüyorsa varsayımlar fazla soyut yazılmıştır.

Doğrulanmayan bir varsayım **engel değil, kapsamın parçasıdır**: ya düzeltilir ya dilim yeniden yazılır. "Sonra bakarız" diye geçilen varsayım, dilimin ortasında keşfedilir ve o noktada geri dönmek pahalıdır.

_Kaynak: 2026-08-29 denetimi. E7.2-B2, yedi dosyada sabit isimle kapsam belirlendiğini varsayıyordu; gerçekte iki dosya yazılmıştı, yedi bulundu. Aynı denetimde, `create-member` Edge Function'ının deploy edildiği varsayılarak arayüz yazılmış ve form çalışmayan bir arka uca bağlanmıştı (#113/#114)._

### K-11 · Zemin kaydı — kararı geçersiz kılan iş, kaydını da yapar

Bir iş, **başka bir dilimin ya da kararın beyan ettiği varsayımı geçersiz kılıyorsa**, bunu kaydetmek isteğe bağlı temizlik değil **işin kendisidir**.

Kayıt, varsayımın **yaşadığı yere** düşülür — sonradan hatırlanacağı yere değil. Kararı silmek gerekmez; altına tarihli bir not yeter. Amaç kararı iptal etmek değil, **hangi paragrafın artık başlangıç noktası olduğunu** söylemek.

Soru cevaplanabilir olmalı: _"Bu iş, birinin yazılı olarak doğru saydığı bir şeyi yanlışladı mı?"_ Cevap evetse iş bitmemiştir.

_Kaynak: 2026-08-29. Hesap geçişi kararı (2026-08-25) oturumun `localStorage`'da olduğu bir dünyada yazılmıştı; E7.2-A onu `sessionStorage`'a taşıdı. "İki oturumu aynı anda sakla" ve "sayaç hepsini kapatsın" maddelerinin uygulaması tamamen değişti, karar metni bunu bilmiyordu. Aynı gün dal koruması kararı da benzer durumdaydı: "Team planı gerekir" varsayıyordu, depo public olunca ruleset'ler ücretsiz hâle geldi ve başka bir yoldan sağlandı._

### K-12 · Koşullu kararın sahibi olur

_"Şu şart sağlanınca şunu yapacağız"_ diyen hiçbir karar, **şartı kimin ve ne zaman kontrol edeceği** yazılmadan kapanmaz.

Şartsız karar bir karardır; **sahipsiz şart bir dilektir.** Şart genellikle sessizce sağlanır ve kimse fark etmez — çünkü fark etmek kimsenin adımı değildir.

Pratik karşılığı: koşullu her karar üç şey taşır — **şart**, **şartı kontrol edecek adım** (hangi dilimin açılışında, hangi kapıda), ve **şart sağlandığında yapılacak iş**. Üçü de yoksa karar yarımdır.

_Kaynak: PR #81 bu tuzağı adıyla tarif etmişti — "`PLATFORM_SETTINGS` §4'teki beş ertelenmiş ayara tam olarak bu oldu; şart aynı gün sağlandı, kimse fark etmedi." 2026-08-29 denetimi aynı kalıbın üç canlı örneğini buldu: KVKK/Frankfurt kararı ("ilk gerçek kurum verisinden önce"), SMTP terki ("ilk gerçek kurum davetinden önce"), ve dal koruması (şart üçüncü bir yoldan sağlandı, metin hâlâ eski yolu tarif ediyor)._

---

## Görev dosyalarının ömrü

`.ai/tasks/` **git'e girmez** (`.gitignore`). Brifingler çalışma dosyasıdır: yazılır, kullanılır, iş bitince silinir.

**Neden izlenmiyor:** Yazan ajan brifingi çalışma kopyasından okur, GitHub'dan değil — yani commit edilmesine hiç gerek yok. İzlendiğinde her görev **iki merge/pull turu** gerektiriyordu: biri brifing için, biri iş için. Birincisi tamamen ek yüktü.

**Kayıt nerede kalıyor:** PR açıklamasında. Neyin neden yapıldığı, hangi alternatifin reddedildiği ve neye dokunulmadığı zaten oraya yazılıyor — brifingin talimat kısmı geçicidir, gerekçe kısmı PR'da kalıcıdır.

**Biten brifing silinir.** Sebebi klasörün şişmesi değil: **duran eski brifing, bir sonraki oturumda yanlışlıkla güncel sanılabilir.** Silme artık commit gerektirmiyor, dosyayı kaldırmak yeterli.

---

## Brifing yazarken

İyi bir brifing şunları içerir:

1. **Bağlam** — bu iş neden var, hangi sorunu kapatıyor
2. **Tam olarak ne yapılacağı** — dosya adı, imza, davranış
3. **Neyin yeniden kullanılacağı** — mevcut yardımcılar, desen alınacak dosya
4. **Dokunulmayacak yerler** ve **yapılmayacak işlemler**
5. **Kabul kriterleri** — işaretlenebilir maddeler
6. **Teslim biçimi** — altı çıktı

Brifingi yazarken yukarıdaki **birikimli kurallara** bak; ilgili olanları göreve özgü biçimde tekrarla. Yazan ajanın bu belgeyi okuduğunu varsayma — brifing kendi başına yeterli olmalı.

### Değişmeyen bölümler — brifingde tekrar yazılmaz

Aşağıdaki üç blok her görevde aynıdır. Brifingde **tek satırla anılır**, kopyalanmaz:

> Kalite kapısı, teslim biçimi ve genel yasaklar için `.ai/AGENT_WORKFLOW.md`. Bu göreve özgü ek kısıtlar aşağıda.

**Her görevde geçerli yasaklar** (brifingde tekrarlanmaz):

- `git commit`, `git push`, branch açma, dal değiştirme
- `supabase/` ve `.ai/` altına dokunma
- Yeni bağımlılık ekleme
- `eslint-disable`, `@ts-ignore`
- Brifingde yazmayan ek özellik
- Brifingde listelenmeyen dosyaya dokunma — gerekiyorsa **dur ve sor**

**Kalite kapısı** — beş komut, salt okuma, ayrıca izin gerekmez. Kum havuzu engelliyorsa dışında çalıştırmak baştan onaylıdır.

**Teslim** — yukarıdaki altı çıktı.

Brifingde yalnızca **göreve özgü** olan yazılır: bağlam, yapılacak iş, dokunulabilecek dosyalar, o göreve özel kısıtlar ve ilgili birikimli kurallar. Değişmeyeni her seferinde yeniden yazmak brifingi uzatır, uzun brifing okunmaz ve okunmayan kısıt uygulanmaz.

---

## Denetleyen için yazım ekonomisi

Commit mesajı ve PR açıklaması projenin kalıcı hafızasıdır; **"ne" değil "neden"** taşırlar ve bu yüzden kısaltılamazlar. Kısaltılabilecek olan hacimdir.

- Diff'in anlattığını tekrar anlatma. Dosya listesi, satır sayısı ve "şu fonksiyon eklendi" zaten görünüyor.
- Bir kararın **gerekçesi ve reddedilen alternatifi** kalır; nasıl bulunduğunun hikâyesi kalmaz.
- Doğrulama sonucu **rakamla** yazılır: "0 satır kayboldu, 7 satır eklendi" — anlatıyla değil.
- Aynı gerekçe hem commit'te hem PR'da varsa biri yeter. Commit'te kısa hâli, PR'da tam hâli.
- Yazan ajanın taslağı varsa (teslim 6. madde) sıfırdan yazma; düzelt.
