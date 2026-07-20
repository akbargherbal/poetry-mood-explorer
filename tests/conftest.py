"""
Shared fixtures for the backend test suite.

Two fixtures, matching docs/TESTING_STRATEGY.md §2.3:

- `synthetic_df`: a small (6-row), hand-built DataFrame that is monkeypatched
  onto `data_loader._df` *after* import (the real 59MB dataset has already
  been loaded at import time, so this is the only way to substitute it).
  Used by the "unit" tests that exercise filtering/sorting/aggregation logic
  in isolation, without paying the real-data load cost and without being
  sensitive to changes in the real dataset.

- `client`: a session-scoped Flask test client wired to the app as-is
  (real 24k-row dataset). Used by the "integration" and API-route tests.
"""

import pandas as pd
import pytest

import data_loader


def _flag_axes(row_low_conf):
    """Small helper mirroring how flagged_axes would be derived: any axis
    marked low-confidence is 'flagged'. Not exercised by data_loader.py
    directly, but needs to be a plausible list for _to_records to serialize."""
    return [axis for axis, low in row_low_conf.items() if low]


# ---------------------------------------------------------------------------
# The synthetic frame
# ---------------------------------------------------------------------------
# Design notes (see docs/TESTING_STRATEGY.md §2.3 for the requirements this
# satisfies):
#   - 3 poets (Alpha, Beta, Gamma), 2 rows each -> multiple poets covered.
#   - Alpha and Beta share POET_RANK == 1 -> a duplicate rank.
#   - Each axis (mood/genre/energy/aesthetic) has exactly one row with an
#     empty tag list: mood -> row 3, genre -> row 0, energy -> row 1,
#     aesthetic -> row 2.
#   - "nightingale" appears in the verse text of rows 0 and 5 (two hits);
#     "desert" appears only in row 2 (one hit) -- used for search tests.
#   - confidence / top2_gap columns are monotonically increasing with row
#     index (0.1, 0.2, ..., 0.6) across all four axes, purely so ascending /
#     descending sort tests have an unambiguous expected order.
#   - BATCH_SIZE and POET_RANK are deliberately *not* monotonic with row
#     index, so sorting by them is a real test of the sort, not a coincidence
#     of insertion order.
#   - All verse text is plain ASCII placeholder text, per the "don't hand
#     author Arabic fixtures" note in the testing strategy.

_ROWS = [
    # (poet, poem_no, batch_no, rank, meter, batch_size, sadr, ajuz,
    #  mood_tags, genre_tags, energy_tags, aesthetic_tags,
    #  mood_low, genre_low, energy_low, aesthetic_low)
    ("Alpha", "p1", 0, 1, "tawil", 10,
     "the nightingale weeps", "softly at dusk",
     ["sad", "longing"], [], ["calm"], ["melancholy"],
     True, False, False, False),
    ("Alpha", "p1", 1, 1, "tawil", 5,
     "gardens bloom bright", "golden in the sun",
     ["joy"], ["praise"], [], ["epic"],
     False, False, True, False),
    ("Beta", "p2", 0, 1, "kamil", 20,
     "desert winds carry", "dust across the plain",
     ["joy", "sad"], ["love"], ["energetic"], [],
     False, True, False, True),
    ("Beta", "p2", 1, 1, "kamil", 15,
     "the king mocks", "his rival loudly",
     [], ["satire"], ["moderate"], ["military"],
     True, False, False, False),
    ("Gamma", "p3", 0, 3, "wafir", 8,
     "shadows fall upon", "the silent tomb",
     ["pessimism"], ["elegy"], ["intense"], ["spiritual"],
     False, False, True, False),
    ("Gamma", "p3", 1, 3, "wafir", 25,
     "love blooms like", "the nightingale sings",
     ["joy"], ["love"], ["calm"], ["romantic"],
     False, False, False, False),
]


def _build_synthetic_df():
    records = []
    for i, (poet, poem_no, batch_no, rank, meter, batch_size, sadr, ajuz,
            mood_tags, genre_tags, energy_tags, aesthetic_tags,
            mood_low, genre_low, energy_low, aesthetic_low) in enumerate(_ROWS):

        conf = round(0.1 * (i + 1), 2)  # 0.1, 0.2, ..., 0.6 - shared by all axes

        def scores_for(tags):
            return {t: 0.5 for t in tags} if tags else {}

        low_conf_map = {
            "mood": mood_low, "genre": genre_low,
            "energy": energy_low, "aesthetic": aesthetic_low,
        }

        records.append({
            "POET_NAME": poet,
            "poem_no": poem_no,
            "batch_no": batch_no,
            "POET_RANK": rank,
            "meter": meter,
            "DATA": [{"verse_id": f"{poem_no}_{batch_no}_0", "sadr": sadr, "ajuz": ajuz}],
            "BATCH_SIZE": batch_size,
            "mood_tags": mood_tags,
            "mood_scores": scores_for(mood_tags),
            "mood_confidence": conf,
            "mood_top2_gap": conf,
            "mood_low_confidence": mood_low,
            "genre_tags": genre_tags,
            "genre_scores": scores_for(genre_tags),
            "genre_confidence": conf,
            "genre_top2_gap": conf,
            "genre_low_confidence": genre_low,
            "energy_tags": energy_tags,
            "energy_scores": scores_for(energy_tags),
            "energy_confidence": conf,
            "energy_top2_gap": conf,
            "energy_low_confidence": energy_low,
            "aesthetic_tags": aesthetic_tags,
            "aesthetic_scores": scores_for(aesthetic_tags),
            "aesthetic_confidence": conf,
            "aesthetic_top2_gap": conf,
            "aesthetic_low_confidence": aesthetic_low,
            "flagged_axes": _flag_axes(low_conf_map),
            "suno_tags": {"mood": "placeholder", "genre": "placeholder",
                          "energy": "placeholder", "aesthetic": "placeholder"},
        })

    df = pd.DataFrame.from_records(records)
    df["row_id"] = df.index
    df["verse_text"] = df["DATA"].apply(data_loader._flatten_verses)
    return df


@pytest.fixture
def synthetic_df(monkeypatch):
    """Small, hand-built frame for isolated logic tests. See module docstring
    and the design notes above `_ROWS` for exactly what it covers."""
    df = _build_synthetic_df()
    monkeypatch.setattr(data_loader, "_df", df)
    return df


@pytest.fixture(scope="session")
def client():
    from app import app
    app.config.update(TESTING=True)
    return app.test_client()
