import { describe, expect, it } from "vitest";
import {
  describeAuditAction,
  describeAuditEntity,
  formatAuditMoment,
  resolveAuditActor,
} from "./auditService";

describe("resolveAuditActor", () => {
  // Bu dört durumun ayrı ayrı ölçülmesi K-09'un doğrudan karşılığı:
  // "okunamadı" ile "yok" aynı cevap değildir ve ekran ikisini
  // karıştırırsa kullanıcıya olmayan bir olgu bildirir.

  it("aktor kimligi hic yazilmamissa sistem kaydidir", () => {
    expect(resolveAuditActor(null, new Map())).toEqual({ kind: "system" });
  });

  it("isim sorgusu basarisizsa hicbir sey iddia edilmez", () => {
    // `null` harita = sorgu hata verdi. Bu durumda "kurum dışı" demek yalan
    // olurdu; kişi pekâlâ kurumun üyesi olabilir.
    expect(resolveAuditActor("user-1", null)).toEqual({ kind: "unresolved" });
  });

  it("sorgu basarili ama kimlik donmediyse aktor kurum disindadir", () => {
    // Bu bir tahmin değil: politika tam olarak kurumun üyelerini döndürüyor,
    // dolayısıyla dönmemesi üye olmadığı anlamına geliyor.
    expect(resolveAuditActor("user-1", new Map())).toEqual({ kind: "outside" });
  });

  it("isim cozulduyse uye olarak adiyla gorunur", () => {
    expect(
      resolveAuditActor("user-1", new Map([["user-1", "Merve Karaca"]]))
    ).toEqual({ kind: "member", name: "Merve Karaca" });
  });

  it("bos harita ile null harita ayni sonucu vermez", () => {
    // Bu ikisinin karışması, servisin `null` yerine boş harita döndürmesiyle
    // olurdu ve sonucu şu olurdu: isim sorgusu bir kez hata verdiğinde
    // kurumun bütün üyeleri "kurum dışı" diye listelenir.
    expect(resolveAuditActor("user-1", new Map())).not.toEqual(
      resolveAuditActor("user-1", null)
    );
  });
});

describe("describeAuditAction / describeAuditEntity", () => {
  it("bilinen eylemleri Turkcelestirir", () => {
    expect(describeAuditAction("membership.created")).toBe("Üye eklendi");
    expect(describeAuditEntity("organization")).toBe("Kurum");
  });

  it("bilinmeyen eylemde ham kodu gosterir, etiket uydurmaz", () => {
    // K-03. Edge Function'da yeni bir eylem yazıldığında burası
    // güncellenmezse ekran çirkin ama DOĞRU bir şey gösterir.
    expect(describeAuditAction("student.archived")).toBe("student.archived");
    expect(describeAuditEntity("student")).toBe("student");
  });
});

describe("formatAuditMoment", () => {
  it("gecerli tarihi okunur hale getirir", () => {
    expect(formatAuditMoment("2026-09-05T08:30:00Z")).toContain("2026");
  });

  it("cozulemeyen tarihte hicbir sey gostermez", () => {
    // K-03: "Invalid Date" veya "NaN" basmaktansa boş bırakılır.
    expect(formatAuditMoment("bozuk-tarih")).toBeNull();
  });
});
