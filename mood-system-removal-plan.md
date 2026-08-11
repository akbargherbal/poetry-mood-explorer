# Removal Plan: Mood / Genre / Energy / Aesthetic Labeling System

**Project:** poetry-mood-explorer
**Reason:** The mood-labeling model is unreliable (e.g. غزل verses labeled as غضب). All four "axes" —
`mood`, `genre`, `energy`, `aesthetic` — share the same flawed labeling pipeline, including their
confidence scores, so the entire system is removed, not just the tags. Data that is **not** part of
this system (poet, poet rank, meter, poem/verse text, poem length, era/century) is kept as-is.

**Scope confirmed with the user:**
- Physically drop the columns from the `.pkl` dataframe (not just stop using them) — smaller file, clean data.
- Remove confidence/low-confidence/top2_gap fields too — they belong to the same unreliable system.
- `flagged_axes` and `suno_tags` are derived entirely from the four axes → removed as well.
- Test cases tied to these axes are deleted outright (not skipped).

**Columns being removed from the dataset** (12 per axis × 4 axes + 2 global = 50 columns):
For each axis in `{mood, genre, energy, aesthetic}`: `{axis}_tags`, `{axis}_scores`, `{axis}_scores_z`,
`{axis}_confidence`, `{axis}_top2_gap`, `{axis}_low_confidence`
Plus: `flagged_axes`, `suno_tags`

**Columns being kept:** `POET_NAME`, `poem_no`, `batch_no`, `POET_RANK`, `meter`, `DATA`, `BATCH_SIZE`,
plus everything derived from `top_100_arabic_poets_dob_dod.json` (birth/death era, century filters).

---

## Guiding principle for phase ordering

Work **outside-in is risky here** because the frontend, backend, and data file all reference the same
`AXES` list in lockstep — removing the data file's columns first would 500-error the app immediately.
Instead we go **inside-out but branch-isolated**: every phase lands on a *working, runnable app* before
moving to the next, and the very first phase creates a safety net so any phase can be rolled back
independently.

---

## Phase 0 — Safety net (no functional change)

**Goal:** Make every later phase reversible.

- Create a new git branch, e.g. `remove-mood-system`.
- Run the existing test suites once on the current `main` to get a baseline (`pytest`, and the
  frontend `vitest`/`playwright` suites) — record which tests currently pass, so later "all green"
  claims are meaningful.
- Copy the current `.pkl` file aside (e.g. `data/_backup_STAGE_02_mood_labeled.pkl`, outside git or
  in `.gitignore`) in case the trimmed version needs to be regenerated differently later.

**Exit check:** Baseline test results recorded; branch created; backup copy exists.
**Breaks nothing** — purely preparatory.

---

## Phase 1 — Trim the data file (`data/`)

**Goal:** Produce a new `.pkl` with the 50 mood-system columns dropped, and update the placeholder
docs describing the expected shape.

**Files touched:** `data/TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl`,
`data/PLACEHOLDER_README.txt`

**Steps:**
1. Write a small one-off script (not part of the app) that:
   - Loads the current pickle.
   - Drops the 50 columns listed above.
   - Saves it under a new, honest filename, e.g.
     `TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_core.pkl` (the old name references "mood_labeled",
     which will no longer be true).
2. Confirm the new file's shape (~23,979 rows × ~8 columns) and spot-check a few rows.
3. Delete the old `.pkl` from `data/` (kept in the Phase-0 backup outside the repo).
4. Update `data/PLACEHOLDER_README.txt` to reference the new filename and expected shape.

**Exit check:** New trimmed `.pkl` loads correctly and is much smaller than 57 MB. The app is **not
yet pointed at it** — nothing runs against it until Phase 2, so nothing is broken yet.

---

## Phase 2 — Backend: `data_loader.py`

**Goal:** Update the single source of truth for backend data access to use the trimmed file and drop
all axis-related logic.

**Files touched:** `data_loader.py`

**Steps:**
1. Point `DATA_PATH` at the new `..._core.pkl` filename.
2. Delete the `AXES` constant.
3. Remove axis-confidence block from `get_meta()` (the `confidence` dict and the four
   `*_tags: tag_vocab(...)` entries).
4. Remove the tag-filter loop, low-confidence-toggle loop, and confidence-range loop inside
   `_apply_filters()` (three `for axis in AXES:` blocks).
5. Remove `_tag_mask()` if nothing else uses it after the above removal.
6. Remove the four `*_confidence` and `*_top2_gap` entries from `valid_sort_cols` in `query()`.
7. Remove the `mood`, `genre`, `energy`, `aesthetic`, `flagged_axes`, `suno_tags` keys from the
   per-record dict built in `_to_records()`.
8. Remove the axis-distribution logic (`dist()` calls and the four `*_tags` keys) from `get_stats()`,
   keeping `matching_batches` and `top_poets`.
9. Update the module docstring at the top of the file (it currently states the app is specifically
   about mood-labeled data).

**Exit check:** `python -c "import data_loader; print(data_loader.get_meta())"` runs without error
and returns only the fields still expected (poets, meters, batch_size, poet_rank, poem_length,
century_options, total_batches).

---

## Phase 3 — Backend: `app.py`

**Goal:** Update docstring/comments; routes themselves need no structural change since they're thin
pass-throughs to `data_loader`.

**Files touched:** `app.py`

**Steps:**
1. Update the module docstring (drop "mood-labeled").
2. Sanity-run the Flask app locally and hit `/api/meta`, `/api/search`, `/api/stats`,
   `/api/batch/<id>` manually (curl or browser) to confirm none of them 500 — at this point the
   **frontend will still request removed fields and silently ignore missing ones**, since browsers
   don't error on absent JSON keys; the UI will just render broken/empty axis widgets, which is
   expected and fixed next phase.

**Exit check:** All four API routes return valid JSON with no `KeyError`/500s.

---

## Phase 4 — Frontend: shared modules first (`constants.js`, `state.js`, `url.js`)

**Goal:** Remove the axis abstraction from the modules everything else imports, in dependency order,
so each subsequent file's edits are mechanical (delete the now-dangling references).

**Files touched:** `static/js/modules/constants.js`, `static/js/modules/state.js`,
`static/js/modules/url.js`

**Steps:**
1. `constants.js`: delete `AXES`, `AXIS_META`, `TAG_COLORS`, and `tagColor()`.
2. `state.js`: delete the `axis: {...}` block from the shared `state` object.
3. `url.js`: delete the two `AXES.forEach(axis => {...})` blocks that (de)serialize axis filters
   to/from the query string.

**Exit check:** These three files no longer reference mood/genre/energy/aesthetic. The app will not
run cleanly yet (other modules still `import { AXES, ... }` from `constants.js`), which is fine — this
phase is intentionally mid-flight and Phase 5 completes it in the same sitting before testing.

---

## Phase 5 — Frontend: UI-producing modules (`sidebar.js`, `filters-bar.js`, `cards.js`, `stats.js`)

**Goal:** Remove all UI that reads/writes axis data, restoring the app to a runnable state.

**Files touched:** `static/js/modules/sidebar.js`, `static/js/modules/filters-bar.js`,
`static/js/modules/cards.js`, `static/js/modules/stats.js`

**Steps:**
1. `sidebar.js`: remove the `AXES.forEach(axis => {...})` block that renders the four filter
   sections (Mood/Genre/Energy/Aesthetic checkboxes, confidence-flag dropdown, confidence range
   inputs) — this is exactly the sidebar content circled in the screenshots. Remove the now-unused
   `tagField` map and the `AXES`/`AXIS_META`/`tagColor` import.
2. `filters-bar.js`: remove the `AXES.forEach(axis => {...})` block that renders the active-filter
   chips for axis tags; remove the `AXES` import.
3. `cards.js`: remove the `axisFooter` block (the small colored tag row at the bottom of each poem
   card) and the `dominant`/`tagColor("mood", ...)` line used for card accent coloring — replace the
   accent color with a fixed/neutral value or one derived from `meter`/`poet_rank` instead. Remove the
   `AXES`/`AXIS_META`/`tagColor` import.
4. `stats.js`: remove the four `barSection(...)` calls for Mood/Genre/Energy/Aesthetic from the
   distribution panel (this is the "Distribution across N matching batches" panel shown in the first
   screenshot).

**Exit check:** Run `python app.py`, open the page, and manually verify:
   - No JS console errors.
   - The sidebar filters panel shows only Poet, Meter, Poet rank range, Poem length, and era/century
     filters.
   - The distribution panel shows no Mood/Genre/Energy/Aesthetic columns.
   - Poem cards render without the axis tag footer.
   - Search, poet filter, meter filter, era filter, and pagination all still work end-to-end.

---

## Phase 6 — Frontend: markup and remaining references (`templates/index.html`, `custom.css`)

**Goal:** Clean up static HTML/CSS that isn't generated by the JS modules.

**Files touched:** `templates/index.html`, `static/css/custom.css`

**Steps:**
1. `index.html`: remove the "Tag axes: mood / genre / energy / aesthetic" markup block (sidebar
   filter section skeleton) and the four `*_confidence` `<option>` entries from the sort-by dropdown.
   Update the page subtitle/header text ("Arabic Poetry Mood Explorer — Top 100 Poets, mood-labeled")
   to something reflecting the new scope, e.g. "Arabic Poetry Explorer — Top 100 Poets" — note this
   also touches the on-page Arabic title ("ديوان الأمزجة") seen in the screenshots, which the user
   should confirm a replacement title for.
2. `custom.css`: remove any selectors/utility classes that only existed for axis chip colors or the
   axis filter sections, if any are unused after Phase 5.

**Exit check:** Full manual walkthrough of the page in a browser matches the trimmed feature set with
no leftover empty containers or broken styling.

---

## Phase 7 — Tests

**Goal:** Delete test coverage for the removed system; keep and adapt coverage for everything else.

**Files touched:** `tests/conftest.py`, `tests/test_api_routes.py`,
`tests/test_data_loader_integration.py`, `tests/test_data_loader_unit.py`,
`frontend/tests/unit/buildParams.test.js`, `frontend/tests/unit/tagColor.test.js`,
`frontend/tests/e2e/filters.spec.js`

**Steps:**
1. `tests/conftest.py`: update any fixture dataframes/records that hard-code axis columns so they
   match the new trimmed schema (mock data used by other, still-relevant tests must not reference
   dropped columns).
2. `test_data_loader_unit.py` / `test_data_loader_integration.py` / `test_api_routes.py`: delete test
   cases that exercise axis filtering, axis sorting, confidence filtering, or axis fields in
   `get_meta()`/`get_stats()`/`_to_records()`. Keep and re-verify the remaining ones (poet/meter/era/
   poem-length/search/pagination).
3. `frontend/tests/unit/tagColor.test.js`: delete entirely (tests a function that no longer exists).
4. `frontend/tests/unit/buildParams.test.js`: delete the assertions covering axis query-param
   serialization; keep the rest.
5. `frontend/tests/e2e/filters.spec.js`: delete the one axis-related scenario; keep the others.

**Exit check:** `pytest` and the frontend `vitest`/`playwright` suites both pass fully with zero
skipped tests referencing the removed system.

---

## Phase 8 — Documentation

**Goal:** Bring written docs in line with the trimmed app so future contributors aren't misled.

**Files touched:** `README.md`, `docs/poetry-mood-explorer-ideation.md`, `docs/TESTING_STRATEGY.md`

**Steps:**
1. `README.md`: update the project description, feature list, and any API/response examples that
   show mood/genre/energy/aesthetic fields.
2. `docs/poetry-mood-explorer-ideation.md`: add a short "Note: the mood/genre/energy/aesthetic
   labeling system was removed on <date> due to low labeling accuracy" addendum rather than rewriting
   the historical ideation doc.
3. `docs/TESTING_STRATEGY.md`: update any references to axis-related test scenarios.

**Exit check:** Docs describe only the current, trimmed feature set (or clearly mark historical
sections as historical).

---

## Phase 9 — Final regression pass

**Goal:** Confirm the whole app is coherent end-to-end before merging.

**Steps:**
1. Re-run the full backend and frontend test suites.
2. Manually re-test the flows from Phase 5's exit check once more on the final branch state.
3. Check file size drop on the `.pkl` and overall repo size.
4. Merge `remove-mood-system` into `main`.

**Not in scope / left untouched:** `graphify-out/` (a generated dependency-graph report) will go
stale after this refactor since it reflects the old module structure; regenerating it is a separate,
optional follow-up and isn't required for the app to function correctly.

---

## Summary table

| Phase | Area | Breaks app mid-phase? |
|---|---|---|
| 0 | Safety net | No |
| 1 | Trim `.pkl` data file | No (unused until Phase 2) |
| 2 | `data_loader.py` | No — app fully functional after this phase |
| 3 | `app.py` docstring/sanity check | No |
| 4 | Shared JS modules (constants/state/url) | Yes, temporarily (fixed within same sitting by Phase 5) |
| 5 | UI-producing JS modules | No — app fully functional after this phase |
| 6 | HTML/CSS cleanup | No |
| 7 | Tests | No |
| 8 | Docs | No |
| 9 | Final regression + merge | No |
