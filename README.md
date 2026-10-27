# BELL

<img width="512" height="512" alt="pixel-bell-512" src="https://github.com/user-attachments/assets/f4c9363d-2ab0-4205-a3c7-7d7ad61ec6c6" />

**BELL is a reference architecture and sample app for developers building personal assistants. Developers should have a practical starting point for building their own versions that are truly performant on execution.**

Browserbase, Linq, 1Password, Baselayer, and Stripe power assistants that execute tasks on your behalf.

Bell pairs an Eve agent with browser
automation powered by Browserbase and a compact web interface. This standalone repository owns
Bell's agent, interface, configuration, and merchant integration.
Bell directly owns Stagehand/Browserbase session management, browser tools,
Contexts, human handoff, and optional 1Password access. Bell adds Linq iMessage/SMS messaging
with a signed webhook and a private sender list.

## Run locally

Use Node.js 24 and pnpm 10.33.4. Clone Bell and install its dependencies:

```sh
git clone https://github.com/browserbase/bell-stack.git
cd bell-stack
pnpm install --frozen-lockfile
cp .env.example .env
# Set OPENAI_API_KEY and BROWSERBASE_API_KEY in .env.
pnpm dev
```

Open `http://127.0.0.1:4320` and select **Open demo site**. Bell opens the configured `BELL_DEMO_URL`
(the protected Baselayer demo in `.env.example`) in one persistent Browserbase session. Configure
Baselayer as described below for that demo, or set the URL to an ordinary website for browsing.
Ask for a screenshot to update the capture panel. Follow-up
messages at the same `/s/...` address reuse the conversation and browser. Stop cancels active work.
The panel is a screenshot viewer; use `human_handoff` when you need to interact with the browser.

Browser tools, hooks, and runtime code live directly in Bell. One Next.js app and one Eve agent
use the root `package.json` and lockfile. Restart Bell after runtime edits. See
[repository layout](docs/repository.md) and
[browser configuration and credential handling](docs/browser-runtime.md).

For phone use, point Linq directly at Bell's HTTPS deployment and use the same origin
for handoff links. Hosted browser launches keep `browserSettings.verified: true` and
managed proxies enabled. See [Linq setup](docs/linq.md).

## Baselayer merchant access

Bell can mint a short-lived L2 credential, bind it to a merchant nonce, and present it on one
approved browser request using `merchant_access`. Configure the sandbox API key, verified
principal, and exact merchant origin in `.env.local`.
[Follow the Baselayer setup and verification guide](docs/baselayer.md).

The protected demo is `https://merchant.example.com/protected`. Ordinary navigation
should be denied; successful `merchant_access` should return HTTP 200. Sandbox credentials
usually expire after about one hour; check the returned expiry. Live access requires a current
verified principal from the same sandbox organization as the API key.
Best Buy browsing does not require Baselayer and does not demonstrate merchant verification.

## Optional integrations

- Link sandbox: test purchases with an operator-injected token, no database or saved wallet
  credentials. Real Link: connect a wallet from an allowlisted Linq conversation using OAuth. Bell sends a
  consent URL and resumes in the same chat. PostgreSQL stores encrypted per-sender grants;
  spend requests retain Eve confirmation and Link approval. Approved payment entry uses the server-side checkout tool;
  card details and payment tokens are not returned to the model. Follow [Link setup](docs/link.md).
- 1Password: for local desktop access, set `OP_ACCOUNT="Your account name"` in `.env.local`,
  using the account name shown in the 1Password sidebar. In the desktop app, enable
  **Settings > Developer > Integrate with other apps** under the SDK options, then approve
  the request when prompted. Bell must run on the same computer as the desktop app.
  For hosted access, set `OP_SERVICE_ACCOUNT_TOKEN` instead; it takes precedence over `OP_ACCOUNT`.
  Existing CLI setups can select `BELL_ONEPASSWORD_BACKEND=cli` with an explicit account or
  service token; see the [credential setup and limits](docs/browser-runtime.md#credentials-and-otp).
  Save a Login item with the destination website, username, and password before asking Bell to log in.
  Add a one-time password field if the site uses TOTP. The vault tools enforce the saved
  website host and HTTPS before filling credentials. Credentials are resolved on the server; a URL alone does not
  provide a login.
  The planned per-user OAuth routes are retained, but they do not yet connect an account to
  the vault tools. Use the configured SDK or CLI access for working logins.
- Local vault: existing encrypted files remain readable using `BELL_VAULT_FILE` and
  `BELL_VAULT_MASTER_KEY`. No vault administration UI or writing API is included. Protect the
  file and its website mappings as trusted operator configuration.
- Linq: configure your own Linq receiving line, API key, webhook signing secret, and allowed
  personal sending number, then text that line. Follow the [Linq setup and phone demo](docs/linq.md).
  Each Linq chat keeps its own conversation and browser. Baselayer is not required for browsing.
- Handoff: set a random `BELL_HANDOFF_SECRET` of at least 32 characters and
  `BELL_PUBLIC_URL` to the app's reachable origin. Configure this before asking for a handoff.

Browser logging and recording are disabled for hosted sessions. Context and vault tools run
directly in Bell. Visa is not integrated. Before updating an existing deployment, follow the
[configuration and session migration notes](docs/browser-runtime.md#updating-an-existing-deployment).

## Check the code

```sh
pnpm check
```

This runs tests, TypeScript, lint, and the Bell production build. Browser runtime tests live in
`tests/browser`; live provider tests remain opt-in and skip without their required configuration.
The default suite makes no live provider calls. Set `TEST_LINK_DATABASE_URL` to a disposable
PostgreSQL database to include Link persistence tests; CI runs these automatically. A successful build verifies compilation only.
Keep this demo local until you configure application authentication and durable storage. Bell's
HTTP channel rejects unauthenticated production traffic. Context metadata and optional local
vault files are scoped to one trusted operator; Context writes are serialized within one process.
See the [browser runtime guide](docs/browser-runtime.md)
for storage, authentication, and credential boundaries and [provider checks](docs/provider-tests.md)
for live regression commands.
