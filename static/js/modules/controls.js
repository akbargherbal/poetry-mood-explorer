/* ============================================================================
   Static controls — search box, ranges, exclusions, sort, page size, resets
   ========================================================================= */

import { state } from "./state.js";
import { debounce } from "./utils.js";

export function wireStaticControls(refresh) {
  document.getElementById("searchInput").value = state.q;
  document.getElementById("searchInput").addEventListener("input", debounce((e) => {
    state.q = e.target.value;
    state.page = 1;
    refresh();
  }, 350));

  ["rankMin", "rankMax"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", debounce((e) => {
        const key = id === "rankMin" ? "rankMin" : "rankMax";
        state[key] = e.target.value === "" ? null : parseInt(e.target.value, 10);
        state.page = 1;
        refresh();
      }, 350));
    }
  });

  // Exclusion inputs
  const addExcludePoem = () => {
    const input = document.getElementById("excludePoemInput");
    const val = (input.value || "").trim();
    if (val) {
      state.excludePoems.add(val);
      input.value = "";
      state.page = 1;
      refresh();
    }
  };

  const addExcludeRank = () => {
    const input = document.getElementById("excludeRankInput");
    const val = parseInt((input.value || "").trim(), 10);
    if (!isNaN(val)) {
      state.excludeRanks.add(val);
      input.value = "";
      state.page = 1;
      refresh();
    }
  };

  const poemBtn = document.getElementById("addExcludePoemBtn");
  if (poemBtn) poemBtn.addEventListener("click", addExcludePoem);
  const poemInput = document.getElementById("excludePoemInput");
  if (poemInput) poemInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addExcludePoem(); });

  const rankBtn = document.getElementById("addExcludeRankBtn");
  if (rankBtn) rankBtn.addEventListener("click", addExcludeRank);
  const rankInput = document.getElementById("excludeRankInput");
  if (rankInput) rankInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addExcludeRank(); });

  ["poemBatchesMin", "poemBatchesMax", "poemVersesMin", "poemVersesMax"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", debounce((e) => {
        state[id] = e.target.value === "" ? null : parseInt(e.target.value, 10);

        const presetsContainer = document.getElementById("poemLengthPresets");
        if (presetsContainer) {
          presetsContainer.querySelectorAll(".length-pill").forEach(b => b.classList.remove("active"));
        }
        state.page = 1;
        refresh();
      }, 350));
    }
  });

  const fbo = document.getElementById("firstBatchOnly");
  if (fbo) {
    fbo.checked = state.firstBatchOnly;
    fbo.addEventListener("change", (e) => {
      state.firstBatchOnly = e.target.checked;
      state.page = 1;
      refresh();
    });
  }

  document.getElementById("sortBy").value = state.sortBy;
  document.getElementById("sortBy").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    refresh();
  });

  document.getElementById("sortDir").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    btn.dataset.dir = state.sortDir;
    btn.textContent = state.sortDir === "asc" ? "↑" : "↓";
    refresh();
  });

  document.getElementById("pageSize").value = String(state.pageSize);
  document.getElementById("pageSize").addEventListener("change", (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.page = 1;
    refresh();
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    window.location.href = window.location.pathname;
  });

  document.querySelectorAll("[data-clear='poet']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.poets.clear();
      document.querySelectorAll("#poetList input[type=checkbox]").forEach(cb => cb.checked = false);
      state.page = 1;
      refresh();
    });
  });

  document.querySelectorAll("[data-clear='exclusions']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.excludePoems.clear();
      state.excludeRanks.clear();
      document.getElementById("excludePoemInput").value = "";
      document.getElementById("excludeRankInput").value = "";
      state.page = 1;
      refresh();
    });
  });

  document.querySelectorAll("[data-clear='poemLength']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.poemBatchesMin = null;
      state.poemBatchesMax = null;
      state.poemVersesMin = null;
      state.poemVersesMax = null;

      document.getElementById("poemBatchesMin").value = "";
      document.getElementById("poemBatchesMax").value = "";
      document.getElementById("poemVersesMin").value = "";
      document.getElementById("poemVersesMax").value = "";

      const container = document.getElementById("poemLengthPresets");
      if (container) {
        container.querySelectorAll(".length-pill").forEach(b => b.classList.remove("active"));
      }
      state.page = 1;
      refresh();
    });
  });

  document.querySelectorAll("[data-clear='century']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.centuryHijri.clear();
      state.centuryGregorian.clear();
      document.querySelectorAll("#hijriCenturyList .meter-pill, #gregorianCenturyList .meter-pill")
        .forEach(b => b.classList.remove("active"));
      state.page = 1;
      refresh();
    });
  });

  // Mobile sidebar
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const openSidebar = () => { sidebar.classList.remove("hidden"); overlay.classList.remove("hidden"); };
  const closeSidebar = () => { sidebar.classList.add("hidden"); overlay.classList.add("hidden"); };
  document.getElementById("sidebarToggle").addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
}