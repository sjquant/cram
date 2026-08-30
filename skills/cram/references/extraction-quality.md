# Card-extraction quality rubric

Use this rubric when turning a source document into a cram deck. A good card
tests one useful piece of knowledge that a learner can retrieve from the card
alone. The source supplies the facts during extraction; it must not be needed
to interpret the prompt during review.

## Quality gate

Before emitting a card, check all of the following:

- **One idea:** The prompt asks for one fact, relationship, decision, or short
  procedure. The answer can be judged as one unit. Split independent facts
  instead of joining them with “and”, “also”, or a list of questions.
- **Self-contained prompt:** Name the subject, scope, and relevant conditions
  in the prompt. Do not rely on “above”, “below”, “this section”, page order,
  an unexplained pronoun, or a citation the learner cannot see.
- **Answerable from memory:** The learner should be able to answer without
  reopening the source. Include enough context to disambiguate the answer,
  but do not copy surrounding exposition into the prompt.
- **One unambiguous answer:** The answer is specific and concise. Avoid
  questions whose answer depends on opinion, an unstated version, or an
  arbitrary level of detail.
- **Useful difficulty:** Prefer concepts, distinctions, causes, and decisions
  the learner is likely to need. Do not make a card harder by hiding essential
  context or by using a trick question.
- **Schema-shaped output:** Use only the fields and card types defined in
  `schema/deck.schema.json`. Add a hint or explanation when it helps recovery
  or feedback; neither should carry information that is required to understand
  the prompt.

If a card fails any check, rewrite it or split it before adding it to the
deck. The deck's `source` field may preserve provenance, but it is not a
substitute for context in the prompt.

## One idea per card

Treat each independently gradable answer as a separate card. “What is X and
why does it matter?”, “Name A, B, and C”, and “What does X do, when should it be
used, and what is its exception?” are compound prompts. Splitting them gives
the learner more honest feedback and makes scheduling each fact possible.

When a concept genuinely has inseparable parts, ask for the relationship rather
than a shopping list. For example, a cloze may test both sides of one protocol
exchange when the blanks describe the same exchange; independent facts still
belong on separate cards.

## Standalone prompts

Write the card as though it will be shown by itself in a shuffled deck. Replace
document navigation with the actual subject and scope:

- “What does the author recommend in the next paragraph?” → “What does
  `Cache-Control: no-store` instruct a cache to do?”
- “What are the two exceptions listed above?” → name the rule and ask for one
  exception per card (or ask for the complete, explicitly named set if the set
  itself is the single learning objective).
- “What is the default port?” → “What is the default port for HTTP?”

Pronouns are fine only when their referent is in the prompt itself. Include a
version, environment, actor, or unit whenever omitting it could change the
answer (for example, “in Python 3’s `asyncio`” or “for an HTTPS URL”).

## Choosing a card type

Choose the type based on the desired retrieval behavior, not on the shape of
the source passage.

| Type | Reach for it when… | Quality rules |
| --- | --- | --- |
| `basic` | The learner should freely recall or explain a fact, distinction, cause, or short procedure. This is the default when recognition would be too easy. | Keep the prompt atomic and the answer short enough to grade consistently. A longer explanation belongs in `explanation`, not in a second question hidden in the answer. |
| `mcq` | The target is a clear distinction among plausible alternatives, and selecting one option is the useful skill. | Put exactly one correct option in `answer`. Use at least one and usually two to four related, credible `distractors`; all options should fit the same question grammatically and category-wise. Do not use trivia, “all of the above”, unevenly detailed options, or obviously absurd distractors. Represent true/false with `answer: "True"` and `distractors: ["False"]` only when the statement is genuinely useful. |
| `cloze` | The learner should recall a term, value, symbol, or short phrase in its natural context. | Put the answer inline as `{{answer}}` (alternatives as `{{answer|accepted alternative}}`). Prefer one blank for one fact. Multiple blanks are appropriate only when they jointly test one inseparable sequence or relationship; split them when each blank could be learned independently. |

Do not turn a difficult basic card into an MCQ merely to make grading easier.
Do not use cloze when the surrounding sentence gives away the answer or when a
free explanation is the real objective.

## Few-shot rewrites

The examples below use the deck schema. “Weak” cards are intentionally
problematic; “Strong” cards show the expected extraction style.

### Compound question → two atomic cards

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

Each strong card has one answer and can be reviewed independently.

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

The strong prompt names the protocol and directive, so it remains meaningful
after shuffling and months after extraction.

### Vague MCQ → plausible, same-category options

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

The strong card asks one disambiguation question and gives options that are all
HTTP response headers with a plausible relationship to caching.

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

The strong sentence supplies enough semantic context to retrieve the term;
the blank is the single target rather than an arbitrary word.

### Ambiguous scope → explicit scope and separate cards

**Weak (`basic`)**

```json
{
  "id": "ambiguous-default-port",
  "type": "basic",
  "prompt": "What is the default port?",
  "answer": "80 (or 443 for HTTPS)."
}
```

**Strong**

```json
[
  {
    "id": "http-default-port",
    "type": "basic",
    "prompt": "What is the default TCP port for HTTP?",
    "answer": "80"
  },
  {
    "id": "https-default-port",
    "type": "basic",
    "prompt": "What is the default TCP port for HTTPS?",
    "answer": "443"
  }
]
```

The strong cards remove the ambiguity and keep the two independently useful
facts from competing on one card.
