# ديوان الأمزجة — Arabic Poetry Mood Explorer

A small Flask app for browsing the **~24,000 mood-labeled verse-batches** from
the `TOP_100_ARABIC_POETS_OF_ALL_TIME` dataset (batches of 1–12 adjacent
verses, each scored across four axes: **mood**, **genre**, **energy**, and
**aesthetic**).

The backend does all the heavy lifting with `pandas` (boolean masks, `.isin()`,
`.apply()`, `.explode()`, `.groupby()`, vectorized string search); the
frontend is plain HTML/CSS/JS with Tailwind pulled in via CDN — no build
step, no npm.

## Requirements

- Python 3.9+
- pip

## Setup

```bash
# from inside the poetry-mood-explorer/ folder
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# only needed if you want to run the backend test suite (see "Testing" below)
pip install pytest
```

### Add the dataset (required)

The `.pkl` file was left out of this download to keep it small. Copy your
copy of the dataset into `data/`, with **exactly** this filename:

```
data/TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl
```

(See `data/PLACEHOLDER_README.txt`. Source: the
[akbargherbal/arabic-poetry-mood-labeling](https://github.com/akbargherbal/arabic-poetry-mood-labeling)
repo.) You can delete `PLACEHOLDER_README.txt` once the real file is in place.

## Run

```bash
python app.py
```

Then open **http://127.0.0.1:5001** in your browser.

## Project layout

```
poetry-mood-explorer/
├── app.py                  # Flask routes (thin HTTP layer)
├── data_loader.py           # All pandas filtering/sorting/search/stats logic
├── requirements.txt
├── pytest.ini
├── data/
│   └── TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl
├── templates/
│   └── index.html          # Page layout + Tailwind config
├── static/
│   ├── css/custom.css      # Styles Tailwind utilities can't express
│   └── js/app.js            # All frontend interactivity (vanilla JS)
├── tests/                  # Backend test suite (pytest)
│   ├── conftest.py
│   ├── test_data_loader_unit.py
│   ├── test_data_loader_integration.py
│   └── test_api_routes.py
├── frontend/                # Frontend test suite (Vitest + Playwright)
│   ├── package.json
│   ├── vitest.config.js
│   ├── playwright.config.js
│   └── tests/
│       ├── unit/            # Vitest — pure functions from static/js/app.js
│       └── e2e/             # Playwright — drives a real browser against app.py
└── docs/
    └── TESTING_STRATEGY.md  # Testing approach and what's covered where
```

## What you can filter by

- **Free-text search** across verse text (Arabic substring match)
- **Poet** (checkbox list, searchable, 100 poets) and **poet rank range**
- **Meter** (بحر) — pill toggles for the 9 meters present in the data
- **Batch size** (1–12 verses per batch)
- **Poem length** — filter by how many batches or verses the _whole poem_
  spans (not just the current batch), either via the Short/Medium/Long/Epic
  presets (quartile-based, computed from the current dataset) or manual
  min/max inputs
- **Exclusions** — drop a specific poem (by number) or an entire poet rank
  from the results, independent of the positive filters above
- **Mood / Genre / Energy / Aesthetic tags** — each with an "any" vs "all"
  match mode, since every batch can carry multiple tags per axis
- **Confidence** per axis — either the coarse `low_confidence` flag (only
  ambiguous vs. only clean labels), or a precise min/max confidence-score
  range
- **One card per poem** — collapse results down to a single representative
  batch (the poem's first) per poem, for browsing by poem rather than by
  batch

Results can be sorted by poet rank, batch size, or any of the four
confidence scores, and are paginated (10/20/50 per page). A stats panel
above the results shows the live tag distribution for whatever is currently
filtered — not the whole dataset — so it updates as you narrow things down.
An active-filters bar lists every filter currently applied, each removable
individually, with a "Reset all" shortcut when more than one is active.

## Testing

See `docs/TESTING_STRATEGY.md` for the full rationale; the short version:

**Backend (pytest)** — from the project root, with `pytest` installed
(see Setup above):

```bash
pytest
```

Runs against a mix of a small synthetic DataFrame (fast logic tests for
`data_loader.py`) and the real dataset (integration/API-route sanity checks).

**Frontend (Vitest + Playwright)** — from `frontend/`:

```bash
cd frontend
npm install
npx playwright install chromium   # one-time, only needed for e2e

npm run test:unit    # Vitest — pure functions from static/js/app.js
npm run test:e2e     # Playwright — drives a real browser against app.py
```

`test:e2e` starts `python ../app.py` for you automatically and tears it
down afterward. If you'd rather run the app yourself (e.g. to iterate on
one spec), start it separately and run:

```bash
PW_SKIP_WEBSERVER=1 npx playwright test
```

Note: the e2e suite hits the real ~24k-row dataset through a non-threaded
Flask dev server, so responses can take a few seconds on a slow machine.
If a test times out intermittently rather than failing consistently, that's
most likely backend latency, not a regression — the specs already wait for
the initial data load before asserting on anything, but very slow hardware
may still need to rerun a flaky test.

## Notes on the data

Each row is one **batch**: a contiguous run of 1–12 verses from one poem.
The four scoring axes (`mood_scores`, `genre_scores`, `energy_scores`,
`aesthetic_scores`) are the raw model confidence per tag; `*_tags` are the
tags that cleared the model's threshold; `*_low_confidence` flags batches
where the top two tags were close enough that the label is uncertain. See
the original dataset repo for how these labels were generated:
https://github.com/akbargherbal/arabic-poetry-mood-labeling
