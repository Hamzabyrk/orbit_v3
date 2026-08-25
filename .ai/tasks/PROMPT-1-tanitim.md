# Codex'e verilecek 1. prompt — tanıma turu

> Bunu olduğu gibi kopyalayıp Codex'e verin. Çıktısını bana iletin.

---

Bu repoyu tanımanı istiyorum. **Bu turda hiçbir dosya değiştirme, hiçbir komut çalıştırma — yalnızca oku.**

Sonraki turda küçük bir arayüz görevi vereceğim. Şimdi amaç, o görevi bağlamı bilerek yapabilmen.

## Sırayla oku

1. `.ai/PROJECT_STATE.md` — ürün, roller, klasör yapısı, bağlayıcı kurallar
2. `.ai/ROADMAP.md` **bölüm 0 ve bölüm 4.5** — nerede olduğumuz ve Faz E
3. `.ai/DECISION_LOG.md` — **yalnızca şu üç kararı** oku, tamamını okuma:
   - "Kimlik ve Giriş Bilgisi Mimarisi"
   - "Hesaplar davet e-postasıyla değil, doğrudan geçici şifreyle açılır"
   - "Taşınabilirlik sınırı — yetkilendirme veritabanında, veri erişimi servis katmanında"
4. `client/src/components/auth/` — bu klasörün tamamı, özellikle `AuthShell.tsx` ve `SetPasswordScreen.tsx`
5. `client/src/auth/passwordPolicy.ts`
6. `eslint.config.js` — özellikle `no-restricted-imports` kuralı

## Sonra bana şunları yaz

1. **Ürün ne yapıyor, kullanıcıları kim?** İki üç cümle.
2. **Kullanıcılar sisteme nasıl giriş yapıyor?** Giriş belirteci nedir, nereden geliyor?
3. **`no-restricted-imports` kuralı neyi yasaklıyor ve neden?** Gerekçeyi kendi cümlelerinle yaz.
4. **`AuthShell` ne sağlıyor?** Onu kullanan bir bileşen kendi tam ekran düzenini kurmalı mı?
5. **`passwordPolicy.ts` hangi fonksiyonları veriyor ve ne işe yarıyorlar?**
6. **Bu kod tabanında yorumlar nasıl yazılmış?** Bir örnek ver ve neyi açıkladığını söyle.
7. **Kafana takılan veya çelişkili bulduğun bir şey var mı?**

## Kurallar

- **Hiçbir dosyayı değiştirme.** Bu tur salt okuma.
- **Hiçbir komut çalıştırma.** `git`, `npm`, `pnpm` — hiçbiri.
- Yukarıdaki listede olmayan yerleri gezmene gerek yok; `.ai/DECISION_LOG.md` uzun, tamamını okuma.
- Bilmediğin bir şeyi **uydurma**; "bunu bulamadım" de.
