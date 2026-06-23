#!/bin/bash

set +e
CONFIG="examples/.prettierrc.sieve.json"
UNFORMATTED_FILE="examples/example.sieve"
FORMATTED_FILE="examples/example.formatted.sieve"

npx prettier $UNFORMATTED_FILE --check --config $CONFIG --log-level warn >/dev/null 2>&1;
status=$?
if [ "$status" -eq 0 ]; then
  echo "example check FAILED"
  echo "Expected example.sieve to fail, but it passed."
  exit 1
fi

npx prettier $FORMATTED_FILE --config $CONFIG --log-level warn >/dev/null 2>&1;
status=$?
if [ "$status" -ne 0 ]; then
  echo "example check FAILED"
  echo "example.formatted.sieve failed, but should pass."
  exit 1
fi

PRETTIER_CMD="npx prettier $UNFORMATTED_FILE --config $CONFIG"
if ! diff -q <($PRETTIER_CMD) "$FORMATTED_FILE" >/dev/null 2>&1; then
  echo "example check FAILED"
  echo "Error: prettier output does not match formatted file" >&2
  exit 1
fi

echo "example check PASSED"