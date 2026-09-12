<img src="docs/logo.svg" alt="Cram logo: a hand-stamped vermilion seal with a carved C" width="96" height="96">

# Cram

English | [한국어](README.ko.md)

**Turn anything into a quiz.**

Reading something isn't the same as knowing it. Cram turns your notes,
documents, and web material into flashcards so you can test your understanding
without writing questions yourself.

Create a quiz with your AI agent, review what you missed, and keep it as a
single HTML file you can study offline or share.

**[Try the live demo →](https://sjquant.github.io/cram/examples/http-caching-essentials.html)**
— no install, nothing to clone. **[Make your own quiz ↓](#make-your-first-quiz)**

![Cram walkthrough: request flashcards, then reveal answers and review a quiz](docs/demo.gif)

Explore the demo's [deck source](examples/http-caching-essentials.json) or
open its [HTML file](examples/http-caching-essentials.html) from a local clone.

## Why Cram?

1. **Spend your time studying, not making flashcards.** Give your AI agent
   material you want to learn. The Cram skill guides it through creating
   questions and rendering a quiz you can use right away.
2. **Focus your next round on what you missed.** Test yourself, reveal answers,
   and grade your recall. Retry just the missed cards, and come back later
   with your place and results saved in your browser when storage is available.
3. **Keep the quiz. Share it. Study offline.** Each quiz is one HTML file with
   the cards and player included. Open it or send it to someone else—playing
   it needs only a browser, with no account, app installation, or server.

## Make your first quiz

You'll need a supported AI agent and system `python3` to create a quiz.
The renderer requires no additional Python packages.

### 1. Install the skill

In **Claude Code**, add this repository as a community plugin source, then
install Cram:

```text
/plugin marketplace add sjquant/cram
/plugin install cram@cram
```

This installs directly from `sjquant/cram`, not an official plugin catalog.

For **other AI agents**, run this in your terminal and select your agent:

```sh
npx skills add sjquant/cram --skill cram
```

This installation route uses Node.js/npm to run `npx`.
[More installation options ↓](#more-installation-options)

### 2. Give your agent something to study

Save your notes as `notes.md` in your working directory, then ask Claude Code:

```text
/cram:cram Read ./notes.md and create 10 flashcards to test the key concepts.
Save the quiz as study.html.
```

In another agent, ask: “Use the cram skill to read ./notes.md and create
10 flashcards to test the key concepts. Save the quiz as study.html.”
You can also paste material, attach a document, or provide a web URL your
agent can access.

### 3. Open the quiz

Open the generated `study.html` in your browser. Work through the cards,
reveal the answers, and grade yourself. At the end, review your results
or retry only the cards you missed.

You can reopen the file offline or send it to someone else. Your study
progress stays in your browser; it isn't included when you share the file.

## What could you study?

- **Technical documentation:** turn a guide into questions that check whether
  you can explain its concepts. Try the [HTTP caching demo](https://sjquant.github.io/cram/examples/http-caching-essentials.html)
  ([source](examples/http-caching-essentials.json)).
- **Language study:** drill the mistakes learners actually make.
  [한국인이 자주 틀리는 일본어](https://sjquant.github.io/cram/examples/japanese-mistakes-ko.html)
  ([source](examples/japanese-mistakes-ko.json)) covers the Japanese traps
  Korean speakers fall into, written natively in Korean.
- **Fandom trivia:** quiz your friends on what they love.
  [K-pop Trivia](https://sjquant.github.io/cram/examples/kpop-trivia.html)
  ([source](examples/kpop-trivia.json)) covers hit songs, fandoms, fanchants,
  and memes.
- **Course notes:** make a quiz from a lecture before your next study session.
- **Onboarding material:** create a quiz from a team guide and share the HTML
  with new teammates.

## Study your way

Practice with basic question-and-answer cards, multiple-choice questions,
and fill-in-the-blank cards. Decks can include hints and explanations.
The player supports keyboard navigation, reduced-motion preferences,
and high-contrast mode.

<details>
<summary>Study order, saved progress, and keyboard settings</summary>

In Settings → Study order, **Shuffle** starts a new round with hidden
answers while keeping recorded grades in learning history. **Restore original
order** returns to the source order. Retry rounds keep their missed-card scope.

Session order, position, results, and Cram-mode repeat attempts are saved in
the browser when storage is available. Saved sessions belong to the same deck
in the same browser; changing the deck's card content starts a new session.
To start over partway through, use **Reset progress** in Settings; after a
warning, it clears that deck's answers and place while keeping your settings.

Settings lets you turn off the A/H single-letter shortcuts; the choice is
remembered when browser storage is available.

</details>

### Player language

Study with controls in English, Korean, Japanese, Simplified Chinese,
Spanish, or French. Ask your agent for the player language you want.
Card language is separate: ask for translated cards if you want those changed too.

## More installation options

<details>
<summary>Choose agents with the skills installer</summary>

The [`npx skills`](https://github.com/vercel-labs/skills) installer places the
skill in a supported agent's skill directory.
To target agents explicitly, repeat `--agent`, for example:

```sh
npx skills add sjquant/cram --skill cram \
  --agent codex \
  --agent cursor \
  --agent github-copilot \
  --agent grok \
  --agent kiro-cli \
  --agent antigravity-cli
```

</details>

The portable skill lives in `skills/cram/`. For the extraction, deck-format,
and rendering workflow, see the [skill guide](skills/cram/SKILL.md).

## Requirements and scope

- **Creating a quiz:** requires an AI agent that can read your source material
  and run the Python renderer. Source access, account requirements, costs,
  and data handling depend on the agent and model you use.
- **Playing a quiz:** requires only a browser. The generated HTML includes
  the player and deck data, with no server or network connection needed.
- **Validation:** Cram checks the deck's structure before rendering. This does
  not fact-check AI-generated questions or answers; review them against your
  source material.

## License

[MIT](LICENSE)
