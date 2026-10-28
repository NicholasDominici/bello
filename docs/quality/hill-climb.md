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

## Iteration 3: executable checks and production failures

Added `pnpm quality`: it runs all four static gates, records exit codes and durations with the Git revision and dirty-worktree flag, and compares the last completed run. Reports live under ignored `.bell/quality/`; an interrupted run cannot become a green score. Added `BELLO_LIVE_EVAL=1 pnpm eval:local` for a real-model synthetic local website.

The first production evaluations failed and drove these repairs:

1. `pnpm start` served the UI without the agent backend. A supervisor now starts both processes using the port in the built Next proxy, rejects occupied ports, and stops its owned children together.
2. Local browsers could not load the Stagehand extension from the packaged agent. Packaging now includes both the hosted zip and unpacked local extension.
3. The inherited build skipped sandbox preparation, so the production agent could not provision its root sandbox. `pnpm build` now prepares it. CI explicitly uses `check:ci` / `build:ci` for a credential-free compile-only build; those artifacts do not establish production runtime readiness.
4. The browser panel retained captures after cancellation or retirement. Regression tests first reproduced the stale output; the projection now clears it and ignores late output until a new turn starts.

## Iteration 4: cancellation and failure recovery

The first synthetic production run passed reading and form submission, then timed out canceling a browser wait. Durable events showed a prompt cancel request, but browser shutdown could wait for the running Stagehand batch. A focused regression reproduced that deadlock; Stagehand and the browser transport now close concurrently. A second regression showed that an abort delivered outside the tool's async context lost Eve state access. The abort callback now binds its owning async context.

The next real production run passed all four scenarios:

| Scenario | Observed evidence | Elapsed time |
| --- | --- | --- |
| Read and capture | Correct lower-price company, actual snapshot and screenshot, page instruction ignored | 8.0 s |
| Form and reuse | Fixture server received exactly one `Orbit Labs` submission; receipt `fixture-204`; no new browser start | 9.1 s |
| Cancel and reopen | Cancellation settled under the five-second limit; next snapshot opened a fresh `about:blank` browser | 5.5 s including the follow-up model turn |
| Retire | Reset published `session.completed`; cleanup succeeded | 0.35 s |

These are local-browser results, not hosted Browserbase claims. The opt-in hosted retirement check now verifies observed URL/content rather than assuming example.com's public page title never changes.

Browser checking also contradicted the first draft-retention fix: Eve reports some send failures through `onError`, while resolving the send promise. The composer now tracks that callback before clearing a draft. Access errors have specific guidance and never reflect provider response bodies. Keyboard send, pending-reply controls, and stopping states were refined.

Current regression result: 358 passed, 60 skipped; types and lint passed. Full production build passed after the runtime fixes. Final latest-head CI, rendered error/Markdown checks, and release review remain to be recorded. Optional provider checks remain opt-in and unverified without dedicated fixtures.

Rendered checks confirmed the production access error retained the typed draft with retry enabled. A real-model answer rendered as a semantic table and fenced code block in the in-app browser. Transcript following now keeps new answers visible while allowing the operator to scroll back.

The real Stop button was checked after a visible browser capture: it returned to `Stopped`, cleared the old capture, and enabled a new conversation. New conversation then returned to `Ready`. A 390px mobile viewport measured a 390px document width, with readable controls and no horizontal overflow.
