/* ============================================================================
   URL — query building from state, and hydrating state from the URL
   ========================================================================= */

import { AXES } from "./constants.js";
import { state } from "./state.js";

export function buildParams(includePagination) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  state.poets.forEach(v => p.append("poet", v));
  state.meters.forEach(v => p.append("meter", v));
  state.excludePoems.forEach(p_id => p.append("exclude_poem", p_id));
  state.excludeRanks.forEach(r => p.append("exclude_rank", String(r)));

  if (state.rankMin != null) p.set("rank_min", state.rankMin);
  if (state.rankMax != null) p.set("rank_max", state.rankMax);

  if (state.poemBatchesMin != null) p.set("poem_batches_min", state.poemBatchesMin);
  if (state.poemBatchesMax != null) p.set("poem_batches_max", state.poemBatchesMax);
  if (state.poemVersesMin != null) p.set("poem_verses_min", state.poemVersesMin);
  if (state.poemVersesMax != null) p.set("poem_verses_max", state.poemVersesMax);
  if (state.firstBatchOnly) p.set("first_batch_only", "1");

  state.centuryHijri.forEach(c => p.append("century_hijri", String(c)));
  state.centuryGregorian.forEach(c => p.append("century_gregorian", String(c)));

  AXES.forEach(axis => {
    state.axis[axis].tags.forEach(t => p.append(`${axis}_tags`, t));
    if (state.axis[axis].tags.size > 0) {
      p.set(`${axis}_mode`, state.axis[axis].mode);
    }
    if (state.axis[axis].confidence !== "") p.set(`${axis}_low_confidence`, state.axis[axis].confidence);
    if (state.axis[axis].confidenceMin != null) p.set(`${axis}_confidence_min`, state.axis[axis].confidenceMin);
    if (state.axis[axis].confidenceMax != null) p.set(`${axis}_confidence_max`, state.axis[axis].confidenceMax);
  });

  if (includePagination) {
    p.set("sort_by", state.sortBy);
    p.set("sort_dir", state.sortDir);
    p.set("page", state.page);
    p.set("page_size", state.pageSize);
  }
  return p;
}

export function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("q")) state.q = params.get("q");

  params.getAll("poet").forEach(p => state.poets.add(p));
  params.getAll("meter").forEach(m => state.meters.add(m));
  params.getAll("exclude_poem").forEach(p_id => state.excludePoems.add(p_id));
  params.getAll("exclude_rank").forEach(r => state.excludeRanks.add(parseInt(r, 10)));

  if (params.has("rank_min")) state.rankMin = parseInt(params.get("rank_min"), 10);
  if (params.has("rank_max")) state.rankMax = parseInt(params.get("rank_max"), 10);

  if (params.has("poem_batches_min")) state.poemBatchesMin = parseInt(params.get("poem_batches_min"), 10);
  if (params.has("poem_batches_max")) state.poemBatchesMax = parseInt(params.get("poem_batches_max"), 10);
  if (params.has("poem_verses_min")) state.poemVersesMin = parseInt(params.get("poem_verses_min"), 10);
  if (params.has("poem_verses_max")) state.poemVersesMax = parseInt(params.get("poem_verses_max"), 10);
  if (params.has("first_batch_only")) state.firstBatchOnly = params.get("first_batch_only") === "1";

  params.getAll("century_hijri").forEach(c => state.centuryHijri.add(parseInt(c, 10)));
  params.getAll("century_gregorian").forEach(c => state.centuryGregorian.add(parseInt(c, 10)));

  AXES.forEach(axis => {
    params.getAll(`${axis}_tags`).forEach(t => state.axis[axis].tags.add(t));
    if (params.has(`${axis}_mode`)) state.axis[axis].mode = params.get(`${axis}_mode`);
    if (params.has(`${axis}_low_confidence`)) state.axis[axis].confidence = params.get(`${axis}_low_confidence`);
    if (params.has(`${axis}_confidence_min`)) state.axis[axis].confidenceMin = parseFloat(params.get(`${axis}_confidence_min`));
    if (params.has(`${axis}_confidence_max`)) state.axis[axis].confidenceMax = parseFloat(params.get(`${axis}_confidence_max`));
  });

  if (params.has("sort_by")) state.sortBy = params.get("sort_by");
  if (params.has("sort_dir")) state.sortDir = params.get("sort_dir");
  if (params.has("page")) state.page = parseInt(params.get("page"), 10);
  if (params.has("page_size")) state.pageSize = parseInt(params.get("page_size"), 10);

  // Prefill sidebar fields
  if (state.rankMin != null) document.getElementById("rankMin").value = state.rankMin;
  if (state.rankMax != null) document.getElementById("rankMax").value = state.rankMax;
  if (state.poemBatchesMin != null) document.getElementById("poemBatchesMin").value = state.poemBatchesMin;
  if (state.poemBatchesMax != null) document.getElementById("poemBatchesMax").value = state.poemBatchesMax;
  if (state.poemVersesMin != null) document.getElementById("poemVersesMin").value = state.poemVersesMin;
  if (state.poemVersesMax != null) document.getElementById("poemVersesMax").value = state.poemVersesMax;
}