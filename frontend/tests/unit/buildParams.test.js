import { describe, it, expect, beforeEach } from "vitest";
import { buildParams, state } from "../../../static/js/app.js";

// Reset all mutable state before each test so tests don't leak into each
// other (state is a shared module-level object).
function resetState() {
  state.q = "";
  state.poets = new Set();
  state.meters = new Set();
  state.excludePoems = new Set();
  state.excludeRanks = new Set();
  state.rankMin = null;
  state.rankMax = null;
  state.poemBatchesMin = null;
  state.poemBatchesMax = null;
  state.poemVersesMin = null;
  state.poemVersesMax = null;
  state.firstBatchOnly = false;
  state.centuryHijri = new Set();
  state.centuryGregorian = new Set();
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

  it("maps excluded poems and ranks onto repeated params", () => {
    let p = buildParams(false);
    expect(p.has("exclude_poem")).toBe(false);
    expect(p.has("exclude_rank")).toBe(false);

    state.excludePoems.add("4730");
    state.excludeRanks.add(1);
    state.excludeRanks.add(7);
    p = buildParams(false);
    expect(p.getAll("exclude_poem")).toEqual(["4730"]);
    expect(p.getAll("exclude_rank").sort()).toEqual(["1", "7"]);
  });

  it("omits poem-length (batches/verses) ranges when null, includes them when set", () => {
    let p = buildParams(false);
    expect(p.has("poem_batches_min")).toBe(false);
    expect(p.has("poem_batches_max")).toBe(false);
    expect(p.has("poem_verses_min")).toBe(false);
    expect(p.has("poem_verses_max")).toBe(false);

    state.poemBatchesMin = 1;
    state.poemBatchesMax = 3;
    state.poemVersesMin = 10;
    state.poemVersesMax = 40;
    p = buildParams(false);
    expect(p.get("poem_batches_min")).toBe("1");
    expect(p.get("poem_batches_max")).toBe("3");
    expect(p.get("poem_verses_min")).toBe("10");
    expect(p.get("poem_verses_max")).toBe("40");
  });

  it("includes first_batch_only only when true", () => {
    let p = buildParams(false);
    expect(p.has("first_batch_only")).toBe(false);

    state.firstBatchOnly = true;
    p = buildParams(false);
    expect(p.get("first_batch_only")).toBe("1");
  });

  it("maps century_hijri and century_gregorian sets onto repeated params", () => {
    let p = buildParams(false);
    expect(p.has("century_hijri")).toBe(false);
    expect(p.has("century_gregorian")).toBe(false);

    state.centuryHijri.add(13);
    state.centuryHijri.add(14);
    state.centuryGregorian.add(19);
    p = buildParams(false);
    expect(p.getAll("century_hijri").sort()).toEqual(["13", "14"]);
    expect(p.getAll("century_gregorian")).toEqual(["19"]);
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
