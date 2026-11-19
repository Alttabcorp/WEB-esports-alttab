import { describe, expect, it } from "vitest";
import { buildFingerprint, parseFingerprint } from "./builds";

describe("buildFingerprint", () => {
  it("sorts items and ignores empty/trinkets/boots by default", () => {
    const fp = buildFingerprint([3006, 3031, 0, 3072, 3085, 3340]);
    expect(fp).toBe("3031-3072-3085");
    expect(parseFingerprint(fp)).toEqual([3031, 3072, 3085]);
  });

  it("returns empty for no core items", () => {
    expect(buildFingerprint([0, 3340, 3006])).toBe("empty");
  });
});
