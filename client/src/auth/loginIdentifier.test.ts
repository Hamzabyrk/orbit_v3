import { describe, expect, it } from "vitest";
import {
  CODE_MAX,
  CODE_MIN,
  SYNTHETIC_EMAIL_DOMAIN,
  buildLoginNumber,
  parseLoginNumber,
  resolveLoginIdentifier,
  syntheticEmailFor,
} from "./loginIdentifier";

describe("buildLoginNumber", () => {
  it("kurum ve kişi kodunu sekiz haneye birleştirir", () => {
    expect(buildLoginNumber(1042, 1137)).toBe("10421137");
  });

  it("aralığın uçlarını kabul eder", () => {
    expect(buildLoginNumber(CODE_MIN, CODE_MIN)).toBe("10001000");
    expect(buildLoginNumber(CODE_MAX, CODE_MAX)).toBe("99999999");
  });

  it("1000'in altındaki kodu reddeder", () => {
    // Kabul edilseydi "0042" gibi baştan sıfırlı bir bölüm oluşur ve kullanıcı
    // numarayı "42" diye yazıp giriş yapamaz duruma düşerdi.
    expect(buildLoginNumber(42, 1137)).toBeNull();
    expect(buildLoginNumber(1042, 999)).toBeNull();
  });

  it("aralık dışını ve tam sayı olmayanı reddeder", () => {
    expect(buildLoginNumber(10000, 1137)).toBeNull();
    expect(buildLoginNumber(1042.5, 1137)).toBeNull();
  });
});

describe("parseLoginNumber", () => {
  it("numarayı kurum ve kişi bölümlerine ayırır", () => {
    expect(parseLoginNumber("10421137")).toEqual({
      organizationCode: 1042,
      personCode: 1137,
    });
  });

  it("bölümlerden biri sıfırla başlıyorsa reddeder", () => {
    expect(parseLoginNumber("00421137")).toBeNull();
    expect(parseLoginNumber("10420137")).toBeNull();
  });

  it("uzunluğu sekiz olmayanı reddeder", () => {
    expect(parseLoginNumber("1042113")).toBeNull();
    expect(parseLoginNumber("104211370")).toBeNull();
  });

  it("rakam olmayan karakter içereni reddeder", () => {
    expect(parseLoginNumber("1042113a")).toBeNull();
  });
});

describe("syntheticEmailFor", () => {
  it("numarayı sentetik adrese çevirir", () => {
    expect(syntheticEmailFor("10421137")).toBe(
      `10421137@${SYNTHETIC_EMAIL_DOMAIN}`
    );
  });

  it("teslim edilemeyen bir alan adı kullanır", () => {
    // RFC 2606: .invalid hiçbir zaman çözümlenmez. Bu adreslere posta
    // gönderilemez ve gerçek bir adresle çakışamaz.
    expect(SYNTHETIC_EMAIL_DOMAIN.endsWith(".invalid")).toBe(true);
  });

  it("geçersiz numarada adres üretmez", () => {
    expect(syntheticEmailFor("42")).toBeNull();
  });
});

describe("resolveLoginIdentifier", () => {
  it("e-posta girdisini olduğu gibi kullanır", () => {
    expect(resolveLoginIdentifier("ahmet@dershane.com")).toEqual({
      kind: "email",
      email: "ahmet@dershane.com",
    });
  });

  it("numara girdisini sentetik adrese çevirir", () => {
    expect(resolveLoginIdentifier("10421137")).toEqual({
      kind: "number",
      email: `10421137@${SYNTHETIC_EMAIL_DOMAIN}`,
      loginNumber: "10421137",
      organizationCode: 1042,
      personCode: 1137,
    });
  });

  it("baştaki ve sondaki boşlukları temizler", () => {
    // Kâğıttan okuyup yapıştıran kullanıcı boşluk bırakabilir.
    expect(resolveLoginIdentifier("  10421137  ")?.kind).toBe("number");
    expect(resolveLoginIdentifier(" ahmet@dershane.com ")).toEqual({
      kind: "email",
      email: "ahmet@dershane.com",
    });
  });

  it("boş girdiyi reddeder", () => {
    expect(resolveLoginIdentifier("")).toBeNull();
    expect(resolveLoginIdentifier("   ")).toBeNull();
  });

  it("çözümlenemeyen girdiyi reddeder", () => {
    expect(resolveLoginIdentifier("ahmet")).toBeNull();
    expect(resolveLoginIdentifier("42")).toBeNull();
    expect(resolveLoginIdentifier("00421137")).toBeNull();
  });

  it("e-posta biçimini kendisi doğrulamaz", () => {
    // Kendi e-posta doğrulama kuralımızı yazmak, geçerli ama sıra dışı
    // adresleri reddetme riski taşır. Doğrulama Supabase'e bırakılır.
    expect(resolveLoginIdentifier("a@b")).toEqual({
      kind: "email",
      email: "a@b",
    });
  });

  it("sentetik alan adının kendisiyle giriş denemesini e-posta sayar", () => {
    // Kullanıcı sentetik adresi bilse ve olduğu gibi yazsa da aynı hesaba
    // ulaşır; ayrı bir yol açılmaz.
    const direct = resolveLoginIdentifier(`10421137@${SYNTHETIC_EMAIL_DOMAIN}`);
    expect(direct).toEqual({
      kind: "email",
      email: `10421137@${SYNTHETIC_EMAIL_DOMAIN}`,
    });
  });
});
