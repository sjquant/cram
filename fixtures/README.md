# Fixtures

Hand-written decks used two ways. They are development inputs, not part of what a user installs, so they live at the repo root rather than inside `skills/cram/`:

- `valid/` — open these directly in `skills/cram/template/player.html` while working on the player, with no Python in the loop.
- `invalid/` — every one of these must be rejected, each with an error naming the offending card index and field.

## Valid decks

| File | What it covers |
| --- | --- |
| `basic-only.json` | The walking-skeleton deck. Only `basic` cards, with and without hints and explanations. |
| `all-types.json` | All three card types, including a one-distractor mcq standing in for true/false and a cloze with two blanks, one of which accepts an alternative spelling. |
| `minimal.json` | Only the required fields. Guards against the player assuming optional fields are present. |

## Invalid decks

Almost everything is caught by the schema itself. Only one semantic rule is left for the validator to implement by hand, plus reporting parse failures readably.

| File | Violation | Caught by |
| --- | --- | --- |
| `unknown-card-type.json` | `type` is `ordering` | schema |
| `missing-required-field.json` | second card has no `answer` | schema |
| `empty-deck.json` | `cards` is empty | schema |
| `deck-id-not-a-slug.json` | deck `id` has spaces and punctuation, so it cannot key stored progress | schema |
| `whitespace-only-prompt.json` | `prompt` is only spaces, so the card face renders empty | schema |
| `cloze-without-a-blank.json` | cloze `prompt` has no `{{answer}}` in it | schema |
| `mcq-without-distractors.json` | nothing to choose between — `distractors` is empty | schema |
| `duplicate-card-ids.json` | two cards share the id `repeated` | validator |
| `malformed-json.json` | trailing comma — the file does not parse | validator |

The representation does most of this work. A cloze card writes its answers inline as `{{answer}}`, so the text and its answers cannot disagree; an mcq card names `answer` and `distractors` separately, so it cannot have zero or two correct options. Neither invariant needs a rule because neither can be expressed wrongly.

`malformed-json.json` is deliberately not loadable. Any helper that walks this directory has to special-case it, and the validator's parse error should say which file failed and where, rather than surfacing a raw traceback.
