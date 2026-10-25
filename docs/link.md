# Link wallet OAuth over Linq

Bell connects a wallet to the verified sender of a private Linq message. The user texts Bell,
opens Link's consent page, and returns to the same conversation. Eve suspends and resumes the
tool call. There is no Bell login, static wallet token, or wallet access from the web demo.

This uses the [Link Eve extension](https://eve.dev/integrations/link) and its
[interactive OAuth contract](https://github.com/stripe/link-cli/tree/main/packages/integrations/eve).
The Eve catalog's static-token quick start is not Bell's configuration.

## Configure

1. Complete [Linq setup](linq.md), including signed webhooks and the trusted-number allowlist.
   Retain the private-operator policy: saved browser Contexts and vaults are still shared.
2. [Register a Link OAuth client](https://docs.stripe.com/agentic-commerce/link-cli/oauth).
   Register exactly `https://<bell-host>/api/link/oauth/callback`. Register every deployment
   separately. A local callback can be `http://127.0.0.1:4320/api/link/oauth/callback`, but a phone
   cannot reach that loopback address.
3. Provide PostgreSQL and set these server-only environment variables:

   ```dotenv
   BROWSIE_PUBLIC_URL=https://<bell-host>
   DATABASE_URL=postgresql://<user>:<password>@<host>/<database>
   LINK_CLIENT_ID=<registered client ID>
   LINK_CLIENT_SECRET=<registered client secret>
   STRIPE_PUBLISHABLE_KEY=<your Stripe publishable key>
   LINK_TOKEN_ENCRYPTION_KEY=<base64 encryption key>
   BROWSIE_LOG_SESSION=false
   ```

   Generate the encryption key once with `openssl rand -base64 32`. Keep it stable across
   restarts and identical on all instances. Back it up separately from PostgreSQL. Replacing it
   without re-encrypting records makes existing grants unreadable, including for revocation.
   Use your database provider's verified TLS configuration; do not disable certificate checks.
4. From the repository root, with `DATABASE_URL` exported in your shell, apply the migration:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_link_oauth.sql
   ```

   Apply before accepting Link requests. It is safe to rerun and does not migrate browser data.
   The application needs SELECT/INSERT/UPDATE/DELETE on these tables. Schema management can use
   a separate database role.
5. Restart Bell. Expose `/api/link/oauth/callback` and Eve's
   `/eve/v1/connections/.../callback/...` routes without an interactive login wall. Opaque OAuth
   state and the framework callback capability protect these routes. Keep the existing web and
   session-control access restrictions. Bell forwards Eve's callback capability through
   `BROWSIE_PUBLIC_URL`, even when Eve generated it on an internal development port or a
   different Vercel project domain. Route that public origin to this same Bell deployment.

Configuration and database connections load only when Link is used. Browsing and builds do not
require these values. Grants request only `payment_methods.agentic` and `userinfo:read`;
financial-data tools are disabled.

## Connect and purchase

Text **“List my Link payment methods.”** Bell sends a private consent link. Complete Link's
authentication and consent within ten minutes. Eve resumes the request in the original chat.
Keep consent links private: possession allows completing the connection for the requesting
sender. Denial or expiry ends the attempt; ask Bell for a new link when ready.

For checkout, give Bell the merchant, item, quantity, and budget. Bell confirms the final total,
including shipping and tax. Eve asks for confirmation before creating a spend request. Link
then provides a separate purchase approval URL. Approve there, then text Bell to continue.

Bell retrieves the same spend request to verify approval before obtaining credentials. It also
checks that the actual Browserbase session has logging disabled. If a browser was started with
logging enabled, set `BROWSIE_LOG_SESSION=false` and restart Bell. Then ask Bell to reopen and
revalidate checkout in the same text conversation. Bell replaces an unsafe persisted browser;
the replacement may need to navigate to checkout again.
An issued credential is not proof of purchase: Bell must observe the merchant's result and
check order state before retrying an uncertain submission.

Text **“Disconnect my Link wallet.”** After confirmation, Bell blocks token resolution,
invalidates pending consent attempts, and revokes the remote grant before removing its tokens.
If revocation fails, encrypted tokens remain for retrying disconnect and the wallet stays blocked.
Disconnect does not cancel orders or merchant subscriptions or undo an already submitted purchase.

## Persistence and recovery

Grants use `(issuer, principal ID)` from verified Linq authentication. They survive conversation
changes and restarts and cannot be selected through model-supplied IDs. Different senders have
separate grants, even for the same operator. A web conversation or second phone is not paired
automatically with an existing wallet.

Tokens, PKCE verifiers, and framework callback capabilities are encrypted with AES-256-GCM and
bound to their owner. Only hashes of state and callback URLs appear outside encrypted records.
Refresh happens sixty seconds before expiry. PostgreSQL advisory locks serialize refresh,
connection replacement, and disconnect per sender. Each native Link request rechecks the grant
even when Eve has cached a bearer within the current execution step. Use a direct connection or
session-mode pooler; transaction-mode poolers are incompatible with these session advisory locks.

Codes and refresh tokens are single use. Bell durably records an exchange as in progress before
sending it. A lost response or process failure can require fresh consent instead of retrying
the same exchange. A Link 401 invalidates the stored bearer and starts a new consent flow. New
attempts supersede earlier attempts for that sender. Before requesting new consent, Bell revokes
any previously stored grant so it cannot be left authorized after wallet replacement. After a
failed refresh, ask Bell to reconnect. If revoking the old grant fails during reconnect or
disconnect, retry **“Disconnect my Link wallet”** successfully before reconnecting.
An identical callback can be redelivered if a phone loses the redirect response; a completed
exchange cannot be repeated and changed callback parameters are rejected.

Database downtime, a wrong encryption key, or missing configuration fails closed. User-facing
errors exclude provider bodies, tokens, and database credentials. The server emits a sanitized
`link.error` diagnostic with one of these reasons:

| Reason | Operator action |
| --- | --- |
| `missing_configuration` / `invalid_configuration` | Fix the named environment variable; values are never logged. |
| `database_migration_required` | Apply the migration to the configured database. |
| `database_unavailable` | Check database connectivity and credentials. |
| `credentials_unreadable` | Restore the encryption key used for existing grants. |
| `unexpected_error` | Check deployment health and reproduce with the regression tests; raw errors are withheld. |

New instances need the same database and encryption key.

Expired attempts cannot authorize a connection. Periodically remove old records, including
encrypted verifier data from abandoned attempts:

```sql
DELETE FROM bell_link_oauth_attempts WHERE expires_at < now() - interval '1 day';
```

PostgreSQL here stores Link state only. Eve still needs durable workflow storage to resume
parked turns after host replacement, and Bell's Context/vault files need their documented
storage. This change does not make the rest of Bell ready for arbitrary multi-instance hosting
or unrelated users.

## Transcript boundary

OAuth tokens and client secrets never enter tool arguments or conversational output. The native
Link extension **does return payment credentials in tool results** when requested; those results
and browser fill arguments may appear in persisted Eve events and model context. Restrict
transcript access to the trusted operator, apply your host's retention/deletion policy, protect
backups, and avoid screenshots while credentials are visible. Disabling Browserbase logging
does not disable Eve event persistence.

## Verify

`pnpm check` runs mock provider tests. Set `TEST_LINK_DATABASE_URL` to a disposable
PostgreSQL database to include persistence tests. The suite creates and drops a unique schema;
it never uses `DATABASE_URL` or calls Link. CI provides PostgreSQL automatically. Tests cover
encryption, identity isolation, callbacks, restart recovery, concurrent refresh, revocation,
and checkout guards.

For an operator-run live smoke test, text “List my Link payment methods,” complete consent, and
verify the response arrives in the same chat. Send a follow-up to confirm grant reuse, then
disconnect and confirm the next request needs consent. This uses real Linq and Link services.
Live checkout needs a separately specified merchant, item, and budget; automated tests and the
wallet smoke test do not submit purchases.
