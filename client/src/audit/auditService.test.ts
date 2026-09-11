import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUDIT_LIMIT,
  describeAuditAction,
  describeAuditEntity,
  formatAuditMoment,
  loadOrganizationAuditEvents,
  resolveAuditActor,
} from "./auditService";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

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
    expect(describeAuditAction("student.created")).toBe("Öğrenci eklendi");
    expect(describeAuditAction("student.updated")).toBe("Öğrenci güncellendi");
    expect(describeAuditAction("student.archived")).toBe("Öğrenci arşivlendi");
    expect(describeAuditAction("student.restored")).toBe(
      "Öğrenci geri yüklendi"
    );
    expect(describeAuditAction("student.account_linked")).toBe(
      "Öğrenci hesabı bağlandı"
    );
    expect(describeAuditAction("student.account_unlinked")).toBe(
      "Öğrenci hesap bağı çözüldü"
    );
    expect(describeAuditAction("guardian.account_linked")).toBe(
      "Veli hesabı bağlandı"
    );
    expect(describeAuditAction("guardian.account_unlinked")).toBe(
      "Veli hesap bağı çözüldü"
    );
    expect(describeAuditAction("class.created")).toBe("Sınıf eklendi");
    expect(describeAuditAction("class.updated")).toBe("Sınıf güncellendi");
    expect(describeAuditAction("class.archived")).toBe("Sınıf arşivlendi");
    expect(describeAuditAction("class.restored")).toBe("Sınıf geri yüklendi");
    expect(describeAuditAction("class_enrollment.created")).toBe(
      "Sınıfa öğrenci kaydedildi"
    );
    expect(describeAuditAction("class_enrollment.archived")).toBe(
      "Öğrencinin sınıf kaydı sonlandırıldı"
    );
    expect(describeAuditAction("class_enrollment.restored")).toBe(
      "Öğrencinin sınıf kaydı geri yüklendi"
    );
    expect(describeAuditAction("attendance_session.created")).toBe(
      "Yoklama oturumu açıldı"
    );
    expect(describeAuditAction("attendance_session.updated")).toBe(
      "Yoklama oturumu güncellendi"
    );
    expect(describeAuditAction("attendance_session.archived")).toBe(
      "Yoklama oturumu arşivlendi"
    );
    expect(describeAuditAction("attendance_session.restored")).toBe(
      "Yoklama oturumu geri yüklendi"
    );
    expect(describeAuditAction("attendance_record.updated")).toBe(
      "Yoklama kaydı güncellendi"
    );
    expect(describeAuditEntity("student")).toBe("Öğrenci");
    expect(describeAuditEntity("guardian")).toBe("Veli");
    expect(describeAuditEntity("class")).toBe("Sınıf");
    expect(describeAuditEntity("class_enrollment")).toBe("Sınıf Kaydı");
    expect(describeAuditEntity("attendance_session")).toBe("Yoklama Oturumu");
    expect(describeAuditEntity("attendance_record")).toBe("Yoklama Kaydı");
  });

  it("⛔ attendance_record.created diye bir eylem yoktur ve etiket haritasında yer almaz (hacim kısıtı)", () => {
    // İlk toplu giriş bilerek denetlenmez (§4.12); etiket haritasında olmamalıdır.
    expect(describeAuditAction("attendance_record.created")).toBe(
      "attendance_record.created"
    );
  });

  it("bilinmeyen eylemde ham kodu gosterir, etiket uydurmaz", () => {
    // K-03. Edge Function'da yeni bir eylem yazıldığında burası
    // güncellenmezse ekran çirkin ama DOĞRU bir şey gösterir.
    expect(describeAuditAction("unknown.action")).toBe("unknown.action");
    expect(describeAuditEntity("unknown_entity")).toBe("unknown_entity");
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

describe("loadOrganizationAuditEvents (v1.3-06 pagination sözleşmesi)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupAuditMocks(options: {
    rows?: Array<{
      id: number;
      actor_user_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      created_at: string;
    }>;
    error?: Error | null;
  }) {
    const orderSpy = vi.fn();
    const ltSpy = vi.fn();
    const limitSpy = vi.fn();
    const eqSpy = vi.fn();

    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn((col: string, val: string) => {
          eqSpy(col, val);
          return chain;
        });
        chain.order = vi.fn((col: string, opts: { ascending: boolean }) => {
          orderSpy(col, opts);
          return chain;
        });
        chain.lt = vi.fn((col: string, val: number) => {
          ltSpy(col, val);
          return chain;
        });
        chain.limit = vi.fn((n: number) => {
          limitSpy(n);
          return Promise.resolve({
            data: options.error ? null : (options.rows ?? []),
            error: options.error ?? null,
          });
        });
        return chain;
      }
      if (table === "profiles") {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockResolvedValue({
          data: [{ id: "actor-1", display_name: "Ali Veli" }],
          error: null,
        });
        return chain;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    return { orderSpy, ltSpy, limitSpy, eqSpy };
  }

  it("⛔ sorgu created_at'e göre sıralamaz; id'ye göre azalan sırada sıralar", async () => {
    const { orderSpy } = setupAuditMocks({ rows: [] });

    await loadOrganizationAuditEvents("org-1", 50);

    expect(orderSpy).toHaveBeenCalledWith("id", { ascending: false });
    expect(orderSpy).not.toHaveBeenCalledWith("created_at", expect.anything());
  });

  it("⛔ ilk sayfada .lt() çağrılmaz; ikinci sayfada imleçle (.lt('id', cursor)) çağrılır", async () => {
    const { ltSpy } = setupAuditMocks({ rows: [] });

    // İlk sayfa: cursor yok
    await loadOrganizationAuditEvents("org-1", 50);
    expect(ltSpy).not.toHaveBeenCalled();

    // İkinci sayfa: cursor var (örn. id: 105)
    await loadOrganizationAuditEvents("org-1", 50, 105);
    expect(ltSpy).toHaveBeenCalledWith("id", 105);
  });

  it("sunucudan limit + 1 satır istenir", async () => {
    const { limitSpy } = setupAuditMocks({ rows: [] });

    await loadOrganizationAuditEvents("org-1");
    expect(limitSpy).toHaveBeenCalledWith(DEFAULT_AUDIT_LIMIT + 1);

    await loadOrganizationAuditEvents("org-1", 10);
    expect(limitSpy).toHaveBeenCalledWith(11);
  });

  it("limit + 1 satır geldiğinde: dönen satır sayısı limit, nextCursor son satırın id'sidir", async () => {
    // 5 satır isteyelim (limit = 5), sunucu 6 satır (limit + 1) dönsün: id'ler 60, 59, 58, 57, 56, 55
    const mockRows = [60, 59, 58, 57, 56, 55].map(id => ({
      id,
      actor_user_id: "actor-1",
      action: "membership.created",
      entity_type: "organization_membership",
      entity_id: `id-${id}`,
      created_at: "2026-09-09T10:00:00Z",
    }));

    setupAuditMocks({ rows: mockRows });

    const result = await loadOrganizationAuditEvents("org-1", 5);

    expect(result.rows).toHaveLength(5);
    expect(result.rows[0].id).toBe(60);
    expect(result.rows[4].id).toBe(56);
    expect(result.nextCursor).toBe(56); // 5. satırın (dönen son satırın) id'si
  });

  it("⛔ limit kadar ya da daha az satır geldiğinde nextCursor null'dır ('burası gerçek son')", async () => {
    // 5 satır isteyelim, tam 5 satır gelsin
    const fiveRows = [50, 49, 48, 47, 46].map(id => ({
      id,
      actor_user_id: "actor-1",
      action: "membership.created",
      entity_type: "organization_membership",
      entity_id: `id-${id}`,
      created_at: "2026-09-09T10:00:00Z",
    }));

    setupAuditMocks({ rows: fiveRows });
    const resultExact = await loadOrganizationAuditEvents("org-1", 5);

    expect(resultExact.rows).toHaveLength(5);
    expect(resultExact.nextCursor).toBeNull();

    // 5 satır isteyelim, 3 satır gelsin
    setupAuditMocks({ rows: fiveRows.slice(0, 3) });
    const resultLess = await loadOrganizationAuditEvents("org-1", 5);

    expect(resultLess.rows).toHaveLength(3);
    expect(resultLess.nextCursor).toBeNull();

    // 0 satır gelsin
    setupAuditMocks({ rows: [] });
    const resultEmpty = await loadOrganizationAuditEvents("org-1", 5);

    expect(resultEmpty.rows).toHaveLength(0);
    expect(resultEmpty.nextCursor).toBeNull();
  });

  // ⛔ Bu süzme bir güvenlik önlemi DEĞİL, bir indeks meselesi. Kapsam zaten
  // RLS'ten geliyor; ama RLS koşulu bir fonksiyon çağrısı olduğu için
  // planlayıcı onu indeks koşuluna çeviremiyor. Canlıda ölçüldü: süzme
  // olmadan `(organization_id, id desc)` indeksi HİÇ kullanılmıyor, sorgu
  // birincil anahtarı geriye tarayıp RLS fonksiyonunu her satırda çalıştırıyor.
  it("⛔ sorgu organization_id'ye göre AÇIKÇA süzer (indeks bunsuz kullanılamıyor)", async () => {
    const { eqSpy } = setupAuditMocks({ rows: [] });

    await loadOrganizationAuditEvents("org-42", 50);

    expect(eqSpy).toHaveBeenCalledWith("organization_id", "org-42");
  });

  it("veritabanı hatası durumunda hata fırlatır", async () => {
    setupAuditMocks({ error: new Error("DB network fail") });

    await expect(loadOrganizationAuditEvents("org-1", 50)).rejects.toThrow(
      "Denetim kaydı yüklenemedi."
    );
  });
});
