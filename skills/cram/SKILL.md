---
name: cram
description: Creates validated, self-contained flashcard quiz decks from pasted, attached, local, or web source material. Use when the user asks for flashcards, study cards, a quiz, or an interactive deck; not for general summaries or rewrites without a deck request.
---

# Cram

## Create the deck JSON

Read the source material before extracting cards. Treat the source as the
evidence for the deck; if it is unavailable or cannot be read, ask the user
for the material instead of guessing. Emit one JSON object that conforms to
[`schema/deck.schema.json`](schema/deck.schema.json):

- The root object requires `id`, `title`, and a non-empty `cards` array. Use a
  stable lowercase kebab-case `id`; add the optional `source` field for
  provenance.
- Every card needs a unique `id` and a `type` of `basic`, `mcq`, or `cloze`.
- A `basic` card has `prompt` and `answer`.
- An `mcq` card has `prompt`, one correct `answer`, and one to five unique
  `distractors`.
- A `cloze` card has a `prompt` containing at least one inline blank such as
  `{{answer}}` (use `{{answer|accepted alternative}}` for alternatives); it
  has no separate `answer` field.
- Any card may also include non-empty `hint` and `explanation` fields. Do not
  add fields that the schema does not define.

For card-writing and extraction-quality decisions, read
[`references/extraction-quality.md`](references/extraction-quality.md) (E2).
That reference is the rubric for choosing useful, atomic cards and card
types; keep its detailed guidance there rather than duplicating it in this
entry point.

Save the JSON as a deck file (for example, `deck.json`) before rendering.

## Render the deck

From the plugin/repository root, run:

```sh
python3 skills/cram/scripts/render.py <deck.json> -o <output.html>
```

The renderer validates the deck first. When validation succeeds, it inlines
the deck JSON into the player template and writes the requested output path;
when validation fails, it reports the errors and does not write an HTML
player.

## Open the result

`<output.html>` is a self-contained HTML file. It includes the player and
deck data, so no server, build step, or other files are needed. Open it by
double-clicking the file or by opening it in any browser. The file is written
exactly where the `-o` option points (relative paths are relative to the
current directory).
