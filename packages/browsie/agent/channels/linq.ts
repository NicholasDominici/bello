import { defaultLinqAuth, linqChannel, type LinqChannelConfig } from "eve/channels/linq";

import { browserChannelEvents } from "../lib/browser-runtime";

export const linqBrowserEvents: NonNullable<LinqChannelConfig["events"]> = {
  ...browserChannelEvents,
  async "session.failed"(event, channel) {
    try {
      await browserChannelEvents["session.failed"](event);
    } finally {
      await channel.thread?.post("This session could not recover from an error. Start a new conversation to continue.");
    }
  },
};

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

export function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Linq channel.`);
  return value;
}
