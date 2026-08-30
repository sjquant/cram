# Tests

The suite uses Python's standard-library `unittest` runner; there is nothing
to install. Run it from the repository root with:

```sh
python3 -m unittest discover -s tests -t . -v
```

The renderer checks invoke the documented public command with a fixture deck
as input and an HTML file as output. They are skipped while the renderer slice
is absent from `main`, so the harness can land before the validator and player;
once `skills/cram/scripts/render.py` exists, those checks run automatically.
The optional player check in `test_player.py` uses the installed `agent-browser`
CLI and the `~/.agent-browser/profiles/sjquant` profile when available. It is
skipped on machines without that local browser setup; when enabled, it exercises
the rendered page through its public DOM and player API rather than mocking the
renderer internals. Future validator and player tests should keep the same
outside-in boundary.
