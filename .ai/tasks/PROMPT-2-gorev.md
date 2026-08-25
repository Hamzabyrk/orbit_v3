# Codex'e verilecek 2. prompt — görev

> 1. promptun cevabını aldıktan **sonra** verin. Çıktısını bana iletin.

---

Şimdi bir uygulama görevin var.

## Brifingi oku ve harfiyen uygula

**`.ai/tasks/E3-01-zorunlu-sifre-degistirme-ekrani.md`**

O dosya tek yetkili kaynaktır. Ne yapılacağı, hangi dosyaya, hangi kısıtlarla — hepsi orada. Brifingde yazmayan bir şeyi kendiliğinden ekleme.

## Çalışma biçimi

1. Önce `feat/e3-force-password-change` adında bir branch aç:
   ```
   git checkout -b feat/e3-force-password-change
   ```
2. Brifingde belirtilen **tek dosyayı** yaz.
3. Kalite kapısını çalıştır ve hepsi yeşil olana kadar düzelt:
   ```
   npx prettier --check .
   npx eslint .
   npx tsc --noEmit
   npx vitest run
   npx vite build
   ```
4. **DUR.** Commit etme, push etme, PR açma.

## Kesin yasaklar

- ❌ `git commit`, `git push`, `git merge`, PR açma
- ❌ `supabase/` klasöründe herhangi bir dosya
- ❌ `.ai/` klasöründe herhangi bir dosya
- ❌ `client/src/auth/` klasöründe herhangi bir dosya
- ❌ `package.json` veya kilit dosyalarında değişiklik — **yeni bağımlılık yok**
- ❌ Brifingde adı geçmeyen herhangi bir dosyayı değiştirmek
- ❌ Supabase, Vercel veya GitHub'a herhangi bir bağlantı/çağrı
- ❌ ESLint kuralını `eslint-disable` ile susturmak

Bu yasaklardan biriyle karşılaşırsan — örneğin görevi tamamlamak için başka bir dosyayı değiştirmen gerektiğini düşünürsen — **yapma, dur ve sor.**

## İşin bitince bana tam olarak şunları ver

Beşini de eksiksiz yaz; ben bunları gözden geçirecek kişiye ileteceğim.

**1. Değişen dosyalar**

```
git status --short
```

**2. Yazdığın kodun tamamı**

```
git diff
```

Dosya yeni olduğu için `git diff` boş dönebilir. O durumda:

```
git add -N . && git diff
```

**3. Kalite kapısı sonuçları**

Beş komutun her birinin çıktısındaki son satırı yapıştır. Hata aldıysan ve düzelttiysen bunu da söyle.

**4. Varsayımların**

Brifingde net olmayan ve senin karar verdiğin **her nokta**. Örnek: "kalan süreyi gün olarak yazdım çünkü saat çok ayrıntılı görünüyordu." Hiç varsayım yapmadıysan "varsayım yok" yaz.

Bu maddeyi atlama — nerede tahmin ettiğini bilmek, kodun kendisinden daha önemli.

**5. Emin olamadıkların**

Yaptığın ama içine sinmeyen, ya da brifingle çeliştiğini düşündüğün şeyler.

## Belirsizlik kuralı

Brifingde cevabı olmayan bir şeyle karşılaşırsan **dur ve sor**. Yanlış varsayımla yazılmış kodu düzeltmek, sormaktan pahalıdır.
