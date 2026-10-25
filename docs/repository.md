# Bell repository

Bell lives in [browserbase/bell-stack](https://github.com/browserbase/bell-stack).
One Next.js application serves the web interface and integrations. One Eve agent owns the web
and Linq conversations; both channels use Bell's browser runtime directly.

```text
agent/                  Eve agent, tools, hooks, runtime, and channels
app/                    Bell web interface, integration APIs, and handoff routes
server/browser/         Browser sessions, Context metadata, credentials, and handoff
lib/browser/            Browser URL and CAPTCHA helpers
tests/browser/          Browser runtime regression tests and local fixtures
package.json            Application dependencies and commands
pnpm-lock.yaml          One dependency resolution tree
```

## Development

Use Node.js 24 and pnpm 10.33.4:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` and `pnpm build` compile the browser runtime directly. There is no separate browser
package, generated library, or second agent application. Run `pnpm check` for tests, TypeScript,
lint, and the Bell production build. Provider-backed tests remain opt-in; see
[provider regression checks](provider-tests.md). Keep generated `.eve`, `.next`, `.output`,
dependencies, environment files, and browser data untracked.

Browser tools must use `runBrowserOperation` and `runCancelableBrowserWork` from
`agent/lib/browser-runtime`. A server integration can call `browser.withHostedPage(signal, callback)`
under the same operation lock. Keep credentials and browser connection URLs out of tool results.
See [browser configuration and credential handling](browser-runtime.md).

## Source provenance

The browser implementation originated in `projects/browsie` from
[browserbase/cookbook at 93483ce09eacb4d08014bb49c8d701cb77943186](https://github.com/browserbase/cookbook/tree/93483ce09eacb4d08014bb49c8d701cb77943186/projects/browsie),
the exact submodule revision Bell used before importing that source. The upstream copyright
and MIT terms are retained in [licenses/browsie-MIT.txt](../licenses/browsie-MIT.txt).
Bell maintains the runtime locally; upstream changes do not arrive automatically.

The standalone Browsie app, its second Eve agent, management screens, and application-only tests
have been removed. The browser implementation and its relevant tests now live in Bell's root
source tree. Existing `BROWSIE_*` environment names, `.browsie` storage paths, and the
`browsie.task.v1` durable state key remain compatible with existing Bell deployments and sessions.
They are compatibility identifiers, not a separate application dependency.

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
