# Guided interview mode

Use this opt-in flow to learn the learner's goal before generating a deck. For a normal request, skip it entirely and go straight to "Create the deck JSON" in [`SKILL.md`](../SKILL.md).

## Enter only on explicit request

Enter guided mode only when the user explicitly asks for an interview, to be walked through setup, or for help choosing deck settings (e.g. "interview me first", "help me set this up", "ask me questions before you build it"). Do not infer it from the source material, topic, or an ambiguous request.

## Ask settings one at a time

Ask only about deck settings, one question at a time, in whatever order fits the conversation:

- **Study goal** — what the learner is using the deck for (e.g. exam prep, onboarding, general review).
- **Card-content language** — the language the cards should be written in.
- **Player UI language** — the language of the player interface; ask separately from card-content language.
- **Level or exam target** — the learner's current level, or a specific exam or certification the deck should target.
- **Card style** — preferred mix or emphasis, e.g. mostly free-recall (`basic`), multiple choice (`mcq`), fill-in-the-blank (`cloze`), or no preference.
- **Approximate size** — a rough target card count.

Skip questions already answered. Stop once the remaining settings would not meaningfully change the resulting deck—for example, when the source material is short enough that size and style have only one reasonable answer, or when the learner has said "just use your judgment" for what's left. Never ask about anything outside this list.

## Summarize before generating

When it would help the learner confirm the setup, summarize the resulting profile in a few lines (goal, card-content language, UI language, level/target, style, size) and let them adjust it.

## Feed the profile into the existing flow

Apply the profile through the normal steps in `SKILL.md`; do not repeat or replace those steps:

- **Card-content language** → the language you write cards in, per "Create the deck JSON".
- **Player UI language** → the `--language <code>` flag when rendering, per "Render the deck"; it never changes card content.
- **Level/exam target and card style** → apply through [`extraction-quality.md`](extraction-quality.md) when choosing card types, difficulty, and phrasing.
- **Approximate size** → a target, not a hard requirement. Keep following `extraction-quality.md`: don't pad with filler cards to reach the number, and don't cut a card the source clearly supports just to land under it.
- **Study goal** → use it to prioritize which topics in the source to turn into cards; it doesn't loosen the extraction-quality rules.

## Source rule

The interview shapes which cards are chosen and how they're presented—it never justifies content the source doesn't support. If a profile answer implies content the source doesn't contain (e.g. a level or exam focus the material doesn't cover), say so instead of inventing cards to fit.
