"""
Logic tests for data_loader.py, run against `synthetic_df` (see conftest.py).

Per docs/TESTING_STRATEGY.md §2.4, this file covers:
  - query(): each filter independently, two filters combined, pagination
    boundaries, sorting by each allowed column in both directions,
    exclude poem/rank, poem verse filtering, and first batch only.
  - get_stats(): aggregation against a hand-computed expected value.
  - get_batch(): valid row_id, out-of-range row_id.
"""

import pandas as pd
import pytest
from werkzeug.datastructures import MultiDict

import data_loader


def params(**kwargs):
    """Build a MultiDict the way Flask's request.args would look, from
    kwargs where list values become repeated keys."""
    items = []
    for key, value in kwargs.items():
        if isinstance(value, (list, tuple)):
            for v in value:
                items.append((key, str(v)))
        elif value is not None:
            items.append((key, str(value)))
    return MultiDict(items)


# ---------------------------------------------------------------------------
# query() - categorical / exact filters
# ---------------------------------------------------------------------------
class TestQueryFilters:
    def test_filter_by_poet(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(poet="Alpha"))
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Alpha"}

    def test_filter_by_multiple_poets(self, synthetic_df):
        records, total, page, page_size = data_loader.query(
            params(poet=["Alpha", "Gamma"])
        )
        assert total == 4
        assert {r["poet_name"] for r in records} == {"Alpha", "Gamma"}

    def test_filter_by_meter(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(meter="kamil"))
        assert total == 2
        assert all(r["meter"] == "kamil" for r in records)

    def test_filter_by_rank_range(self, synthetic_df):
        # Alpha & Beta are rank 1 (dup rank), Gamma is rank 3
        records, total, page, page_size = data_loader.query(
            params(rank_min=2, rank_max=3)
        )
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Gamma"}

    def test_filter_by_rank_min_only(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(rank_min=3))
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Gamma"}

    def test_filter_by_batch_size_range(self, synthetic_df):
        # BATCH_SIZE values: 10, 5, 20, 15, 8, 25
        records, total, page, page_size = data_loader.query(
            params(batch_size_min=10, batch_size_max=20)
        )
        assert total == 3
        assert sorted(r["batch_size"] for r in records) == [10, 15, 20]

    def test_two_filters_combined(self, synthetic_df):
        # poet=Alpha AND batch_size>=8 -> only row 0 (Alpha, batch of 10)
        records, total, page, page_size = data_loader.query(
            params(poet="Alpha", batch_size_min=8)
        )
        assert total == 1
        assert records[0]["poet_name"] == "Alpha"
        assert records[0]["batch_size"] == 10

    def test_free_text_search_multiple_hits(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(q="nightingale"))
        assert total == 2
        assert {r["row_id"] for r in records} == {0, 5}

    def test_free_text_search_single_hit(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(q="desert"))
        assert total == 1
        assert records[0]["row_id"] == 2

    def test_free_text_search_no_hits(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(q="xyznotpresent"))
        assert total == 0
        assert records == []

    def test_free_text_search_blank_string_matches_all(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(q="   "))
        assert total == len(synthetic_df)


# ---------------------------------------------------------------------------
# query() - exclusion filters
# ---------------------------------------------------------------------------
class TestQueryExclusions:
    def test_exclude_poem_by_id(self, synthetic_df):
        records, total, *_ = data_loader.query(params(exclude_poem="p2"))
        assert total == 4
        assert {r["poem_no"] for r in records} == {"p1", "p3"}

    def test_exclude_poet_rank(self, synthetic_df):
        # Alpha and Beta are rank 1, Gamma is rank 3
        records, total, *_ = data_loader.query(params(exclude_rank=1))
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Gamma"}

    def test_exclude_rank_combined_with_rank_min(self, synthetic_df):
        records, total, *_ = data_loader.query(params(rank_min=1, exclude_rank=1))
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Gamma"}


# ---------------------------------------------------------------------------
# query() - poem-level filtering & first batch only
# ---------------------------------------------------------------------------
class TestQueryPoemLevel:
    def test_poem_verses_min_filter(self, synthetic_df):
        # p1: 15 verses, p2: 35 verses, p3: 33 verses
        records, total, *_ = data_loader.query(params(poem_verses_min=30))
        assert total == 4
        assert {r["poem_no"] for r in records} == {"p2", "p3"}

    def test_poem_verses_max_filter(self, synthetic_df):
        records, total, *_ = data_loader.query(params(poem_verses_max=20))
        assert total == 2
        assert {r["poem_no"] for r in records} == {"p1"}

    def test_first_batch_only(self, synthetic_df):
        records, total, *_ = data_loader.query(params(first_batch_only="1"))
        assert total == 3
        assert {r["row_id"] for r in records} == {0, 2, 4}
        assert all(r["batch_no"] == 0 for r in records)


# ---------------------------------------------------------------------------
# _century_mask
# ---------------------------------------------------------------------------
class TestCenturyMask:
    def test_single_century_within_range_matches(self):
        birth = pd.Series([13, 12, 14])
        death = pd.Series([14, 12, 15])
        mask = data_loader._century_mask(birth, death, [13])
        assert list(mask) == [True, False, False]

    def test_century_matching_upper_boundary_matches(self):
        # a poet's death century is an inclusive boundary
        birth = pd.Series([13])
        death = pd.Series([14])
        mask = data_loader._century_mask(birth, death, [14])
        assert list(mask) == [True]

    def test_multiple_wanted_centuries_is_any_match(self):
        birth = pd.Series([12, 13, 20])
        death = pd.Series([12, 14, 20])
        mask = data_loader._century_mask(birth, death, [12, 20])
        assert list(mask) == [True, False, True]

    def test_empty_wanted_matches_everything(self):
        birth = pd.Series([12, 13])
        death = pd.Series([12, 14])
        mask = data_loader._century_mask(birth, death, [])
        assert mask.all()

    def test_missing_era_data_never_matches(self):
        birth = pd.Series([13, None])
        death = pd.Series([14, None])
        mask = data_loader._century_mask(birth, death, [13])
        assert list(mask) == [True, False]


# ---------------------------------------------------------------------------
# query() - era / century filters
# ---------------------------------------------------------------------------
class TestQueryEraFilters:
    def test_filter_by_single_hijri_century(self, synthetic_df):
        # Beta's hijri range is [12,12]; only Beta qualifies for century 12
        records, total, *_ = data_loader.query(params(century_hijri=12))
        assert total == 2
        assert {r["poet_name"] for r in records} == {"Beta"}

    def test_filter_by_hijri_century_at_range_boundary(self, synthetic_df):
        # century 14 is Alpha's death century AND Gamma's birth century ->
        # both should match (inclusive boundary on both ends)
        records, total, *_ = data_loader.query(params(century_hijri=14))
        assert total == 4
        assert {r["poet_name"] for r in records} == {"Alpha", "Gamma"}

    def test_filter_by_multiple_hijri_centuries_is_any_match(self, synthetic_df):
        records, total, *_ = data_loader.query(params(century_hijri=[12, 15]))
        assert total == 4
        assert {r["poet_name"] for r in records} == {"Beta", "Gamma"}

    def test_filter_by_gregorian_century(self, synthetic_df):
        # gregorian 19 overlaps Alpha [19,20] and Beta [18,19]
        records, total, *_ = data_loader.query(params(century_gregorian=19))
        assert total == 4
        assert {r["poet_name"] for r in records} == {"Alpha", "Beta"}

    def test_combining_hijri_and_gregorian_century_filters(self, synthetic_df):
        # hijri=14 -> Alpha, Gamma ; gregorian=20 -> Alpha, Gamma -> both agree
        records, total, *_ = data_loader.query(
            params(century_hijri=14, century_gregorian=20)
        )
        assert total == 4
        assert {r["poet_name"] for r in records} == {"Alpha", "Gamma"}

    def test_combining_contradictory_century_filters_returns_empty(self, synthetic_df):
        # hijri=12 -> Beta only ; gregorian=20 -> Alpha, Gamma -> no overlap
        records, total, *_ = data_loader.query(
            params(century_hijri=12, century_gregorian=20)
        )
        assert total == 0

    def test_poet_missing_from_era_lookup_is_excluded(self, synthetic_df):
        # Add a row for a poet with no era data and confirm it never
        # matches any century filter.
        extra = synthetic_df.iloc[[0]].copy()
        extra["POET_NAME"] = "Unknown Poet"
        extra["row_id"] = 999
        combined = pd.concat([synthetic_df, extra], ignore_index=True)
        original_df = data_loader._df
        data_loader._df = combined
        try:
            records, total, *_ = data_loader.query(params(century_hijri=13))
            assert "Unknown Poet" not in {r["poet_name"] for r in records}
        finally:
            data_loader._df = original_df

    def test_no_century_param_does_not_filter(self, synthetic_df):
        records, total, *_ = data_loader.query(params())
        assert total == len(synthetic_df)


# ---------------------------------------------------------------------------
# query() - pagination
# ---------------------------------------------------------------------------
class TestQueryPagination:
    def test_page_beyond_last_page_returns_empty_but_keeps_total(self, synthetic_df):
        records, total, page, page_size = data_loader.query(
            params(page=99, page_size=20)
        )
        assert total == len(synthetic_df)
        assert records == []
        assert page == 99

    def test_page_size_clipped_to_max_100(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(page_size=500))
        assert page_size == 100

    def test_page_size_zero_falls_back_to_default(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(page_size=0))
        assert page_size == 20

    def test_page_size_negative_clipped_to_min_1(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(page_size=-5))
        assert page_size == 1
        assert len(records) == 1

    def test_page_clipped_to_min_1(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params(page=0))
        assert page == 1

    def test_default_pagination(self, synthetic_df):
        records, total, page, page_size = data_loader.query(params())
        assert page == 1
        assert page_size == 20
        assert len(records) == len(synthetic_df)


# ---------------------------------------------------------------------------
# query() - sorting
# ---------------------------------------------------------------------------
class TestQuerySorting:
    SORT_COLS = [
        "row_id",
        "POET_RANK",
        "BATCH_SIZE",
        "batch_no",
        "poem_n_batches",
        "poem_n_verses",
    ]

    @pytest.mark.parametrize("col", SORT_COLS)
    def test_sort_ascending(self, synthetic_df, col):
        records, *_ = data_loader.query(
            params(sort_by=col, sort_dir="asc", page_size=10)
        )
        values = [r["row_id"] for r in records]
        expected = list(synthetic_df.sort_values(by=col, ascending=True)["row_id"])
        assert values == expected

    @pytest.mark.parametrize("col", SORT_COLS)
    def test_sort_descending(self, synthetic_df, col):
        records, *_ = data_loader.query(
            params(sort_by=col, sort_dir="desc", page_size=10)
        )
        values = [r["row_id"] for r in records]
        expected = list(synthetic_df.sort_values(by=col, ascending=False)["row_id"])
        assert values == expected

    def test_invalid_sort_by_falls_back_to_row_id(self, synthetic_df):
        records, *_ = data_loader.query(
            params(sort_by="not_a_real_column", page_size=10)
        )
        values = [r["row_id"] for r in records]
        assert values == sorted(values)

    def test_default_sort_is_row_id_ascending(self, synthetic_df):
        records, *_ = data_loader.query(params(page_size=10))
        values = [r["row_id"] for r in records]
        assert values == list(range(len(synthetic_df)))


# ---------------------------------------------------------------------------
# get_stats()
# ---------------------------------------------------------------------------
class TestGetStats:
    def test_aggregation_matches_hand_computed_values(self, synthetic_df):
        stats = data_loader.get_stats()

        assert stats["matching_batches"] == 6

        top_poets = {d["poet"]: d["count"] for d in stats["top_poets"]}
        assert top_poets == {"Alpha": 2, "Beta": 2, "Gamma": 2}

    def test_stats_honor_filters(self, synthetic_df):
        stats = data_loader.get_stats(params(poet="Alpha"))
        assert stats["matching_batches"] == 2
        top_poets = {d["poet"]: d["count"] for d in stats["top_poets"]}
        assert top_poets == {"Alpha": 2}

    def test_stats_without_params_uses_full_frame(self, synthetic_df):
        stats = data_loader.get_stats(None)
        assert stats["matching_batches"] == len(synthetic_df)


# ---------------------------------------------------------------------------
# get_batch()
# ---------------------------------------------------------------------------
class TestGetBatch:
    def test_valid_row_id(self, synthetic_df):
        batch = data_loader.get_batch(2)
        assert batch is not None
        assert batch["row_id"] == 2
        assert batch["poet_name"] == "Beta"

    def test_out_of_range_row_id_returns_none(self, synthetic_df):
        assert data_loader.get_batch(999999) is None

    def test_negative_row_id_returns_none(self, synthetic_df):
        assert data_loader.get_batch(-1) is None
