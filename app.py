"""
Arabic Poetry Mood Explorer
----------------------------
A small Flask app for browsing the ~24k mood-labeled verse-batches from
the TOP_100_ARABIC_POETS_OF_ALL_TIME dataset. All filtering/sorting/search
logic lives in data_loader.py and is built on top of pandas.

Run:
    python app.py
Then open http://127.0.0.1:5000
"""

from flask import Flask, render_template, jsonify, request

import data_loader

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/meta")
def api_meta():
    return jsonify(data_loader.get_meta())


@app.route("/api/search")
def api_search():
    records, total, page, page_size = data_loader.query(request.args)
    return jsonify(
        {
            "results": records,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }
    )


@app.route("/api/stats")
def api_stats():
    return jsonify(data_loader.get_stats(request.args))


@app.route("/api/batch/<int:row_id>")
def api_batch(row_id):
    batch = data_loader.get_batch(row_id)
    if batch is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(batch)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
