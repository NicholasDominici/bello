# Browser runtime

Bell's Eve agent owns conversation history and tool execution. Browser tools share one in-process
Stagehand runtime per Eve session. Follow-up turns reuse the browser; saved Browserbase session
metadata supports reconnecting after a worker restart. Hosted launches request managed proxies,
Verified Browsers, and keep-alive on every attempt, including retries.

`snapshot` reads page text and short-lived targets, `run` performs typed browser actions, and
`screenshot` captures the page for Bell's viewer. Navigation accepts HTTP and HTTPS URLs without
embedded credentials. A destination URL cannot change the browser provider. Local fixtures
require `STAGEHAND_BROWSER=local`.

## Configuration and compatibility

Copy the root [`.env.example`](../.env.example) for Bell and integration settings. Browser settings
retain their original `BROWSIE_*` names so existing deployments do not need a configuration migration.

| Variable | Purpose |
| --- | --- |
| `STAGEHAND_BROWSER` | `browserbase`, `local`, or `auto`; `auto` uses Browserbase when its API key is present. |
| `BROWSERBASE_CONTEXT_ID` | Optional existing Context for saved browser state. |
| `BROWSIE_PUBLIC_URL` | Reachable HTTPS Bell origin for handoff links; loopback HTTP is allowed locally. |
| `BROWSIE_HANDOFF_SECRET` | Handoff encryption secret, at least 32 bytes. |
| `BROWSIE_LOG_SESSION` | Hosted session logging; keep `false` before starting credential-bearing sessions. |
| `BROWSIE_HEADLESS` | Local browser headless mode; defaults to `true`. |
| `BROWSIE_BROWSER_IDLE_MS` | Browser inactivity timeout; defaults to 30 minutes. |
| `BROWSIE_CAPTCHA_TIMEOUT_MS` | CAPTCHA wait timeout; defaults to 30 seconds. |
| `BROWSIE_DRAFT_CONTEXT_TTL_MS` | Unused draft Context lifetime; defaults to seven days. |
| `BROWSIE_CONTEXT_METADATA_PATH` | Context metadata file; defaults to `.browsie/contexts.json`. |
| `BROWSIE_VAULT_MASTER_KEY` | Native vault key: 32 bytes in base64 or 64 hex characters. |
| `BROWSIE_VAULT_FILE` | Native vault data file; defaults to `.browsie/vault.enc.json`. |
| `BROWSIE_STUDIO_USERNAME` / `BROWSIE_STUDIO_PASSWORD` | Optional HTTP Basic operator credentials for Bell; password must be at least 32 bytes. |

The HTTP channel also supports Vercel OIDC and Eve's local development authentication.
Production deployments must protect the web interface and session routes. The Basic credentials
are Bell settings despite their legacy names; removing the standalone app does not remove them.
Never commit credentials, `.env` files, or `.browsie` data. Keep encryption keys stable when reusing
existing data; renaming storage paths or the `browsie.task.v1` state key requires a migration.

## Contexts and storage

Browserbase Contexts preserve cookies and site state; they do not store vault secrets. Hosted
tasks get a draft Context. Bell's `context_save` tool names and retains it, and `context_list`,
`context_create`, and `context_select` manage saved browser identities. Select a separate Context
for each identity or work boundary.

Eve stores durable conversation and browser state. Context labels and the native vault use local
files scoped to one trusted operator. Preserve those files across restarts. Multi-instance or
multi-user deployments need durable storage and user isolation before sharing these features.

## Credentials and OTP

Use `vault_login` or `human_handoff` for login. Never put secrets in generic `run` arguments:
Eve records tool inputs separately from the browser runtime's redacted activity traces.
The model receives login labels, host mappings, field availability, and opaque item references;
credentials resolve server-side immediately before filling.

For hosted 1Password access, set `OP_SERVICE_ACCOUNT_TOKEN` with access only to the required vault.
For local use, enable SDK integration in the 1Password desktop app and set `OP_ACCOUNT` to the
account name shown in its sidebar. Service-account mode takes precedence over desktop access.
The optional account connection flow uses the `ONEPASSWORD_*` settings in `.env.example`.

Bell can read existing native encrypted vault files for local demo data. The v1 format uses
AES-256-GCM with a data key per record wrapped by `BROWSIE_VAULT_MASTER_KEY`. Bell lists safe
metadata and resolves credentials from these files; it has no native vault administration or
write API. Hosted deployments need durable storage and managed encryption keys.

Vault login requires HTTPS and the saved hostname, checked before each credential fill and
submission, including an OTP step after navigation. A success selector is required to verify login.
Hosted login requires logging to be disabled when the browser starts. Changing
`BROWSIE_LOG_SESSION` cannot disable logging retroactively; start a new session.
TOTP values resolve server-side. When a login needs an unavailable OTP, passkey, or human approval,
use `human_handoff`, complete the challenge in Live View, and reply in the original Bell conversation.

Handoff links expire after ten minutes by default and are not single-use. The token grants browser
control until expiry, so keep the URL private. The reachable Bell origin and handoff secret must be
configured before issuing a link. See [provider checks](provider-tests.md) for opt-in login and
saved-Context regressions.
