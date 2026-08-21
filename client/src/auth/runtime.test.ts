import { describe, expect, it } from "vitest";
import { resolveDeploymentEnvironment } from "./runtime";

describe("resolveDeploymentEnvironment", () => {
  it("keeps Vercel preview in demo mode", () => {
    expect(resolveDeploymentEnvironment("preview", false)).toBe("preview");
  });

  it("locks an explicit production build", () => {
    expect(resolveDeploymentEnvironment("production", true)).toBe("production");
  });

  it("fails closed for an unknown production value", () => {
    expect(resolveDeploymentEnvironment("unexpected", false)).toBe(
      "production"
    );
  });

  it("uses development only for a real Vite development build", () => {
    expect(resolveDeploymentEnvironment(undefined, true)).toBe("development");
  });
});
