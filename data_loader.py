"""
data_loader.py
--------------
Loads the Arabic poetry dataset once at process start-up and exposes a
small query layer built entirely on top of the pandas API: boolean
masking, .isin(), .apply(), .sort_values(), .groupby(), and vectorized
string search.

Everything the Flask routes need lives here so app.py stays a thin
HTTP layer.
"""

import json
import os
import re
import pandas as pd

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_core.pkl",
)

POETS_ERA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "top_100_arabic_poets_dob_dod.json",
)

# Era systems this app filters by. Each entry names the JSON field prefixes
# ("birth_century_hijri" / "death_century_hijri", etc.) and the request
# param the frontend will send ("century_hijri" / "century_gregorian").
ERA_SYSTEMS = ["hijri", "gregorian"]

# ---------------------------------------------------------------------------
# Load once, keep in memory. 24k rows of mostly short strings/lists is small.
# ---------------------------------------------------------------------------
_df = pd.read_pickle(DATA_PATH)

# A stable row id so the frontend can reference a specific batch precisely
# (poem_no + batch_no are unique together, but a flat id is simpler to pass
# around in query strings).
_df = _df.reset_index(drop=True)
_df["row_id"] = _df.index


# Pre-compute a flattened, searchable verse text column once, rather than on
# every request. This is the classic pandas trick: pay the .apply() cost a
# single time at load, not per-filter.
def _flatten_verses(verses):
    return " \n".join(f"{v.get('sadr', '')} {v.get('ajuz', '')}" for v in verses)


_df["verse_text"] = _df["DATA"].apply(_flatten_verses)


# ---------------------------------------------------------------------------
# Poet birth/death era lookup (name -> century info), loaded once.
# Verified 100% direct-name match against POET_NAME (see exploratory match
# report) — no normalization or other_names fallback needed.
# ---------------------------------------------------------------------------
def _load_poet_era_map():
    with open(POETS_ERA_PATH, encoding="utf-8") as f:
        entries = json.load(f)
    return {entry["name"]: entry for entry in entries}


_POET_ERA = _load_poet_era_map()


# ---------------------------------------------------------------------------
# Poem-level aggregates (batches-per-poem, verses-per-poem).
# ---------------------------------------------------------------------------
def _poem_stats():
    return _df.groupby("poem_no").agg(
        poem_n_batches=("batch_no", "count"),
        poem_n_verses=("BATCH_SIZE", "sum"),
    )


def _poem_length_meta(col):
    """Min/max plus Short/Medium/Long/Epic presets, built from the actual
    quartiles of the current dataset rather than hardcoded, so the presets
    stay meaningful even if the dataset changes size/shape."""
    stats = _poem_stats()
    series = stats[col]
    lo, hi = int(series.min()), int(series.max())
    q25, q50, q75 = (int(v) for v in series.quantile([0.25, 0.5, 0.75]))

    # Build monotonically increasing preset boundaries even when quartiles
    # collapse together (e.g. a small/uniform dataset) by clamping each
    # boundary to be at least one more than the previous.
    b1 = max(q25, lo)
    b2 = max(q50, b1 + 1 if b1 < hi else b1)
    b3 = max(q75, b2 + 1 if b2 < hi else b2)

    presets = [
        {"label": "Short", "min": lo, "max": min(b1, hi)},
        {"label": "Medium", "min": min(b1 + 1, hi), "max": min(b2, hi)},
        {"label": "Long", "min": min(b2 + 1, hi), "max": min(b3, hi)},
        {"label": "Epic", "min": min(b3 + 1, hi), "max": hi},
    ]
    return {"min": lo, "max": hi, "presets": presets}


def _century_options():
    """Sorted list of every century (birth or death, either era system)
    that actually appears among the loaded poets — for populating the
    filter's century choices."""
    options = {}
    for system in ERA_SYSTEMS:
        centuries = set()
        for entry in _POET_ERA.values():
            for bound in ("birth", "death"):
                c = entry.get(f"{bound}_century_{system}")
                if c is not None:
                    centuries.add(int(c))
        options[system] = sorted(centuries)
    return options


# ---------------------------------------------------------------------------
# Metadata for building the frontend's filter controls
# ---------------------------------------------------------------------------
def get_meta():
    """Everything the filter sidebar needs to populate its controls."""

    poets = (
        _df[["POET_NAME", "POET_RANK"]]
        .drop_duplicates()
        .sort_values("POET_RANK")
        .to_dict(orient="records")
    )

    poem_length = {
        "batches": _poem_length_meta("poem_n_batches"),
        "verses": _poem_length_meta("poem_n_verses"),
    }

    return {
        "poets": poets,
        "meters": sorted(_df["meter"].dropna().unique().tolist()),
        "batch_size": {
            "min": int(_df["BATCH_SIZE"].min()),
            "max": int(_df["BATCH_SIZE"].max()),
        },
        "poet_rank": {
            "min": int(_df["POET_RANK"].min()),
            "max": int(_df["POET_RANK"].max()),
        },
        "poem_length": poem_length,
        "century_options": _century_options(),
        "total_batches": int(len(_df)),
    }


# ---------------------------------------------------------------------------
# Core filter builder
# ---------------------------------------------------------------------------
def _century_mask(birth_col, death_col, wanted_centuries):
    """Boolean mask matching rows whose poet's lifespan overlaps any of the
    wanted centuries. A poet "belongs" to every century between their birth
    and death (inclusive), not just their birth century — e.g. a poet born
    in century 13 and who died in century 14 overlaps both. Rows for poets
    missing era data (not found in the lookup) never match."""
    if not wanted_centuries:
        return pd.Series(True, index=birth_col.index)
    wanted = set(wanted_centuries)

    def matches(birth, death):
        if pd.isna(birth) or pd.isna(death):
            return False
        lo, hi = int(min(birth, death)), int(max(birth, death))
        return any(lo <= c <= hi for c in wanted)

    return pd.Series(
        [matches(b, d) for b, d in zip(birth_col, death_col)],
        index=birth_col.index,
    )


def _int(params, name):
    v = params.get(name)
    return int(v) if v not in (None, "") else None


def _getlist(params, name):
    if hasattr(params, "getlist"):
        val = params.getlist(name)
        return val if val else []
    val = params.get(name)
    if val is None or val == "":
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    return [val]


def _apply_filters(df, params):
    """The full filter/search pipeline, shared by query() and get_stats()."""
    result = df.copy() if not df.empty else df

    # Attach poem-level stats columns for filtering, sorting, and display
    stats = _poem_stats()
    result["poem_n_batches"] = result["poem_no"].map(stats["poem_n_batches"])
    result["poem_n_verses"] = result["poem_no"].map(stats["poem_n_verses"])

    # ---- era / century filters (hijri and/or gregorian) -------------------
    for system in ERA_SYSTEMS:
        wanted = _getlist(params, f"century_{system}")
        if not wanted:
            continue
        birth_col = result["POET_NAME"].map(
            lambda n: _POET_ERA.get(n, {}).get(f"birth_century_{system}")
        )
        death_col = result["POET_NAME"].map(
            lambda n: _POET_ERA.get(n, {}).get(f"death_century_{system}")
        )
        try:
            parsed = [int(c) for c in wanted]
        except (TypeError, ValueError):
            parsed = []
        result = result[_century_mask(birth_col, death_col, parsed)]

    # ---- categorical / exact filters -------------------------------------
    poets = _getlist(params, "poet")
    if poets:
        result = result[result["POET_NAME"].isin(poets)]

    meters = _getlist(params, "meter")
    if meters:
        result = result[result["meter"].isin(meters)]

    # ---- exclusion filters --------------------------------------------------
    exclude_poems = _getlist(params, "exclude_poem")
    if exclude_poems:
        result = result[
            ~result["poem_no"].astype(str).isin([str(p) for p in exclude_poems])
        ]

    exclude_ranks = _getlist(params, "exclude_rank")
    if exclude_ranks:
        parsed_ranks = []
        for r in exclude_ranks:
            try:
                parsed_ranks.append(int(r))
            except (ValueError, TypeError):
                pass
        if parsed_ranks:
            result = result[~result["POET_RANK"].isin(parsed_ranks)]

    # ---- numeric range filters --------------------------------------------
    rank_min, rank_max = _int(params, "rank_min"), _int(params, "rank_max")
    if rank_min is not None:
        result = result[result["POET_RANK"] >= rank_min]
    if rank_max is not None:
        result = result[result["POET_RANK"] <= rank_max]

    bs_min, bs_max = _int(params, "batch_size_min"), _int(params, "batch_size_max")
    if bs_min is not None:
        result = result[result["BATCH_SIZE"] >= bs_min]
    if bs_max is not None:
        result = result[result["BATCH_SIZE"] <= bs_max]

    # ---- poem-length filters -----------------------------------------------
    pb_min, pb_max = _int(params, "poem_batches_min"), _int(params, "poem_batches_max")
    pv_min, pv_max = _int(params, "poem_verses_min"), _int(params, "poem_verses_max")
    if pb_min is not None:
        result = result[result["poem_n_batches"] >= pb_min]
    if pb_max is not None:
        result = result[result["poem_n_batches"] <= pb_max]
    if pv_min is not None:
        result = result[result["poem_n_verses"] >= pv_min]
    if pv_max is not None:
        result = result[result["poem_n_verses"] <= pv_max]

    # ---- free text search over the verses ---------------------------------
    search = (params.get("q") or "").strip()
    if search:
        pattern = re.escape(search)
        result = result[
            result["verse_text"].str.contains(pattern, regex=True, na=False)
        ]

    # ---- first-batch-only: collapse to one representative row per poem ----
    first_batch_only = params.get("first_batch_only") in ("true", "1", "yes")
    if first_batch_only:
        result = result.sort_values("batch_no").drop_duplicates(
            subset="poem_no", keep="first"
        )

    return result


def query(params):
    """
    Filter, search, sort, and paginate the dataset according to `params`.
    Returns (page_of_records, total_matching_rows).
    """
    result = _apply_filters(_df, params)

    # ---- sorting ------------------------------------------------------------
    sort_by = params.get("sort_by", "row_id")
    sort_dir = params.get("sort_dir", "asc")
    valid_sort_cols = {
        "row_id",
        "POET_RANK",
        "BATCH_SIZE",
        "batch_no",
        "poem_n_batches",
        "poem_n_verses",
    }
    if sort_by not in valid_sort_cols:
        sort_by = "row_id"
    result = result.sort_values(by=sort_by, ascending=(sort_dir != "desc"))

    total = len(result)

    # ---- pagination ---------------------------------------------------------
    page = max(_int(params, "page") or 1, 1)
    page_size = min(max(_int(params, "page_size") or 20, 1), 100)
    start = (page - 1) * page_size
    page_df = result.iloc[start : start + page_size]

    records = _to_records(page_df)
    return records, total, page, page_size


# ---------------------------------------------------------------------------
# Aggregate stats (for the overview / legend panel)
# ---------------------------------------------------------------------------
def get_stats(params=None):
    """Counts and top-poets for the overview panel, honoring the filters."""
    if params is not None:
        result = _apply_filters(_df, params)
    else:
        result = _df

    top_poets = (
        result.groupby("POET_NAME", sort=False)
        .size()
        .sort_values(ascending=False)
        .head(10)
    )

    return {
        "matching_batches": int(len(result)),
        "top_poets": [{"poet": p, "count": int(n)} for p, n in top_poets.items()],
    }


# ---------------------------------------------------------------------------
# Single batch lookup (for a detail view / deep link)
# ---------------------------------------------------------------------------
def get_batch(row_id):
    row = _df[_df["row_id"] == row_id]
    if row.empty:
        return None
    return _to_records(row)[0]


def _to_records(page_df):
    """Convert a DataFrame slice into plain JSON-safe dicts."""
    records = []
    for row in page_df.to_dict(orient="records"):
        records.append(
            {
                "row_id": row["row_id"],
                "poet_name": row["POET_NAME"],
                "poet_rank": row["POET_RANK"],
                "poem_no": row["poem_no"],
                "batch_no": row["batch_no"],
                "meter": row["meter"],
                "batch_size": row["BATCH_SIZE"],
                "poem_num_batches": int(row.get("poem_n_batches", 1)),
                "poem_total_verses": int(row.get("poem_n_verses", row["BATCH_SIZE"])),
                "verses": [
                    {
                        "sadr": v.get("sadr", "").strip(),
                        "ajuz": v.get("ajuz", "").strip(),
                    }
                    for v in row["DATA"]
                ],
            }
        )
    return records
