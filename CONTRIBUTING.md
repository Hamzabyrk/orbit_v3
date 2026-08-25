# CONTRIBUTING.md — İki Kişilik Ekip Anayasası

Bu dosya **git ve inceleme kurallarını** tutar. Kod yazan taraf ister bir insan ister bir YZ ajanı (Claude, Codex, Antigravity vb.) olsun, aşağıdakiler herkes için geçerlidir.

Projeye yeni başlıyorsan önce kökteki **`AGENTS.md`**'yi oku: hangi soru için hangi dosyaya bakılacağını orası söyler.

## Temel Kurallar

1. **`main` dalına doğrudan commit atılamaz.** Her değişiklik bir branch + PR üzerinden ilerler.
2. **Dallanma formatı:** `feat/issue-no-ozellik-adi` veya `fix/issue-no-hata-adi` (örn. `feat/12-ogrenci-listesi`).
3. **Kod birleştirilmeden önce diğer ekip üyesinin PR onayı zorunludur.**
4. **Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/) formatında yazılır:** `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
5. **Değişen bilgi aynı PR'da belgeye işlenir.** Karar → `DECISION_LOG.md`, durum → `ROADMAP.md` §0, panel ayarı → `PLATFORM_SETTINGS.md`, klasör/servis yapısı → `PROJECT_STATE.md` §5. Ayrı bir "belgeleri güncelleme" işi açılmaz; açılırsa yapılmaz.
6. **Modülerlik & Tek Sorumluluk:** Yeni ekranlar veya özellikler devasa tek bir dosyaya yığılamaz. Her ekran kendi alt dosyasında (`components/education/`, `platform/`) olmalı, tipler ve hook'lar ayrıştırılmalıdır. Ayrıntı: `AGENTS.md`.
7. **Graph-First Düşünme & Etki Alanı Analizi:** Herhangi bir kod yazılmadan önce, değişikliğin etkileyeceği diğer modüller, veritabanı ilişkileri ve maliyet/güvenlik boyutları bir graf ağı olarak düşünülmelidir.

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

YZ ajanlarıyla çalışırken ek olarak `.ai/AGENT_WORKFLOW.md` geçerlidir: kim yazar, kim denetler, hangi adımda ne yapılır. Kod yazan ajan commit atmaz, push etmez ve `supabase/` altına dokunmaz; bu adımlar denetleyen taraf ve insan onayı üzerinden yürür.
