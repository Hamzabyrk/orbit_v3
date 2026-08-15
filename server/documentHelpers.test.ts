import { describe, expect, it } from "vitest";
import { decodeDocumentBase64, safeDocumentName } from "./documentHelpers";

describe("belge yükleme yardımcıları", () => {
  it("dosya adını depolama anahtarı için güvenli hâle getirir", () => {
    expect(safeDocumentName("Ağustos teklif / v2.pdf")).toBe("A-ustos-teklif-v2.pdf");
    expect(safeDocumentName("///")).toBe("belge");
  });

  it("geçerli base64 içeriğini byte dizisine dönüştürür", () => {
    expect(decodeDocumentBase64(Buffer.from("MoneyFlow").toString("base64")).toString()).toBe("MoneyFlow");
  });
});
