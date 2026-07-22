"""
Logic tests for data_loader.py, run against `synthetic_df` (see conftest.py).

Per docs/TESTING_STRATEGY.md §2.4, this file covers:
  - _tag_mask: any/all modes, empty wanted, tag absent from every row.
  - query(): each filter independently, two filters combined, pagination
    boundaries, sorting by each allowed column in both directions,
    confidence ranges, exclude poem/rank, poem verse filtering, and first batch only.
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
# _tag_mask
# ---------------------------------------------------------------------------
class TestTagMask:
    def test_any_mode_matches_rows_with_at_least_one_wanted_tag(self, synthetic_df):
        mask = data_loader._tag_mask(synthetic_df["mood_tags"], ["sad"], "any")
        # rows 0 and 2 have "sad" in their mood_tags
        assert list(synthetic_df[mask]["row_id"]) == [0, 2]

    def test_all_mode_requires_every_wanted_tag_present(self, synthetic_df):
        mask = data_loader._tag_mask(synthetic_df["mood_tags"], ["joy", "sad"], "all")
        # only row 2 has both "joy" and "sad"
        assert list(synthetic_df[mask]["row_id"]) == [2]

    def test_all_mode_no_match_when_tags_split_across_rows(self, synthetic_df):
        # "joy" appears alone in rows 1/5, "sad" alone (combined w/ longing)
        # in row 0; nothing has ["joy", "longing"] together.
        mask = data_loader._tag_mask(
            synthetic_df["mood_tags"], ["joy", "longing"], "all"
        )
        assert not mask.any()

    def test_empty_wanted_matches_everything(self, synthetic_df):
        mask = data_loader._tag_mask(synthetic_df["mood_tags"], [], "any")
        assert mask.all()
        assert len(mask) == len(synthetic_df)

    def test_tag_not_present_in_any_row_matches_nothing(self, synthetic_df):
        mask = data_loader._tag_mask(
            synthetic_df["mood_tags"], ["nonexistent_tag"], "any"
        )
        assert not mask.any()


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

    def test_filter_by_axis_tags_any_mode(self, synthetic_df):
        records, total, page, page_size = data_loader.query(
            params(mood_tags=["sad"], mood_mode="any")
        )
        assert total == 2

    def test_filter_by_axis_tags_all_mode(self, synthetic_df):
        records, total, page, page_size = data_loader.query(
            params(mood_tags=["joy", "sad"], mood_mode="all")
        )
        assert total == 1

    def test_filter_by_axis_tags_default_mode_is_any(self, synthetic_df):
        # no explicit mood_mode -> defaults to "any"
        records, total, page, page_size = data_loader.query(params(mood_tags=["sad"]))
        assert total == 2

    def test_two_filters_combined(self, synthetic_df):
        # poet=Beta AND genre_tags=love -> only row 2 (Beta/p2/batch0)
        records, total, page, page_size = data_loader.query(
            params(poet="Beta", genre_tags=["love"])
        )
        assert total == 1
        assert records[0]["poet_name"] == "Beta"
        assert "love" in records[0]["genre"]["tags"]

    def test_low_confidence_true_filter(self, synthetic_df):
        # mood_low_confidence True on rows 0 and 3
        records, total, page, page_size = data_loader.query(
            params(mood_low_confidence="true")
        )
        assert total == 2
        assert all(r["mood"]["low_confidence"] for r in records)

    def test_low_confidence_false_filter(self, synthetic_df):
        records, total, page, page_size = data_loader.query(
            params(mood_low_confidence="false")
        )
        assert total == 4
        assert all(not r["mood"]["low_confidence"] for r in records)

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
# query() - confidence range filters
# ---------------------------------------------------------------------------
class TestQueryConfidenceRanges:
    def test_filter_by_confidence_min(self, synthetic_df):
        # confs across rows are 0.1, 0.2, 0.3, 0.4, 0.5, 0.6
        records, total, *_ = data_loader.query(params(mood_confidence_min=0.4))
        assert total == 3
        assert {r["row_id"] for r in records} == {3, 4, 5}

    def test_filter_by_confidence_max(self, synthetic_df):
        records, total, *_ = data_loader.query(params(mood_confidence_max=0.3))
        assert total == 3
        assert {r["row_id"] for r in records} == {0, 1, 2}

    def test_filter_by_confidence_range(self, synthetic_df):
        records, total, *_ = data_loader.query(
            params(mood_confidence_min=0.2, mood_confidence_max=0.4)
        )
        assert total == 3
        assert {r["row_id"] for r in records} == {1, 2, 3}


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
        "mood_confidence",
        "genre_confidence",
        "energy_confidence",
        "aesthetic_confidence",
        "mood_top2_gap",
        "genre_top2_gap",
        "energy_top2_gap",
        "aesthetic_top2_gap",
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

        mood_dist = {d["tag"]: d["count"] for d in stats["mood_tags"]}
        assert mood_dist == {"sad": 2, "longing": 1, "joy": 3, "pessimism": 1}

        genre_dist = {d["tag"]: d["count"] for d in stats["genre_tags"]}
        assert genre_dist == {"praise": 1, "love": 2, "satire": 1, "elegy": 1}

        energy_dist = {d["tag"]: d["count"] for d in stats["energy_tags"]}
        assert energy_dist == {"calm": 2, "energetic": 1, "moderate": 1, "intense": 1}

        aesthetic_dist = {d["tag"]: d["count"] for d in stats["aesthetic_tags"]}
        assert aesthetic_dist == {
            "melancholy": 1,
            "epic": 1,
            "military": 1,
            "spiritual": 1,
            "romantic": 1,
        }

        top_poets = {d["poet"]: d["count"] for d in stats["top_poets"]}
        assert top_poets == {"Alpha": 2, "Beta": 2, "Gamma": 2}

    def test_stats_honor_filters(self, synthetic_df):
        stats = data_loader.get_stats(params(poet="Alpha"))
        assert stats["matching_batches"] == 2
        mood_dist = {d["tag"]: d["count"] for d in stats["mood_tags"]}
        assert mood_dist == {"sad": 1, "longing": 1, "joy": 1}

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
