# Bell and Browsie workspace

Bell lives in [browserbase/bell-stack](https://github.com/browserbase/bell-stack).
Bell owns the shared browser implementation. The standalone Browsie interface consumes the
same source and dependencies without a separate package or library build.

```text
agent/                  Bell's tools, hooks, runtime, and channels
app/                    Bell's web interface and handoff routes
server/browser/         Browser sessions, Context metadata, credentials, and handoff
lib/browser/            Shared browser URL and CAPTCHA helpers
packages/browsie/        Standalone UI, management routes, agent entrypoints, and tests
package.json            Dependencies and commands for both applications
pnpm-lock.yaml          One dependency resolution tree
```

## Source provenance

`packages/browsie` was imported from `projects/browsie` in
[browserbase/cookbook at 93483ce09eacb4d08014bb49c8d701cb77943186](https://github.com/browserbase/cookbook/tree/93483ce09eacb4d08014bb49c8d701cb77943186/projects/browsie),
the exact submodule revision Bell used before this import. The package's MIT license is retained
in [packages/browsie/LICENSE](../packages/browsie/LICENSE). Only tracked package files were imported;
local environment files, browser data, dependencies, and generated output are excluded.

Packaging and contributor documentation are adapted to this workspace. The import removes
unused trace-writing, task-history, and console-event helpers, unused response types, and the
direct dotenv dependency formerly used by the tunnel runner. The active runtime behavior is
preserved. The nested lockfile is consolidated into the root lockfile, and the existing Eve/Undici
override is enforced at the workspace root. Bell and Browsie now use Eve 0.79.1 and its
required AI SDK 7.0.137 peer. The optional tunnel runner is omitted; messaging and phone handoff use Bell's
direct HTTPS deployment.

Repository-specific coding-agent entry files are omitted. Both Next.js apps disable their
automatic generation; contributor guidance lives in the README and CONTRIBUTING documents.

This is a maintained local copy. Cookbook changes do not arrive automatically. Review upstream
changes against the recorded source revision and bring over relevant fixes deliberately.

## Install and build

Use Node.js 24 and pnpm 10.33.4:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` and `pnpm build` compile the runtime directly. The standalone app starts with
`pnpm dev:studio` and builds with `pnpm build:studio`; its working directory and configuration
remain `packages/browsie`, and its port remains 4318. There is no `browsie` package dependency,
package export map, or prebuilt runtime artifact. Each application still has its own agent
entrypoints and TypeScript configuration; dependency versions, tests, and lint are managed at the root.

## Verify changes

Run `pnpm check:workspace` from the root. It runs the combined tests, both TypeScript
checks, root lint, and both production builds. CI checks both apps. The tests verify that Bell's
tools and lifecycle hooks share one runtime, without a package compilation boundary.
Provider-backed tests remain opt-in; report those separately. Keep generated `.eve`, `.next`,
`.output`, dependencies, and browser data untracked.

## Browser retirement

The HTTP and Linq channels release the hosted browser on terminal session events, including
when cleanup runs in a fresh worker. Eve 0.79.1 skips global stream hooks for completion outside
a turn, so cleanup uses channel callbacks. A failed release retains the browser ID and reaches
Eve's error logging; failed callbacks are not automatically retried. Starting a new conversation
resets the prior session and releases its browser. Browserbase sessions still have provider
lifetimes, so this does not guarantee an indefinitely running browser.

With Bell running locally and its provider credentials loaded, run the opt-in regression:

```sh
BELL_LIVE_RETIREMENT=1 pnpm test:retirement:live
```

The test opens example.com, checks browser reuse across two turns, resets the session, verifies
provider release, and deletes its temporary Context. It uses the configured model and Browserbase.
