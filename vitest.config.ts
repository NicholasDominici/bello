import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "server-only": new URL("./packages/browsie/tests/server-only.ts", import.meta.url).pathname } },
  test: { include: ["tests/**/*.test.ts", "packages/browsie/tests/**/*.test.{ts,tsx}"], restoreMocks: true },
});
