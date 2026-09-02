# Cram

Cram turns pasted, attached, local, or web material into a validated deck and
a self-contained, offline flashcard quiz in a single HTML file you can open in
any browser.

The generated player supports:

- basic, multiple-choice (MCQ), and cloze cards;
- self-grading with a score and review screen;
- retrying only the cards you missed;
- optional hints and explanations; and
- progress persisted in the browser, so you can come back to a deck later.

## Try the demo

The repository includes a small HTTP caching deck. Browse the [deck
source](examples/http-caching-essentials.json), or open the already-rendered
[offline quiz](examples/http-caching-essentials.html) directly in your browser.

## Install in Claude Code

Add the Cram marketplace, then install its `cram` plugin:

```text
/plugin marketplace add sjquant/cram
/plugin install cram@cram
```

The first command registers the GitHub marketplace (`sjquant/cram`). The
second follows Claude Code's `plugin-name@marketplace-name` convention; both
names are `cram` here. After installation, invoke the skill as `/cram:cram` or
ask Claude Code to make flashcards or an interactive quiz from your material.

For the complete extraction, deck-format, and rendering workflow, see the
[skill guide](skills/cram/SKILL.md).

## Use with other AI tools

The skill payload follows the portable [Agent Plugins](https://agent-plugins.org/)
format and lives in `skills/cram/`. The [`npx skills`](https://github.com/vercel-labs/skills)
installer can place it in any supported agent's skill directory (using a
symlink by default, or copies when requested):

```sh
npx skills add sjquant/cram --skill cram
```

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

This repository also includes native marketplace metadata where the format is
documented: Claude Code (`.claude-plugin/`), Codex (`.codex-plugin/` and
`.agents/plugins/`), Cursor (`.cursor-plugin/`), and GitHub Copilot
(`.github/plugin/`). Codex and Copilot can be installed from their respective
marketplace catalogs:

```text
codex plugin marketplace add sjquant/cram
codex plugin add cram@cram

copilot plugin marketplace add sjquant/cram
copilot plugin install cram@cram
```

Kiro Powers and Cursor's public marketplace require their own import or
review/publish flow; Antigravity and Grok can use the portable skill, and Grok
also reads Claude-compatible plugin marketplaces.

## Requirements

For skill users, system `python3` is enough—there is nothing to install with
`pip`, and no Node.js, Playwright, Chromium, server, or network connection is
needed to play a rendered deck. The output is a single HTML file containing
the player and deck data.

The optional Playwright browser suite is for repository contributors and CI
only. It requires the JavaScript development dependencies and Chromium
described in [`tests/README.md`](tests/README.md); skill users never need
those dependencies.

## License

[MIT](LICENSE)
