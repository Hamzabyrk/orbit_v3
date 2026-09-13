import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveBranch,
  createBranch,
  loadBranches,
  loadOrganizationBranches,
  restoreBranch,
  setDefaultBranch,
  translateBranchError,
  updateBranch,
} from "./branchService";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("branchService (v1.4-09 · #284)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadBranches", () => {
    it("kurum kimliğiyle süzer, arşivlenmemişleri sıralar ve limit uygular", async () => {
      const mockOrder = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: "b-1",
              organization_id: "org-1",
              name: "Kadıköy",
              is_default: true,
              archived_at: null,
              created_at: "2026-09-01T00:00:00Z",
              updated_at: "2026-09-01T00:00:00Z",
            },
          ],
          error: null,
        }),
      });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadBranches("org-1");

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(mockEq).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockIs).toHaveBeenCalledWith("archived_at", null);
      expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        id: "b-1",
        organizationId: "org-1",
        name: "Kadıköy",
        isDefault: true,
        archivedAt: null,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      });
      expect(result.truncated).toBe(false);
    });

    it("includeArchived true iken arşiv süzgeci koymaz", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadBranches("org-1", { includeArchived: true });

      expect(mockEq).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
      expect(result.rows).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite ulaştığında truncated true döner (K-03)", async () => {
      const mockData = [
        {
          id: "b-1",
          organization_id: "org-1",
          name: "Şube 1",
          is_default: true,
          archived_at: null,
        },
        {
          id: "b-2",
          organization_id: "org-1",
          name: "Şube 2",
          is_default: false,
          archived_at: null,
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadBranches("org-1", { limit: 2 });
      expect(result.truncated).toBe(true);
      expect(result.rows).toHaveLength(2);
    });
  });

  describe("loadOrganizationBranches", () => {
    it("şubeleri sadeleştirilmiş diziye dönüştürür", async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: "b-1",
            organization_id: "org-1",
            name: "Merkez",
            is_default: true,
            archived_at: null,
          },
        ],
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const list = await loadOrganizationBranches("org-1");
      expect(list).toEqual([{ id: "b-1", name: "Merkez", isDefault: true }]);
    });
  });

  describe("createBranch (Yüke id konmaz)", () => {
    it("yüke id koymaz ve RLS üzerinden ekleme yapar", async () => {
      let insertArg: unknown;
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "new-branch-uuid",
          organization_id: "org-1",
          name: "Beşiktaş",
          is_default: false,
          archived_at: null,
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockImplementation((arg: unknown) => {
        insertArg = arg;
        return { select: mockSelect };
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const created = await createBranch({
        organizationId: "org-1",
        name: "  Beşiktaş  ",
        isDefault: false,
      });

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(insertArg).toEqual({
        organization_id: "org-1",
        name: "Beşiktaş",
        is_default: false,
      });
      // ⚠️ K-00 & briefing: Yüke asla id konmaz!
      expect(insertArg).not.toHaveProperty("id");
      expect(created.id).toBe("new-branch-uuid");
      expect(created.name).toBe("Beşiktaş");
    });
  });

  describe("updateBranch (Yüke id konmaz & K-14)", () => {
    it("güncelleme yüküne id veya organization_id koymaz", async () => {
      let updateArg: unknown;
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "b-1",
            organization_id: "org-1",
            name: "Kadıköy Yeni",
            is_default: false,
            archived_at: null,
          },
        ],
        error: null,
      });
      const mockEqId = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockImplementation((arg: unknown) => {
        updateArg = arg;
        return { eq: mockEqOrg };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      const updated = await updateBranch("org-1", "b-1", {
        name: "  Kadıköy Yeni  ",
      });

      expect(updateArg).toEqual({ name: "Kadıköy Yeni" });
      expect(updateArg).not.toHaveProperty("id");
      expect(updateArg).not.toHaveProperty("organization_id");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqId).toHaveBeenCalledWith("id", "b-1");
      expect(updated.name).toBe("Kadıköy Yeni");
    });

    it("sıfır satır etkilendiğinde hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqId = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(
        updateBranch("org-1", "b-nonexistent", { name: "Test" })
      ).rejects.toThrow("Şube bulunamadı veya güncelleme yetkiniz yok.");
    });
  });

  describe("setDefaultBranch (Tek UPDATE, .is('archived_at', null) & K-14)", () => {
    it("tek bir UPDATE atarak is_default = true yapar ve arşivli şubeleri dışlar", async () => {
      let updateArg: unknown;
      let updateCallsCount = 0;

      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: "b-2",
            organization_id: "org-1",
            name: "Üsküdar",
            is_default: true,
            archived_at: null,
          },
        ],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockImplementation((arg: unknown) => {
        updateCallsCount++;
        updateArg = arg;
        return { eq: mockEqOrg };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await setDefaultBranch("org-1", "b-2");

      // ⚠️ Briefing: Devir tek bir UPDATE ile yapılır, iki adım değil!
      expect(updateCallsCount).toBe(1);
      expect(updateArg).toEqual({ is_default: true });
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqId).toHaveBeenCalledWith("id", "b-2");
      // R4: Arşivli şubeler varsayılan yapılamaz
      expect(mockIs).toHaveBeenCalledWith("archived_at", null);
      expect(result.isDefault).toBe(true);
    });

    it("sıfır satır etkilendiğinde hata fırlatır (K-14 / arşivli veya yok)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(setDefaultBranch("org-1", "b-zero")).rejects.toThrow(
        "Şube bulunamadı veya güncelleme yetkiniz yok."
      );
    });
  });

  describe("archiveBranch & restoreBranch (K-14)", () => {
    it("archiveBranch: archived_at alanını günceller", async () => {
      let updateArg: unknown;
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "b-1" }],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockImplementation((arg: unknown) => {
        updateArg = arg;
        return { eq: mockEqOrg };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await archiveBranch("org-1", "b-1");

      expect(updateArg).toHaveProperty("archived_at");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqId).toHaveBeenCalledWith("id", "b-1");
    });

    it("archiveBranch: sıfır satır etkilendiğinde hata fırlatır (K-14)", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockIs = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ is: mockIs });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqOrg });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(archiveBranch("org-1", "b-1")).rejects.toThrow(
        "Şube bulunamadı veya işlem yetkiniz yok."
      );
    });

    it("restoreBranch: archived_at alanını null yapar ve 0 satırda hata fırlatır (K-14)", async () => {
      let updateArg: unknown;
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "b-1" }],
        error: null,
      });
      const mockNot = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ not: mockNot });
      const mockEqOrg = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockUpdate = vi.fn().mockImplementation((arg: unknown) => {
        updateArg = arg;
        return { eq: mockEqOrg };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      await restoreBranch("org-1", "b-1");

      expect(updateArg).toEqual({ archived_at: null });
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", "org-1");
      expect(mockEqId).toHaveBeenCalledWith("id", "b-1");
    });
  });

  describe("translateBranchError (R1 gerçek PostgREST gövdesi, ORB03'ün 3 hali, R5)", () => {
    it("Hal 1: Şube dolu hatasında sayıları okur ve insani cümle kurar (ham details basmaz)", () => {
      // R1: PostgREST'ten dönen gerçek gövde: 'details' alanı kullanılır
      const err = {
        code: "ORB03",
        details: "öğrenci=3, sınıf=2, üyelik=1",
        hint: "Önce bu kayıtları başka bir şubeye taşıyın veya arşivleyin.",
        message: "Bu şube kapatılamaz: içinde aktif kayıtlar var.",
      };

      const translated = translateBranchError(err);

      // İnsani Türkçe cümle kurulmalı
      expect(translated).toContain("3 öğrenci");
      expect(translated).toContain("2 sınıf");
      expect(translated).toContain("1 üye");
      expect(translated).toContain(
        "Önce bu kayıtları başka bir şubeye taşıyın"
      );

      // ⚠️ Ham details asla arayüze sızmamalı!
      expect(translated).not.toContain("öğrenci=3");
      expect(translated).not.toContain("sınıf=2");
      expect(translated).not.toContain("üyelik=1");
    });

    it("Hal 2: Son şube kapatılmaya çalışıldığında doğru cümleye çevrilir", () => {
      const err = {
        code: "ORB03",
        details: "işlem sonrası kalacak aktif şube sayısı=0",
        hint: "Kapatmadan önce başka bir şube açın.",
        message: "Bu şube kapatılamaz: içinde aktif kayıtlar var.",
      };

      const translated = translateBranchError(err);

      expect(translated).toBe(
        "Kurumun son şubesi kapatılamaz. Kapatmadan önce başka bir şube açın."
      );
      // Ham details sızmamalı
      expect(translated).not.toContain("kalacak aktif şube sayısı=0");
    });

    it("Hal 3: Varsayılan şube kapatılmaya çalışıldığında doğru cümleye çevrilir", () => {
      const err = {
        code: "ORB03",
        details: "kapatılmak istenen şube kurumun varsayılan şubesi",
        hint: "Önce başka bir şubeyi varsayılan yapın, sonra bu şubeyi kapatın.",
        message: "Bu şube kapatılamaz: içinde aktif kayıtlar var.",
      };

      const translated = translateBranchError(err);

      expect(translated).toBe(
        "Varsayılan şube kapatılamaz. Önce başka bir şubeyi varsayılan yapın, sonra bu şubeyi kapatın."
      );
      // Ham details sızmamalı
      expect(translated).not.toContain("kapatılmak istenen şube");
    });

    it("R1: details boş olduğunda ikincil yol (message) üzerinden doğru çevrilir", () => {
      const err = {
        code: "ORB03",
        message: "Kurumun son şubesi kapatılamaz.",
      };
      expect(translateBranchError(err)).toBe(
        "Kurumun son şubesi kapatılamaz. Kapatmadan önce başka bir şube açın."
      );
    });

    it("R5: Tanınmayan ORB03 detayında sebep uydurmaz, nötr cümle döner (K-22)", () => {
      const err = {
        code: "ORB03",
        details: "bilinmeyen_yeni_kural=true",
        message: "Bu şube kapatılamaz.",
      };
      expect(translateBranchError(err)).toBe("Bu şube şu anda kapatılamıyor.");
    });

    it("23505 tekil ad çakışmasını kullanıcı dostu mesaja çevirir", () => {
      const err = { code: "23505", message: "duplicate key value" };
      expect(translateBranchError(err)).toBe(
        "Bu isimde aktif bir şube zaten var. Lütfen farklı bir şube adı seçin."
      );
    });

    it("23514 ad uzunluğu kısıtını kullanıcı dostu mesaja çevirir", () => {
      const err = { code: "23514", message: "check constraint" };
      expect(translateBranchError(err)).toBe(
        "Şube adı 2 ile 120 karakter arasında olmalıdır."
      );
    });

    it("42501 RLS yetki hatasını kullanıcı dostu mesaja çevirir", () => {
      const err = { code: "42501", message: "permission denied" };
      expect(translateBranchError(err)).toBe(
        "Bu işlem için kurum yöneticisi yetkisi gerekiyor."
      );
    });

    it("R5: Bilinmeyen genel hatada ham Postgres mesajı basmaz, genel mesaj döner", () => {
      const err = {
        code: "XXXXX",
        message: "FATAL: database connection closed unexpectedly",
      };
      expect(translateBranchError(err)).toBe(
        "Şube işlemi gerçekleştirilemedi. Lütfen tekrar deneyin."
      );
    });
  });

  describe("ekranın gördüğü cümle — çeviri İKİ KEZ yapılmaz (denetleyen turu)", () => {
    // R5 bir regresyon doğurdu ve kökü brifingin kendisiydi: son satırdaki
    // `return message` kaldırılınca, `translateBranchError`'dan bir daha
    // geçirilen —ve zaten çevrilmiş— bir `Error` genel yedeğe düşmeye başladı.
    //
    // Servis her yazmada `throw new Error(translateBranchError(raw))` yapıyor,
    // yani ekranın elindeki hata ZATEN Türkçe bir cümle. Ekran onu yeniden
    // çevirmeye kalkarsa ORB03'ün sayıları da K-14 mesajları da kaybolur.
    //
    // Bu iddia çevirmenin bu özelliğini çiviliyor; ekranın `err.message`
    // okuduğunu `SettingsInstitutionSection` tarafındaki `hataCumlesi`
    // yardımcısı sağlıyor.
    it("zaten çevrilmiş bir cümle ikinci geçişte GENEL YEDEĞE düşer — bu yüzden ekran ikinci geçişi yapmaz", () => {
      const servisCumlesi = translateBranchError({
        code: "ORB03",
        details: "öğrenci=3, sınıf=2, üyelik=1",
        hint: "Önce bu kayıtları başka bir şubeye taşıyın veya arşivleyin.",
        message: "Bu şube kapatılamaz: içinde aktif kayıtlar var.",
      });

      expect(servisCumlesi).toContain("3 öğrenci");

      // Ekran BUNU yapsaydı sayılar kaybolurdu:
      expect(translateBranchError(new Error(servisCumlesi))).toBe(
        "Şube işlemi gerçekleştirilemedi. Lütfen tekrar deneyin."
      );

      // Ekranın yaptığı şey ise cümleyi olduğu gibi taşımak:
      const err: unknown = new Error(servisCumlesi);
      const ekranda =
        err instanceof Error && err.message ? err.message : "yedek";
      expect(ekranda).toBe(servisCumlesi);
    });

    it("K-14 mesajı da ikinci çeviriden sağ çıkmaz", () => {
      const k14 = new Error("Şube bulunamadı veya güncelleme yetkiniz yok.");
      expect(translateBranchError(k14)).toBe(
        "Şube işlemi gerçekleştirilemedi. Lütfen tekrar deneyin."
      );
    });
  });
});
