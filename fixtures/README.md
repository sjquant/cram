# Fixtures

Hand-written decks used two ways. They are development inputs, not part of what a user installs, so they live at the repo root rather than inside `skills/flashcard/`:

- `valid/` — open these directly in `skills/flashcard/template/player.html` while working on the player, with no Python in the loop.
- `invalid/` — every one of these must be rejected by the validator, each with an error naming the offending card index and field.

## Valid decks

| File | What it covers |
| --- | --- |
| `basic-only.json` | The walking-skeleton deck. Only `basic` cards, a mix of hints, explanations and difficulties. |
| `all-types.json` | All three card types, including a two-choice mcq standing in for true/false and a multi-blank cloze. |
| `minimal.json` | Only the required fields. Guards against the player assuming optional fields are present. |

## Invalid decks

The schema catches some of these on its own. The rest are rules JSON Schema cannot express, so the validator has to implement them — they are listed here so it is clear which work is the validator's.

| File | Violation | Caught by |
| --- | --- | --- |
| `unknown-card-type.json` | `type` is `ordering` | schema |
| `missing-required-field.json` | second card has no `answer` | schema |
| `empty-deck.json` | `cards` is empty | schema |
| `deck-id-not-a-slug.json` | deck `id` has spaces and punctuation, so it cannot key the progress store | schema |
| `cloze-zero-placeholder.json` | placeholder is `{{0}}`; numbering starts at 1 | schema |
| `whitespace-only-prompt.json` | `prompt` is only spaces, so the card face renders empty | schema |
| `duplicate-card-ids.json` | two cards share the id `repeated` | validator |
| `mcq-no-correct-choice.json` | no choice is marked correct | validator |
| `mcq-multiple-correct-choices.json` | two choices are marked correct | validator |
| `cloze-blank-count-mismatch.json` | prompt has `{{1}}` and `{{2}}` but only one blank | validator |
| `cloze-orphan-blank.json` | prompt has only `{{1}}` but two blanks are supplied | validator |
| `created-not-a-real-date.json` | `created` is `2026-13-99` — right shape, impossible date | validator |
| `malformed-json.json` | trailing comma — the file does not parse | validator |

The cloze pair is deliberate: `cloze-blank-count-mismatch.json` has more placeholders than blanks and `cloze-orphan-blank.json` has more blanks than placeholders. The schema promises the validator checks both directions, so both directions have a fixture.

`created-not-a-real-date.json` is the one rule the schema cannot reach at all: `pattern` only checks the shape and `format: date` is an annotation a stdlib validator gets nothing from, so the calendar check has to be an explicit `date.fromisoformat` call.

`malformed-json.json` is deliberately not loadable. Any helper that walks this directory has to special-case it, and the validator's parse error should say which file failed and where, rather than surfacing a raw traceback.
