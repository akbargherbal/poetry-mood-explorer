import { describe, it, expect } from "vitest";
import { tagColor } from "../../../static/js/app.js";

describe("tagColor", () => {
  it("returns the fixed color for a known mood tag", () => {
    // "فرح" (joy) is defined in TAG_COLORS.mood in app.js
    expect(tagColor("mood", "فرح")).toBe("#D9AE45");
  });

  it("returns the fixed color for a known tag on a different axis", () => {
    // "غزل" is defined in TAG_COLORS.genre
    expect(tagColor("genre", "غزل")).toBe("#B06B8F");
  });

  it("falls back to the axis accent color for an unknown tag", () => {
    // AXIS_META.mood.accent
    expect(tagColor("mood", "not_a_real_tag")).toBe("#D9AE45");
  });

  it("falls back to the correct accent per axis for unknown tags", () => {
    expect(tagColor("genre", "not_a_real_tag")).toBe("#57998D");
    expect(tagColor("energy", "not_a_real_tag")).toBe("#C9642E");
    expect(tagColor("aesthetic", "not_a_real_tag")).toBe("#9C7FBF");
  });
});
