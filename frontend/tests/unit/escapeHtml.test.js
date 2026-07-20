import { describe, it, expect } from "vitest";
import { escapeHtml } from "../../../static/js/app.js";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("escapes a mix of special characters in one string", () => {
    expect(escapeHtml(`<a href="x">A & B</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;"
    );
  });

  it("passes plain text through unchanged", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("passes Arabic text through unchanged (no special chars)", () => {
    expect(escapeHtml("قصيدة")).toBe("قصيدة");
  });

  it("returns an empty string for null or undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("coerces non-string input to a string first", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});
