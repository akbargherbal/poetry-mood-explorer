/* ============================================================================
   Rendering: stats panel
   ========================================================================= */

import { escapeHtml } from "./utils.js";

export function renderStats(stats) {
  const panel = document.getElementById("statsPanel");

  const topPoets = (stats.top_poets || [])
    .map(p => `
      <div class="stat-row">
        <span class="truncate text-parchment-muted">${escapeHtml(p.poet)}</span>
        <div class="stat-track"><div class="stat-fill" style="width:${(p.count / stats.matching_batches) * 100}%"></div></div>
        <span class="font-mono text-parchment-dim text-right">${p.count}</span>
      </div>`).join("");

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-parchment-dim"><span class="text-gold-bright font-mono">${stats.matching_batches.toLocaleString()}</span> matching batches</span>
    </div>
    ${topPoets ? `
      <div class="text-[10px] uppercase tracking-wide mb-1.5 text-parchment-dim">Top poets</div>
      ${topPoets}
    ` : ""}
  `;
}
