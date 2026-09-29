"""Checks that Cram works in the layouts installers actually produce.

Claude Code copies the marketplace entry's ``source`` directory into its plugin
cache, and runs ``npm ci`` there when that directory has a ``package.json`` and a
lockfile. ``npx skills`` copies only ``skills/cram``. The renderer must work
from each copy, and the Claude Code plugin must not ship the repository's
development dependencies.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from .support import FIXTURES, ROOT

SKILL = ROOT / "skills" / "cram"
LOCKFILES = ("package-lock.json", "npm-shrinkwrap.json", "bun.lock", "bun.lockb")


def _render(renderer: Path, output: Path, plugin_root: Path | None) -> subprocess.CompletedProcess:
    environment = {key: value for key, value in os.environ.items() if key != "CLAUDE_PLUGIN_ROOT"}
    if plugin_root is not None:
        environment["CLAUDE_PLUGIN_ROOT"] = str(plugin_root)
    deck = FIXTURES / "valid" / "minimal.json"
    return subprocess.run(
        [sys.executable, str(renderer), str(deck), "-o", str(output), "--language", "ko"],
        cwd=output.parent,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


class InstalledSkillLayoutTests(unittest.TestCase):
    def test_given_only_the_skill_directory_when_rendered_then_it_uses_its_own_template(self):
        # Given the skill directory copied on its own, as a plugin cache or `npx skills` does.
        with tempfile.TemporaryDirectory() as directory:
            installed = Path(directory) / "cache" / "cram" / "0.1.0"
            shutil.copytree(SKILL, installed)
            output = Path(directory) / "quiz.html"

            # When the copied renderer runs without CLAUDE_PLUGIN_ROOT.
            result = _render(installed / "scripts" / "render.py", output, plugin_root=None)

            # Then it writes the quiz from the copied template.
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('lang="ko"', output.read_text(encoding="utf-8"))

    def test_given_plugin_root_is_the_skill_directory_when_rendered_then_it_succeeds(self):
        # Given CLAUDE_PLUGIN_ROOT pointing at the skill directory itself.
        with tempfile.TemporaryDirectory() as directory:
            installed = Path(directory) / "plugin"
            shutil.copytree(SKILL, installed)
            output = Path(directory) / "quiz.html"

            # When the renderer runs from that installation.
            result = _render(installed / "scripts" / "render.py", output, plugin_root=installed)

            # Then it still finds the template and locales.
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output.is_file())


class ClaudeMarketplaceTests(unittest.TestCase):
    def test_plugin_source_is_the_skill_without_node_dependencies(self):
        # Given the marketplace entry Claude Code installs from.
        marketplace = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
        (plugin,) = [entry for entry in marketplace["plugins"] if entry["name"] == "cram"]
        source = (ROOT / plugin["source"]).resolve()

        # Then the copied directory holds the skill and nothing that triggers `npm ci`.
        self.assertTrue((source / "SKILL.md").is_file(), source)
        self.assertFalse((source / "package.json").exists())
        for lockfile in LOCKFILES:
            self.assertFalse((source / lockfile).exists(), lockfile)
        self.assertEqual(plugin.get("version"), json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))["version"])


if __name__ == "__main__":
    unittest.main()
