PUT YOUR DATA FILE HERE
=======================

This app expects the following file to exist in this exact folder,
with this exact name:

    TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_core.pkl

It was removed from this zip to keep the download small. Copy your own
copy of the file here (e.g. from the akbargherbal/arabic-poetry-mood-labeling
repo) before running `python app.py`.

Expected shape: ~21,868 rows x 7 columns, produced by pandas.to_pickle().
The seven columns are: POET_NAME, poem_no, batch_no, POET_RANK, meter,
DATA, BATCH_SIZE.

(The original mood-labeled variant — TOP_100_ARABIC_POETS_OF_ALL_TIME_STAGE_02_mood_labeled.pkl —
is no longer used. The mood/genre/energy/aesthetic labeling system was removed;
see mood-system-removal-plan.md.)
