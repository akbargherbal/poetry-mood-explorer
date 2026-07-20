import { describe, it, expect } from "vitest";
import { toggleSetValue } from "../../../static/js/app.js";

describe("toggleSetValue", () => {
  it("adds a value when on is true", () => {
    const s = new Set();
    toggleSetValue(s, "x", true);
    expect(s.has("x")).toBe(true);
  });

  it("removes a value when on is false", () => {
    const s = new Set(["x"]);
    toggleSetValue(s, "x", false);
    expect(s.has("x")).toBe(false);
  });

  it("is a no-op removing a value that was never present", () => {
    const s = new Set(["y"]);
    toggleSetValue(s, "x", false);
    expect(s.has("x")).toBe(false);
    expect(s.has("y")).toBe(true);
    expect(s.size).toBe(1);
  });

  it("adding an already-present value keeps the set as-is (Set semantics)", () => {
    const s = new Set(["x"]);
    toggleSetValue(s, "x", true);
    expect([...s]).toEqual(["x"]);
  });
});
