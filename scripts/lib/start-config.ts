/** Resolve local production ports from the built proxy, rather than guessing runtime config. */
export function productionAgentPort(manifest: unknown): number {
  const rewrites = (manifest as { rewrites?: { beforeFiles?: { source?: string; destination?: string }[] } })?.rewrites?.beforeFiles;
  const destination = rewrites?.find(rule => rule.source === "/eve/v1/:path+")?.destination;
  if (!destination) throw new Error("Missing agent proxy in the production build. Run pnpm build first.");
  const url = new URL(destination);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password)
    throw new Error("pnpm start requires a local agent proxy. Use the configured deployment platform for a remote agent.");
  return Number(url.port);
}

/** The web service stays on loopback; hosting is a separate deployment decision. */
export function productionWebPort(value: string | undefined): number {
  const port = value === undefined ? 4320 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || (value !== undefined && String(port) !== value))
    throw new Error("PORT must be an integer between 1 and 65535.");
  return port;
}
