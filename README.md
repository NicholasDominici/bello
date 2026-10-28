# BELLO

**O stands for Orbit.** A developer-focused fork of [Browserbase’s BELL](https://github.com/browserbase/bell-stack).

<p align="center"><img width="96" height="96" alt="BELLO Orbit mark" src="app/icon.svg" /></p>

[BELL](https://www.browserbase.com/blog/bell-personal-assistant-stack) is a reference architecture and sample app for building personal AI assistants that execute tasks on your behalf.

- Browserbase: Browser + Stagehand
- Eve by Vercel: Agent Framework
- Link by Stripe: Payments
- Linq: Messaging Infrastruture
- 1Password: Authentication
- Baselayer: Identity 


## Run locally

Requires Node.js 24, pnpm 10.33.4, and OpenAI and Browserbase API keys.

```sh
git clone https://github.com/NicholasDominici/bello.git
cd bello
pnpm install --frozen-lockfile
cp .env.example .env
```

Set `OPENAI_API_KEY` and `BROWSERBASE_API_KEY` in `.env`. For ordinary browsing, set `BELL_DEMO_URL` to your target website. 

```sh
pnpm dev
```


## Start here

| Integration | What it does | Guide |
| --- | --- | --- |
| Browserbase + Stagehand | Browser sessions, automation, saved Contexts, and human handoff | [Browser runtime](docs/browser-runtime.md) |
| Eve by Vercel | Agent configuration, tools, conversation state, and channels | [Eve in Bell](docs/repository.md#eve-by-vercel) |
| Linq | iMessage and SMS through a signed webhook and sender allowlist | [Messaging setup](docs/linq.md) |
| Link by Stripe | Wallet authorization, spend approval, and checkout through Linq | [Sandbox and wallet setup](docs/link.md) |
| 1Password | Operator credentials and OTP; personal Agentic Autofill is disabled by default | [Operator access](docs/browser-runtime.md#credentials-and-otp) · [Personal access status](docs/onepassword.md) |
| Baselayer | Verified access to approved merchants using short-lived credentials | [Merchant access](docs/baselayer.md) |


See the [repository layout and implementation map](docs/repository.md) to extend Bell.



## Quality hill climb

The [release scorecard](docs/quality/hill-climb.md) tracks real scenarios, regression checks, and remaining release gates. Existing `BELL_` environment variables remain compatible with upstream.

## Development

```sh
pnpm check
```

Runs tests, type checking, lint, and the production build. [Live provider checks](docs/provider-tests.md) are opt-in.

Bell is a sample app for one trusted operator. Before deploying, configure application authentication and durable storage using the [browser runtime guide](docs/browser-runtime.md).


## License

[MIT](LICENSE).
