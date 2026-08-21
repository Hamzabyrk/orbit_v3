import { describe, expect, it } from "vitest";
import { isEducationRole } from "./authService";

describe("isEducationRole", () => {
  it.each(["admin", "teacher", "student", "parent"])(
    "accepts the database role %s",
    role => {
      expect(isEducationRole(role)).toBe(true);
    }
  );

  it("rejects a client-invented privileged role", () => {
    expect(isEducationRole("platform_admin")).toBe(false);
  });
});
