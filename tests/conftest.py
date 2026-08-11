"""
Shared fixtures for the backend test suite.

Two fixtures, matching docs/TESTING_STRATEGY.md §2.3:

- `synthetic_df`: a small (6-row), hand-built DataFrame that is monkeypatched
  onto `data_loader._df` *after* import (the real dataset has already
  been loaded at import time, so this is the only way to substitute it).
  Used by the "unit" tests that exercise filtering/sorting/aggregation logic
  in isolation, without paying the real-data load cost and without being
  sensitive to changes in the real dataset.

- `client`: a session-scoped Flask test client wired to the app as-is
  (real dataset). Used by the "integration" and API-route tests.
"""

import pandas as pd
import pytest

import data_loader


# ---------------------------------------------------------------------------
# The synthetic frame
# ---------------------------------------------------------------------------
# Design notes (see docs/TESTING_STRATEGY.md §2.3 for the requirements this
# satisfies):
#   - 3 poets (Alpha, Beta, Gamma), 2 rows each -> multiple poets covered.
#   - Alpha and Beta share POET_RANK == 1 -> a duplicate rank.
#   - "nightingale" appears in the verse text of rows 0 and 5 (two hits);
#     "desert" appears only in row 2 (one hit) -- used for search tests.
#   - BATCH_SIZE and POET_RANK are deliberately *not* monotonic with row
#     index, so sorting by them is a real test of the sort, not a coincidence
#     of insertion order.
#   - All verse text is plain ASCII placeholder text, per the "don't hand
#     author Arabic fixtures" note in the testing strategy.

_ROWS = [
    # (poet, poem_no, batch_no, rank, meter, batch_size, sadr, ajuz)
    ("Alpha", "p1", 0, 1, "tawil", 10,
     "the nightingale weeps", "softly at dusk"),
    ("Alpha", "p1", 1, 1, "tawil", 5,
     "gardens bloom bright", "golden in the sun"),
    ("Beta", "p2", 0, 1, "kamil", 20,
     "desert winds carry", "dust across the plain"),
    ("Beta", "p2", 1, 1, "kamil", 15,
     "the king mocks", "his rival loudly"),
    ("Gamma", "p3", 0, 3, "wafir", 8,
     "shadows fall upon", "the silent tomb"),
    ("Gamma", "p3", 1, 3, "wafir", 25,
     "love blooms like", "the nightingale sings"),
]


def _build_synthetic_df():
    records = []
    for i, (poet, poem_no, batch_no, rank, meter, batch_size, sadr, ajuz) in enumerate(_ROWS):
        records.append({
            "POET_NAME": poet,
            "poem_no": poem_no,
            "batch_no": batch_no,
            "POET_RANK": rank,
            "meter": meter,
            "DATA": [{"verse_id": f"{poem_no}_{batch_no}_0", "sadr": sadr, "ajuz": ajuz}],
            "BATCH_SIZE": batch_size,
        })

    df = pd.DataFrame.from_records(records)
    df["row_id"] = df.index
    df["verse_text"] = df["DATA"].apply(data_loader._flatten_verses)

    # Poem-level aggregate columns, mirroring what _apply_filters() attaches
    # so sort tests can compare against the raw frame.
    stats = df.groupby("poem_no").agg(
        poem_n_batches=("batch_no", "count"),
        poem_n_verses=("BATCH_SIZE", "sum"),
    )
    df["poem_n_batches"] = df["poem_no"].map(stats["poem_n_batches"])
    df["poem_n_verses"] = df["poem_no"].map(stats["poem_n_verses"])
    return df


# ---------------------------------------------------------------------------
# Synthetic poet-era lookup, matching the same three poets as _ROWS.
# Deliberately built so century ranges overlap in testable ways:
#   - hijri 13: Alpha only        hijri 14: Alpha AND Gamma (boundary touch)
#   - hijri 12: Beta only         hijri 15: Gamma only
#   - gregorian 19: Alpha AND Beta (boundary touch)
#   - gregorian 20: Alpha AND Gamma
# ---------------------------------------------------------------------------
_SYNTHETIC_ERA = {
    "Alpha": {
        "name": "Alpha",
        "birth_century_hijri": 13, "death_century_hijri": 14,
        "birth_century_gregorian": 19, "death_century_gregorian": 20,
    },
    "Beta": {
        "name": "Beta",
        "birth_century_hijri": 12, "death_century_hijri": 12,
        "birth_century_gregorian": 18, "death_century_gregorian": 19,
    },
    "Gamma": {
        "name": "Gamma",
        "birth_century_hijri": 14, "death_century_hijri": 15,
        "birth_century_gregorian": 20, "death_century_gregorian": 20,
    },
}


@pytest.fixture
def synthetic_df(monkeypatch):
    """Small, hand-built frame for isolated logic tests. See module docstring
    and the design notes above `_ROWS` for exactly what it covers. Also
    monkeypatches the poet-era lookup so century-filter tests have real data
    to match against (see `_SYNTHETIC_ERA` above)."""
    df = _build_synthetic_df()
    monkeypatch.setattr(data_loader, "_df", df)
    monkeypatch.setattr(data_loader, "_POET_ERA", _SYNTHETIC_ERA)
    return df


@pytest.fixture(scope="session")
def client():
    from app import app
    app.config.update(TESTING=True)
    return app.test_client()
