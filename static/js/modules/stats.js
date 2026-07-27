/* ============================================================================
   Rendering: stats panel
   ========================================================================= */

import { AXIS_META, tagColor } from "./constants.js";
import { escapeHtml } from "./utils.js";

export function renderStats(stats) {
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