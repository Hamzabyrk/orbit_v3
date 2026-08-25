# Görev C4 — Anahtarı çevir: production sahte veri göstermesin

> Kalite kapısı, teslim biçimi (altı çıktı) ve genel yasaklar için `.ai/AGENT_WORKFLOW.md`. Bu göreve özgü kısıtlar aşağıda.

Bu brifing **üç bağımsız iş** taşıyor. Birbirlerine dokunmuyorlar; birinde takılırsan diğerlerini yapmaya devam et ve takıldığını teslimde yaz.

---

# İş 1 · Faz E5'in finali — sahte veriyi demo moduna hapset

## Bağlam

Production bugün sahte öğrenci, sınıf, ödeme ve ödev gösteriyor. C2 veriyi ayırdı, C3 ekranları boş veriye dayanıklı hâle getirdi. **Bu iş anahtarı çeviriyor.**

`isDemoMode` değeri `client/src/auth/runtime.ts`'ten gelir. Yerel geliştirme ve Vercel preview `true`, yalnızca production `false`.

**Bu işten sonra yerelde hiçbir şey değişmeyecek** — demo modu açık olduğu için ekranlar aynı görünecek. Değişen yer production.

## Sızıntı dört noktada

### 1.1 · `educationData.ts` — ana listeler

Bugün saf geçiş katmanı. Artık ortama göre dallanacak: demo modunda `demoData`, production'da **boş.**

`classes`, `schedule`, `students`, `paymentRows` boş dizi olur. `dayPlanEventsByRole` role göre anahtarlanmış bir nesne; **yapısı korunur**, her rolün dizisi boşalır — çağıran taraf `dayPlanEventsByRole[role]` yaptığı için anahtar kaybolursa `undefined` döner ve ekran çöker.

### 1.2 · `EducationPlatform.tsx` — state tohumları

Dört değer hâlâ doğrudan `demoData`'dan geliyor: `initialAttendances`, `initialAutomations`, `initialHomework`, `dayPlanTasksByRole`.

Bunlar ekrana basılan liste değil, React state'inin başlangıç değeri — ama production'da sahte ödev ve yoklama üretiyorlar. Aynı kurala tabi olmalılar: demo modunda demo tohumu, production'da boş.

Bunları `educationData.ts` üzerinden al; `EducationPlatform`'un `demoData`'ya doğrudan bağlantısı **tamamen kalkmalı.**

### 1.3 · `client/src/lib/demoStorage.ts` — en önemlisi

Bu modül hiç kontrol edilmiyor ve production'da `orbit:demo:*` anahtarlarıyla **tarayıcı deposuna yazıyor.**

Bunun anlamı şu: production'da bir kullanıcı yoklama işaretlerse, işlem **kaydedilmiş gibi görünür** ve yalnızca kendi tarayıcısında durur. Sunucuda karşılığı yok, başka cihazda yok, başka kullanıcı için yok. Sessizce kaybolan veriden daha kötüsü, kaydedildiğini sanmaktır.

Demo modu dışında: `readDemoData` yalnızca kendisine verilen `fallback` değerini döndürür, `writeDemoData` ve `clearDemoData` hiçbir şey yapmaz.

`__writeRawForTest` test yardımcısıdır; **davranışını değiştirme**, mevcut testler ona dayanıyor.

Mevcut testlerin geçmeye devam etmesi gerekiyor. Kapı kırmızıya dönerse testi değiştirme — **dur ve sor.**

### 1.4 · `SettingsProfileSection.tsx` — sahte e-posta

`useState(roleEmail[role])` ile ayarlar ekranındaki e-posta alanı uydurma bir adresle doluyor (`yonetici@orbit.edu.tr`).

Production'da alan **boş başlar.** Gerçek e-posta E4'te gelecek; o gelene kadar boş bırakmak doğru, çünkü uydurma bir adres kullanıcıya kendi adresi olarak gösteriliyor.

`roleEmail` demo giriş kartlarında kullanılmaya devam eder; **`demoData`'dan kaldırma.**

## Nasıl doğrulayacaksın

Kalite kapısı bunu yakalamaz — yerelde demo modu açık, her şey eskisi gibi görünür.

`runtime.ts`'e dokunmadan, geçici olarak `educationData.ts` içindeki dalı production tarafına zorla, ekranları gözle kontrol et, sonra **geri al.** Teslimde hangi ekranlara baktığını yaz.

Geçici değişikliğin diff'te **kalmadığından emin ol.**

**Beklenen:** her ekran C3'te eklenen boş durumunu gösterir, hiçbiri çökmez, konsolda hata yoktur.

---

# İş 2 · Şifre alanlarına görünürlük düğmesi

Geçici şifreler kâğıt fişten **elle** yazılıyor ve yanlış yazan kullanıcı nedenini göremiyor.

Üç ekrana göz düğmesi eklenecek:

- `client/src/components/education/LoginScreen.tsx`
- `client/src/components/auth/ForcePasswordChangeScreen.tsx`
- `client/src/components/auth/SetPasswordScreen.tsx`

Kurallar:

- Varsayılan **gizli** (`type="password"`). Düğme açar, tekrar basınca kapatır.
- Düğme **klavyeyle erişilebilir** olmalı — gerçek bir `<button type="button">`, `div` değil.
- Durumu ekran okuyucuya bildir: `aria-label` açıkken "Şifreyi gizle", kapalıyken "Şifreyi göster".
- Birden fazla şifre alanı olan ekranda **her alanın kendi düğmesi ve kendi durumu** olur; biri açılınca diğeri açılmaz.
- Ekranların mevcut giriş alanı stiline uy (`authInputClassName` vb.); yeni bir tasarım dili getirme.

---

# İş 3 · `tsconfig.node.json` kaldırılması

Bu dosya **hiçbir yerden referans alınmıyor**: `tsconfig.json` içinde `references` anahtarı yok, `package.json` script'leri onu çağırmıyor, `vite.config.ts` ve `vitest.config.ts` okumuyor.

Sil, sonra kapının tamamını çalıştır. **`tsc --noEmit` veya `vite build` kırılırsa geri al ve teslimde bunu yaz** — o durumda dosya ölü değil demektir ve bulgu kendisi değerlidir.

---

## Dokunabileceğin dosyalar

**İş 1:**

- `client/src/components/education/educationData.ts`
- `client/src/components/education/EducationPlatform.tsx`
- `client/src/components/education/pages/SettingsProfileSection.tsx`
- `client/src/lib/demoStorage.ts`

**İş 2:**

- `client/src/components/education/LoginScreen.tsx`
- `client/src/components/auth/ForcePasswordChangeScreen.tsx`
- `client/src/components/auth/SetPasswordScreen.tsx`
- Ortak bir düğme bileşeni çıkarırsan: `client/src/components/auth/AuthShell.tsx` **veya** yeni bir dosya — hangisini seçtiğini teslimde yaz

**İş 3:**

- `tsconfig.node.json` (silinecek)

## Bu göreve özgü yasaklar

- ❌ `client/src/auth/runtime.ts`'e **dokunma.** `isDemoMode` mantığı doğru ve testleri var; yalnızca **oku**.
- ❌ `demoData.ts` içindeki veriyi silme veya kısaltma. Demo modu onu göstermeye devam edecek.
- ❌ Sabit isimli rol filtrelerine (`mentor === "Merve Karaca"`) dokunma — biliniyor, kapsam dışı.
- ❌ Mevcut testleri değiştirme. Kırılıyorsa **dur ve sor.**

## Aklında tut

**K-04 · Bilinmeyende güvenli tarafta kal.** Ortam çözümlenemiyorsa demo tarafına düşme; `runtime.ts` zaten bilinmeyende production'ı seçiyor, sen de o yönü koru.

**K-03 · Çözümlenemeyen veri uydurulmuş değerle gösterilmez.** Kullanıcının e-posta adresi bilinmiyorsa alan boştur, uydurma bir adres değil.
