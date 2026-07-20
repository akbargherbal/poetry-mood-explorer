"""
Flask route tests, per docs/TESTING_STRATEGY.md §2.4 ("app.py"). Uses the
session-scoped `client` fixture (real data) from conftest.py.
"""

import pytest


class TestIndexRoute:
    def test_index_returns_200_html(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "text/html" in resp.content_type


class TestMetaRoute:
    def test_meta_returns_200_json_with_expected_keys(self, client):
        resp = client.get("/api/meta")
        assert resp.status_code == 200
        assert resp.content_type.startswith("application/json")
        data = resp.get_json()
        expected_keys = {
            "poets", "meters", "mood_tags", "genre_tags", "energy_tags",
            "aesthetic_tags", "batch_size", "poet_rank", "total_batches",
        }
        assert expected_keys.issubset(data.keys())


class TestSearchRoute:
    def test_search_no_params_has_expected_shape(self, client):
        resp = client.get("/api/search")
        assert resp.status_code == 200
        data = resp.get_json()
        assert {"results", "total", "page", "page_size", "total_pages"} <= data.keys()

    def test_search_total_pages_consistent_with_total_and_page_size(self, client):
        resp = client.get("/api/search?page_size=25")
        data = resp.get_json()
        expected_total_pages = max(1, (data["total"] + data["page_size"] - 1) // data["page_size"])
        assert data["total_pages"] == expected_total_pages
        assert data["page_size"] == 25

    def test_search_nonsense_filter_returns_200_empty_not_500(self, client):
        resp = client.get("/api/search?poet=___definitely_not_a_real_poet___")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["results"] == []
        assert data["total"] == 0

    def test_search_non_numeric_rank_min_currently_500s(self, client):
        # KNOWN ISSUE (found while writing this suite, not in the testing
        # strategy's original scope): data_loader._int() calls int(v)
        # unguarded, so a non-numeric value for a numeric param (e.g.
        # rank_min=not_a_number) raises ValueError and Flask turns it into
        # a 500, rather than the "200 with empty results" behavior the
        # strategy specifies for nonsense *filter* values (e.g. an unknown
        # poet name). This test pins down the current behavior so a future
        # fix shows up as a deliberate, visible change here rather than a
        # silent regression.
        # With app.config["TESTING"] = True, Flask propagates the exception
        # to the test client rather than converting it to a 500 response
        # (that's TESTING's documented behavior), so we assert on the
        # underlying exception instead of a status code.
        with pytest.raises(ValueError):
            client.get("/api/search?rank_min=not_a_number")


class TestStatsRoute:
    def test_stats_returns_200_json(self, client):
        resp = client.get("/api/stats")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "matching_batches" in data
        assert "top_poets" in data


class TestBatchRoute:
    def test_valid_batch_id_returns_200(self, client):
        resp = client.get("/api/batch/0")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["row_id"] == 0

    def test_out_of_range_batch_id_returns_404_with_error_body(self, client):
        resp = client.get("/api/batch/999999999")
        assert resp.status_code == 404
        data = resp.get_json()
        assert "error" in data
