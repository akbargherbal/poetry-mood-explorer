# Graph Report - /home/akbar/Jupyter_Notebooks/AntiGravity/poetry-mood-explorer  (2026-07-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 71 nodes · 117 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `514032b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- README.md
- _filtered_frame
- app.js
- templates/index.html
- app.py
- refresh
- escapeHtml
- data_loader.py
- AXES
- query
- get_stats
- Flask
- buildPoetList

## God Nodes (most connected - your core abstractions)
1. `refresh()` - 13 edges
2. `query()` - 5 edges
3. `AXES` - 5 edges
4. `tagColor()` - 5 edges
5. `buildAxisBlocks()` - 5 edges
6. `renderCard()` - 5 edges
7. `renderActiveFilters()` - 5 edges
8. `escapeHtml()` - 5 edges
9. `Filter System` - 5 edges
10. `Verse Batch` - 5 edges

## Surprising Connections (you probably didn't know these)
- `api_search()` --calls--> `query()`  [EXTRACTED]
  app.py → data_loader.py
- `api_meta()` --calls--> `get_meta()`  [EXTRACTED]
  app.py → data_loader.py
- `api_stats()` --calls--> `get_stats()`  [EXTRACTED]
  app.py → data_loader.py
- `api_batch()` --calls--> `get_batch()`  [EXTRACTED]
  app.py → data_loader.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Filter Axes System** — mood_axis, genre_axis, energy_axis, aesthetic_axis, filter_system [INFERRED 0.80]

## Communities (14 total, 1 thin omitted)

### Community 0 - "README.md"
Cohesion: 0.26
Nodes (13): Aesthetic Axis, akbargherbal/arabic-poetry-mood-labeling, Arabic Poetry Mood Explorer, Energy Axis, Filter System, Genre Axis, Meter (bahr), Mood Axis (+5 more)

### Community 1 - "_filtered_frame"
Cohesion: 0.50
Nodes (4): _filtered_frame(), Same filtering pipeline as query(), minus sort/paginate, returned as a     DataF, Boolean mask for a list-valued column against a list of wanted tags., _tag_mask()

### Community 2 - "app.js"
Cohesion: 0.33
Nodes (6): AXIS_META, debounce(), expandedCards, state, TAG_COLORS, wireStaticControls()

### Community 3 - "templates/index.html"
Cohesion: 0.33
Nodes (5): Amiri Font, Google Fonts, Inter Font, JetBrains Mono Font, Tailwind CSS

### Community 4 - "app.py"
Cohesion: 0.33
Nodes (4): api_meta(), Arabic Poetry Mood Explorer ---------------------------- A small Flask app for b, get_meta(), Everything the filter sidebar needs to populate its controls.

### Community 5 - "refresh"
Cohesion: 0.50
Nodes (5): buildPoemLengthPresets(), fetchJSON(), refresh(), renderPagination(), renderResults()

### Community 6 - "escapeHtml"
Cohesion: 0.60
Nodes (5): escapeHtml(), renderActiveFilters(), renderCard(), renderStats(), tagColor()

### Community 7 - "data_loader.py"
Cohesion: 0.33
Nodes (5): api_batch(), get_batch(), data_loader.py -------------- Loads the mood-labeled Arabic poetry dataset once, Convert a DataFrame slice into plain JSON-safe dicts, reshaping the     verse li, _to_records()

### Community 8 - "AXES"
Cohesion: 0.50
Nodes (4): AXES, buildAxisBlocks(), buildParams(), loadStateFromURL()

### Community 9 - "query"
Cohesion: 0.67
Nodes (3): api_search(), query(), Filter, search, sort, and paginate the dataset according to `params`     (a plai

### Community 10 - "get_stats"
Cohesion: 0.67
Nodes (3): api_stats(), get_stats(), Tag-frequency breakdown per axis, honoring the current filters so the     stats

### Community 12 - "buildPoetList"
Cohesion: 0.67
Nodes (3): buildMeterList(), buildPoetList(), toggleSetValue()

## Knowledge Gaps
- **12 isolated node(s):** `AXIS_META`, `TAG_COLORS`, `state`, `expandedCards`, `Tailwind CSS` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `_filtered_frame`, `data_loader.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `get_stats()` connect `get_stats` to `_filtered_frame`, `data_loader.py`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `get_meta()` connect `app.py` to `data_loader.py`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `AXIS_META`, `TAG_COLORS`, `state` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._