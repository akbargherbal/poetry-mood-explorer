/* ============================================================================
   State — shared mutable filter/pagination state
   ========================================================================= */

export const state = {
  q: "",
  poets: new Set(),
  meters: new Set(),
  excludePoems: new Set(),
  excludeRanks: new Set(),
  rankMin: null, rankMax: null,
  poemBatchesMin: null, poemBatchesMax: null,
  poemVersesMin: null, poemVersesMax: null,
  firstBatchOnly: false,
  axis: {
    mood: { tags: new Set(), mode: "any", confidence: "", confidenceMin: null, confidenceMax: null },
    genre: { tags: new Set(), mode: "any", confidence: "", confidenceMin: null, confidenceMax: null },
    energy: { tags: new Set(), mode: "any", confidence: "", confidenceMin: null, confidenceMax: null },
    aesthetic: { tags: new Set(), mode: "any", confidence: "", confidenceMin: null, confidenceMax: null },
  },
  sortBy: "row_id",
  sortDir: "asc",
  page: 1,
  pageSize: 20,
};

// Card row_ids currently expanded to show all verses (rather than the 4-line preview)
export const expandedCards = new Set();