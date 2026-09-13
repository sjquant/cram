---
name: cram
description: Creates validated, self-contained flashcard quiz decks from pasted, attached, local, or web source material, with an optional guided interview to choose deck settings first. Use when the user asks for flashcards, study cards, a quiz, an interactive deck, or to be interviewed or guided in setting one up; not for general summaries or rewrites without a deck request.
---

# Cram

## Guided interview (opt-in)

Only when the user explicitly asks for an interview or for help choosing the
deck setup, follow
[`references/guided-interview.md`](references/guided-interview.md) first and
use its resulting profile in the steps below. Otherwise skip straight to
"Create the deck JSON" — a normal request is never interrupted with
questions.

## Create the deck JSON

Read the source material before extracting cards. Treat the source as the
evidence for the deck; if it is unavailable or cannot be read, ask the user
for the material instead of guessing. Emit one JSON object that conforms to
[`schema/deck.schema.json`](schema/deck.schema.json).

Read [`references/extraction-quality.md`](references/extraction-quality.md)
for card selection and writing guidance. Write card content in the user's
requested language.

Save the JSON as a deck file (for example, `deck.json`) before rendering.

## Render the deck

From the plugin/repository root, run:

```sh
python3 skills/cram/scripts/render.py <deck.json> -o <output.html>
```

Use `--language <code>` for the requested player UI language; it does not
translate card content. See `--help` for supported codes and options.

## Open the result

Give the user the generated HTML path so they can open the offline quiz in
a browser.
