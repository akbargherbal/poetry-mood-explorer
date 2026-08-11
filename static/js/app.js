/* ============================================================================
   Arabic Poetry Mood Explorer — main entry point (ES module)
   ========================================================================= */

import { fetchJSON } from "./modules/api.js";
import { state } from "./modules/state.js";
import { tagColor } from "./modules/constants.js";
import { toggleSetValue, debounce, escapeHtml } from "./modules/utils.js";
import { buildParams, loadStateFromURL } from "./modules/url.js";
import { buildPoetList, buildMeterList, buildAxisBlocks, buildPoemLengthPresets, buildEraLists } from "./modules/sidebar.js";
import { wireStaticControls } from "./modules/controls.js";
import { openSharedBatchFromURL } from "./modules/sharing.js";
import { renderResults, renderCard } from "./modules/cards.js";
import { renderStats } from "./modules/stats.js";
import { renderActiveFilters } from "./modules/filters-bar.js";

// Re-export names required by unit tests in frontend/tests/unit/
export { tagColor, state, toggleSetValue, debounce, escapeHtml, buildParams };

let META = null;

document.addEventListener("DOMContentLoaded", async () => {
  META = await fetchJSON("/api/meta");
  loadStateFromURL();
  buildPoetList(META.poets, refresh);
  buildMeterList(META.meters, refresh);
  buildEraLists(META.century_options, refresh);
  buildAxisBlocks(META, refresh);
  buildPoemLengthPresets(META.poem_length, refresh);
  wireStaticControls(refresh);
  refresh();
  openSharedBatchFromURL((batch) => renderCard(batch, refresh));
});

async function refresh() {
  const searchParams = buildParams(true);
  const statsParams = buildParams(false);

  const urlSearch = searchParams.toString();
  const newURL = window.location.pathname + (urlSearch ? "?" + urlSearch : "");
  window.history.replaceState(null, "", newURL);

  document.getElementById("resultSummary").textContent = "Loading…";

  const [searchData, statsData] = await Promise.all([
    fetchJSON(`/api/search?${searchParams.toString()}`),
    fetchJSON(`/api/stats?${statsParams.toString()}`),
  ]);

  renderResults(searchData, refresh);
  renderStats(statsData);
  renderActiveFilters(refresh);

  document.getElementById("headerCount").textContent = searchData.total.toLocaleString();
  document.getElementById("headerTotal").textContent = META.total_batches.toLocaleString();
}