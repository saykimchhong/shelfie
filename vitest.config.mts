import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Unit tests for pure logic (domain rules, merge, mock AI). They run in Node,
// without Firebase or a browser.
export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // `server-only` throws outside a React Server Component build; tests are
      // allowed to import server modules.
      "server-only": path("./node_modules/server-only/empty.js"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
