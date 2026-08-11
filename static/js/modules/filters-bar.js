/* ============================================================================
   Rendering: Active Filters Bar
   ========================================================================= */

import { AXES } from "./constants.js";
import { state } from "./state.js";
import { tagColor } from "./constants.js";
import { escapeHtml } from "./utils.js";

export function renderActiveFilters(refresh) {
  const container = document.getElementById("activeFilters");
  if (!container) return;
  container.innerHTML = "";

  const activeChips = [];

  const addChip = (axis, value, removeCallback) => {
    activeChips.push({ axis, value, removeCallback });
  };

  // 1. Text Search Filter
  if (state.q) {
    addChip("Query", `"${state.q}"`, () => {
      state.q = "";
      document.getElementById("searchInput").value = "";
      state.page = 1;
      refresh();
    });
  }

  // 2. Poet Filters
  state.poets.forEach(poet => {
    addChip("Poet", poet, () => {
      state.poets.delete(poet);
      document.querySelectorAll("#poetList input[type='checkbox']").forEach(cb => {
        if (cb.value === poet) cb.checked = false;
      });
      state.page = 1;
      refresh();
    });
  });

  // 3. Meter Filters
  state.meters.forEach(m => {
    addChip("Meter", m, () => {
      state.meters.delete(m);
      document.querySelectorAll("#meterList .meter-pill").forEach(btn => {
        if (btn.textContent === m) btn.classList.remove("active");
      });
      state.page = 1;
      refresh();
    });
  });

  // 4. Excluded Poem IDs
  state.excludePoems.forEach(p_id => {
    addChip("Exclude Poem", `#${p_id}`, () => {
      state.excludePoems.delete(p_id);
      state.page = 1;
      refresh();
    });
  });

  // 5. Excluded Poet Ranks
  state.excludeRanks.forEach(rank => {
    addChip("Exclude Rank", `#${rank}`, () => {
      state.excludeRanks.delete(rank);
      state.page = 1;
      refresh();
    });
  });

  // 6. Poet Rank range
  if (state.rankMin != null || state.rankMax != null) {
    const label = state.rankMin != null && state.rankMax != null
      ? `#${state.rankMin} – #${state.rankMax}`
      : state.rankMin != null ? `≥ #${state.rankMin}` : `≤ #${state.rankMax}`;
    addChip("Poet Rank", label, () => {
      state.rankMin = null;
      state.rankMax = null;
      document.getElementById("rankMin").value = "";
      document.getElementById("rankMax").value = "";
      state.page = 1;
      refresh();
    });
  }

  // 7. Poem Length (Batches) Range
  if (state.poemBatchesMin != null || state.poemBatchesMax != null) {
    const label = state.poemBatchesMin != null && state.poemBatchesMax != null
      ? `${state.poemBatchesMin} – ${state.poemBatchesMax} batches`
      : state.poemBatchesMin != null ? `≥ ${state.poemBatchesMin} batches` : `≤ ${state.poemBatchesMax} batches`;
    addChip("Poem Batches", label, () => {
      state.poemBatchesMin = null;
      state.poemBatchesMax = null;
      document.getElementById("poemBatchesMin").value = "";
      document.getElementById("poemBatchesMax").value = "";

      const pres = document.getElementById("poemLengthPresets");
      if (pres) pres.querySelectorAll(".length-pill").forEach(b => b.classList.remove("active"));

      state.page = 1;
      refresh();
    });
  }

  // 8. Poem Length (Verses) Range
  if (state.poemVersesMin != null || state.poemVersesMax != null) {
    const label = state.poemVersesMin != null && state.poemVersesMax != null
      ? `${state.poemVersesMin} – ${state.poemVersesMax} verses`
      : state.poemVersesMin != null ? `≥ ${state.poemVersesMin} verses` : `≤ ${state.poemVersesMax} verses`;
    addChip("Poem Verses", label, () => {
      state.poemVersesMin = null;
      state.poemVersesMax = null;
      document.getElementById("poemVersesMin").value = "";
      document.getElementById("poemVersesMax").value = "";
      state.page = 1;
      refresh();
    });
  }

  // 9. Browsing Mode
  if (state.firstBatchOnly) {
    addChip("Browsing", "One card per poem", () => {
      state.firstBatchOnly = false;
      const fbo = document.getElementById("firstBatchOnly");
      if (fbo) fbo.checked = false;
      state.page = 1;
      refresh();
    });
  }

  // 9b. Era / Century filters
  state.centuryHijri.forEach(c => {
    addChip("Hijri century", `${c} هـ`, () => {
      state.centuryHijri.delete(c);
      document.querySelectorAll("#hijriCenturyList .meter-pill").forEach(btn => {
        if (btn.textContent === `${c} هـ`) btn.classList.remove("active");
      });
      state.page = 1;
      refresh();
    });
  });

  state.centuryGregorian.forEach(c => {
    addChip("Gregorian century", `${c}م`, () => {
      state.centuryGregorian.delete(c);
      document.querySelectorAll("#gregorianCenturyList .meter-pill").forEach(btn => {
        if (btn.textContent === `${c}م`) btn.classList.remove("active");
      });
      state.page = 1;
      refresh();
    });
  });

  // 10. Categorical tags & confidence ranges
  AXES.forEach(axis => {
    state.axis[axis].tags.forEach(tag => {
      addChip(axis, tag, () => {
        state.axis[axis].tags.delete(tag);
        document.querySelectorAll(`#axisFilters .tag-chip`).forEach(chip => {
          if (chip.textContent.startsWith(tag)) {
            chip.classList.remove("active");
            chip.style.background = "";
            chip.style.borderColor = tagColor(axis, tag) + "55";
          }
        });
        state.page = 1;
        refresh();
      });
    });

    if (state.axis[axis].confidenceMin != null || state.axis[axis].confidenceMax != null) {
      const cMin = state.axis[axis].confidenceMin != null ? state.axis[axis].confidenceMin : 0;
      const cMax = state.axis[axis].confidenceMax != null ? state.axis[axis].confidenceMax : 1;
      addChip(`${axis} conf`, `${cMin} – ${cMax}`, () => {
        state.axis[axis].confidenceMin = null;
        state.axis[axis].confidenceMax = null;
        state.page = 1;
        refresh();
      });
    }
  });

  if (activeChips.length === 0) {
    container.classList.add("hidden");
    container.classList.remove("flex");
    return;
  }

  container.classList.remove("hidden");
  container.classList.add("flex");

  const title = document.createElement("span");
  title.className = "text-xs text-parchment-dim mr-1.5 font-semibold self-center";
  title.textContent = "Active filters:";
  container.appendChild(title);

  activeChips.forEach(c => {
    const tagNode = document.createElement("div");
    tagNode.className = "filter-chip";
    tagNode.innerHTML = `
      <span class="chip-axis uppercase tracking-wide text-[9px]">${escapeHtml(c.axis)}:</span>
      <span class="text-parchment font-medium">${escapeHtml(c.value)}</span>
      <button class="hover:bg-red-900 transition-colors" title="Remove filter">✕</button>
    `;
    tagNode.querySelector("button").addEventListener("click", c.removeCallback);
    container.appendChild(tagNode);
  });

  if (activeChips.length > 1) {
    const resetBtn = document.createElement("button");
    resetBtn.className = "text-xs text-teal-bright hover:underline hover:text-gold ml-2 underline-offset-2 self-center";
    resetBtn.textContent = "Reset all";
    resetBtn.addEventListener("click", () => {
      window.location.href = window.location.pathname;
    });
    container.appendChild(resetBtn);
  }
}