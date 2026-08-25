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
3. TESLİM     Yazan beş çıktıyı verir (aşağıda)
4. KAPSAM     Denetleyen: brifing dışı dosyaya dokunulmuş mu?
                └─ dokunulmuşsa → REDDET, içeriğe hiç bakma
5. İNCELEME   Denetleyen diff'i okur, kapıyı KENDİ çalıştırır
                ├─ kabul  → 6. adım
                └─ revizyon → 2. adıma dön
6. KAPANIŞ    Denetleyen commit, PR, belgeyi günceller, brifingi siler
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

| İş                            | Kim            | Neden                                  |
| ----------------------------- | -------------- | -------------------------------------- |
| Tasarım kararları, tartışma   | **Denetleyen** | Bağlamın tamamı ve karar geçmişi orada |
| Migration, RLS, yetkilendirme | **Denetleyen** | Hatası sessiz ve geri dönüşü pahalı    |
| Edge Function                 | **Denetleyen** | `service_role` taşıyor                 |
| Production'a dokunan her şey  | **Denetleyen** | Geri alınamaz                          |
| Arayüz bileşenleri            | **Yazan**      | Sınırlı ve geri alınabilir             |
| Mekanik dönüşümler            | **Yazan**      | Hacimli ama düşük riskli               |
| Saf mantık ve testleri        | **Yazan**      | Şartname brifingde net verilebiliyor   |
| `git diff` incelemesi         | **Denetleyen** | Devrin var olma sebebi                 |

Sınır şu soruyla çizilir: **yanlış yapılırsa sessizce mi geçer, yoksa hemen görünür mü?** Sessiz olanlar devredilmez.

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

### Teslim — beş çıktı, eksiksiz

1. `git status --short`
2. `git diff` (yeni dosyada `git add -N . && git diff`)
3. Kalite kapısının beş komutunun sonuçları
4. **Varsayımların** — yoksa "varsayım yok" yaz
5. **Emin olamadıkların**

Son iki madde atlanamaz.

### Kalite kapısı

```bash
npx prettier --check .
npx eslint .
npx tsc --noEmit
npx vitest run
npx vite build
```

Hepsi yeşil olmadan teslim etme.

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

---

## Görev dosyalarının ömrü

| Dosya          | Nerede                  | Ne zaman silinir       |
| -------------- | ----------------------- | ---------------------- |
| Bu belge       | `.ai/AGENT_WORKFLOW.md` | Silinmez               |
| Görev brifingi | `.ai/tasks/`            | İlgili PR merge olunca |

Biten brifingler silinir. Sebebi klasörün şişmesi değil yalnızca: **duran eski brifing, bir sonraki oturumda yanlışlıkla güncel sanılabilir.** Kayıt git geçmişinde durur.

---

## Brifing yazarken

İyi bir brifing şunları içerir:

1. **Bağlam** — bu iş neden var, hangi sorunu kapatıyor
2. **Tam olarak ne yapılacağı** — dosya adı, imza, davranış
3. **Neyin yeniden kullanılacağı** — mevcut yardımcılar, desen alınacak dosya
4. **Dokunulmayacak yerler** ve **yapılmayacak işlemler**
5. **Kabul kriterleri** — işaretlenebilir maddeler
6. **Teslim biçimi** — beş çıktı

Brifingi yazarken yukarıdaki **birikimli kurallara** bak; ilgili olanları göreve özgü biçimde tekrarla. Yazan ajanın bu belgeyi okuduğunu varsayma — brifing kendi başına yeterli olmalı.
