# Contributing translations

Copy a catalog from [`skills/cram/locales/`](../skills/cram/locales/),
using `en.json` as the reference. Translate the values while preserving
the English message keys and named placeholders such as `{count}`.
Plural messages use `Intl.PluralRules` categories and require an `other`
form.

Register a new language code in the renderer's `LANGUAGES`, add a browser
integration case, and update the supported languages in the README.
Run the checks described in [`tests/README.md`](../tests/README.md).

When adding UI messages, mark static text-only elements with `data-i18n`
and attributes with `data-i18n-attrs="aria-label title"`. In JavaScript,
pass literal, double-quoted message keys to `t(...)`, supplying variables
as parameters. Add every new message to all catalogs. The renderer checks
used messages, catalog completeness, value types, and placeholders before
writing output.

## Preview

Render a deck with the selected language and open the resulting HTML:

```sh
python3 skills/cram/scripts/render.py examples/http-caching-essentials.json \
  -o /tmp/cram-preview.html --language ko
```

Use `--help` for supported codes. The template is a rendering input;
preview and production output both use the locale catalogs. Preserve each
of its three injection tokens exactly once. To refresh the committed
English example, omit the language option and write to
`examples/http-caching-essentials.html`.
