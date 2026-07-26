# Graph Report - .  (2026-07-26)

## Corpus Check
- 1 files · ~12,612 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 191 nodes · 260 edges · 21 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 1,500 input · 300 output

## Community Hubs (Navigation)
- Data Loader Unit Tests
- Frontend App Interactivity
- Data Loader Pandas Engine
- Flask API Routes
- Dataset Integration Tests
- API Route Tests
- Frontend Package Dependencies
- Batch and Stats Unit Tests
- Project Overview & Documentation
- UI Layout & Testing Strategy

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
10. `TestSearchRoute` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Testing Strategy` --references--> `Index HTML Template`  [EXTRACTED]
  docs/TESTING_STRATEGY.md → templates/index.html

## Import Cycles
- None detected.

## Communities (21 total, 0 thin omitted)

### Community 0 - "Data Loader Unit Tests"
Cohesion: 0.08
Nodes (9): params(), Logic tests for data_loader.py, run against `synthetic_df` (see conftest.py).  P, Build a MultiDict the way Flask's request.args would look, from     kwargs where, TestQueryConfidenceRanges, TestQueryExclusions, TestQueryFilters, TestQueryPagination, TestQueryPoemLevel (+1 more)

### Community 1 - "Frontend App Interactivity"
Cohesion: 0.20
Nodes (23): AXES, AXIS_META, buildAxisBlocks(), buildMeterList(), buildParams(), buildPoemLengthPresets(), buildPoetList(), debounce() (+15 more)

### Community 2 - "Data Loader Pandas Engine"
Cohesion: 0.14
Nodes (20): _apply_filters(), _float(), get_batch(), get_meta(), get_stats(), _getlist(), _int(), _poem_length_meta() (+12 more)

### Community 3 - "Flask API Routes"
Cohesion: 0.12
Nodes (9): Arabic Poetry Mood Explorer ---------------------------- A small Flask app for b, Flask, pandas, _build_synthetic_df(), _flag_axes(), Shared fixtures for the backend test suite.  Two fixtures, matching docs/TESTING, Small, hand-built frame for isolated logic tests. See module docstring     and t, Small helper mirroring how flagged_axes would be derived: any axis     marked lo (+1 more)

### Community 4 - "Dataset Integration Tests"
Cohesion: 0.11
Nodes (5): Integration sanity tests for data_loader.py against the real dataset.  Per docs/, TestDatasetInvariants, TestGetBatchOnRealData, TestGetMetaSanity, TestQuerySanityOnRealData

### Community 5 - "API Route Tests"
Cohesion: 0.12
Nodes (6): Flask route tests, per docs/TESTING_STRATEGY.md §2.4 ("app.py"). Uses the sessio, TestBatchRoute, TestIndexRoute, TestMetaRoute, TestSearchRoute, TestStatsRoute

### Community 6 - "Frontend Package Dependencies"
Cohesion: 0.14
Nodes (13): devDependencies, jsdom, @playwright/test, vitest, name, private, scripts, test:e2e (+5 more)

### Community 7 - "Batch and Stats Unit Tests"
Cohesion: 0.12
Nodes (3): TestGetBatch, TestGetStats, TestTagMask

### Community 8 - "Project Overview & Documentation"
Cohesion: 0.50
Nodes (4): Arabic Poetry Mood Explorer, Top 100 Arabic Poets Mood Labeled Dataset, Pandas Data Loader & Filtering Architecture, Hybrid Testing Suite (Pytest + Vitest + Playwright)

### Community 9 - "UI Layout & Testing Strategy"
Cohesion: 0.67
Nodes (3): Poetry Mood Explorer UI Layout, Testing Strategy, Index HTML Template

## Knowledge Gaps
- **16 isolated node(s):** `name`, `private`, `type`, `test:unit`, `test:e2e` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `params()` connect `Data Loader Unit Tests` to `Batch and Stats Unit Tests`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `pandas` connect `Flask API Routes` to `Data Loader Unit Tests`, `Data Loader Pandas Engine`, `Dataset Integration Tests`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `name`, `private`, `type` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Loader Unit Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.0797979797979798 - nodes in this community are weakly interconnected._
- **Should `Data Loader Pandas Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Flask API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `Dataset Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._