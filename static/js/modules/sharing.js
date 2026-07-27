/* ============================================================================
   Sharing — copying a batch's verses to the clipboard, and opening a
   shared-batch permalink (?batch=<row_id>) into a modal on page load
   ========================================================================= */

// --------------------------------------------------------------------------
// Copy-to-clipboard: verse text (what people actually want to paste/share)
// --------------------------------------------------------------------------
export function buildBatchVersesText(batch) {
  const lines = batch.verses.map(v => `${v.sadr}    ${v.ajuz}`);
  const attribution = `— ${batch.poet_name} (${batch.meter}), poem #${batch.poem_no}, batch ${batch.batch_no + 1} of ${batch.poem_num_batches}`;
  return `${lines.join("\n")}\n\n${attribution}`;
}

export async function copyBatchVerses(batch, triggerBtn) {
  const text = buildBatchVersesText(batch);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts / older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    flashCopyFeedback(triggerBtn, "✅ Copied!");
  } catch (err) {
    flashCopyFeedback(triggerBtn, "⚠️ Copy failed");
  }
}

function flashCopyFeedback(btn, message) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = message;
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.disabled = false;
  }, 1400);
}

// --------------------------------------------------------------------------
// Shared-batch permalinks: still supported for anyone who lands on a
// ?batch=<row_id> URL (e.g. pasted from the browser address bar)
// --------------------------------------------------------------------------
export function buildBatchLink(rowId) {
  return `${window.location.origin}${window.location.pathname}?batch=${rowId}`;
}

export async function openSharedBatchFromURL(renderCard) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("batch")) return;

  const rowId = parseInt(params.get("batch"), 10);
  if (isNaN(rowId)) return;

  try {
    const res = await fetch(`/api/batch/${rowId}`);
    if (!res.ok) {
      showSharedBatchModal(null, renderCard);
      return;
    }
    const batch = await res.json();
    showSharedBatchModal(batch, renderCard);
  } catch (err) {
    showSharedBatchModal(null, renderCard);
  }
}

function showSharedBatchModal(batch, renderCard) {
  const overlay = document.createElement("div");
  overlay.className = "shared-batch-overlay";

  const panel = document.createElement("div");
  panel.className = "shared-batch-panel";

  const header = document.createElement("div");
  header.className = "shared-batch-header";
  header.innerHTML = `<span>🔗 Shared verse</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "shared-batch-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => overlay.remove());
  header.appendChild(closeBtn);

  panel.appendChild(header);

  if (batch) {
    panel.appendChild(renderCard(batch));
  } else {
    const msg = document.createElement("p");
    msg.className = "shared-batch-missing";
    msg.textContent = "This verse could not be found — it may have been removed from the dataset.";
    panel.appendChild(msg);
  }

  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}