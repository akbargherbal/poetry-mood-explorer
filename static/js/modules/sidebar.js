/* ============================================================================
   Sidebar construction — poet list, meter pills, axis blocks, length presets
   ========================================================================= */

import { AXES, AXIS_META, tagColor } from "./constants.js";
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

export function buildAxisBlocks(meta, refresh) {
  const container = document.getElementById("axisFilters");
  const template = document.getElementById("axisBlockTemplate");
  const tagField = { mood: "mood_tags", genre: "genre_tags", energy: "energy_tags", aesthetic: "aesthetic_tags" };

  AXES.forEach(axis => {
    const node = template.content.cloneNode(true);
    const block = node.querySelector(".axis-block");
    const title = node.querySelector(".axis-title");
    title.textContent = AXIS_META[axis].label;
    title.style.color = AXIS_META[axis].accent;

    const tagContainer = node.querySelector(".tag-options");
    meta[tagField[axis]].forEach(({ tag, count }) => {
      const chip = document.createElement("button");
      chip.className = "tag-chip";
      chip.textContent = `${tag} (${count})`;

      const isActive = state.axis[axis].tags.has(tag);
      chip.style.borderColor = tagColor(axis, tag) + "55";
      if (isActive) {
        chip.classList.add("active");
        chip.style.background = tagColor(axis, tag);
        chip.style.borderColor = tagColor(axis, tag);
      }

      chip.addEventListener("click", () => {
        const active = chip.classList.toggle("active");
        chip.style.background = active ? tagColor(axis, tag) : "";
        chip.style.borderColor = active ? tagColor(axis, tag) : tagColor(axis, tag) + "55";
        toggleSetValue(state.axis[axis].tags, tag, active);
        state.page = 1;
        refresh();
      });
      tagContainer.appendChild(chip);
    });

    node.querySelectorAll(".mode-btn").forEach(btn => {
      const isCurrentMode = state.axis[axis].mode === btn.dataset.mode;
      btn.classList.remove("active");
      if (isCurrentMode) btn.classList.add("active");

      btn.addEventListener("click", () => {
        block.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.axis[axis].mode = btn.dataset.mode;
        state.page = 1;
        refresh();
      });
    });

    const select = node.querySelector(".confidence-select");
    select.value = state.axis[axis].confidence;
    select.addEventListener("change", (e) => {
      state.axis[axis].confidence = e.target.value;
      state.page = 1;
      refresh();
    });

    const confMin = node.querySelector(".conf-min-input");
    const confMax = node.querySelector(".conf-max-input");

    if (state.axis[axis].confidenceMin != null) confMin.value = state.axis[axis].confidenceMin;
    if (state.axis[axis].confidenceMax != null) confMax.value = state.axis[axis].confidenceMax;

    confMin.addEventListener("input", debounce((e) => {
      state.axis[axis].confidenceMin = e.target.value === "" ? null : parseFloat(e.target.value);
      state.page = 1;
      refresh();
    }, 350));

    confMax.addEventListener("input", debounce((e) => {
      state.axis[axis].confidenceMax = e.target.value === "" ? null : parseFloat(e.target.value);
      state.page = 1;
      refresh();
    }, 350));

    container.appendChild(node);
  });
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