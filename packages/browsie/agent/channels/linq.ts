import { defaultLinqAuth, linqChannel } from "eve/channels/linq";

import { linqBrowserEvents, requiredEnvironmentValue } from "../../../../agent/lib/linq";

export default linqChannel({
  events: linqBrowserEvents,
  credentials: {
    apiKey: () => requiredEnvironmentValue("LINQ_API_KEY"),
    signingSecret: () => requiredEnvironmentValue("LINQ_WEBHOOK_SECRET"),
  },
  turnPolicy: "steer",
  onMessage(_context, message) {
    if (!isAllowedLinqSender(message.author)) return null;

    return {
      auth: defaultLinqAuth(message),
      context: ["This request arrived through Browsie's Linq iMessage or SMS channel."],
    };
  },
});

export function isAllowedLinqSender(
  author: { isBot: boolean; userId: string },
  allowlist = process.env.BROWSIE_LINQ_ALLOWED_USER_IDS,
): boolean {
  if (author.isBot) return false;
  const allowedUserIds = new Set(
    (allowlist ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return allowedUserIds.has(author.userId);
}
