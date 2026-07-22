# Graph Report - .  (2026-07-22)

## Corpus Check
- 5 files · ~12,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 201 nodes · 281 edges · 20 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Data Loader Unit Tests
- Frontend UI Logic & Helpers
- Backend Data Processing Module
- Flask API Routes & Server
- Data Loader Integration Tests
- API Route Integration Tests
- Project Documentation & Architecture
- Frontend Dependencies & Scripts
- Data Batch & Stats Unit Tests

## God Nodes (most connected - your core abstractions)
1. `params()` - 38 edges
2. `TestQueryFilters` - 17 edges
3. `refresh()` - 13 edges
4. `_apply_filters()` - 9 edges
5. `TestDatasetInvariants` - 7 edges
6. `TestQueryPagination` - 7 edges
7. `buildAxisBlocks()` - 6 edges
8. `TestTagMask` - 6 edges
9. `pandas` - 5 edges
10. `Filter System` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Testing Strategy` --references--> `Index HTML Template`  [EXTRACTED]
  docs/TESTING_STRATEGY.md → templates/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Filter Axes System** — mood_axis, genre_axis, energy_axis, aesthetic_axis, filter_system [INFERRED 0.80]

## Communities (20 total, 0 thin omitted)

### Community 0 - "Data Loader Unit Tests"
Cohesion: 0.08
Nodes (9): params(), Logic tests for data_loader.py, run against `synthetic_df` (see conftest.py).  P, Build a MultiDict the way Flask's request.args would look, from     kwargs where, TestQueryConfidenceRanges, TestQueryExclusions, TestQueryFilters, TestQueryPagination, TestQueryPoemLevel (+1 more)

### Community 1 - "Frontend UI Logic & Helpers"
Cohesion: 0.16
Nodes (26): Poetry Mood Explorer UI Layout, Testing Strategy, AXES, AXIS_META, buildAxisBlocks(), buildMeterList(), buildParams(), buildPoemLengthPresets() (+18 more)

### Community 2 - "Backend Data Processing Module"
Cohesion: 0.14
Nodes (20): _apply_filters(), _float(), get_batch(), get_meta(), get_stats(), _getlist(), _int(), _poem_length_meta() (+12 more)

### Community 3 - "Flask API Routes & Server"
Cohesion: 0.12
Nodes (9): Arabic Poetry Mood Explorer ---------------------------- A small Flask app for b, Flask, pandas, _build_synthetic_df(), _flag_axes(), Shared fixtures for the backend test suite.  Two fixtures, matching docs/TESTING, Small, hand-built frame for isolated logic tests. See module docstring     and t, Small helper mirroring how flagged_axes would be derived: any axis     marked lo (+1 more)

### Community 4 - "Data Loader Integration Tests"
Cohesion: 0.11
Nodes (5): Integration sanity tests for data_loader.py against the real dataset.  Per docs/, TestDatasetInvariants, TestGetBatchOnRealData, TestGetMetaSanity, TestQuerySanityOnRealData

### Community 5 - "API Route Integration Tests"
Cohesion: 0.12
Nodes (6): Flask route tests, per docs/TESTING_STRATEGY.md §2.4 ("app.py"). Uses the sessio, TestBatchRoute, TestIndexRoute, TestMetaRoute, TestSearchRoute, TestStatsRoute

### Community 6 - "Project Documentation & Architecture"
Cohesion: 0.26
Nodes (13): Aesthetic Axis, akbargherbal/arabic-poetry-mood-labeling, Arabic Poetry Mood Explorer, Energy Axis, Filter System, Genre Axis, Meter (bahr), Mood Axis (+5 more)

### Community 7 - "Frontend Dependencies & Scripts"
Cohesion: 0.14
Nodes (13): devDependencies, jsdom, @playwright/test, vitest, name, private, scripts, test:e2e (+5 more)

### Community 8 - "Data Batch & Stats Unit Tests"
Cohesion: 0.12
Nodes (3): TestGetBatch, TestGetStats, TestTagMask

## Knowledge Gaps
- **17 isolated node(s):** `Arabic Poetry Mood Explorer`, `Pagination`, `Stats Panel`, `name`, `private` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `params()` connect `Data Loader Unit Tests` to `Data Batch & Stats Unit Tests`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `pandas` connect `Flask API Routes & Server` to `Data Loader Unit Tests`, `Backend Data Processing Module`, `Data Loader Integration Tests`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `Arabic Poetry Mood Explorer`, `Pagination`, `Stats Panel` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Loader Unit Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.0797979797979798 - nodes in this community are weakly interconnected._
- **Should `Backend Data Processing Module` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Flask API Routes & Server` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `Data Loader Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._