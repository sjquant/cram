# Card-extraction quality rubric

Use this when converting a source document into a cram deck. A card should
test one useful piece of knowledge that the learner can retrieve from the card
alone. The source is for extraction, not for interpreting a prompt during
review.

## Before emitting a card

- **One idea:** Ask for one fact, relationship, decision, or short procedure,
  with one independently gradable answer. Split questions joined by “and”,
  “also”, or a list of questions.
- **Standalone prompt:** Name the subject, scope, and relevant conditions. Do
  not depend on “above”, “below”, “this section”, page order, an unseen
  citation, or an unexplained pronoun. Include a version, environment, actor,
  or unit when leaving it out could change the answer.
- **Answerable and unambiguous:** The learner can answer without reopening the
  source, and the answer is specific and concise. Avoid opinions, unstated
  versions, arbitrary detail, and trick questions.
- **Useful difficulty:** Test concepts, distinctions, causes, and decisions the
  learner is likely to need; do not hide essential context.
- **Schema-shaped:** Use only the fields and card types in
  `schema/deck.schema.json`. Add `hint` or `explanation` when useful, but do
  not put information required to understand the prompt only there.

Rewrite or split any card that fails a check. The deck-level `source` field can
preserve provenance, but cannot replace prompt context.

Treat each independently gradable answer as a separate card. “What is X and
why does it matter?”, “Name A, B, and C”, and “What does X do, when should it be
used, and what is its exception?” are compound prompts. When parts are truly
inseparable, ask for their relationship rather than a list; multiple cloze
blanks are appropriate only when they test one inseparable sequence or
relationship.

## Choose the card type

Choose based on the desired retrieval behavior, not the source passage's
format.

| Type | Use it when… | Rules |
| --- | --- | --- |
| `basic` | The learner should freely recall or explain a fact, distinction, cause, or short procedure. Use it by default when recognition would be too easy. | Keep the prompt atomic and the answer consistently gradable. Put a longer explanation in `explanation`, not a second question in `answer`. |
| `mcq` | The useful skill is distinguishing one clear answer from plausible alternatives. | Put exactly one correct option in `answer`. Include at least one, usually two to four, related and credible `distractors`; keep all options grammatical and in the same category. Avoid trivia, “all of the above”, uneven detail, and absurd options. Use `answer: "True"` with `distractors: ["False"]` only for a useful true/false claim. |
| `cloze` | The learner should recall a term, value, symbol, or short phrase in natural context. | Put the target inline as `{{answer}}`; use `{{answer|accepted alternative}}` for alternatives. Prefer one blank per fact. Split blanks that can be learned independently. |

Do not convert a difficult `basic` card to `mcq` solely to simplify grading.
Do not use `cloze` when the sentence gives away the answer or when free
explanation is the actual objective.

## Few-shot rewrites

These card fragments use the deck schema. Weak cards are deliberately
problematic; strong cards show the expected result.

### Compound question → atomic cards

**Weak (`basic`)**

```json
{
  "id": "coroutine-vs-task",
  "type": "basic",
  "prompt": "What is a coroutine, and how does a Task differ from one?",
  "answer": "A coroutine is inert until awaited; a Task wraps a coroutine and schedules it on the event loop."
}
```

**Strong**

```json
[
  {
    "id": "coroutine-return",
    "type": "basic",
    "prompt": "What does calling an `async` function return in Python?",
    "answer": "A coroutine object; its body does not run until the coroutine is awaited or scheduled."
  },
  {
    "id": "task-scheduling",
    "type": "basic",
    "prompt": "What does an `asyncio.Task` do to a coroutine?",
    "answer": "It wraps the coroutine and schedules it on the event loop so it can run independently."
  }
]
```

### Source-dependent wording → standalone context

**Weak (`basic`)**

```json
{
  "id": "no-store-source-reference",
  "type": "basic",
  "prompt": "What does the second paragraph say about `no-store`?",
  "answer": "It prevents caching."
}
```

**Strong (`basic`)**

```json
{
  "id": "no-store-directive",
  "type": "basic",
  "prompt": "What does the HTTP `Cache-Control: no-store` directive require?",
  "answer": "The response must not be stored in a cache."
}
```

### Weak MCQ → plausible options

**Weak (`mcq`)**

```json
{
  "id": "vague-cache-header",
  "type": "mcq",
  "prompt": "Which header is important for caching?",
  "answer": "ETag",
  "distractors": ["fast", "secure", "good"]
}
```

**Strong (`mcq`)**

```json
{
  "id": "vary-header-purpose",
  "type": "mcq",
  "prompt": "Which HTTP response header tells a shared cache which request headers must match before reusing a response?",
  "answer": "Vary",
  "distractors": ["ETag", "Cache-Control", "Last-Modified"]
}
```

### Ungrounded blank → meaningful cloze

**Weak (`cloze`)**

```json
{
  "id": "ungrounded-header-blank",
  "type": "cloze",
  "prompt": "The {{important}} header is used here."
}
```

**Strong (`cloze`)**

```json
{
  "id": "vary-header-cloze",
  "type": "cloze",
  "prompt": "The HTTP response header that tells shared caches which request headers must match is {{Vary}}."
}
```
