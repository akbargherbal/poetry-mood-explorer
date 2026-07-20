# Testing Strategy — Poetry Mood Explorer

**Audience:** an AI coding agent implementing the test suite for this repo.
**Scope:** backend (Flask + pandas) and frontend (vanilla JS, no build step).

Read this whole document before writing any test. Two things in this codebase
break naive test setups if you don't account for them up front — they're
called out explicitly in each section below so you don't discover them halfway
through.

---

## 1. Architecture recap (what you're testing)

```
app.py            Flask routes only — thin HTTP layer, no logic.
data_loader.py    All filtering/sorting/search logic. Loads the pickled
                  dataset ONCE at import time into a module-level `_df`.
static/js/app.js  Vanilla JS, loaded via a plain <script> tag (NOT
                  type="module"). No build step, no framework. Owns all
                  DOM rendering, state, and fetch() calls to the API.
templates/index.html   Single page, server-rendered by Flask, static
                  otherwise. Stable element IDs (see §4).
```

Routes exposed by `app.py`: `/`, `/api/meta`, `/api/search`, `/api/stats`,
`/api/batch/<row_id>`.

---

## 2. Backend testing (pytest)

### 2.1 The load-at-import problem — read this first

`data_loader.py` runs `_df = pd.read_pickle(DATA_PATH)` **at module import
time**, against the real 59MB dataset. This has two consequences:

1. Any test that does `import data_loader` or `from app import app` pays the
   full load cost, and does so **once per pytest session** if you import at
   module scope — that's fine and expected, don't try to avoid it.
2. You **cannot** monkeypatch `data_loader._df` before import to substitute a
   small synthetic frame, because the load already happened at import. If you
   want synthetic-data unit tests, monkeypatch `data_loader._df` *after*
   import, inside a fixture, and restore it afterward.

Recommended split — use both, don't pick one:

- **Logic tests (fast, isolated):** monkeypatch `data_loader._df` with a small
  hand-built DataFrame (5–10 rows) covering edge cases you control (empty tag
  lists, ties in rank, missing optional fields). Use these for `_tag_mask`,
  `query()` filter combinations, `get_stats()` aggregation, `_flatten_verses`.
- **Integration sanity tests (slower, real data):** a session-scoped fixture
  that imports `data_loader` as-is (real 24k-row dataset) and asserts on
  shape/invariants only (e.g. "every row has a mood tag", "row_id is unique
  and dense"), plus a handful of Flask test-client calls against real
  endpoints. Don't assert on exact counts here — the dataset can change.

### 2.2 Directory layout

```
tests/
  conftest.py              # fixtures below
  test_data_loader_unit.py       # synthetic-data logic tests
  test_data_loader_integration.py  # real-data sanity tests
  test_api_routes.py             # Flask test client, real data
```

### 2.3 `conftest.py` — required fixtures

```python
import pandas as pd
import pytest
import data_loader

@pytest.fixture
def synthetic_df(monkeypatch):
    """Small, hand-built frame for isolated logic tests."""
    df = pd.DataFrame([
        # include: multiple poets, at least one row with an empty tag list
        # per axis, at least one duplicate rank, ascii-safe placeholder text
        # (do not hand-author Arabic test fixtures unless asked to)
        ...
    ])
    df["row_id"] = df.index
    monkeypatch.setattr(data_loader, "_df", df)
    return df

@pytest.fixture(scope="session")
def client():
    from app import app
    app.config.update(TESTING=True)
    return app.test_client()
```

### 2.4 What to cover

**`data_loader.py`** (use `synthetic_df`):
- `_tag_mask`: `mode="any"` vs `mode="all"`, empty `wanted` set, tag not
  present in any row.
- `query()`: each filter independently (poet, meter, rank range, poem-length
  range, per-axis tags + confidence), then two filters combined. Pagination
  math at boundaries (`page` beyond last page, `page_size` edge values).
  Sorting by each allowed `sortBy` value, both directions.
- `get_stats()`: aggregation matches a hand-computed expected value on the
  synthetic frame.
- `get_batch()`: valid `row_id`, and an out-of-range `row_id` (must return
  `None`, not raise).

**`app.py`** (use `client`, real data):
- `GET /` → 200, HTML content type.
- `GET /api/meta` → 200, JSON, expected top-level keys present.
- `GET /api/search` with no params → 200, `results`/`total`/`page` keys
  present, `total_pages` consistent with `total` and `page_size`.
- `GET /api/search` with a nonsense filter value → 200 with empty results,
  not a 500.
- `GET /api/batch/<valid_id>` → 200. `GET /api/batch/999999999` → 404 with
  `{"error": ...}`.

### 2.5 Explicitly out of scope
- Don't test pandas itself (`.explode()`, `.isin()` semantics).
- Don't assert exact row counts against the real dataset — it's a fixture the
  agent doesn't own and may be swapped later.
- Don't add tests that require network access or the Tailwind CDN.

---

## 3. Frontend testing

### 3.1 The no-exports problem — read this first

`static/js/app.js` is loaded as a plain `<script src="...">`, not
`type="module"`, and none of its functions are exported. **A test runner
cannot `import` anything from it as-is.** Before writing any unit test, do
one small, non-breaking prep step:

- Add `export` in front of the pure, DOM-free functions you intend to unit
  test: `buildParams`, `toggleSetValue`, `debounce`, `escapeHtml`, `tagColor`.
  (Leave DOM-touching functions — `renderCard`, `renderResults`, etc. —
  alone; they're covered by Playwright instead, see §3.3.)
- Change the script tag in `templates/index.html` to
  `<script type="module" src="/static/js/app.js"></script>`.
- Verify the app still runs unchanged in a browser after this change — adding
  `export` keywords and `type="module"` does not require a bundler and does
  not change runtime behavior for a single-file script with no other
  consumers. If anything relies on these functions being global (inline
  `onclick="..."` in `index.html`), grep for it first and fix before
  proceeding.

Do this refactor as its own first commit, before adding tests, so it's easy
to review and revert independently of the test code.

### 3.2 Unit layer — Vitest

Covers only the exported pure functions from §3.1. No jsdom needed for these
(they don't touch `document`).

```
frontend/
  package.json          # devDependencies: vitest
  vitest.config.js
  tests/unit/
    buildParams.test.js
    toggleSetValue.test.js
    debounce.test.js
    escapeHtml.test.js
    tagColor.test.js
```

What to cover:
- `buildParams`: state → query-string params mapping, including the
  `includePagination` flag branch, empty sets/ranges omitted from output.
- `toggleSetValue`: add, remove, no-op on missing value.
- `escapeHtml`: standard HTML-special-char cases; passthrough of plain text.
- `tagColor`: known tag returns its fixed color, unknown tag falls back to
  `AXIS_META[axis].accent`.
- `debounce`: fake timers (`vi.useFakeTimers()`), assert the wrapped fn fires
  once after the delay even with multiple rapid calls.

### 3.3 Integration/E2E layer — Playwright

This is where DOM rendering, filter interactions, and RTL Arabic content
actually get exercised — don't try to replicate this with jsdom.

```
frontend/
  tests/e2e/
    search.spec.js
    filters.spec.js
    pagination.spec.js
```

Run against the real Flask dev server (`python app.py`), not a mock backend
— the API surface is small enough that hitting it directly is simpler and
more trustworthy than mocking it.

**Selector policy:** use the existing element `id`s (`#searchInput`,
`#poetList`, `#rankMin`, `#resetFilters`, `#axisFilters`, etc. — confirmed
present in `templates/index.html`). Do not select on Tailwind utility classes
or on Arabic text content, both of which are more likely to change than the
IDs.

What to cover:
- Typing in `#searchInput` narrows `#headerCount` (debounced — wait for it).
- Selecting a poet in `#poetList` filters results; `#resetFilters` clears it.
- An axis tag filter (mood/genre/energy/aesthetic) changes result count and
  updates `renderActiveFilters` chips.
- Pagination controls move between pages and stay in sync with the URL
  (`loadStateFromURL` / `buildParams` round-trip).
- A poem-length preset (Short/Medium/Long/Epic) sets the min/max batch
  inputs correctly.

### 3.4 Explicitly out of scope
- Don't unit-test `renderCard`/`renderResults`/`renderStats` — DOM-diff
  assertions in jsdom for these are brittle relative to the Playwright
  coverage above. If they need isolated testing later, that's a candidate for
  `@testing-library/dom`, not a default here.
- Don't test Tailwind's CDN build or visual styling/pixel output.

---

## 4. Order of operations for the agent

1. Backend: write `conftest.py` + unit tests against `synthetic_df` first
   (no dataset dependency, fastest feedback loop).
2. Backend: add the real-data integration tests and API route tests.
3. Frontend: do the export/`type="module"` prep commit (§3.1), confirm the
   app still runs manually.
4. Frontend: Vitest unit tests for the five pure functions.
5. Frontend: Playwright E2E specs, run against `python app.py`.
6. Wire both suites into whatever CI config exists (or note in the PR that
   none exists yet, if that's the case).
