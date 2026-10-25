# Browsie

Browsie is a self-hosted consumer browser agent and a reference application for Stagehand v4 and
Browserbase. It shows how to combine a durable agent, a persistent browser, saved login state,
human handoff, credentials, messaging, and an inspectable web interface.

> [!CAUTION]
> This is reference code. Review its security, privacy, cost, authorization, and compliance needs
> before you use it with real accounts or deploy it for more than one user.

## What you can study

- A durable Eve conversation with one persistent Stagehand browser runtime.
- Three basic browser tools: `run`, `snapshot`, and `screenshot`.
- Browserbase sessions with managed proxies, Verified Browsers, and optional proxy location.
- A draft Browserbase Context for every hosted task. A user can later name and save that same
  Context, then use it in another task.
- A native encrypted vault example and an optional 1Password service-account integration.
- Browserbase Live View handoff for OTP, passkeys, login approval, and other human-only steps.
- Durable CAPTCHA state, cancellation, restart recovery, and redacted activity events.
- One agent core for the web interface and the optional Linq iMessage/SMS channel.

## Why it is built this way

The agent harness, browser runtime, and product interface have separate duties:

```text
Web UI or Linq channel
          |
     durable Eve agent
          |
 typed tools and runtime skills
          |
 one Stagehand runtime per Eve session
          |
 Browserbase session + Context + Live View
```

Eve owns the conversation and event history. Stagehand owns browser automation. Browserbase owns
the remote browser, network identity, saved browser state, and Live View. Browsie keeps credentials
behind a vault boundary. Vault tools resolve credentials on the server; form values and sensitive
fields are redacted from Browsie's activity traces. Never put secrets in generic `run` arguments:
Eve records tool inputs separately from these traces. Use `vault_login` or human handoff for login.

There is no second browser-control service. Eve tools import the browser runtime in the same
process. This keeps session ownership clear and makes cancellation and recovery easier to follow.
See [the harness guide](docs/stagehand-harness.md) and
[the agent-layer guide](docs/agent-layers.md) for the detailed design.

## Run it locally

You need Node.js 24, pnpm, and an OpenAI API key. A Browserbase API key is required for hosted
sessions and for Browserbase Contexts, Live View, proxies, and Verified Browsers.

```bash
git clone https://github.com/browserbase/bell-stack.git
cd bell-stack
pnpm install --frozen-lockfile
cd packages/browsie
cp .env.example .env
```

Set secret values only in `.env`:

```bash
OPENAI_API_KEY=<your-key>
BROWSERBASE_API_KEY=<your-key>
STAGEHAND_BROWSER=browserbase
BROWSIE_STUDIO_USERNAME=operator
BROWSIE_STUDIO_PASSWORD=<separate-random-password-at-least-32-bytes>
BROWSIE_HANDOFF_SECRET=<separate-random-secret-at-least-32-characters>
BROWSIE_LOG_SESSION=false
```

Then return to the repository root (`cd ../..`) and start the application:

```bash
pnpm dev:studio
```

Generate each secret separately with `openssl rand -base64 32`. Open `http://127.0.0.1:4318` and
sign in using the configured operator credentials. Start a task and ask Browsie to use the web. The workbench shows the
live browser, tool activity, active skill, and Context state.

For a local Chrome test, keep `STAGEHAND_BROWSER=auto` and omit `BROWSERBASE_API_KEY`. Local mode
does not provide Browserbase Contexts, Live View, proxies, or Verified Browsers.

## Configuration

| Variable                   | Required     | Purpose                                                              |
| -------------------------- | ------------ | -------------------------------------------------------------------- |
| `OPENAI_API_KEY`           | Yes          | Runs the Eve agent model.                                            |
| `BROWSIE_STUDIO_USERNAME` | Web app      | Single trusted operator's login name.                               |
| `BROWSIE_STUDIO_PASSWORD` | Web app      | Operator password, at least 32 bytes. Missing configuration denies access. |
| `BROWSERBASE_API_KEY`      | Hosted mode  | Creates Browserbase sessions and Contexts.                           |
| `STAGEHAND_BROWSER`        | No           | `auto`, `local`, or `browserbase`.                                   |
| `BROWSIE_MODEL`            | No           | Model name. Default: `gpt-5.6-sol`.                                  |
| `BROWSIE_HANDOFF_SECRET`   | Handoff      | Encrypts scoped handoff tokens. Use at least 32 characters.              |
| `BROWSIE_PUBLIC_URL`       | Handoff      | Public HTTPS origin for handoff links.                               |
| `BROWSIE_VAULT_MASTER_KEY` | Native vault | Encrypts the local vault example.                                    |
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password    | Gives server-side access to an allowed 1Password vault.              |
| `LINQ_API_KEY`             | Linq         | Enables the Linq channel.                                            |
| `LINQ_WEBHOOK_SECRET`      | Linq         | Verifies Linq webhooks.                                              |

Read [`.env.example`](.env.example) for every option. Never commit `.env` or secret values.

## Test it

The default tests do not call live services. From the repository root, run:

```bash
pnpm check:workspace
```

The `*-real.test.ts` and live CAPTCHA tests need explicit service credentials. They skip when the
required credentials are absent. Run them only against accounts and sites that you are authorized
to use. Treat usage as billable Browserbase and model activity.

Useful manual checks:

1. Start a hosted task and confirm that Live View appears.
2. Sign in through Live View, then save the draft Context with a clear name.
3. Start another task, select that Context, and confirm that the login state is present.
4. Stop an active task and confirm that model work and browser work both stop.
5. Open the activity feed and confirm that tool inputs are useful and private values are redacted.

## Optional iMessage and SMS test

Browsie uses Eve's Linq channel. Set `LINQ_API_KEY`, `LINQ_WEBHOOK_SECRET`, and an explicit
`BROWSIE_LINQ_ALLOWED_USER_IDS` allowlist. Deploy behind your application's HTTPS origin and
register `/eve/v1/linq?version=2026-02-03` as the signed webhook endpoint. Set
`BROWSIE_PUBLIC_URL` to that origin for phone handoff, with a strong `BROWSIE_HANDOFF_SECRET`.
Keep the web UI, vault APIs, and other agent routes behind application authentication.

For Bell, use its [Linq setup guide](../../docs/linq.md), including Bell's receiving-line and
sender checks. This workspace contains no tunnel runner. `browserSettings.verified: true`
remains enabled for hosted browsing; the webhook and handoff need a reachable application host.

## Storage and deployment notes

Browsie is ready for a local or single-instance reference deployment. It is not a finished
multi-tenant service.

- Eve stores durable conversation and event state.
- Browserbase Contexts store browser cookies and site state.
- Browsie stores Context labels and native-vault data in local files under `.browsie/`.
- Browser session recovery uses saved Browserbase session metadata.
- The 1Password integration uses one server-side service account.
- Handoff links expire, but they are not single-use links.
- Hosted session logging defaults to off. Explicitly enabling `BROWSIE_LOG_SESSION=true` blocks
  form entry and vault login; start a new session with logging off before entering private data.
- The standalone web app and management APIs require the configured operator login. Use HTTPS
  outside loopback. Management tokens are signed, expire after six hours, and are invalidated by
  operator credential rotation. Agent Live View verifies the active browser in the authenticated task history; knowing an
  unrelated Browserbase session ID does not grant access. Public handoff links expire after ten minutes.
- Configure `BROWSIE_LINQ_ALLOWED_USER_IDS` for trusted operators before enabling Linq; an empty
  list accepts no senders. All configured operators share the same vaults and Contexts.

Before a multi-instance or multi-user deployment, replace local files with a durable database,
put encryption keys in KMS, isolate all records by user or tenant, replace the single-operator
login with per-user authorization, make handoff tokens one-use, add rate limits and audit retention, and define secret
rotation and deletion procedures.

## Repository guide

- [`.agents/skills/build-browser-agent/SKILL.md`](.agents/skills/build-browser-agent/SKILL.md): a
  reusable guide for developers who want to adapt this architecture.
- [`docs/contexts-and-vaults.md`](docs/contexts-and-vaults.md): browser identity and credentials.
- [`docs/vault-and-otp.md`](docs/vault-and-otp.md): vault login and human handoff.
- [`docs/stagehand-v4-doc-map.md`](docs/stagehand-v4-doc-map.md): links to official Stagehand and
  Browserbase documentation.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): development and validation rules.

Browsie is licensed under the MIT License. See [`LICENSE`](LICENSE).

## Shared browser implementation

The root `agent/lib`, `agent/tools`, `server/browser`, and `lib/browser` directories own browser behavior.
This app imports them directly and keeps its own UI and agent entrypoints. One root manifest and
lockfile supply both applications; no package export map or generated library is needed.

Every custom browser tool must use `runBrowserOperation` and `runCancelableBrowserWork` from
`agent/lib/browser-runtime`. A server integration can call `browser.withHostedPage(signal, callback)`
under the same operation lock. Keep `BROWSIE_LOG_SESSION=false` and never return a connection URL
or credential headers from the callback. Run `pnpm dev:studio` from the repository root for this UI.
