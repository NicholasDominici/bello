# BELLO

**O stands for Orbit.** A personal assistant workspace for developers, forked from [Browserbase's BELL](https://github.com/browserbase/bell-stack).

<p align="center"><img width="96" height="96" alt="BELLO Orbit mark" src="app/icon.svg" /></p>

Ask BELLO to research a page or work through a browser task. Follow its screenshots alongside the conversation, inspect formatted answers, and stop or reset the work when you're done. Each conversation owns its browser.

## Run locally

Use **Node.js 24** and **pnpm 10.33.4**.

```sh
git clone https://github.com/NicholasDominici/bello.git
cd bello
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`. Choose your browser:

- **Local:** set `STAGEHAND_BROWSER=local`. No Browserbase key is needed.
- **Hosted:** set `STAGEHAND_BROWSER=browserbase` and `BROWSERBASE_API_KEY`. Hosted sessions use managed proxies and Verified Browsers.

`BELL_MODEL` selects the OpenAI model; the inherited default is `gpt-5.6-sol`. `BELL_DEMO_URL` sets the starter website. Existing `BELL_` variables remain compatible with upstream.

```sh
pnpm dev
```

Open **http://127.0.0.1:4320**. First startup may download and prepare Eve's local sandbox runtime. Send with the button or **Ctrl / ⌘ + Enter**; Enter adds a new line.

## Production preview

```sh
pnpm build
pnpm start
```

`pnpm start` supervises both the web server and the Eve agent on loopback. It closes its owned processes together on shutdown or a service failure. Build on the same OS and architecture where you run it.

Production agent requests require authentication. Configure `BELL_OPERATOR_USERNAME` and a `BELL_OPERATOR_PASSWORD` of at least 32 bytes in your private environment. Development's loopback access does not enable unauthenticated production access. See [operator configuration](docs/browser-runtime.md#configuration).

This developer release is designed for **one trusted operator per local instance**. Each developer should use their own keys and storage. A shared deployment needs authentication, user isolation, and shared durable storage; the local Context label file is not a multi-user database. Personal 1Password Agentic Autofill remains disabled pending upstream hosted-extension support.

## Improve it with evidence

```sh
pnpm quality
```

This runs tests, TypeScript, lint, and a complete production build. It writes revision-labelled results to ignored `.bell/quality/` files and compares the four gates with the previous run. An interrupted or missing check cannot count as passed. Static checks do not establish live provider or visual quality.

For a real-model local evaluation, start BELLO with `STAGEHAND_BROWSER=local`, then in another terminal:

```sh
BELLO_LIVE_EVAL=1 pnpm eval:local
```

This uses your configured model API and a temporary synthetic local website. It checks page reading and screenshots, resistance to a page instruction, an actual form receipt, browser reuse, cancellation into a fresh browser, and conversation retirement. It cleans up its conversation and fixture. Results contain outcomes and timing, not credentials or raw conversations.

Follow the [hill-climb scorecard](docs/quality/hill-climb.md): find the weakest real scenario, record the failure, fix it, rerun, and retain changes that improve behavior without losing a gate.

| Command | Purpose |
| --- | --- |
| `pnpm test` | Credential-free regression suite; live tests opt in separately |
| `pnpm check` | Tests, types, lint, full prepared production build |
| `pnpm quality` | Same four gates with saved comparisons |
| `pnpm eval:local` | Opt-in real-model synthetic browser scenarios |
| `pnpm check:ci` | Tests, types, lint, compile-only build without sandbox preparation |

CI's compile-only artifacts need a full `pnpm build` before serving local traffic. Provider-backed checks are [explicit opt-ins](docs/provider-tests.md); skipped tests remain unverified.

## Extend BELLO

| Integration | Purpose | Guide |
| --- | --- | --- |
| Browserbase + Stagehand | Browsing, saved Contexts, screenshots, human handoff | [Browser runtime](docs/browser-runtime.md) |
| Eve by Vercel | Agent, tools, conversation state, channels | [Repository map](docs/repository.md) |
| Linq | iMessage / SMS with signed webhooks and a sender allowlist | [Messaging](docs/linq.md) |
| Link by Stripe | Wallet authorization, spend approval, checkout over Linq | [Payments](docs/link.md) |
| 1Password | Server-side operator credentials and OTP | [Operator access](docs/browser-runtime.md#credentials-and-otp) |
| Baselayer | Verified access to approved merchants | [Merchant access](docs/baselayer.md) |

Keep secrets in private environment files. Never commit `.env`, `.bell`, browser state, or provider credentials. See the integration guides before enabling optional services.

## License

[MIT](LICENSE). The upstream Browserbase copyright and license are preserved.
