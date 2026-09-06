import vinext from "vinext";
import { defineConfig } from "vite";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    ...(isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : {}),
  },
  plugins: [vinext()],
  ssr: {
    external: [
      "pg",
      "pg-pool",
      "pg-protocol",
      "@prisma/client",
      "@prisma/adapter-pg",
      ".prisma/client",
    ],
  },
  optimizeDeps: {
    exclude: ["pg", "@prisma/client", "@prisma/adapter-pg"],
  },
});
