"""
Integration sanity tests for data_loader.py against the real dataset.

Per docs/TESTING_STRATEGY.md §2.1 / §2.5: these import `data_loader` as-is
(paying the real load cost once per session) and assert on shape/invariants
only. They deliberately do NOT assert exact row counts, since the dataset is
a fixture this test suite doesn't own and may be swapped later.
"""

import pandas as pd
from werkzeug.datastructures import MultiDict

import data_loader


class TestDatasetInvariants:
    def test_dataset_is_nonempty(self):
        assert len(data_loader._df) > 0

    def test_row_id_is_unique_and_dense(self):
        row_ids = sorted(data_loader._df["row_id"].tolist())
        assert row_ids == list(range(len(data_loader._df)))

    def test_every_row_has_a_mood_tag_list(self):
        # mood_tags may legitimately be empty for some rows, but the column
        # itself must be present and list-typed for every row.
        assert data_loader._df["mood_tags"].apply(lambda t: isinstance(t, list)).all()

    def test_every_axis_confidence_column_is_present_and_populated(self):
        # Despite the name, these are z-score-derived values and can be
        # negative, so we only assert presence/dtype here, not a range.
        for axis in data_loader.AXES:
            col = data_loader._df[f"{axis}_confidence"]
            assert col.notna().all()
            assert pd.api.types.is_float_dtype(col)

    def test_verse_text_column_exists_and_is_string(self):
        assert "verse_text" in data_loader._df.columns
        assert data_loader._df["verse_text"].apply(lambda s: isinstance(s, str)).all()

    def test_poet_rank_is_positive_int(self):
        assert (data_loader._df["POET_RANK"] > 0).all()


class TestGetMetaSanity:
    def test_get_meta_shape(self):
        meta = data_loader.get_meta()
        expected_keys = {
            "poets", "meters", "mood_tags", "genre_tags", "energy_tags",
            "aesthetic_tags", "batch_size", "poet_rank", "total_batches",
        }
        assert expected_keys.issubset(meta.keys())
        assert meta["total_batches"] == len(data_loader._df)
        assert len(meta["poets"]) > 0
        assert meta["batch_size"]["min"] <= meta["batch_size"]["max"]
        assert meta["poet_rank"]["min"] <= meta["poet_rank"]["max"]


class TestQuerySanityOnRealData:
    def test_query_no_params_returns_a_page(self):
        records, total, page, page_size = data_loader.query(MultiDict())
        assert total == len(data_loader._df)
        assert len(records) == page_size

    def test_query_nonsense_filter_returns_empty_not_error(self):
        records, total, page, page_size = data_loader.query(
            MultiDict({"poet": "___definitely_not_a_real_poet___"})
        )
        assert total == 0
        assert records == []

    def test_query_search_for_nonsense_string_returns_empty(self):
        records, total, page, page_size = data_loader.query(
            MultiDict({"q": "___definitely_not_in_any_verse___"})
        )
        assert total == 0


class TestGetBatchOnRealData:
    def test_first_row_id_resolves(self):
        batch = data_loader.get_batch(0)
        assert batch is not None
        assert batch["row_id"] == 0

    def test_absurdly_large_row_id_returns_none(self):
        assert data_loader.get_batch(999_999_999) is None
