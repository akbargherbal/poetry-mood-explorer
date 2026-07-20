"""
data_loader.py
--------------
Loads the mood-labeled Arabic poetry dataset once at process start-up and
exposes a small query layer built entirely on top of the pandas API:
boolean masking, .isin(), .apply(), .explode(), .sort_values(),
.groupby(), and vectorized string search.

Everything the Flask routes need lives here so app.py stays a thin
HTTP layer.
"""

import os
import re
import pandas as pd

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl",
)

AXES = ["mood", "genre", "energy", "aesthetic"]

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
# Metadata for building the frontend's filter controls
# ---------------------------------------------------------------------------
def get_meta():
    """Everything the filter sidebar needs to populate its controls."""

    def tag_vocab(col):
        # .explode() turns each list-cell into its own row, then value_counts
        # gives us both the vocabulary AND how common each tag is.
        counts = _df[col].explode().value_counts()
        return [{"tag": tag, "count": int(n)} for tag, n in counts.items()]

    poets = (
        _df[["POET_NAME", "POET_RANK"]]
        .drop_duplicates()
        .sort_values("POET_RANK")
        .to_dict(orient="records")
    )

    return {
        "poets": poets,
        "meters": sorted(_df["meter"].dropna().unique().tolist()),
        "mood_tags": tag_vocab("mood_tags"),
        "genre_tags": tag_vocab("genre_tags"),
        "energy_tags": tag_vocab("energy_tags"),
        "aesthetic_tags": tag_vocab("aesthetic_tags"),
        "batch_size": {
            "min": int(_df["BATCH_SIZE"].min()),
            "max": int(_df["BATCH_SIZE"].max()),
        },
        "poet_rank": {
            "min": int(_df["POET_RANK"].min()),
            "max": int(_df["POET_RANK"].max()),
        },
        "total_batches": int(len(_df)),
    }


# ---------------------------------------------------------------------------
# Core filter builder
# ---------------------------------------------------------------------------
def _tag_mask(series, wanted, mode):
    """Boolean mask for a list-valued column against a list of wanted tags."""
    if not wanted:
        return pd.Series(True, index=series.index)
    wanted = set(wanted)
    if mode == "all":
        return series.apply(lambda tags: wanted.issubset(set(tags)))
    # default: "any"
    return series.apply(lambda tags: not wanted.isdisjoint(set(tags)))


def query(params):
    """
    Filter, search, sort, and paginate the dataset according to `params`
    (a plain dict, typically flask's request.args). Returns
    (page_of_records, total_matching_rows).
    """
    result = _df

    # ---- categorical / exact filters -------------------------------------
    poets = params.getlist("poet") if hasattr(params, "getlist") else params.get("poet")
    if poets:
        result = result[result["POET_NAME"].isin(poets)]

    meters = (
        params.getlist("meter") if hasattr(params, "getlist") else params.get("meter")
    )
    if meters:
        result = result[result["meter"].isin(meters)]

    # ---- numeric range filters --------------------------------------------
    def _int(name):
        v = params.get(name)
        return int(v) if v not in (None, "") else None

    rank_min, rank_max = _int("rank_min"), _int("rank_max")
    if rank_min is not None:
        result = result[result["POET_RANK"] >= rank_min]
    if rank_max is not None:
        result = result[result["POET_RANK"] <= rank_max]

    bs_min, bs_max = _int("batch_size_min"), _int("batch_size_max")
    if bs_min is not None:
        result = result[result["BATCH_SIZE"] >= bs_min]
    if bs_max is not None:
        result = result[result["BATCH_SIZE"] <= bs_max]

    # ---- tag filters (mood / genre / energy / aesthetic) ------------------
    for axis in AXES:
        wanted = (
            params.getlist(f"{axis}_tags")
            if hasattr(params, "getlist")
            else params.get(f"{axis}_tags")
        )
        if wanted:
            mode = params.get(f"{axis}_mode", "any")
            result = result[_tag_mask(result[f"{axis}_tags"], wanted, mode)]

    # ---- low-confidence toggles --------------------------------------------
    for axis in AXES:
        flag = params.get(f"{axis}_low_confidence")
        if flag in ("true", "1", "yes"):
            result = result[result[f"{axis}_low_confidence"] == True]  # noqa: E712
        elif flag in ("false", "0", "no"):
            result = result[result[f"{axis}_low_confidence"] == False]  # noqa: E712

    # ---- free text search over the verses ---------------------------------
    search = (params.get("q") or "").strip()
    if search:
        # Simple case-sensitive substring match is enough for Arabic text
        # (no case folding needed) and is fast via a vectorized str.contains.
        pattern = re.escape(search)
        result = result[
            result["verse_text"].str.contains(pattern, regex=True, na=False)
        ]

    # ---- sorting ------------------------------------------------------------
    sort_by = params.get("sort_by", "row_id")
    sort_dir = params.get("sort_dir", "asc")
    valid_sort_cols = {
        "row_id",
        "POET_RANK",
        "BATCH_SIZE",
        "batch_no",
        "mood_confidence",
        "genre_confidence",
        "energy_confidence",
        "aesthetic_confidence",
        "mood_top2_gap",
        "genre_top2_gap",
        "energy_top2_gap",
        "aesthetic_top2_gap",
    }
    if sort_by not in valid_sort_cols:
        sort_by = "row_id"
    result = result.sort_values(by=sort_by, ascending=(sort_dir != "desc"))

    total = len(result)

    # ---- pagination -----------------------------------------------------
    page = max(_int("page") or 1, 1)
    page_size = min(max(_int("page_size") or 20, 1), 100)
    start = (page - 1) * page_size
    page_df = result.iloc[start : start + page_size]

    records = _to_records(page_df)
    return records, total, page, page_size


# ---------------------------------------------------------------------------
# Aggregate stats (for the overview / legend panel)
# ---------------------------------------------------------------------------
def get_stats(params=None):
    """Tag-frequency breakdown per axis, honoring the current filters so the
    stats panel reflects what's actually on screen (minus pagination)."""
    if params is not None:
        # Reuse query() filtering logic but skip pagination — cheap trick:
        # call query with a huge page_size, but that copies data twice.
        # Instead we recompute the filtered frame directly.
        result = _filtered_frame(params)
    else:
        result = _df

    def dist(col):
        counts = result[col].explode().value_counts()
        return [{"tag": t, "count": int(n)} for t, n in counts.items()]

    top_poets = (
        result.groupby("POET_NAME", sort=False)
        .size()
        .sort_values(ascending=False)
        .head(10)
    )

    return {
        "matching_batches": int(len(result)),
        "mood_tags": dist("mood_tags"),
        "genre_tags": dist("genre_tags"),
        "energy_tags": dist("energy_tags"),
        "aesthetic_tags": dist("aesthetic_tags"),
        "top_poets": [{"poet": p, "count": int(n)} for p, n in top_poets.items()],
    }


def _filtered_frame(params):
    """Same filtering pipeline as query(), minus sort/paginate, returned as a
    DataFrame for aggregate stats."""
    result = _df

    poets = params.getlist("poet") if hasattr(params, "getlist") else params.get("poet")
    if poets:
        result = result[result["POET_NAME"].isin(poets)]

    meters = (
        params.getlist("meter") if hasattr(params, "getlist") else params.get("meter")
    )
    if meters:
        result = result[result["meter"].isin(meters)]

    def _int(name):
        v = params.get(name)
        return int(v) if v not in (None, "") else None

    rank_min, rank_max = _int("rank_min"), _int("rank_max")
    if rank_min is not None:
        result = result[result["POET_RANK"] >= rank_min]
    if rank_max is not None:
        result = result[result["POET_RANK"] <= rank_max]

    bs_min, bs_max = _int("batch_size_min"), _int("batch_size_max")
    if bs_min is not None:
        result = result[result["BATCH_SIZE"] >= bs_min]
    if bs_max is not None:
        result = result[result["BATCH_SIZE"] <= bs_max]

    for axis in AXES:
        wanted = (
            params.getlist(f"{axis}_tags")
            if hasattr(params, "getlist")
            else params.get(f"{axis}_tags")
        )
        if wanted:
            mode = params.get(f"{axis}_mode", "any")
            result = result[_tag_mask(result[f"{axis}_tags"], wanted, mode)]

    for axis in AXES:
        flag = params.get(f"{axis}_low_confidence")
        if flag in ("true", "1", "yes"):
            result = result[result[f"{axis}_low_confidence"] == True]  # noqa: E712
        elif flag in ("false", "0", "no"):
            result = result[result[f"{axis}_low_confidence"] == False]  # noqa: E712

    search = (params.get("q") or "").strip()
    if search:
        pattern = re.escape(search)
        result = result[
            result["verse_text"].str.contains(pattern, regex=True, na=False)
        ]

    return result


# ---------------------------------------------------------------------------
# Single batch lookup (for a detail view / deep link)
# ---------------------------------------------------------------------------
def get_batch(row_id):
    row = _df[_df["row_id"] == row_id]
    if row.empty:
        return None
    return _to_records(row)[0]


def _to_records(page_df):
    """Convert a DataFrame slice into plain JSON-safe dicts, reshaping the
    verse list into the {sadr, ajuz} pairs the frontend renders."""
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
                "verses": [
                    {
                        "sadr": v.get("sadr", "").strip(),
                        "ajuz": v.get("ajuz", "").strip(),
                    }
                    for v in row["DATA"]
                ],
                "mood": {
                    "tags": row["mood_tags"],
                    "confidence": round(float(row["mood_confidence"]), 3),
                    "top2_gap": round(float(row["mood_top2_gap"]), 3),
                    "low_confidence": bool(row["mood_low_confidence"]),
                    "scores": row["mood_scores"],
                },
                "genre": {
                    "tags": row["genre_tags"],
                    "confidence": round(float(row["genre_confidence"]), 3),
                    "top2_gap": round(float(row["genre_top2_gap"]), 3),
                    "low_confidence": bool(row["genre_low_confidence"]),
                    "scores": row["genre_scores"],
                },
                "energy": {
                    "tags": row["energy_tags"],
                    "confidence": round(float(row["energy_confidence"]), 3),
                    "top2_gap": round(float(row["energy_top2_gap"]), 3),
                    "low_confidence": bool(row["energy_low_confidence"]),
                    "scores": row["energy_scores"],
                },
                "aesthetic": {
                    "tags": row["aesthetic_tags"],
                    "confidence": round(float(row["aesthetic_confidence"]), 3),
                    "top2_gap": round(float(row["aesthetic_top2_gap"]), 3),
                    "low_confidence": bool(row["aesthetic_low_confidence"]),
                    "scores": row["aesthetic_scores"],
                },
                "flagged_axes": row["flagged_axes"],
                "suno_tags": row["suno_tags"],
            }
        )
    return records
