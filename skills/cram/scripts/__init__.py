"""Python helpers used by the cram skill.

The validator names are loaded lazily so ``python -m skills.cram.scripts.validator``
does not import the module once through the package and then again to execute it.
"""

__all__ = [
    "DeckParseError",
    "DeckValidationError",
    "load_deck",
    "parse_deck",
    "validate_deck",
]


def __getattr__(name: str):
    if name not in __all__:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    from importlib import import_module

    validator = import_module(".validator", __name__)
    return getattr(validator, name)
