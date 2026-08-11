# Product Ideation: ديوان الأمزجة — Arabic Poetry Mood Explorer

> **Note:** The mood/genre/energy/aesthetic labeling system — the four tag
> axes, their confidence scores, `flagged_axes`, and `suno_tags` — was
> **removed on 11 August 2026** due to low labeling accuracy (e.g. غزل verses
> labeled as غضب). The app is now a plain Arabic Poetry Explorer over the
> core columns only (poet, rank, meter, poem/verse text, era). Everything
> below is a historical snapshot written against the mood-labeled version and
> is kept for context only; see `mood-system-removal-plan.md` for the removal
> rationale.

**Reviewed:** `app.py`, `data_loader.py`, `templates/index.html`, `static/js/app.js`, `static/css/custom.css`, dataset schema (21,868 rows × 33 columns).

## Context: what the product actually does today

It's a single-page filter/search tool over ~24k mood-labeled Arabic poetry batches. Filtering is exhaustive and well-built (poet, meter, rank, poem length, four tag axes with any/all modes, confidence ranges, exclusions, free-text search), results are paginated and sortable, and there's a live stats panel. It is, functionally, a **faceted search UI** — not yet a reading, discovery, or creative tool. That framing is where most of the opportunity below comes from.

---

## 1. Turn the poem into a song — surface `suno_tags`

**User problem or unmet need:** The dataset already carries an English-language `suno_tags` field per batch (e.g. `{'mood': 'sad, sorrowful', 'genre': 'romantic, ...'}`), clearly generated to feed AI music-generation prompts. It is fetched all the way to `_to_records()` in `data_loader.py` and returned by `/api/batch/<row_id>` and `/api/search`, but it is **never rendered or used anywhere in `app.js` or `index.html`.** This is a fully-computed, unused asset — the single clearest gap in the whole codebase.

**Proposed feature:** A "🎵 Turn this into a song" action on each card that assembles a ready-to-paste Suno/AI-music prompt from `suno_tags` (mood + genre + energy + aesthetic descriptors) plus the verse text, with a one-click copy button. As a stretch, a direct Suno API call (server-side, using the user's own key) to generate and embed playback.

**Expected user benefit:** A genuinely novel, shareable experience — "hear this 1000-year-old poem as a song" — that no competing poetry-archive site offers. Strong social/virality hook.

**Why the architecture supports it:** Trivial — the data is already computed and already flows through the API response. This is a frontend rendering task, not a backend one.

**Complexity:** Low (prompt copy button) / Medium (live Suno API integration).
**Confidence:** High — verified directly in `data_loader.py` line 408 (`"suno_tags": row["suno_tags"]`) and confirmed absent from `app.js` via search.

---

## 2. Continuous poem reading mode

**User problem or unmet need:** The unit of browsing is a *batch* (1–12 verses), not a poem. A user who finds an interesting opening batch has no way to keep reading — cards show "batch 2 of 7" as a static label, but there's no "next batch of this poem" control. The card renderer even shows `poem_num_batches` and `poem_total_verses` but doesn't act on them.

**Proposed feature:** A "Read full poem →" action that opens a sequential, scrollable view of every batch for that `poem_no` in `batch_no` order, with the mood/genre/energy tags shown per batch as you scroll — essentially a "read mode" layered on top of the same data.

**Expected user benefit:** Converts the tool from "browse tagged snippets" into "actually read poetry," which is presumably the deeper motivation of most visitors. Removes the single biggest usability gap for anyone who isn't purely doing data exploration.

**Why the architecture supports it:** `poem_no`/`batch_no` are already the row's natural sort key (`data_loader.py`'s `_poem_stats()` already groups by `poem_no`), and `get_batch(row_id)` already exists as an endpoint — it's just unused by the frontend. A new `/api/poem/<poem_no>` endpoint returning all batches sorted by `batch_no` is a small, additive change.

**Complexity:** Medium.
**Confidence:** High.

---

## 3. Shareable permalinks for a single batch or poem

**User problem or unmet need:** Filter state is synced to the URL (`loadStateFromURL`/`history.replaceState` in `app.js`), so a *search* is shareable — but an individual card is not. There's no "copy link to this verse" affordance, even though `GET /api/batch/<row_id>` already exists specifically for "a detail view / deep link" per its own docstring.

**Proposed feature:** A small "🔗 Copy link" button per card that generates a URL like `/?batch=1042`, with `app.js` reading that param on load to scroll to / highlight (or open) that specific batch, pulling it via the already-built `/api/batch/<row_id>` endpoint.

**Expected user benefit:** Enables word-of-mouth sharing of a specific striking verse (social media, WhatsApp, etc.) — currently impossible without screenshotting.

**Why the architecture supports it:** The backend endpoint is already built and explicitly comments that it's "for a detail view / deep link" — it's simply never called by the frontend.

**Complexity:** Low.
**Confidence:** High (directly verified: `app.py` line 49–54, docstring in `data_loader.py` line 348–349, zero references in `app.js`).

---

## 4. Personal collections ("My Diwan")

**User problem or unmet need:** There is no account system, no persistence beyond the current URL/session — nothing survives a browser refresh except whatever's encoded in the query string. A user who wants to build a personal anthology of favorite verses across multiple search sessions has no way to do so.

**Proposed feature:** A lightweight, no-login "save to My Diwan" (☆) button per card, persisted in `localStorage` initially, with a dedicated view/page to browse, reorder, and export saved verses. No backend/auth changes required for v1.

**Expected user benefit:** Turns single-session browsing into a returning-user habit; gives the tool a reason to be bookmarked rather than used once.

**Why the architecture supports it:** Frontend-only for v1 (client-side storage), since row data already includes a stable `row_id`. No backend change needed at all for the MVP.

**Complexity:** Low (localStorage) / Medium (if backed by real accounts later).
**Confidence:** High for feasibility; the "no accounts exist today" premise is confirmed by the absence of any auth/session code in `app.py`.

---

## 5. Poet profile pages

**User problem or unmet need:** Poets are currently just a filter checkbox (name + rank). There's no page that answers "who is this poet, and what's their emotional/thematic signature across their body of work?" — even though the backend's `get_stats()` already does almost exactly this aggregation, just scoped to the current filter rather than to a poet.

**Proposed feature:** Clicking a poet's name (the `poet-link` button already exists on every card, currently just applies a poet filter) opens a profile: rank, poem count, verse count, and a tag-distribution chart across all four axes — i.e., `get_stats()` called with `poet=<name>` pre-applied, rendered as a small dashboard instead of just filtering the main list.

**Expected user benefit:** Makes the "Top 100 Poets" framing (from the README) mean something — right now rank is just a number in a filter, not a story. Gives casual users, students, and researchers a natural entry point ("show me Al-Mutanabbi's emotional range") instead of requiring them to already know what they're filtering for.

**Why the architecture supports it:** `get_stats(params)` already accepts arbitrary filter params and returns the exact tag-distribution shape needed — reusing it with `poet` pre-set requires no new backend logic, only a new small route/template.

**Complexity:** Medium.
**Confidence:** High — verified `get_stats()` signature and behavior directly in `data_loader.py`.

---

## 6. "Surprise me" / mood-based discovery mode

**User problem or unmet need:** Discovery today requires the user to already know what they want (a poet, a tag, a meter). There's no path for "I feel nostalgic tonight, show me something" without manually navigating ~10 filter tags — a real barrier for a first-time or casual visitor versus a researcher.

**Proposed feature:** A one-click "Surprise me" button and/or a small onboarding flow ("How are you feeling?" → maps to 2–3 mood tags → pre-fills the filter and jumps straight to a curated result) sitting above the current filter sidebar, using an existing `_apply_filters` pipeline plus simple random sampling.

**Expected user benefit:** Dramatically lowers the barrier to entry for non-expert users; converts "advanced faceted search tool" into "something you can actually recommend to a friend who just wants a poem for how they're feeling right now" — closer to the emotional premise implied by the app's own name (ديوان الأمزجة = "Diwan of Moods").

**Why the architecture supports it:** All the filtering machinery already exists (`_apply_filters`, tag vocab from `get_meta()`); this is primarily a new lightweight route (`/api/random?mood=...`) plus a UI entry point, not new query logic.

**Complexity:** Low–Medium.
**Confidence:** Medium — the mechanism is clearly supported, but the ideal UX (mapping vague feelings → specific tags) needs some design/product judgment not verifiable from code alone.

---

## 7. Poet / era comparison view

**User problem or unmet need:** The stats panel shows one filtered slice at a time. Users can't ask "how does Al-Mutanabbi's mood profile differ from Imru' al-Qais's?" without manually re-filtering and eyeballing two separate result sets from memory.

**Proposed feature:** A "Compare" mode that lets a user pick 2–3 poets (or two custom filter sets) and see their four-axis tag distributions side-by-side, reusing `get_stats()` called once per selection.

**Expected user benefit:** Serves a more analytical/academic user segment (literature students, researchers) with a genuinely differentiated capability most poetry archives don't offer, while reusing almost all existing backend logic.

**Why the architecture supports it:** `get_stats()` is already filter-parameterized and stateless per call — running it N times for N comparison targets requires no backend changes, just N parallel fetches from the frontend (the app already does `Promise.all` for parallel `/api/search` + `/api/stats` calls, so the pattern is established in `app.js`).

**Complexity:** Medium.
**Confidence:** High for backend feasibility; Medium for whether this specific framing is the highest-value use of that reusability (a PM guess, not a code fact).

---

## 8. Export / build a custom anthology

**User problem or unmet need:** There is no way to get results out of the browser. A teacher building a lesson, or a user curating verses for a personal project, has to manually copy text card by card.

**Proposed feature:** An "Export selected" or "Export current filter" action producing a clean PDF/Markdown anthology (poet, verses, tags) from the current filtered result set — pairing naturally with the "My Diwan" collection feature (#4) as the export target.

**Expected user benefit:** Converts the tool from "browse-only" to "produces something you take with you" — valuable for the education and content-creation audiences that a mood/genre-tagged poetry dataset is likely to attract.

**Why the architecture supports it:** The backend already returns fully-structured JSON per batch (verses, poet, tags) via `/api/search`; generating a PDF/Markdown from that is a formatting exercise, not new data logic. No pandas/query changes needed.

**Complexity:** Medium.
**Confidence:** Medium — feasible with current data shape, but PDF/export tooling is new infrastructure not present anywhere in the current stack (`requirements.txt` has no PDF library today).

---

## Summary table

| # | Idea | User value | Complexity | Confidence |
|---|------|------------|------------|------------|
| 1 | Suno music-prompt generation | Very high — novel, shareable | Low–Medium | High |
| 2 | Continuous poem reading mode | Very high — core UX gap | Medium | High |
| 3 | Shareable single-batch permalinks | High — enables sharing | Low | High |
| 4 | Personal collections ("My Diwan") | High — retention/return visits | Low–Medium | High |
| 5 | Poet profile pages | High — gives rank/poets meaning | Medium | High |
| 6 | "Surprise me" mood discovery | Medium–High — lowers entry barrier | Low–Medium | Medium |
| 7 | Poet/era comparison view | Medium — serves academic users | Medium | High (backend) |
| 8 | Export / build anthology | Medium — utility for educators | Medium | Medium |

**Suggested sequencing:** Start with #1 and #3 (both near-zero backend work, high novelty/shareability, and directly close gaps between what the backend already computes and what the UI exposes), then #2 (the biggest genuine UX gap), then #4 and #5 to build retention and give the "Top 100 Poets" framing real substance.
