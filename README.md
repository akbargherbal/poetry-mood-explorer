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

Then open **http://127.0.0.1:5000** in your browser.

## Project layout

```
poetry-mood-explorer/
├── app.py                  # Flask routes (thin HTTP layer)
├── data_loader.py           # All pandas filtering/sorting/search/stats logic
├── requirements.txt
├── data/
│   └── TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl
├── templates/
│   └── index.html          # Page layout + Tailwind config
└── static/
    ├── css/custom.css      # Styles Tailwind utilities can't express
    └── js/app.js            # All frontend interactivity (vanilla JS)
```

## What you can filter by

- **Free-text search** across verse text (Arabic substring match)
- **Poet** (checkbox list, searchable, 100 poets) and **poet rank range**
- **Meter** (بحر) — pill toggles for the 9 meters present in the data
- **Batch size** (1–12 verses per batch)
- **Mood / Genre / Energy / Aesthetic tags** — each with an "any" vs "all"
  match mode, since every batch can carry multiple tags per axis
- **Confidence** per axis — narrow down to only the ambiguous
  (`low_confidence = true`) or only the clean, high-confidence labels

Results can be sorted by poet rank, batch size, or any of the four
confidence scores, and are paginated (10/20/50 per page). A stats panel
above the results shows the live tag distribution for whatever is currently
filtered — not the whole dataset — so it updates as you narrow things down.

## Notes on the data

Each row is one **batch**: a contiguous run of 1–12 verses from one poem.
The four scoring axes (`mood_scores`, `genre_scores`, `energy_scores`,
`aesthetic_scores`) are the raw model confidence per tag; `*_tags` are the
tags that cleared the model's threshold; `*_low_confidence` flags batches
where the top two tags were close enough that the label is uncertain. See
the original dataset repo for how these labels were generated:
https://github.com/akbargherbal/arabic-poetry-mood-labeling
