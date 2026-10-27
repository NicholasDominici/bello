# BELL 🔔

**Ring the BELL and put your personal assistant to work.** 

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
in one persistent Browserbase session. Ask for a screenshot to update the capture panel. Follow-up
messages at the same `/s/...` address reuse the conversation and browser. Stop cancels active work.
The panel is a screenshot viewer; use `human_handoff` when you need to interact with the browser.

Browser tools, hooks, and runtime code live directly in Bell. Both web apps use the root
`package.json` and lockfile; there is no separate browser package or library build.
The optional Browsie interface remains in `packages/browsie`; run it with `pnpm dev:studio`.
Its existing environment and data paths are unchanged. Restart the running app after runtime edits.
See [repository layout and source provenance](docs/repository.md).

For phone use, point Linq directly at Bell's HTTPS deployment and use the same origin
for handoff links. Hosted browser launches keep `browserSettings.verified: true` and
managed proxies enabled. See [Linq setup](docs/linq.md).

## Baselayer merchant access

Bell can mint a short-lived L2 credential, bind it to a merchant nonce, and present it on one
approved browser request using `merchant_access`. Configure the sandbox API key, verified
principal, and exact merchant origin in `.env.local`. Keep `BROWSIE_LOG_SESSION=false` before
starting the browser. [Follow the Baselayer setup and verification guide](docs/baselayer.md).

The protected demo is `https://merchant.example.com/protected`. Ordinary navigation
should be denied; successful `merchant_access` should return HTTP 200. Sandbox credentials
usually expire after about one hour; check the returned expiry. Live access requires a current
verified principal from the same sandbox organization as the API key.
Best Buy browsing does not require Baselayer and does not demonstrate merchant verification.

## Optional integrations

- Link: connect a wallet from an allowlisted Linq conversation using OAuth. Bell sends a
  consent URL and resumes in the same chat. PostgreSQL stores encrypted per-sender grants;
  checkout retains Eve confirmation and Link purchase approval. Follow [Link setup](docs/link.md).
- 1Password: for local desktop access, set `OP_ACCOUNT="Your account name"` in `.env.local`,
  using the account name shown in the 1Password sidebar. In the desktop app, enable
  **Settings > Developer > Integrate with other apps** under the SDK options, then approve
  the request when prompted. Bell must run on the same computer as the desktop app.
  For hosted access, set `OP_SERVICE_ACCOUNT_TOKEN` instead; it takes precedence over `OP_ACCOUNT`.
  Save a Login item with the destination website, username, and password before asking Bell to log in.
  Add a one-time password field if the site uses TOTP. The shared vault tools enforce the saved
  website host and HTTPS before filling credentials. Keep `BROWSIE_LOG_SESSION=false` before
  starting a hosted login session. Credentials are resolved on the server; a URL alone does not
  provide a login.
- Linq: text Bell at **+12025550100** after configuring your Linq API key, webhook signing
  secret, and personal sending number. Follow the [Linq setup and phone demo](docs/linq.md).
  Each Linq chat keeps its own conversation and browser. Baselayer is not required for browsing.
- Handoff: set a random `BROWSIE_HANDOFF_SECRET` of at least 32 characters and
  `BROWSIE_PUBLIC_URL` to the app's reachable origin. Configure this before asking for a handoff.

The shared runtime retains its `BROWSIE_*` configuration names. Bell does not copy the Context or
Vault administration screens. Their agent tools remain available. Link checkout is available
through the private Linq flow after configuration and approval. Visa is not integrated.

## Check the code

```sh
pnpm check:workspace
```

This checks Browsie and Bell, including both standalone production builds. Browsie's live tests
remain opt-in and skip without their required configuration. The default suite makes no live
provider calls. Set `TEST_LINK_DATABASE_URL` to a disposable PostgreSQL database to include
Link persistence tests; CI runs these automatically. A successful build verifies compilation only.
Keep this demo local until you configure application authentication and durable storage. Eve's
default HTTP channel rejects unauthenticated production traffic. The shared vault/Context data
uses local files and is scoped to a single demo operator. See
[`packages/browsie/README.md`](packages/browsie/README.md) for runtime
settings and [the vault guide](packages/browsie/docs/vault-and-otp.md) for the credential boundary.
