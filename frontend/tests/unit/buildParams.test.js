import { describe, it, expect, beforeEach } from "vitest";
import { buildParams, state } from "../../../static/js/app.js";

// Reset all mutable state before each test so tests don't leak into each
// other (state is a shared module-level object).
function resetState() {
  state.q = "";
  state.poets = new Set();
  state.meters = new Set();
  state.rankMin = null;
  state.rankMax = null;
  state.poemBatchesMin = null;
  state.poemBatchesMax = null;
  state.poemVersesMin = null;
  state.poemVersesMax = null;
  state.firstBatchOnly = false;
  state.axis = {
    mood: { tags: new Set(), mode: "any", confidence: "" },
    genre: { tags: new Set(), mode: "any", confidence: "" },
    energy: { tags: new Set(), mode: "any", confidence: "" },
    aesthetic: { tags: new Set(), mode: "any", confidence: "" },
  };
  state.sortBy = "row_id";
  state.sortDir = "asc";
  state.page = 1;
  state.pageSize = 20;
}

describe("buildParams", () => {
  beforeEach(resetState);

  it("omits empty/default fields entirely", () => {
    const p = buildParams(false);
    expect(p.toString()).toBe("");
  });

  it("maps a search query onto q", () => {
    state.q = "hello";
    const p = buildParams(false);
    expect(p.get("q")).toBe("hello");
  });

  it("maps poet and meter sets onto repeated params", () => {
    state.poets.add("Alpha");
    state.poets.add("Beta");
    state.meters.add("tawil");
    const p = buildParams(false);
    expect(p.getAll("poet").sort()).toEqual(["Alpha", "Beta"]);
    expect(p.getAll("meter")).toEqual(["tawil"]);
  });

  it("omits rank/length ranges when null, includes them when set", () => {
    let p = buildParams(false);
    expect(p.has("rank_min")).toBe(false);
    expect(p.has("rank_max")).toBe(false);

    state.rankMin = 5;
    state.rankMax = 10;
    p = buildParams(false);
    expect(p.get("rank_min")).toBe("5");
    expect(p.get("rank_max")).toBe("10");
  });

  it("includes first_batch_only only when true", () => {
    let p = buildParams(false);
    expect(p.has("first_batch_only")).toBe(false);

    state.firstBatchOnly = true;
    p = buildParams(false);
    expect(p.get("first_batch_only")).toBe("1");
  });

  it("maps axis tags and their mode, omitting mode when no tags selected", () => {
    let p = buildParams(false);
    expect(p.has("mood_mode")).toBe(false);

    state.axis.mood.tags.add("sad");
    state.axis.mood.mode = "all";
    p = buildParams(false);
    expect(p.getAll("mood_tags")).toEqual(["sad"]);
    expect(p.get("mood_mode")).toBe("all");
  });

  it("includes axis low-confidence flag only when set to a non-empty string", () => {
    let p = buildParams(false);
    expect(p.has("mood_low_confidence")).toBe(false);

    state.axis.mood.confidence = "true";
    p = buildParams(false);
    expect(p.get("mood_low_confidence")).toBe("true");
  });

  describe("includePagination flag", () => {
    it("omits sort/page fields when includePagination is false", () => {
      state.sortBy = "POET_RANK";
      state.sortDir = "desc";
      state.page = 3;
      state.pageSize = 50;
      const p = buildParams(false);
      expect(p.has("sort_by")).toBe(false);
      expect(p.has("sort_dir")).toBe(false);
      expect(p.has("page")).toBe(false);
      expect(p.has("page_size")).toBe(false);
    });

    it("includes sort/page fields when includePagination is true", () => {
      state.sortBy = "POET_RANK";
      state.sortDir = "desc";
      state.page = 3;
      state.pageSize = 50;
      const p = buildParams(true);
      expect(p.get("sort_by")).toBe("POET_RANK");
      expect(p.get("sort_dir")).toBe("desc");
      expect(p.get("page")).toBe("3");
      expect(p.get("page_size")).toBe("50");
    });
  });
});
