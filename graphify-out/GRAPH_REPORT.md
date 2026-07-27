# Graph Report - .  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 234 nodes · 357 edges · 33 communities (15 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 1,122 input · 1,131 output

## Graph Freshness
- Built from commit: `175591e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Data Loader Unit Tests
- Frontend Utility Functions
- Backend API & Data Loader
- Data Loader Integration Tests
- Flask Route Tests
- Project Dependencies & Scripts
- Arabic Poetry Mood Explorer
- Test Fixtures & Shared Setup
- Batch Sharing Functions
- Tag Mask Tests
- Frontend Assets & Templates
- Get Batch Tests
- External Datasets
- Testing Strategy Documentation
- Backend Testing (pytest)
- Poet Era Comparison
- Continuous Poem Reading
- Export Anthology Feature
- Faceted Search UI
- Frontend Testing Suite
- Load-at-Import Issue
- Frontend Export Issue
- Personal Collections Feature
- Poet Profile Pages
- Shareable Permalinks
- Mood Discovery Feature
- Placeholder README
- Product Ideation Document

## God Nodes (most connected - your core abstractions)
1. `params()` - 38 edges
2. `TestQueryFilters` - 17 edges
3. `tagColor()` - 11 edges
4. `escapeHtml()` - 11 edges
5. `Arabic Poetry Mood Explorer` - 11 edges
6. `_apply_filters()` - 9 edges
7. `AXES` - 9 edges
8. `state` - 8 edges
9. `toggleSetValue()` - 7 edges
10. `debounce()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `api_search()` --calls--> `query()`  [EXTRACTED]
  app.py → data_loader.py
- `api_meta()` --calls--> `get_meta()`  [EXTRACTED]
  app.py → data_loader.py
- `api_stats()` --calls--> `get_stats()`  [EXTRACTED]
  app.py → data_loader.py
- `api_batch()` --calls--> `get_batch()`  [EXTRACTED]
  app.py → data_loader.py
- `Flask` --references--> `Flask`  [EXTRACTED]
  requirements.txt → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Backend Stack** — readme_md_flask, readme_md_pandas, readme_md_app_py, readme_md_data_loader_py [EXTRACTED 1.00]
- **Testing Frameworks** — readme_md_pytest, readme_md_vitest, readme_md_playwright [EXTRACTED 1.00]
- **Product Ideas for Poetry Mood Explorer** — concept_suno_tags, concept_continuous_reading, concept_shareable_permalinks, concept_personal_collections, concept_poet_profiles, concept_surprise_me, concept_comparison_view, concept_export_anthology [EXTRACTED 1.00]
- **Testing Strategy Components** — concept_backend_testing, concept_frontend_testing, concept_load_at_import_problem, concept_no_exports_problem [EXTRACTED 1.00]

## Communities (33 total, 18 thin omitted)

### Community 0 - "Data Loader Unit Tests"
Cohesion: 0.07
Nodes (10): params(), Logic tests for data_loader.py, run against `synthetic_df` (see conftest.py).  P, Build a MultiDict the way Flask's request.args would look, from     kwargs where, TestGetStats, TestQueryConfidenceRanges, TestQueryExclusions, TestQueryFilters, TestQueryPagination (+2 more)

### Community 1 - "Frontend Utility Functions"
Cohesion: 0.16
Nodes (23): refresh(), fetchJSON(), renderCard(), renderPagination(), renderResults(), AXES, AXIS_META, TAG_COLORS (+15 more)

### Community 2 - "Backend API & Data Loader"
Cohesion: 0.11
Nodes (25): api_batch(), api_meta(), api_search(), api_stats(), Arabic Poetry Mood Explorer ---------------------------- A small Flask app for b, _apply_filters(), _float(), get_batch() (+17 more)

### Community 3 - "Data Loader Integration Tests"
Cohesion: 0.11
Nodes (5): Integration sanity tests for data_loader.py against the real dataset.  Per docs/, TestDatasetInvariants, TestGetBatchOnRealData, TestGetMetaSanity, TestQuerySanityOnRealData

### Community 4 - "Flask Route Tests"
Cohesion: 0.12
Nodes (6): Flask route tests, per docs/TESTING_STRATEGY.md §2.4 ("app.py"). Uses the sessio, TestBatchRoute, TestIndexRoute, TestMetaRoute, TestSearchRoute, TestStatsRoute

### Community 5 - "Project Dependencies & Scripts"
Cohesion: 0.14
Nodes (13): devDependencies, jsdom, @playwright/test, vitest, name, private, scripts, test:e2e (+5 more)

### Community 6 - "Arabic Poetry Mood Explorer"
Cohesion: 0.18
Nodes (14): app.py, Arabic Poetry Mood Explorer, arabic-poetry-mood-labeling Repository, data_loader.py, Flask, pandas, Playwright, pytest (+6 more)

### Community 7 - "Test Fixtures & Shared Setup"
Cohesion: 0.32
Nodes (6): _build_synthetic_df(), _flag_axes(), Shared fixtures for the backend test suite.  Two fixtures, matching docs/TESTING, Small, hand-built frame for isolated logic tests. See module docstring     and t, Small helper mirroring how flagged_axes would be derived: any axis     marked lo, synthetic_df()

### Community 8 - "Batch Sharing Functions"
Cohesion: 0.43
Nodes (5): buildBatchVersesText(), copyBatchVerses(), flashCopyFeedback(), openSharedBatchFromURL(), showSharedBatchModal()

### Community 10 - "Frontend Assets & Templates"
Cohesion: 0.40
Nodes (4): Google Fonts Amiri, Google Fonts Inter, Google Fonts JetBrains Mono, Tailwind CSS

## Knowledge Gaps
- **38 isolated node(s):** `name`, `private`, `type`, `test:unit`, `test:e2e` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `private`, `type` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Loader Unit Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Backend API & Data Loader` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Data Loader Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Flask Route Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies & Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._