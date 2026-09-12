# Guided interview mode

An opt-in way to learn the learner's goal before generating a deck. Skip this
entirely for a normal request — go straight to "Create the deck JSON" in
[`SKILL.md`](../SKILL.md).

## When to enter it

Only when the user explicitly asks for an interview, to be walked through the
setup, or for help choosing the deck settings (for example: "interview me
first", "help me set this up", "ask me questions before you build it"). Do not
infer guided mode from the source material, the topic, or an ambiguous
request — a plain deck request always gets generated directly, without
questions.

## Question set and stopping rule

Ask about deck settings only, one question at a time, in whatever order fits
the conversation:

- **Study goal** — what the learner is using the deck for (e.g. exam prep,
  onboarding, general review).
- **Card-content language** — the language the cards themselves should be
  written in.
- **Player UI language** — the language of the player interface, asked as a
  separate question from card-content language.
- **Level or exam target** — the learner's current level, or a specific exam
  or certification the deck should target.
- **Card style** — preferred mix or emphasis, e.g. mostly free-recall
  (`basic`), multiple choice (`mcq`), fill-in-the-blank (`cloze`), or no
  preference.
- **Approximate size** — a rough target card count.

Skip any question the user already answered in their request. Stop asking
once the remaining settings would not meaningfully change the resulting
deck — for example, once the source material is short enough that size and
style have only one reasonable answer, or once the learner has said "just use
your judgment" for what's left. Never ask about anything outside this list.

## Summarize before generating

When it would help the learner confirm the setup, summarize the resulting
profile (goal, card-content language, UI language, level/target, style,
size) in a few lines before generating, and let them adjust it.

## Feeding the profile into the existing flow

Apply the profile through the normal steps in `SKILL.md` — do not repeat or
replace those steps:

- **Card-content language** → the language you write cards in, per "Create
  the deck JSON".
- **Player UI language** → the `--language <code>` flag when rendering, per
  "Render the deck". It never changes card content.
- **Level/exam target and card style** → apply through
  [`extraction-quality.md`](extraction-quality.md) when choosing card types,
  difficulty, and phrasing.
- **Approximate size** → a target, not a hard requirement. Keep following
  `extraction-quality.md`: don't pad with filler cards to reach the number,
  and don't cut a card the source clearly supports just to land under it.
- **Study goal** → use it to prioritize which topics in the source to turn
  into cards; it doesn't loosen the extraction-quality rules.

## The source rule still applies

The interview shapes which cards are chosen and how they're presented — it
never justifies content the source doesn't support. If a profile answer
implies content the source doesn't contain (e.g. a level or exam focus the
material doesn't cover), say so instead of inventing cards to fit.
