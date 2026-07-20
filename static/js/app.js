/* ============================================================================
   Arabic Poetry Mood Explorer — frontend logic (vanilla JS, no build step)
   ========================================================================= */

const AXES = ["mood", "genre", "energy", "aesthetic"];

const AXIS_META = {
  mood:      { label: "Mood — المزاج",       accent: "#D9AE45" },
  genre:     { label: "Genre — الغرض",       accent: "#57998D" },
  energy:    { label: "Energy — الطاقة",      accent: "#C9642E" },
  aesthetic: { label: "Aesthetic — الجمالية", accent: "#9C7FBF" },
};

// Fixed, hand-picked colors per tag so the same mood/genre always reads the
// same color everywhere in the UI (chips, card stripes, stats bars).
const TAG_COLORS = {
  mood: {
    "فرح": "#D9AE45", "حزن": "#6E86A8", "غضب": "#B84A3E", "تشاؤم": "#7A6E8C",
    "تفاؤل وأمل": "#9BAA4E", "حنين وشوق": "#57998D", "وحدة": "#4E5A6E",
    "شكوى": "#A8703D", "عتاب": "#B06B8F", "تأمل": "#6E8C86",
  },
  genre: {
    "غزل": "#B06B8F", "خمريات": "#8C3A3A", "رثاء": "#5A5A6E", "مدح": "#D9AE45",
    "هجاء": "#B84A3E", "فخر": "#C98A2E", "حكمة": "#4E8C82", "زهد": "#7A8C4E",
    "وصف": "#6E86A8", "حماسة": "#C9642E",
  },
  energy: {
    "هادئ جدا": "#2E5A54", "هادئ": "#4E8C82", "متوسط": "#9C8F5A",
    "نشيط": "#C98A2E", "شديد الحماس": "#C9642E",
  },
  aesthetic: {
    "تراثي أصيل": "#B8912F", "ملحمي أوركسترالي": "#8C3A3A", "صوفي روحاني": "#7A6E9C",
    "عسكري حماسي": "#C9642E", "رومانسي عاطفي": "#B06B8F", "حزين كئيب": "#5A5A6E",
    "احتفالي شعبي": "#9BAA4E",
  },
};

function tagColor(axis, tag) {
  return (TAG_COLORS[axis] && TAG_COLORS[axis][tag]) || AXIS_META[axis].accent;
}

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------
const state = {
  q: "",
  poets: new Set(),
  meters: new Set(),
  rankMin: null, rankMax: null,
  poemBatchesMin: null, poemBatchesMax: null,
  poemVersesMin: null, poemVersesMax: null,
  firstBatchOnly: false,
  axis: {
    mood: { tags: new Set(), mode: "any", confidence: "" },
    genre: { tags: new Set(), mode: "any", confidence: "" },
    energy: { tags: new Set(), mode: "any", confidence: "" },
    aesthetic: { tags: new Set(), mode: "any", confidence: "" },
  },
  sortBy: "row_id",
  sortDir: "asc",
  page: 1,
  pageSize: 20,
};

let META = null;
let expandedCards = new Set();

// --------------------------------------------------------------------------
// Init
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  META = await fetchJSON("/api/meta");
  loadStateFromURL();
  buildPoetList(META.poets);
  buildMeterList(META.meters);
  buildAxisBlocks(META);
  buildPoemLengthPresets(META.poem_length);
  wireStaticControls();
  refresh();
});

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

// --------------------------------------------------------------------------
// Sidebar construction
// --------------------------------------------------------------------------
function buildPoetList(poets) {
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

function buildMeterList(meters) {
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

function buildAxisBlocks(meta) {
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

    container.appendChild(node);
  });
}

function buildPoemLengthPresets(poemLengthMeta) {
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
        
        // Clear verses manual settings since we activated a batches preset
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

function wireStaticControls() {
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

  ["poemBatchesMin", "poemBatchesMax", "poemVersesMin", "poemVersesMax"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", debounce((e) => {
        state[id] = e.target.value === "" ? null : parseInt(e.target.value, 10);
        
        // Deactivate active preset chips since the user edited manually
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
    // Standard full clear: reload page with clean parameters
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

  // mobile sidebar
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const openSidebar = () => { sidebar.classList.remove("hidden"); overlay.classList.remove("hidden"); };
  const closeSidebar = () => { sidebar.classList.add("hidden"); overlay.classList.add("hidden"); };
  document.getElementById("sidebarToggle").addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
}

// --------------------------------------------------------------------------
// Query building + fetch + URL Sync
// --------------------------------------------------------------------------
function buildParams(includePagination) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  state.poets.forEach(v => p.append("poet", v));
  state.meters.forEach(v => p.append("meter", v));
  if (state.rankMin != null) p.set("rank_min", state.rankMin);
  if (state.rankMax != null) p.set("rank_max", state.rankMax);
  
  if (state.poemBatchesMin != null) p.set("poem_batches_min", state.poemBatchesMin);
  if (state.poemBatchesMax != null) p.set("poem_batches_max", state.poemBatchesMax);
  if (state.poemVersesMin != null) p.set("poem_verses_min", state.poemVersesMin);
  if (state.poemVersesMax != null) p.set("poem_verses_max", state.poemVersesMax);
  if (state.firstBatchOnly) p.set("first_batch_only", "1");

  AXES.forEach(axis => {
    state.axis[axis].tags.forEach(t => p.append(`${axis}_tags`, t));
    if (state.axis[axis].tags.size > 0) {
      p.set(`${axis}_mode`, state.axis[axis].mode);
    }
    if (state.axis[axis].confidence !== "") p.set(`${axis}_low_confidence`, state.axis[axis].confidence);
  });

  if (includePagination) {
    p.set("sort_by", state.sortBy);
    p.set("sort_dir", state.sortDir);
    p.set("page", state.page);
    p.set("page_size", state.pageSize);
  }
  return p;
}

function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has("q")) state.q = params.get("q");
  
  params.getAll("poet").forEach(p => state.poets.add(p));
  params.getAll("meter").forEach(m => state.meters.add(m));
  
  if (params.has("rank_min")) state.rankMin = parseInt(params.get("rank_min"), 10);
  if (params.has("rank_max")) state.rankMax = parseInt(params.get("rank_max"), 10);
  
  if (params.has("poem_batches_min")) state.poemBatchesMin = parseInt(params.get("poem_batches_min"), 10);
  if (params.has("poem_batches_max")) state.poemBatchesMax = parseInt(params.get("poem_batches_max"), 10);
  if (params.has("poem_verses_min")) state.poemVersesMin = parseInt(params.get("poem_verses_min"), 10);
  if (params.has("poem_verses_max")) state.poemVersesMax = parseInt(params.get("poem_verses_max"), 10);
  if (params.has("first_batch_only")) state.firstBatchOnly = params.get("first_batch_only") === "1";

  AXES.forEach(axis => {
    params.getAll(`${axis}_tags`).forEach(t => state.axis[axis].tags.add(t));
    if (params.has(`${axis}_mode`)) state.axis[axis].mode = params.get(`${axis}_mode`);
    if (params.has(`${axis}_low_confidence`)) state.axis[axis].confidence = params.get(`${axis}_low_confidence`);
  });

  if (params.has("sort_by")) state.sortBy = params.get("sort_by");
  if (params.has("sort_dir")) state.sortDir = params.get("sort_dir");
  if (params.has("page")) state.page = parseInt(params.get("page"), 10);
  if (params.has("page_size")) state.pageSize = parseInt(params.get("page_size"), 10);

  // Prefill sidebar fields on boot if state dictates
  if (state.rankMin != null) document.getElementById("rankMin").value = state.rankMin;
  if (state.rankMax != null) document.getElementById("rankMax").value = state.rankMax;
  if (state.poemBatchesMin != null) document.getElementById("poemBatchesMin").value = state.poemBatchesMin;
  if (state.poemBatchesMax != null) document.getElementById("poemBatchesMax").value = state.poemBatchesMax;
  if (state.poemVersesMin != null) document.getElementById("poemVersesMin").value = state.poemVersesMin;
  if (state.poemVersesMax != null) document.getElementById("poemVersesMax").value = state.poemVersesMax;
}

async function refresh() {
  const searchParams = buildParams(true);
  const statsParams = buildParams(false);

  // Sync state to URL address bar
  const urlSearch = searchParams.toString();
  const newURL = window.location.pathname + (urlSearch ? "?" + urlSearch : "");
  window.history.replaceState(null, "", newURL);

  document.getElementById("resultSummary").textContent = "Loading…";

  const [searchData, statsData] = await Promise.all([
    fetchJSON(`/api/search?${searchParams.toString()}`),
    fetchJSON(`/api/stats?${statsParams.toString()}`),
  ]);

  renderResults(searchData);
  renderStats(statsData);
  renderActiveFilters();

  document.getElementById("headerCount").textContent = searchData.total.toLocaleString();
  document.getElementById("headerTotal").textContent = META.total_batches.toLocaleString();
}

// --------------------------------------------------------------------------
// Rendering: results
// --------------------------------------------------------------------------
function renderResults(data) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  document.getElementById("resultSummary").textContent =
    data.total === 0
      ? "No batches match these filters"
      : `Showing ${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total.toLocaleString()} batches`;

  data.results.forEach(batch => container.appendChild(renderCard(batch)));
  renderPagination(data);
}

function renderCard(batch) {
  const card = document.createElement("article");
  card.className = "batch-card";
  const dominant = batch.mood.tags[0] ? tagColor("mood", batch.mood.tags[0]) : "#B8912F";
  card.style.setProperty("--dominant-color", dominant);

  const expanded = expandedCards.has(batch.row_id);
  const visibleVerses = expanded ? batch.verses : batch.verses.slice(0, 4);
  const hasMore = batch.verses.length > 4;

  const versesHtml = visibleVerses.map(v => `
    <div class="verse-line"><span class="sadr">${escapeHtml(v.sadr)}</span><span class="ajuz">${escapeHtml(v.ajuz)}</span></div>
  `).join("");

  const axisFooter = AXES.map(axis => {
    const a = batch[axis];
    const chips = a.tags.map(t => `<span class="axis-tag" style="background:${tagColor(axis, t)}22; color:${tagColor(axis, t)}; border:1px solid ${tagColor(axis, t)}55;">${escapeHtml(t)}</span>`).join(" ");
    const pct = Math.max(0, Math.min(100, Math.round(a.confidence * 100)));
    return `
      <div class="flex-1 min-w-[150px]">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] uppercase tracking-wide" style="color:${AXIS_META[axis].accent}">${axis}</span>
          <span class="text-[10px] font-mono text-parchment-dim">${pct}%${a.low_confidence ? " ⚠" : ""}</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-1.5">${chips}</div>
        <div class="conf-bar-track"><div class="conf-bar-fill" style="width:${pct}%; background:${AXIS_META[axis].accent}"></div></div>
      </div>`;
  }).join("");

  // Render readable batch index and poem length scales
  const batchDisplay = `batch ${batch.batch_no + 1} of ${batch.poem_num_batches}`;
  const totalVersesDisplay = `${batch.poem_total_verses} verses total`;

  card.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pr-2">
      <div class="flex items-center gap-2 flex-wrap">
        <button class="poet-link text-gold-bright font-semibold hover:underline text-sm">${escapeHtml(batch.poet_name)}</button>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">rank #${batch.poet_rank}</span>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">${escapeHtml(batch.meter)}</span>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">${batch.batch_size} verses in batch</span>
        <span class="poem-progress" title="Scale of the whole poem">
          <span class="text-gold-bright font-semibold">${batchDisplay}</span>
          <span class="text-parchment-dim">· ${totalVersesDisplay}</span>
        </span>
      </div>
      <span class="text-[10px] font-mono text-parchment-dim">poem #${escapeHtml(batch.poem_no)}</span>
    </div>

    <div class="space-y-0.5 mb-3 pr-2">${versesHtml}</div>
    ${hasMore ? `<button class="expand-btn text-xs text-teal-bright hover:underline mb-3">${expanded ? "Show fewer verses ▲" : `Show all ${batch.verses.length} verses ▼`}</button>` : ""}

    <div class="flex flex-wrap gap-4 pt-3 border-t border-ink-border pr-2">${axisFooter}</div>
  `;

  card.querySelector(".poet-link").addEventListener("click", () => {
    state.poets.clear();
    state.poets.add(batch.poet_name);
    document.querySelectorAll("#poetList input[type=checkbox]").forEach(cb => {
      cb.checked = cb.value === batch.poet_name;
    });
    state.page = 1;
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const expandBtn = card.querySelector(".expand-btn");
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      if (expandedCards.has(batch.row_id)) expandedCards.delete(batch.row_id);
      else expandedCards.add(batch.row_id);
      const newCard = renderCard(batch);
      card.replaceWith(newCard);
    });
  }

  return card;
}

function renderPagination(data) {
  const container = document.getElementById("pagination");
  container.innerHTML = "";
  if (data.total_pages <= 1) return;

  const mkBtn = (label, page, disabled, current) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.disabled = disabled;
    btn.className = `px-3 py-1.5 rounded-md border text-xs font-mono ${
      current ? "border-gold text-gold-bright" : "border-ink-border text-parchment-muted hover:border-gold"
    } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`;
    btn.addEventListener("click", () => { state.page = page; refresh(); window.scrollTo({top:0, behavior:"smooth"}); });
    return btn;
  };

  container.appendChild(mkBtn("← Prev", data.page - 1, data.page <= 1, false));

  const windowSize = 2;
  for (let p = Math.max(1, data.page - windowSize); p <= Math.min(data.total_pages, data.page + windowSize); p++) {
    container.appendChild(mkBtn(String(p), p, false, p === data.page));
  }

  container.appendChild(mkBtn("Next →", data.page + 1, data.page >= data.total_pages, false));
}

// --------------------------------------------------------------------------
// Rendering: stats panel
// --------------------------------------------------------------------------
function renderStats(stats) {
  const panel = document.getElementById("statsPanel");

  const barSection = (title, axis, items) => {
    const max = items.reduce((m, i) => Math.max(m, i.count), 1);
    const rows = items.slice(0, 6).map(i => `
      <div class="stat-row">
        <span class="truncate text-parchment-muted">${escapeHtml(i.tag)}</span>
        <div class="stat-track"><div class="stat-fill" style="width:${(i.count / max) * 100}%; background:${tagColor(axis, i.tag)}"></div></div>
        <span class="font-mono text-parchment-dim text-right">${i.count}</span>
      </div>`).join("");
    return `<div><div class="text-[10px] uppercase tracking-wide mb-1.5" style="color:${AXIS_META[axis].accent}">${title}</div>${rows}</div>`;
  };

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-parchment-dim">Distribution across <span class="text-gold-bright font-mono">${stats.matching_batches.toLocaleString()}</span> matching batches</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${barSection("Mood — المزاج", "mood", stats.mood_tags)}
      ${barSection("Genre — الغرض", "genre", stats.genre_tags)}
      ${barSection("Energy — الطاقة", "energy", stats.energy_tags)}
      ${barSection("Aesthetic — الجمالية", "aesthetic", stats.aesthetic_tags)}
    </div>
  `;
}

// --------------------------------------------------------------------------
// Rendering: Active Filters Bar
// --------------------------------------------------------------------------
function renderActiveFilters() {
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

  // 3. Meter (بحر) Filters
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

  // 4. Poet Rank range
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

  // 5. Poem Length (Batches) Range
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

  // 6. Poem Length (Verses) Range
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

  // 7. Browsing Mode (First batch only / One card per poem)
  if (state.firstBatchOnly) {
    addChip("Browsing", "One card per poem", () => {
      state.firstBatchOnly = false;
      const fbo = document.getElementById("firstBatchOnly");
      if (fbo) fbo.checked = false;
      state.page = 1;
      refresh();
    });
  }

  // 8. Categorical axis tags
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
  });

  // Hide container if there are no filters
  if (activeChips.length === 0) {
    container.classList.add("hidden");
    container.classList.remove("flex");
    return;
  }

  container.classList.remove("hidden");
  container.classList.add("flex");

  // Prefix title
  const title = document.createElement("span");
  title.className = "text-xs text-parchment-dim mr-1.5 font-semibold self-center";
  title.textContent = "Active filters:";
  container.appendChild(title);

  // Generate tags
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

  // Reset all button
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

// --------------------------------------------------------------------------
// Utils
// --------------------------------------------------------------------------
function toggleSetValue(set, value, on) {
  if (on) set.add(value); else set.delete(value);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}