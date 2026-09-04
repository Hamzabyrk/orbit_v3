import { describe, expect, it } from "vitest";
import { resolveSessionEvent, type SessionEventInput } from "./sessionEvents";

function input(overrides: Partial<SessionEventInput> = {}): SessionEventInput {
  return {
    event: "INITIAL_SESSION",
    accessToken: "jeton-1",
    resolvedToken: null,
    recovering: false,
    ...overrides,
  };
}

describe("resolveSessionEvent", () => {
  describe("ilk boyamanın kilidi", () => {
    // #145'in düzeltmesi `getSession()`'ı kaldırıyor; `loading` artık yalnızca
    // bu olayla düşüyor. Kilidin düşmediği bir yol kalırsa ekran asılı kalır.
    it("INITIAL_SESSION kilidi her durumda düşürür", () => {
      expect(resolveSessionEvent(input()).releasesLoading).toBe(true);
      expect(
        resolveSessionEvent(input({ accessToken: null })).releasesLoading
      ).toBe(true);
      expect(
        resolveSessionEvent(input({ resolvedToken: "jeton-1" })).releasesLoading
      ).toBe(true);
    });

    // 🔴 Bu testin var olma sebebi somut bir gerileme: kurtarma bayrağı açıkken
    // olay "ignore" dönüyor. Kilit karara bağlansaydı kurtarma bağlantısıyla
    // gelen kullanıcı sonsuz spinner görürdü. Bugün o kilidi kaldıran şey,
    // bu değişiklikle giden `getSession()` yoluydu.
    it("kurtarma sürerken bile INITIAL_SESSION kilidi düşürür", () => {
      const decision = resolveSessionEvent(
        input({ event: "INITIAL_SESSION", recovering: true })
      );

      expect(decision.action).toBe("ignore");
      expect(decision.releasesLoading).toBe(true);
    });

    it("PASSWORD_RECOVERY kilidi düşürür", () => {
      expect(
        resolveSessionEvent(input({ event: "PASSWORD_RECOVERY" }))
          .releasesLoading
      ).toBe(true);
    });

    it("sonraki olaylar kilide dokunmaz", () => {
      for (const event of ["SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"]) {
        expect(resolveSessionEvent(input({ event })).releasesLoading).toBe(
          false
        );
      }
    });
  });

  describe("kurtarma akışı", () => {
    it("PASSWORD_RECOVERY kurtarma moduna geçirir", () => {
      expect(
        resolveSessionEvent(input({ event: "PASSWORD_RECOVERY" })).action
      ).toBe("enter-recovery");
    });

    // Kurtarma sürerken gelen geçerli oturum kullanıcıyı panele düşürmemeli;
    // şifre henüz belirlenmedi.
    it("kurtarma sürerken oturumlu olaylar yok sayılır", () => {
      expect(
        resolveSessionEvent(input({ event: "SIGNED_IN", recovering: true }))
          .action
      ).toBe("ignore");
      expect(
        resolveSessionEvent(
          input({ event: "TOKEN_REFRESHED", recovering: true })
        ).action
      ).toBe("ignore");
    });

    it("kurtarma, jeton tekrarı kontrolünden önce gelir", () => {
      expect(
        resolveSessionEvent(
          input({ resolvedToken: "jeton-1", recovering: true })
        ).action
      ).toBe("ignore");
    });
  });

  describe("tekrar eden çözümlemenin engellenmesi", () => {
    it("aynı jeton ikinci kez çözülmez", () => {
      expect(
        resolveSessionEvent(
          input({ event: "SIGNED_IN", resolvedToken: "jeton-1" })
        ).action
      ).toBe("skip-resolved");
    });

    it("hiç çözülmemişse okur", () => {
      expect(resolveSessionEvent(input({ resolvedToken: null })).action).toBe(
        "resolve"
      );
    });

    // 🔴 Ölçüt jeton, kullanıcı değil. "Aynı kullanıcı → atla" deseydik zorunlu
    // şifre değişiminden sonra kimlik yeniden okunmaz, `must_change_password`
    // düşmüş olsa da kilit ekranı açık kalırdı. Şifre değişimi oturumu
    // döndürür; yeni jeton okumayı zorunlu kılar.
    it("jeton değiştiyse aynı kullanıcı için bile yeniden okur", () => {
      expect(
        resolveSessionEvent(
          input({
            event: "TOKEN_REFRESHED",
            accessToken: "jeton-2",
            resolvedToken: "jeton-1",
          })
        ).action
      ).toBe("resolve");
    });
  });

  describe("oturumsuz olaylar", () => {
    it("oturum yoksa kimlik sıfırlanır", () => {
      expect(
        resolveSessionEvent(input({ event: "SIGNED_OUT", accessToken: null }))
          .action
      ).toBe("clear");
    });

    // Çözülmüş jeton varken oturumun düşmesi "atla" ile karıştırılmamalı;
    // `null === null` karşılaştırmasına düşseydi çıkış sessizce yutulurdu.
    it("çözülmüş jeton varken oturum düşerse yine sıfırlanır", () => {
      expect(
        resolveSessionEvent(
          input({
            event: "SIGNED_OUT",
            accessToken: null,
            resolvedToken: "jeton-1",
          })
        ).action
      ).toBe("clear");
    });

    it("hiç oturum olmadan gelen INITIAL_SESSION de sıfırlar", () => {
      expect(
        resolveSessionEvent(input({ accessToken: null, resolvedToken: null }))
          .action
      ).toBe("clear");
    });
  });
});
