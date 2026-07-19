import { defineMcpClientConnection } from "eve/connections";
import { createRequire } from "node:module";
import extension from "../extension";

// Kernel's hosted MCP server exposes the whole cloud-browser toolset — session
// management, Playwright execution, and human-like computer controls — so this
// extension ships no browser tools of its own. eve discovers the tools at runtime
// and surfaces them to the model as `<mount>__browser__<tool>` via `connection_search`.
//
// Auth is chosen from the mount config, so both modes are a one-line mount — no
// connection override needed:
//   - `connect` set  -> broker the token through Vercel Connect (no API key).
//        string       -> per-user principal, interactive consent (default, recommended)
//        { connector, principalType: "app" } -> shared, pre-installed app-level grant
//   - otherwise       -> static Kernel API key (config.apiKey, else KERNEL_API_KEY env).
//
// `@vercel/connect` is an optional peer, loaded lazily only when `connect` is set,
// so API-key-only consumers don't need it installed.
function auth() {
  const { connect } = extension.config;
  if (connect) {
    const require = createRequire(import.meta.url);
    const { connect: connectAuth } = require("@vercel/connect/eve");
    return connectAuth(connect);
  }
  return {
    getToken: async () => ({
      token: extension.config.apiKey ?? process.env.KERNEL_API_KEY!,
    }),
  };
}

export default defineMcpClientConnection({
  url: extension.config.mcpUrl,
  description:
    "Kernel cloud browser. Create and manage browser sessions, run Playwright code against a live page, and drive it with mouse/keyboard/screenshot computer controls.",
  auth: auth(),
  // The tools needed to open a browser, drive it end-to-end, log into sites via
  // Kernel's managed auth, and configure profiles/proxies. Kernel's MCP exposes
  // more (shell exec, app management, browser pools, etc.) — widen this by
  // overriding the connection. Leaving the destructive/account-management tools
  // out keeps an autonomous agent's blast radius small.
  tools: {
    allow: [
      "manage_browsers",
      "execute_playwright_code",
      "computer_action",
      "browser_curl",
      "manage_auth_connections",
      "manage_credentials",
      "manage_profiles",
      "manage_proxies",
    ],
  },
  // No approval gate — the agent runs autonomously. Consumers can override this
  // connection to add e.g. `approval: once()` (from "eve/tools/approval") or a
  // custom policy that inspects the tool input before irreversible actions.
});
