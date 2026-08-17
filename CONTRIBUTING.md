# CONTRIBUTING.md — İki Kişilik Ekip Anayasası

Bu proje `PROJECT_ARCHITECT.md`'de tanımlanan kurumsal standartlarla, iki kişilik bir ekip tarafından geliştiriliyor. Kod yazan taraf ister bir insan ister bir YZ ajanı (Claude, Cursor, Gemini, Antigravity vb.) olsun, aşağıdaki kurallar herkes için geçerlidir.

## Temel Kurallar

1. **`main` dalına doğrudan commit atılamaz.** Her değişiklik bir branch + PR üzerinden ilerler.
2. **Dallanma formatı:** `feat/issue-no-ozellik-adi` veya `fix/issue-no-hata-adi` (örn. `feat/12-ogrenci-listesi`).
3. **Kod birleştirilmeden önce diğer ekip üyesinin PR onayı zorunludur.**
4. **Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/) formatında yazılır:** `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
5. **Her PR'da `.ai/PROJECT_STATE.md` ve `.ai/WORK_LOG.md` güncel mi kontrol edilir** — bkz. PR şablonundaki ilgili checkbox.

## İş Akışı

```bash
git checkout main
git pull origin main
git checkout -b feat/<issue-no>-<kisa-ad>
# ... geliştirme, atomik commit'ler ...
git push -u origin feat/<issue-no>-<kisa-ad>
# GitHub üzerinden PR aç, diğer ekip üyesini review'a ata
```

## Kod İnceleme Beklentileri

PR şablonundaki kontrol listesine ek olarak:
- Hardcoded secret/API key olmadığından emin olun.
- Yeni bağımlılık eklendiyse gerekçesi PR açıklamasında belirtilmeli.
- Mimariyle (mevcut pattern, klasör yapısı, isimlendirme) tutarlılık kontrol edilmeli.

Daha ayrıntılı geliştirme standartları ve güvenlik kontrol listesi için `CLAUDE.md` (`Desktop/sektorelmd/CLAUDE.md`) ve `PROJECT_ARCHITECT.md` referans alınmalıdır.
