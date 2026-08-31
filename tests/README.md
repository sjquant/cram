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
Player behavior is covered by the Playwright suite below, which runs separately
from the standard-library tests and does not require a contributor's local
browser profile. Future validator and player tests belong in separate `test_*.py`
modules and should keep the same outside-in boundary.

## Browser tests

The player browser tests use Playwright as a contributor/CI-only dependency;
it is not installed for skill users. Install the JavaScript development
dependencies (Node.js 20 or newer) and Chromium once, then run the browser
suite separately:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

The standard-library suite remains independent and needs no Node or Playwright
installation:

```sh
python3 -m unittest discover -s tests -t . -v
```

Browser checks specify card behavior and accessibility through public controls;
they do not assert geometry, computed styles, or other presentation details.
