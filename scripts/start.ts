/** Own both local production processes; fail and clean up together if either exits. */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { productionAgentPort, productionWebPort } from "./lib/start-config.ts";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url);
const children: ChildProcess[] = [];
let stopping = false;
let startupFailure = false;
let shutdownPromise: Promise<void> | undefined;

/** Only signal processes launched by this supervisor, never an existing listener. */
function shutdown(code: number): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  process.exitCode = code;
  shutdownPromise = Promise.all(children.map(async child => {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>(resolve => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
    timeout.unref();
    await exited;
    clearTimeout(timeout);
  })).then(() => undefined);
  return shutdownPromise;
}
const listening = (port: number): Promise<boolean> => new Promise(resolve => {
  const socket = createConnection({ host: "127.0.0.1", port });
  const finish = (value: boolean) => { socket.destroy(); resolve(value); };
  socket.setTimeout(500, () => finish(false));
  socket.once("connect", () => finish(true));
  socket.once("error", () => finish(false));
});
function launch(label: string, args: string[]) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
  children.push(child);
  child.once("error", () => {
    startupFailure = true;
    console.error(`BELLO ${label} could not start.`);
    void shutdown(1);
  });
  child.once("exit", code => {
    if (!stopping) {
      startupFailure = true;
      console.error(`BELLO ${label} exited; shutting down the workspace.`);
      void shutdown(code === 0 ? 1 : code ?? 1);
    }
  });
  return child;
}
process.once("SIGINT", () => { void shutdown(0); });
process.once("SIGTERM", () => { void shutdown(0); });
try {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("BELLO requires Node.js 24.");
  if (!existsSync(".output/server/index.mjs") || !existsSync(".next/BUILD_ID"))
    throw new Error("Production output is missing. Run pnpm build first.");
  const agentPort = productionAgentPort(JSON.parse(readFileSync(".next/routes-manifest.json", "utf8")));
  const webPort = productionWebPort(process.env.PORT);
  if (agentPort === webPort) throw new Error("The web and agent ports must differ. Change PORT and retry.");
  if (await listening(agentPort) || await listening(webPort))
    throw new Error("A BELLO production port is already in use. Stop its owner or choose unused ports and rebuild.");
  if (!stopping) {
    launch("agent", ["node_modules/eve/bin/eve.js", "start", "--host", "127.0.0.1", "--port", String(agentPort)]);
    const deadline = Date.now() + 60_000;
    while (!stopping && !startupFailure && !await listening(agentPort) && Date.now() < deadline) await delay(100);
    if (!stopping && !startupFailure) {
      if (!await listening(agentPort)) throw new Error("The agent did not start within 60 seconds.");
      launch("web", [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(webPort)]);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "BELLO production startup failed.");
  await shutdown(1);
}
