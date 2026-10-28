# BELLO release hill climb

BELLO adds Orbit to Browserbase's BELL personal assistant stack. Each iteration must improve a real developer task and retain the inherited browser, approval, payment, and privacy guarantees.

## Release gates

| Gate | Evidence required |
| --- | --- |
| Install | Fresh Node 24 install with the frozen pnpm lockfile |
| Regression | Unit tests pass; skipped provider and database tests reported separately |
| Static checks | Typecheck and lint pass |
| Package | Eve agent assets and Next production build succeed |
| Interface | Desktop and mobile: no horizontal overflow; keyboard focus, empty, loading, error, and approval states usable |
| Agent | Authorized real browser task produces a useful answer and screenshot; cancellation and new conversation retire the browser |
| Distribution | Fork, reviewed changes, setup instructions, CI, and known limitations available to developers |

## Method

1. Run the smallest real developer scenario that exposes the weakest gate.
2. Record the observed failure and its evidence before changing code.
3. Fix the cause, rerun the scenario, and run relevant regression checks.
4. Retain the change only if it improves the scenario without weakening another gate.
5. Continue until every release gate has direct evidence. A passing mocked test does not prove a live integration.

## Iteration 1

- Forked `browserbase/bell-stack` (the requested `browserless/bell-stack` does not resolve) to `NicholasDominici/bello`.
- Introduced BELLO identity, Orbit workspace colors, responsive layout, visible focus, skip navigation, reduced motion, and branded metadata.
- Local inherited suite: 339 tests passed; 60 skipped. Live provider/database coverage remains outstanding.
- Typecheck, lint, and the Node 24 production build passed. Desktop and 390px mobile layouts inspected in the in-app browser.

Environment variable names retain `BELL_` compatibility with upstream. Never commit provider credentials or local browser state. This is still a single trusted operator application; deployment authentication and durable storage are required before exposing it to a group.

## Iteration 2

- Real local Stagehand browser task completed on example.com, with visible screenshot and a description consistent with the captured page. Uses the configured OpenAI model. This does not prove hosted Browserbase or optional payment/messaging integration coverage.
- New conversation reset the UI and returned to the empty workspace. Provider-side retirement still requires the opt-in hosted retirement test.
- Live answer exposed raw Markdown; added safe Markdown formatting for lists, code, tables, and citations. Raw HTML and unsafe link protocols are disabled; assistant images render as text to avoid unsolicited remote image requests.
- Network send failures retain the composer draft.
- Replaced inherited scattered styles with shared tokens, and completed BELLO branding in handoff and approval pages.
- Eve's first live startup installed its `just-bash` development dependency and optional native-dependency exclusions. These are recorded for reproducible setup.

Latest local verification: Node 24 frozen-lockfile install and `pnpm check` passed: 343 tests passed, 60 skipped; typecheck, lint, and production agent/Next builds passed.
