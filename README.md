<img src="docs/logo.svg" alt="Cram logo: a hand-stamped vermilion seal with a carved C" width="96" height="96">

# Cram

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

In **Claude Code**, run:

```text
/plugin marketplace add sjquant/cram
/plugin install cram@cram
```

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
  you can explain its concepts. The demo uses HTTP caching.
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

Settings lets you turn off the A/H single-letter shortcuts; the choice is
remembered when browser storage is available.

</details>

### Player language

Study with controls in English, Korean, Japanese, Simplified Chinese,
Spanish, or French. Ask your agent for the player language you want.
Card language is separate: ask for translated cards if you want those changed too.

<details>
<summary>Set the player language when rendering a deck yourself</summary>

```sh
python3 skills/cram/scripts/render.py deck.json -o quiz.html --language ko
```

This selects Korean controls and keeps the cards in their original language.

</details>

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

<details>
<summary>Codex and GitHub Copilot marketplace commands</summary>

For Codex:

```text
codex plugin marketplace add sjquant/cram
codex plugin add cram@cram
```

For GitHub Copilot:

```text
copilot plugin marketplace add sjquant/cram
copilot plugin install cram@cram
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
