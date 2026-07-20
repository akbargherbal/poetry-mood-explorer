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
  batchMin: null, batchMax: null,
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
  buildPoetList(META.poets);
  buildMeterList(META.meters);
  buildAxisBlocks(META);
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
        row.innerHTML = `
          <input type="checkbox" value="${escapeHtml(p.POET_NAME)}">
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
      chip.style.borderColor = tagColor(axis, tag) + "55";
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
      if (btn.dataset.mode === "any") btn.classList.add("active");
      btn.addEventListener("click", () => {
        node.querySelectorAll ? null : null;
        block.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.axis[axis].mode = btn.dataset.mode;
        state.page = 1;
        refresh();
      });
    });

    node.querySelector(".confidence-select").addEventListener("change", (e) => {
      state.axis[axis].confidence = e.target.value;
      state.page = 1;
      refresh();
    });

    container.appendChild(node);
  });
}

function wireStaticControls() {
  document.getElementById("searchInput").addEventListener("input", debounce((e) => {
    state.q = e.target.value;
    state.page = 1;
    refresh();
  }, 350));

  ["rankMin", "rankMax", "batchMin", "batchMax"].forEach(id => {
    document.getElementById(id).addEventListener("input", debounce((e) => {
      const key = id === "rankMin" ? "rankMin" : id === "rankMax" ? "rankMax" : id === "batchMin" ? "batchMin" : "batchMax";
      state[key] = e.target.value === "" ? null : parseInt(e.target.value, 10);
      state.page = 1;
      refresh();
    }, 350));
  });

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

  document.getElementById("pageSize").addEventListener("change", (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.page = 1;
    refresh();
  });

  document.getElementById("resetFilters").addEventListener("click", () => location.reload());

  document.querySelectorAll("[data-clear='poet']").forEach(btn => {
    btn.addEventListener("click", () => {
      state.poets.clear();
      document.querySelectorAll("#poetList input[type=checkbox]").forEach(cb => cb.checked = false);
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
// Query building + fetch
// --------------------------------------------------------------------------
function buildParams(includePagination) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  state.poets.forEach(v => p.append("poet", v));
  state.meters.forEach(v => p.append("meter", v));
  if (state.rankMin != null) p.set("rank_min", state.rankMin);
  if (state.rankMax != null) p.set("rank_max", state.rankMax);
  if (state.batchMin != null) p.set("batch_size_min", state.batchMin);
  if (state.batchMax != null) p.set("batch_size_max", state.batchMax);

  AXES.forEach(axis => {
    state.axis[axis].tags.forEach(t => p.append(`${axis}_tags`, t));
    p.set(`${axis}_mode`, state.axis[axis].mode);
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

async function refresh() {
  const searchParams = buildParams(true);
  const statsParams = buildParams(false);

  document.getElementById("resultSummary").textContent = "Loading…";

  const [searchData, statsData] = await Promise.all([
    fetchJSON(`/api/search?${searchParams.toString()}`),
    fetchJSON(`/api/stats?${statsParams.toString()}`),
  ]);

  renderResults(searchData);
  renderStats(statsData);

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

  card.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pr-2">
      <div class="flex items-center gap-2 flex-wrap">
        <button class="poet-link text-gold-bright font-semibold hover:underline text-sm">${escapeHtml(batch.poet_name)}</button>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">rank #${batch.poet_rank}</span>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">${escapeHtml(batch.meter)}</span>
        <span class="text-[10px] font-mono text-parchment-dim border border-ink-border rounded px-1.5 py-0.5">${batch.batch_size} verses</span>
      </div>
      <span class="text-[10px] font-mono text-parchment-dim">poem ${escapeHtml(batch.poem_no)} · batch ${batch.batch_no}</span>
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
