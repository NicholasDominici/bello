# Text Bell through Linq

Bell's assigned demo line is **+12025550100** (`+12025550100` in configuration).
Linq carries iMessage and SMS. [Link wallet OAuth and checkout](link.md) use this channel's
verified sender identity and require separate configuration.

```text
Your phone -> Linq -> Bell /eve/v1/linq -> Eve conversation
                                              |
                           Bell browser tools + Browserbase browser
                                              |
Your phone <- Linq <- Bell's reply in the original chat
```

One Linq chat keeps one Eve conversation and browser across follow-up messages. It does not
automatically join an existing web chat. Browser, vault, and handoff tools run in the same agent
process. Baselayer credentials are not required for ordinary browsing.

## Configure the line

Use Bell's deployed HTTPS origin directly. The intended flow is
`Linq -> Bell -> Browserbase`, with handoff links served by that same Bell origin.
No tunnel process or Cloudflare-specific application setup is required.

Hosted browser launches request `browserSettings: { verified: true }` and managed
proxies on every attempt. Verified Browsers provide browser identity for websites
Bell visits. The receiving webhook and handoff pages are served by Bell, so they
still need a reachable HTTPS application host. See
[Browserbase Verified Browsers](https://www.browserbase.com/verified).

1. In Bell's ignored `.env.local`, set these server-only values:

   ```dotenv
   LINQ_API_KEY=<API token for the Linq account that owns the line>
   LINQ_WEBHOOK_SECRET=<signing secret from the webhook subscription>
   BELL_LINQ_PHONE_NUMBER=+12025550100
   BELL_LINQ_ALLOWED_SENDERS=<your personal phone number, starting with + and country code>
   ```

   Keep the existing OpenAI and Browserbase settings. The receiving line and your personal
   sending number are different settings. An empty or invalid sender list accepts nobody.
   For this single-operator demo, allow only the operator's numbers because saved vault and
   browser Context data are shared. Group chats and iMessage email handles are not supported
   by this phone-only policy. Bell uses `BELL_LINQ_ALLOWED_SENDERS`; the former
   `BROWSIE_LINQ_ALLOWED_USER_IDS` setting has no effect.

2. Deploy Bell behind your chosen HTTPS application origin. Protect the web UI,
   session-control routes, and any administration endpoints with application authentication.
   Route Linq requests directly to `/eve/v1/linq`, where Eve verifies the signing secret;
   an interactive login screen must not intercept the webhook. Handoff routes validate
   their encrypted, expiring token. A local `pnpm dev` instance remains on port **4320**;
   Linq and a phone cannot reach its loopback address.

3. In the [Linq dashboard](https://dashboard.linqapp.com/api-tooling), create a webhook subscription:

   | Setting | Value |
   | --- | --- |
   | Target URL | `https://<your reachable Bell host>/eve/v1/linq?version=2026-02-03` |
   | Event | `message.received` |
   | Phone-number filter | `+12025550100` |

   Save the subscription's signing secret as `LINQ_WEBHOOK_SECRET`, then restart Bell. The target
   is the Bell application. Best Buy is the website Bell visits, so do not enter it as the webhook
   URL. The payload version supplies the receiving line and direct/group-chat fields Bell checks.
   Bell verifies these fields again even when the subscription has a phone-number filter.
   Replies use the inbound Linq chat and therefore the same receiving line.

   See Linq's [subscription API](https://docs.linqapp.com/channel/imessage/api/resources/webhook_subscriptions/methods/create/)
   and [signed webhook guide](https://docs.linqapp.com/channel/imessage/guides/webhooks/).

4. For optional human handoff, set `BROWSIE_PUBLIC_URL` to Bell's reachable origin and
   `BROWSIE_HANDOFF_SECRET` to a random secret of at least 32 characters. A localhost handoff
   link works only on the computer running Bell; a phone needs the deployed HTTPS origin.
   Keep handoff links private because the token grants control of that browser until expiry.

5. Use persistent storage for Bell's Context metadata and vault data on a single-instance
   host, or configure durable shared storage before a multi-instance/serverless deployment.
   Hosted 1Password access requires a scoped `OP_SERVICE_ACCOUNT_TOKEN`; `OP_ACCOUNT`
   desktop authorization works only on the machine running the 1Password app. Keep all
   provider credentials server-side in the deployment's secret configuration.

## Demo from your phone

Text the assigned line from an allowed personal number:

1. "Open https://www.bestbuy.com and tell me the homepage title."
2. "Take a screenshot of that page."
3. "Tell me the current page URL without navigating again."

Bell should visit the site in Browserbase and reply in the same Linq chat. Follow-ups reuse
that chat's browser. Report what the browser actually sees; merchant pages can vary by region
or present a challenge. This demo does not log in, add items to a cart, or purchase anything.

For a saved login, configure 1Password and ask Bell to use the vault tools for the saved website.
For an OTP or passkey, complete the step through the human handoff link, then text Bell to continue.
Do not send passwords or OTPs as chat messages. Desktop 1Password access requires Bell to run
on the same computer as the desktop app.

## Verification boundary

`pnpm test` sends signed HTTP requests through the installed Eve/Linq adapter and checks dispatch
to the agent. Provider calls and Eve dispatch are mocked, so the suite sends no texts and starts
no model or browser. It covers valid direct messages, same-chat routing, missing/tampered/stale
signatures, wrong lines or senders, groups, bot echoes, outbound messages, and invalid settings.

A live phone round trip also needs the actual Linq credentials, reachable webhook, allowed sender,
and Browserbase/OpenAI credentials. Verified browser mode alone does not establish inbound delivery.
For Baselayer-protected merchant access, follow [the separate sandbox flow](baselayer.md).
It needs a compatible merchant and a current verified principal. For wallet access and checkout,
follow [the Link guide](link.md).
