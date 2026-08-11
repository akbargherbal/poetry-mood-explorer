/* ============================================================================
   Sidebar construction — poet list, meter pills, length presets, era lists
   ========================================================================= */

import { state } from "./state.js";
import { toggleSetValue, debounce, escapeHtml } from "./utils.js";

export function buildPoetList(poets, refresh) {
  const container = document.getElementById("poetList");
  const render = (filterText) => {
    container.innerHTML = "";
    const needle = (filterText || "").trim();
    poets
      .filter(p => !needle || p.POET_NAME.includes(needle))
      .forEach(p => {
        const row = document.createElement("label");
        row.className = "check-row";
        const isChecked = state.poets.has(p.POET_NAME);
        row.innerHTML = `
          <input type="checkbox" value="${escapeHtml(p.POET_NAME)}" ${isChecked ? "checked" : ""}>
          <span>${escapeHtml(p.POET_NAME)}</span>
          <span class="count">#${p.POET_RANK}</span>`;
        row.querySelector("input").addEventListener("change", (e) => {
          toggleSetValue(state.poets, p.POET_NAME, e.target.checked);
          state.page = 1;
          refresh();
        });
        container.appendChild(row);
      });
  };
  render("");
  document.getElementById("poetSearch").addEventListener("input", (e) => render(e.target.value));
}

export function buildMeterList(meters, refresh) {
  const container = document.getElementById("meterList");
  container.innerHTML = "";
  meters.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "meter-pill";
    btn.textContent = m;
    if (state.meters.has(m)) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("active");
      toggleSetValue(state.meters, m, active);
      state.page = 1;
      refresh();
    });
    container.appendChild(btn);
  });
}

export function buildEraLists(centuryOptions, refresh) {
  if (!centuryOptions) return;

  const buildOne = (containerId, centuries, stateSet, suffix) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    (centuries || []).forEach(c => {
      const btn = document.createElement("button");
      btn.className = "meter-pill";
      btn.textContent = `${c}${suffix}`;
      if (stateSet.has(c)) btn.classList.add("active");
      btn.addEventListener("click", () => {
        const active = btn.classList.toggle("active");
        toggleSetValue(stateSet, c, active);
        state.page = 1;
        refresh();
      });
      container.appendChild(btn);
    });
  };

  buildOne("hijriCenturyList", centuryOptions.hijri, state.centuryHijri, " هـ");
  buildOne("gregorianCenturyList", centuryOptions.gregorian, state.centuryGregorian, "م");
}

export function buildPoemLengthPresets(poemLengthMeta, refresh) {
  const container = document.getElementById("poemLengthPresets");
  if (!container) return;
  container.innerHTML = "";

  if (!poemLengthMeta || !poemLengthMeta.batches || !poemLengthMeta.batches.presets) return;

  poemLengthMeta.batches.presets.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "length-pill";
    btn.innerHTML = `${p.label} <span class="range">${p.min}-${p.max}</span>`;

    if (state.poemBatchesMin === p.min && state.poemBatchesMax === p.max) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      container.querySelectorAll(".length-pill").forEach(b => b.classList.remove("active"));

      if (wasActive) {
        state.poemBatchesMin = null;
        state.poemBatchesMax = null;
        document.getElementById("poemBatchesMin").value = "";
        document.getElementById("poemBatchesMax").value = "";
      } else {
        btn.classList.add("active");
        state.poemBatchesMin = p.min;
        state.poemBatchesMax = p.max;
        document.getElementById("poemBatchesMin").value = p.min;
        document.getElementById("poemBatchesMax").value = p.max;

        state.poemVersesMin = null;
        state.poemVersesMax = null;
        document.getElementById("poemVersesMin").value = "";
        document.getElementById("poemVersesMax").value = "";
      }
      state.page = 1;
      refresh();
    });

    container.appendChild(btn);
  });
}