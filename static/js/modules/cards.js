/* ============================================================================
   Rendering: result cards + pagination
   ========================================================================= */

import { state, expandedCards } from "./state.js";
import { escapeHtml } from "./utils.js";
import { copyBatchVerses } from "./sharing.js";

export function renderResults(data, refresh) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  document.getElementById("resultSummary").textContent =
    data.total === 0
      ? "No batches match these filters"
      : `Showing ${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total.toLocaleString()} batches`;

  data.results.forEach(batch => container.appendChild(renderCard(batch, refresh)));
  renderPagination(data, refresh);
}

export function renderCard(batch, refresh) {
  const card = document.createElement("article");
  card.className = "batch-card";
  card.style.setProperty("--dominant-color", "#B8912F");

  const expanded = expandedCards.has(batch.row_id);
  const visibleVerses = expanded ? batch.verses : batch.verses.slice(0, 4);
  const hasMore = batch.verses.length > 4;

  const versesHtml = visibleVerses.map(v => `
    <div class="verse-line"><span class="sadr">${escapeHtml(v.sadr)}</span><span class="ajuz">${escapeHtml(v.ajuz)}</span></div>
  `).join("");

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
      <div class="flex items-center gap-2">
        <button class="copy-verses-btn text-[10px] font-mono text-parchment-dim hover:text-teal-bright border border-ink-border rounded px-1.5 py-0.5" title="Copy these verses as text">
          📋 Copy verses
        </button>
        <button class="exclude-poem-btn text-[10px] font-mono text-parchment-dim hover:text-red-400 border border-ink-border rounded px-1.5 py-0.5" title="Exclude poem #${escapeHtml(batch.poem_no)}">
          🚫 Exclude poem
        </button>
        <span class="text-[10px] font-mono text-parchment-dim">poem #${escapeHtml(batch.poem_no)}</span>
      </div>
    </div>

    <div class="space-y-0.5 mb-3 pr-2">${versesHtml}</div>
    ${hasMore ? `<button class="expand-btn text-xs text-teal-bright hover:underline mb-3">${expanded ? "Show fewer verses ▲" : `Show all ${batch.verses.length} verses ▼`}</button>` : ""}
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

  const copyBtn = card.querySelector(".copy-verses-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyBatchVerses(batch, copyBtn);
    });
  }

  const exclBtn = card.querySelector(".exclude-poem-btn");
  if (exclBtn) {
    exclBtn.addEventListener("click", () => {
      state.excludePoems.add(String(batch.poem_no));
      state.page = 1;
      refresh();
    });
  }

  const expandBtn = card.querySelector(".expand-btn");
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      if (expandedCards.has(batch.row_id)) expandedCards.delete(batch.row_id);
      else expandedCards.add(batch.row_id);
      const newCard = renderCard(batch, refresh);
      card.replaceWith(newCard);
    });
  }

  return card;
}

function renderPagination(data, refresh) {
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