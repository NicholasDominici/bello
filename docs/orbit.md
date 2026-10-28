# Orbit people intelligence

The O in BELLO is a real Orbit integration. The assistant searches people, follows asynchronous results, and reads public structured profiles with supporting sources. The People workspace renders those actual tool results, rather than illustrative profiles.

## Configure

Set `ORBIT_API_KEY` in the private server environment. Use a developer key with `search:read` and `profile:read`, issued at https://developer.orbitsearch.com/dashboard/keys. `ORBIT_API_HOST` defaults to `https://api.orbitsearch.com`; only HTTPS origins or explicit loopback HTTP test fixtures are accepted. Redirects are rejected so a provider response cannot forward the bearer to another host.

The key is never a tool parameter, browser prop, or model result. Each developer uses their own key. These operator tools are disabled for Linq senders; they do not lend the web operator's account to messaging users.

## Tools

| Tool | Behavior |
| --- | --- |
| `orbit_search` | Plain-English search, default five results at partial depth; quick and full depths supported; optional bounded candidate discovery |
| `orbit_search_status` | Resumes a search from the same conversation; honors its poll interval and returns cached terminal results |
| `orbit_profile` | Reads the current public profile by canonical ID or slug, including sections and source references |

Repeated identical search calls resume the same logical operation. `new_search` is reserved for user-requested fresh work. Request IDs derive from the session/tool call and are journaled before POST, so replay and uncertain-network retries reuse the same idempotency key. At most eight operations are retained; active receipts are not discarded to make room for terminal history.

The client retries at most twice on 429/5xx, using the exact same request body/key, exponential backoff and `Retry-After`. Long retry delays are returned to the caller instead of retrying early. Billing, auth, validation and scope errors do not retry. A running result is not a failure; partial success retains ready people and their IDs. Completed results stop polling.

Orbit search and profile reads use credits according to the API's current billing contract. A profile read can schedule the API's normal stale-profile refresh. BELLO does not add a tariff or silently request regeneration. The assistant must distinguish observed facts, inference, missing context and uncertain identity matches.

## Contract and tests

The integration follows the published OpenAPI contract at https://docs.orbitsearch.com/openapi.json, including quick/partial/full depths and generating/enriching/ready/failed result states. Unit tests use synthetic profiles and verify idempotency, retries, terminal caching, error redaction, safe source links and operator isolation. They make no live Orbit calls.

After building and starting a local instance with its keys, run the opt-in live path:

```sh
BELLO_LIVE_EVAL=1 BELLO_LIVE_ORBIT=1 pnpm eval:local
```

It adds an actual one-result quick search for Linus Torvalds and one public-profile read to the browser hill climb, requiring ready identity, sources and a cited assistant answer. It does not start discovery, request regeneration, or send messages. The report keeps outcome counts and timing without raw profile data or credentials.
