/* ============================================================================
   API — thin fetch wrapper
   ========================================================================= */

export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}