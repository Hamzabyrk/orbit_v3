# Görev E3-01 — Zorunlu şifre değiştirme ekranı

> **Bu bir uygulama brifingidir.** Kapsamı dışına çıkma. Belirsizlik varsa **tahmin etme, sor.**

## Bağlam

ORBIT çok kiracılı bir dershane yönetim sistemidir. Kullanıcılar sisteme **giriş numarası ve geçici şifre** ile açılır; şifre kâğıda yazılıp elden verilir.

Bugünkü sorun: geçici şifre süresiz çalışıyor. Kâğıda yazılmış bir şifre kalıcı şifre gibi kullanılabiliyor. Bu ekran o kapıyı kapatacak — kullanıcı şifresini değiştirmeden hiçbir yere gidemeyecek.

## Yapılacak

**Tek bir dosya:** `client/src/components/auth/ForcePasswordChangeScreen.tsx`

Saf bir sunum bileşeni. Veri katmanına **dokunmaz**; her şeyi prop olarak alır, sonucu callback ile bildirir.

```ts
export function ForcePasswordChangeScreen({
  displayName,
  expiresAt,
  onSubmit,
  onSignOut,
}: {
  /** Kullanıcının görünen adı. Selamlama için. */
  displayName: string;
  /** Geçici şifrenin son geçerlilik anı (ISO). Yoksa süre bilgisi gösterilmez. */
  expiresAt: string | null;
  /** Yeni şifreyi kaydeder. Hata fırlatırsa mesajı ekranda göster. */
  onSubmit: (newPassword: string) => Promise<void>;
  /** Kullanıcı vazgeçip çıkmak isterse. */
  onSignOut: () => void;
}) {
  // ...
}
```

Dönüş tipi **yazma**. Bu kod tabanındaki hiçbir bileşende `: JSX.Element` gibi bir anotasyon yok; TypeScript zaten çıkarıyor.

### Ekranda olacaklar

1. Başlık ve kısa açıklama: şifresini değiştirmesi gerektiği, bunun tek seferlik olduğu
2. `displayName` ile selamlama
3. **Yeni şifre** ve **Yeni şifre (tekrar)** alanları
4. Şifre kurallarının **canlı** listesi — yazdıkça hangi kural sağlandı/sağlanmadı görünsün
5. Kaydet düğmesi
6. `expiresAt` doluysa kalan süre bilgisi (örn. "Geçici şifreniz 3 gün sonra geçersiz olacak")
7. `footer` alanında küçük bir "Çıkış yap" bağlantısı

### Süresi dolmuş geçici şifre

`expiresAt` **geçmiş bir tarihse** form hiç gösterilmez. Yerine kısa bir açıklama: geçici şifrenin süresi dolmuş, kurum yöneticisinden yeni şifre istemesi gerekiyor. `footer`'daki "Çıkış yap" yine dursun.

Gerekçe: süresi dolmuş şifreyle yeni şifre belirletmek, süre sınırının anlamını ortadan kaldırır. Sunucu tarafı da bunu reddedecek; kullanıcıyı boşuna form doldurtup hata almaya bırakmayalım.

### Şifre kurallarını YENİDEN YAZMA

`client/src/auth/passwordPolicy.ts` zaten var ve test edilmiş. Şunları kullan:

- `evaluatePassword(password): PasswordRule[]` — canlı kural listesi için
- `findPasswordProblem(password, confirmation): string | null` — gönderim öncesi doğrulama

Kendi doğrulama mantığını yazma.

### Deseni buradan al

`client/src/components/auth/SetPasswordScreen.tsx` (168 satır) neredeyse aynı işi yapıyor: aynı iki alan, aynı canlı kural listesi, aynı `useMemo` deseni. **Görsel dili ve yapıyı oradan taşı** ki iki ekran birbirine benzesin.

Kopyala-yapıştır değil — okuyup aynı üslupta yaz.

### `AuthShell` kullan — kendi tam ekran düzenini KURMA

`client/src/components/auth/AuthShell.tsx` ortak kabuktur ve `title`, `description`, `children`, `footer` alır. Arka planı, `min-h-screen` yüksekliğini, logoyu ve ortalamayı **o hallediyor**.

Kendi `<main className="min-h-screen ...">` sarmalayıcını yazma — çift sarmalama olur ve iki farklı arka plan üst üste biner.

`footer` alanını "Çıkış yap" için kullan.

## Bu ekranın ASIL İŞİ: kaçış yolu bırakmamak

Bu bir kilit ekranı. Aşağıdakiler **kesinlikle olmayacak**:

- ❌ "Daha sonra", "Atla", "Şimdi değil" gibi bir seçenek
- ❌ Kapatma düğmesi, `Esc` ile kapanma
- ❌ Panele veya başka bir sayfaya giden bağlantı
- ❌ Arkada görünen dashboard içeriği

Tek çıkış yolu **"Çıkış yap"**. Kullanıcı çıkabilir ama şifresini değiştirmeden içeri giremez.

> Bu ekran tek başına bir güvenlik sınırı değildir — sunucu tarafı ayrıca zorlanacak. Ama arayüzde bir kaçış deliği bırakmak, kullanıcının kilidi fark etmeden atlamasına yol açar ve kilidin varlık sebebi ortadan kalkar.

## Mobil öncelikli

Bu ekranı **herkes** görecek: öğrenciler ve veliler ağırlıklı olarak telefondan girecek.

- Önce dar ekranda çalışsın, masaüstü genişletme olsun
- Alanlar ve düğmeler parmakla rahat kullanılacak boyutta
- Yatay kaydırma **olmayacak**

## Sert kurallar

### Dokunulmayacak yerler

| Yer                                 | Neden                                   |
| ----------------------------------- | --------------------------------------- |
| `supabase/` — tamamı                | Şema ve sunucu bana ait                 |
| `.ai/` — bu dosya hariç             | Proje hafızası                          |
| `client/src/auth/`                  | Kimlik katmanı; bu görevde değişmeyecek |
| `package.json`, kilit dosyaları     | **Yeni bağımlılık eklenmeyecek**        |
| `.env*`, herhangi bir anahtar/token | Hiçbir koşulda                          |

### Yapılmayacak işlemler

- ❌ `git commit`, `git push`, PR açma — **branch'te bırak, dur**
- ❌ Supabase, Vercel veya GitHub'a herhangi bir çağrı
- ❌ Var olan dosyaları "iyileştirmek" — kapsam bu tek dosya
- ❌ `client/src/App.tsx`'e rota ekleme — bağlamayı ben yapacağım

### Kod kuralları

- **Supabase istemcisi import edilemez.** ESLint bunu zaten engelliyor (`no-restricted-imports`); kuralı susturma, kural haklı. Bu bileşen veri katmanını hiç görmemeli.
- **Arayüz metinleri Türkçe.**
- **Yorumlar Türkçe ve "ne" değil "neden" anlatır.** `// state'i güncelle` gibi yorum yazma. `// Kaçış yolu bırakılmıyor çünkü ...` gibi yaz.
- Mevcut dosyalardaki yorum yoğunluğuna ve üslubuna uy.
- `any` kullanma.
- Her alanın `<label>` bağlantısı olsun; şifre alanlarında `autoComplete="new-password"`.
- **Listede olmayan özellik ekleme.** Şifre göster/gizle düğmesi, güç göstergesi, animasyon vb. istenmedi — eklenmeyecek.

## Kabul kriterleri

Aşağıdakilerin **hepsi** geçmeden teslim etme:

```bash
npx prettier --check .
npx eslint .
npx tsc --noEmit
npx vitest run
npx vite build
```

**Test yazma.** Bu repoda bileşen testi altyapısı yok (`@testing-library` kurulu değil); mevcut testlerin tamamı saf mantık testi. Yeni bir test altyapısı kurma — kapsam dışı.

Ayrıca:

- [ ] Ekranda hiçbir atlama/kapatma yolu yok
- [ ] Şifre kuralları yazdıkça canlı güncelleniyor
- [ ] İki alan eşleşmiyorsa gönderim engelleniyor
- [ ] `onSubmit` hata fırlatırsa mesaj ekranda görünüyor, ekran kapanmıyor
- [ ] Gönderim sırasında düğme devre dışı, çift gönderim imkânsız
- [ ] Dar ekranda (375px) yatay kaydırma yok
- [ ] `expiresAt` `null` iken süre bilgisi hiç görünmüyor
- [ ] `expiresAt` geçmiş bir tarihse form gösterilmiyor, bunun yerine yöneticiye başvurma yönlendirmesi çıkıyor

## Teslim

1. Yeni bir branch aç: `feat/e3-force-password-change`
2. **Yalnızca** `ForcePasswordChangeScreen.tsx` dosyasını ekle
3. Kalite kapısını çalıştır, hepsi yeşil olsun
4. **Commit etme, push etme.** Çalışma kopyasında bırak
5. Bana şunu ilet:
   - `git status --short` çıktısı
   - `git diff` çıktısı
   - Kalite kapısı sonuçları
   - Emin olamadığın veya varsayım yaptığın noktalar

## Belirsizlik varsa

Tahmin etme. Bu brifingde cevabı olmayan bir şeyle karşılaşırsan **dur ve sor**. Yanlış varsayımla yazılmış kodu düzeltmek, sormaktan pahalıdır.
